# AdsDash — Checklist de Go-Live

Dois caminhos de produção. **Docker Swarm é o recomendado** (reusa Traefik/Redis/Postgres já no servidor). PM2 é alternativa sem container.

Pré-requisitos comuns a ambos:
- PostgreSQL acessível em `bancodedados01:5432` com um banco `adsdash` criado.
- Redis acessível (URL do Redis do Swarm).
- Segredos gerados (NÃO commitar):
  ```bash
  openssl rand -base64 32   # NEXTAUTH_SECRET
  openssl rand -base64 32   # ENCRYPTION_KEY (deve resultar em 32 bytes)
  ```
- App Meta criado em developers.facebook.com (`META_APP_ID`, `META_APP_SECRET`).

---

## 0. Migration inicial (uma vez, antes do primeiro deploy)

A migration ainda não existe no repo (ver `MIGRATIONS.md`). Em uma máquina/job com
acesso ao banco e devDependencies instaladas:

```bash
export DATABASE_URL="postgresql://USER:SENHA@bancodedados01:5432/adsdash"
pnpm install
pnpm exec prisma migrate dev --name init      # gera prisma/migrations/ + aplica
pnpm exec prisma db seed                       # cria usuário owner inicial
```

Commit da pasta `prisma/migrations/` gerada, para que `migrate deploy` funcione nos
demais ambientes. Sem este passo, o app sobe mas não tem schema.

---

## A. Go-Live — Docker Swarm (recomendado)

- [ ] **0** acima concluído (migration gerada e commitada)
- [ ] No nó manager do Swarm, clonar/atualizar o repo (branch de release)
- [ ] Editar `docker/docker-compose.yml`: substituir `adsdash.SEUDOMINIO.com.br` pelo domínio real; conferir nomes das redes externas (`traefik-public`) e do service de Redis
- [ ] Criar os segredos/variáveis (via `docker secret` ou env no stack):
      `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`,
      `META_APP_ID`, `META_APP_SECRET`
- [ ] Build das imagens:
      ```bash
      docker build -f docker/Dockerfile      -t adsdash-app:latest    .
      docker build -f docker/Dockerfile.worker -t adsdash-worker:latest .
      ```
      (push para o registry se o Swarm tiver múltiplos nós)
- [ ] **Migration**: rodar `prisma migrate deploy` como job pontual antes/junto do deploy
      (NÃO confiar só no entrypoint — a imagem standalone pode não ter o Prisma CLI;
      ver caveat no `DEPLOY.md`). Ex.: container one-off com devDeps + `DATABASE_URL`.
- [ ] Deploy do stack:
      ```bash
      docker stack deploy -c docker/docker-compose.yml adsdash
      ```
- [ ] Verificar serviços: `docker stack services adsdash` (app, worker, scheduler com replicas OK)
- [ ] Logs sem erro: `docker service logs adsdash_app` / `_worker` / `_scheduler`
- [ ] Traefik roteando: acessar `https://DOMINIO` → tela de login carrega (TLS válido)
- [ ] Smoke test (seção D)
- [ ] Rollback testado: `docker service rollback adsdash_app`

---

## B. Go-Live — Servidor com PM2 (alternativa, sem container)

- [ ] **0** acima concluído
- [ ] Node 20+ e pnpm instalados no servidor; PM2 global (`npm i -g pm2`)
- [ ] Clonar o repo e `pnpm install --frozen-lockfile`
- [ ] Criar `.env` no servidor (NÃO commitado) com todas as variáveis (DATABASE_URL,
      REDIS_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY, META_*)
- [ ] `pnpm exec prisma generate`
- [ ] `pnpm exec prisma migrate deploy` (banco já deve existir)
- [ ] Build: `pnpm build`
- [ ] Subir os processos:
      ```bash
      pm2 start ecosystem.config.js
      pm2 save
      pm2 startup        # gerar script de boot e executar o comando que ele imprimir
      ```
- [ ] `pm2 status` → `adsdash-app`, `adsdash-worker`, `adsdash-scheduler` online
- [ ] `pm2 logs` sem erros de conexão (DB/Redis)
- [ ] Reverse proxy (Traefik/Nginx) do servidor apontando para a porta do app (3000) com TLS
- [ ] Smoke test (seção D)
- [ ] Rollback: `git checkout <tag-anterior>` → `pnpm build` → `pm2 reload ecosystem.config.js`

---

## C. Segurança (antes de expor publicamente)

- [ ] `.env` / segredos NÃO estão no git (conferir `git status` e `.gitignore`)
- [ ] `NEXTAUTH_SECRET` e `ENCRYPTION_KEY` únicos de produção (não os de exemplo)
- [ ] HTTPS forçado; cookies de sessão seguros
- [ ] Trocar a senha do usuário `owner` semeado pelo seed
- [ ] Tokens de AdAccount conferidos como encriptados no banco (coluna `accessToken` ilegível)

## D. Smoke test pós-deploy

- [ ] Login com o usuário owner
- [ ] Criar/listar workspace; trocar de workspace no switcher
- [ ] Vincular uma conta Meta (token de teste) em Settings
- [ ] Disparar sync manual → `SyncStatus` muda; worker processa o job (ver logs)
- [ ] Dashboard renderiza KPIs/gráfico/tabela com os dados sincronizados
- [ ] Export CSV de relatório baixa e abre corretamente
- [ ] Acesso de um usuário `client` vê apenas o próprio workspace (isolamento)

## E. Pós go-live

- [ ] Scheduler enfileira sync diário (verificar no dia seguinte / logs do service scheduler)
- [ ] Backup do banco `adsdash` agendado
- [ ] Monitorar `sync_logs` para falhas recorrentes de sync
