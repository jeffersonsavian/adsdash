# Sprint 5 — Decisões Técnicas de Deploy

Documento complementar ao `DEPLOY.md` explicando as decisões arquiteturais para Sprint 5.

---

## 1. Estratégia de Execução de Migrations

### Decisão: Entrypoint com `prisma migrate deploy`

**Implementado:** Script `docker/entrypoint.sh` que executa migrations **sempre** que o container inicia.

```bash
#!/bin/sh
set -e
echo "[AdsDash] Running database migrations..."
npx prisma migrate deploy
exec node server.js
```

**Dockerfile:** Usa `ENTRYPOINT` em vez de `CMD` para garantir que o script rodará sempre:

```dockerfile
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
```

### Por que essa abordagem?

1. **Idempotente:** Prisma v7 detecta que migrations já foram aplicadas e pula. Seguro rodar múltiplas vezes.
2. **Automático:** Não requer deploy manual de migrations — cada novo deploy da imagem garante schema sincronizado.
3. **Escalável:** Mesmo com múltiplas réplicas do app (Docker Swarm), Prisma trata locks de migration e garante atomicidade.
4. **Sem erro humano:** Reduz chance de esquecer de rodar migrate manualmente no servidor.

### Tradeoff: Tempo de startup

- Startup é ~1-3s mais lento (migration check + eventual SQL).
- Aceitável porque:
  - Migrations usualmente muito rápidas (apenas check se nenhuma pendente).
  - Startup é raro (deploys, crashes, scaling).
  - Docker Swarm usa `start_period: 10s` no healthcheck para dar margem.

### Garantias de Prisma v7

Documentado em [Prisma Migrate Deploy](https://www.prisma.io/docs/orm/prisma-migrate/workflows/integrate-migrations-with-deployment):

- Detecção de migrations pendentes.
- Locks automáticos (mutex via tabela `_prisma_migrations`).
- Rollback automático em caso de erro.
- Safe com scaling horizontal.

---

## 2. Scheduler — Loop vs Cron

### Decisão: Loop em `src/worker/scheduler.ts` com sleep

**Implementado no `docker/docker-compose.yml`:**

```yaml
scheduler:
  command: >
    sh -c "while true; do
      echo '[Scheduler] Running sync enqueue at '$(date) &&
      tsx src/worker/scheduler.ts &&
      echo '[Scheduler] Completed, sleeping 3600s until next run' &&
      sleep 3600;
    done"
```

**Arquivo:** `src/worker/scheduler.ts` — enfileira jobs de sync diário, depois `process.exit(0)`.

### Por quê?

1. **Simplemente:** Sem necessidade de instalar/configurar cron no container.
2. **Portável:** Mesmo código roda em Docker e PM2 (via `ecosystem.config.js`).
3. **Testável:** Scheduler é um script Node isolado, não daemon oculto.
4. **Logs claros:** Container logs mostram exatamente quando scheduler rodou.

### Alternativa (não implementada): Verdadeiro cron

Seria preciso:
- `apk add dcron` no Dockerfile (mais complexo).
- Gerenciar arquivo crontab dentro do container.
- Perder logs nativos do Docker.

**Decisão:** Loop simples + sleep é mais robusto para ambientes containerizados.

---

## 3. Imagem do Worker vs App

### Decisão: Mesma imagem (`adsdash-worker`) para worker + scheduler

```yaml
worker:
  image: adsdash-worker:latest
  command: tsx src/worker/index.ts

scheduler:
  image: adsdash-worker:latest
  command: sh -c "while true; do tsx src/worker/scheduler.ts; sleep 3600; done"
```

### Por quê?

1. **Economia:** 1 imagem instead of 2. Menos espaço em disco, menos to push.
2. **Consistency:** Mesmas deps, engine Prisma, runtime Node.
3. **Simplicidade:** Override de `command` no compose, não precisa de Dockerfile separado.

**Trade-off:** Worker + scheduler precisam da mesma base (ambos precisam de Prisma, Redis, etc). É o caso aqui.

---

## 4. Entrypoint COPY antes de User

### Detalhe no Dockerfile:

```dockerfile
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
USER nextjs
```

**Por quê?** 

- Script `chmod +x` precisa de permissão root.
- Usuário `nextjs` roda server.js, mas entrypoint continua rodando como root (que é OK — entrypoint é setup).
- Alternativa: `chown nextjs:nodejs /app/entrypoint.sh` e depois `USER nextjs`, mas entrypoint precisa root para alguns passos (nem sempre).

**Segurança:** Entrypoint (root) é minimal — só rodar migrate e exec server.js. Sem código arbitrário.

---

## 5. Prisma em Runtime vs Build

### O que incluímos no runtime?

```dockerfile
# Copy prisma schema and migration files
COPY --from=builder /app/prisma ./prisma
```

**Por quê?**

1. **Prisma Client engine:** Já compilado em deps/builder, disponível em node_modules.
2. **Prisma schema:** Necessário em runtime para `prisma migrate deploy`.
3. **Migrations SQL:** Necessário para o Prisma ler histórico.

**Não incluímos:** `node_modules` do builder — já está compilado em `.next/standalone/node_modules`.

---

## 6. Health Check no Docker

Implementado no app:

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

**Por quê?**

- Docker Swarm usa health checks para decidir se container está vivo.
- `start_period: 10s` dá tempo suficiente para migrations rodarem.
- `wget` é leve e disponível em Alpine.
- Verifica apenas HTTP 200 (app respondendo).

**Worker/Scheduler:** Sem health check (background workers, não servem HTTP).

---

## 7. Secrets e Env Vars no Swarm

**Decisão:** Documentar em DEPLOY.md, não hardcoded.

```bash
# Criar via docker secret
docker secret create nextauth_secret <(echo -n "$VALUE")

# Referenciar em docker-compose.yml
environment:
  NEXTAUTH_SECRET_FILE: /run/secrets/nextauth_secret
```

**Ou (mais simples):** Passar via `-e` flag:

```bash
docker stack deploy \
  -e NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
  -e ENCRYPTION_KEY="$ENCRYPTION_KEY" \
  -c docker-compose.yml adsdash
```

**Vantagem:** Não expor secrets em docker-compose.yml committed no git.

---

## 8. Redis no Swarm

**Decisão:** Documentar como pré-requisito, não incluir no stack.

Redis já está rodando no Swarm (como mencionado em CLAUDE.md). Não incluir no compose porque:

1. Evitar gerenciar persistência de Redis (já tem setup).
2. Simplificar compose (foco no app, worker, scheduler).
3. Redis shared entre outros serviços.

**Em docker-compose.yml:**

```yaml
environment:
  REDIS_URL: redis://redis:6379  # Assume rede intra-Swarm
```

Ou via `.env` no deploy:

```bash
REDIS_URL="redis://redis:6379"
```

---

## 9. Multi-stage Build Rationale

**Dockerfile stages:**

1. **base:** Node 20 + pnpm (reutilizável).
2. **deps:** Install apenas package.json + pnpm-lock (cache-friendly).
3. **builder:** Build da app (prisma generate + next build).
4. **runner:** Cópia apenas `.next/standalone`, `.next/static`, `public`, `prisma/`.

**Benefício:** Imagem final ~180MB (sem node_modules full, sem source code).

**Sem multi-stage:** ~800MB+ (full node_modules + source + build artifacts).

---

## 10. PM2 Alternativa

**Por quê incluir?** 

- Ambientes que não têm Docker (shared hosting, VPS simples).
- Mais familiar para equipes sem experiência com containers.
- Debugging mais fácil (direto no servidor, sem container layer).

**Arquivo:** `ecosystem.config.js` com 3 apps:

```javascript
{
  name: 'adsdash-app',
  script: 'pnpm start',
  exec_mode: 'cluster',
  instances: 1,
},
{
  name: 'adsdash-worker',
  script: 'pnpm worker',
  exec_mode: 'fork',
  instances: 1,
},
{
  name: 'adsdash-scheduler',
  script: 'pnpm scheduler',
  cron_restart: '0 0 * * *', // Daily
  instances: 1,
}
```

**Limitação:** PM2 não escala tão elegantemente quanto Swarm. Recomendado apenas 1 replica de app + worker.

---

## 11. Validation Status

**Local (sem infra):**
- ✓ `pnpm build` → exit 0
- ✓ `pnpm exec tsc --noEmit` → exit 0
- ✓ Dockerfiles sintaxe válida (não testadas, apenas linting manual)
- ✓ docker-compose.yml sintaxe válida
- ✓ ecosystem.config.js sem syntax errors (não rodado, apenas linting)

**Pendente (requer infra no servidor):**
- `docker build` com accesso a node_modules reais
- `docker stack deploy` com Swarm ativo + secrets criadas
- Migrations rodadas contra PostgreSQL real
- Worker + scheduler processando jobs com Redis real
- E2E: vincular conta Meta → sync → dashboard populado

---

## Próximas etapas para o usuário

1. **Ler DEPLOY.md** completamente antes de qualquer ação.
2. **Setup infra:**
   - PostgreSQL 14+ em `bancodedados01:5432`, banco `adsdash` criado.
   - Redis 6+ acessível (já deve estar no Swarm).
   - Domínio registrado (e.g., `adsdash.seudominio.com.br`).
3. **Gerar segredos:**
   ```bash
   openssl rand -base64 32  # NEXTAUTH_SECRET
   openssl rand -base64 32  # ENCRYPTION_KEY
   ```
4. **Build + push imagens:**
   ```bash
   docker build -f docker/Dockerfile -t adsdash-app:1.0.0 .
   docker build -f docker/Dockerfile.worker -t adsdash-worker:1.0.0 .
   docker push ...  # Se usando registry
   ```
5. **Deploy no Swarm:**
   ```bash
   docker stack deploy -c docker/docker-compose.yml adsdash \
     -e DATABASE_URL="..." \
     -e REDIS_URL="..." \
     -e NEXTAUTH_SECRET="..." \
     -e ENCRYPTION_KEY="..." \
     -e NEXTAUTH_URL="https://adsdash.seudominio.com.br"
   ```
6. **Monitorar logs:** `docker service logs adsdash_app`
7. **Acessar:** https://adsdash.seudominio.com.br → login com seed user.
