# AdsDash — Guia de Deploy

Deploy do AdsDash (dashboard SaaS multi-tenant de Meta Ads) em produção.

Dois caminhos: **Docker Swarm** (recomendado, usa infra existente) ou **PM2** (alternativa sem containers).

---

## 1. Pré-requisitos (ambas as opções)

### Base de dados
- PostgreSQL 14+ rodando em `bancodedados01:5432`
- Banco `adsdash` criado
- Credenciais: usuário e senha configuradas

### Redis
- Redis 6+ rodando (por padrão no Swarm via Traefik)
- URL acessível: `redis://redis:6379` (intra-Swarm) ou equivalente

### Domínio
- Domínio registrado: `adsdash.seudominio.com.br` (ajuste conforme seu domínio)
- DNS apontando para o servidor Swarm (manager01)
- Certificado HTTPS via Let's Encrypt (Traefik gerencia automaticamente)

### Segredos e chaves
Gerar com `openssl rand -base64 32`:

```bash
# No servidor, gerar e guardar esses valores com segurança
NEXTAUTH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
```

**Nunca commitar `.env` com segredos reais no repositório.**

---

## 2. Setup da base de dados

### Criar banco e usuário

```bash
# Conectar ao PostgreSQL como admin
psql -h bancodedados01 -U postgres

# Dentro do psql:
CREATE DATABASE adsdash;
CREATE USER adsdash_user WITH PASSWORD 'senha_segura_aqui';
ALTER ROLE adsdash_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE adsdash TO adsdash_user;
\q
```

### Connection string
```
DATABASE_URL=postgresql://adsdash_user:senha_segura_aqui@bancodedados01:5432/adsdash
```

### Executar migrations
As migrations rodam **uma única vez** no startup do app:

```bash
# Localmente (antes de buildar a imagem):
export DATABASE_URL="postgresql://adsdash_user:..."
pnpm prisma migrate deploy  # Aplica migrations existentes

# OU em produção (no container, via script de startup)
# Ver seção "Estratégia de migrations" abaixo
```

### Seed de dados iniciais
Criar usuário `owner` para acesso inicial:

```bash
export DATABASE_URL="postgresql://adsdash_user:..."
pnpm db:seed
```

Credenciais de exemplo geradas em `prisma/seed.ts`. Trocar logo após primeiro login.

---

## 3. Estratégia de Migrations

**Decisão:** Migrations executam via `prisma migrate deploy` no **entrypoint do container app** antes de iniciar o Next.js.

### Por que?
- Garante que o schema está sempre sincronizado com o código
- Não requer acesso manual ao servidor para rodar migrate
- Seguro para múltiplas replicas (Prisma detecta locks de migration)

### Como funciona

**Em `docker/Dockerfile`**, copiamos `prisma/` inteira para o runtime. O entrypoint do container (que não está explícito, usa o padrão `CMD ["node", "server.js"]`) não roda migrate.

**SOLUÇÃO ALTERNATIVA RECOMENDADA:** Criar entrypoint.sh que roda migrate antes do app:

```bash
#!/bin/sh
set -e

echo "[App Startup] Running migrations..."
npx prisma migrate deploy

echo "[App Startup] Migrations complete, starting server..."
exec node server.js
```

E atualizar `docker/Dockerfile`:
```dockerfile
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
```

**OU (manual):** Rodar migrate manualmente **uma vez** após criar o banco, antes de fazer deploy:

```bash
# No servidor com acesso ao banco
ssh user@bancodedados01
export DATABASE_URL="postgresql://adsdash_user:...@bancodedados01:5432/adsdash"
cd /var/www/adsdash
pnpm prisma migrate deploy
```

**Recomendação:** Use o entrypoint.sh para evitar erros humanos.

---

## 4. Deploy via Docker Swarm (RECOMENDADO)

### 4.1 Build das imagens

Na máquina de build (ou no manager01 com acesso Docker):

```bash
cd /caminho/para/adsdash

# Build da imagem app
docker build -f docker/Dockerfile -t adsdash-app:1.0.0 .

# Build da imagem worker
docker build -f docker/Dockerfile.worker -t adsdash-worker:1.0.0 .

# Tag para registry local (se usando)
docker tag adsdash-app:1.0.0 registry.local/adsdash-app:1.0.0
docker tag adsdash-worker:1.0.0 registry.local/adsdash-worker:1.0.0

# Push (se usando registry private)
docker push registry.local/adsdash-app:1.0.0
docker push registry.local/adsdash-worker:1.0.0
```

### 4.2 Criar secrets do Swarm

```bash
# No manager01 (com Docker Swarm ativo)
docker secret create nextauth_secret <(echo -n "$NEXTAUTH_SECRET")
docker secret create encryption_key <(echo -n "$ENCRYPTION_KEY")
docker secret create database_url <(echo -n "postgresql://adsdash_user:...@bancodedados01:5432/adsdash")
docker secret create redis_url <(echo -n "redis://redis:6379")
```

Ou via arquivo `.env.swarm`:
```bash
cat > .env.swarm <<EOF
NEXTAUTH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
DATABASE_URL=postgresql://adsdash_user:senha@bancodedados01:5432/adsdash
REDIS_URL=redis://redis:6379
NEXTAUTH_URL=https://adsdash.seudominio.com.br
META_APP_ID=seu_meta_app_id
META_APP_SECRET=seu_meta_app_secret
EOF
```

### 4.3 Deploy da stack

Atualizar `docker/docker-compose.yml`:
- Substituir `adsdash.seudominio.com.br` pelo seu domínio real
- Verificar IPs/hosts de banco e Redis

```bash
# Deploy no Swarm
docker stack deploy -c docker/docker-compose.yml adsdash

# Ou com env vars:
docker stack deploy \
  --with-registry-auth \
  -c docker/docker-compose.yml \
  -c .env.swarm \
  adsdash

# Verificar status
docker stack ps adsdash
docker service logs adsdash_app

# Escalar services (se necessário)
docker service scale adsdash_app=2 adsdash_worker=2
```

### 4.4 Monitorar

```bash
# Ver logs em tempo real
docker service logs -f adsdash_app

# Ver containers rodando
docker ps | grep adsdash

# Health check
curl https://adsdash.seudominio.com.br/api/workspaces
```

---

## 5. Deploy via PM2 (sem Docker)

Alternativa para ambientes sem Docker ou Kubernetes.

### 5.1 Pré-requisitos no servidor

```bash
# Node.js 20+ e pnpm
node --version  # >= 20.0.0
pnpm --version  # >= 9.0.0

# PM2 global
npm install -g pm2
pm2 install pm2-auto-pull  # Auto-restart on code changes (dev)
```

### 5.2 Preparar código

```bash
# Clonar ou copiar projeto para servidor
scp -r adsdash/ user@server:/var/www/adsdash

# Ou via git
ssh user@server
cd /var/www
git clone <repo-url> adsdash
cd adsdash
```

### 5.3 Build e setup

```bash
cd /var/www/adsdash

# Instalar deps
pnpm install --frozen-lockfile

# Build Next.js
pnpm build

# Gerar Prisma Client
pnpm prisma generate

# Criar variáveis de ambiente
cat > .env <<EOF
DATABASE_URL=postgresql://adsdash_user:senha@bancodedados01:5432/adsdash
REDIS_URL=redis://redis-host:6379
NEXTAUTH_URL=https://adsdash.seudominio.com.br
NEXTAUTH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
META_APP_ID=seu_app_id
META_APP_SECRET=seu_app_secret
EOF

# Rodar migrations (uma única vez)
pnpm prisma migrate deploy

# Seed (usuário inicial)
pnpm db:seed
```

### 5.4 Iniciar com PM2

```bash
# Editar ecosystem.config.js com caminhos reais
vim ecosystem.config.js
# Mudar "/var/www/adsdash" se necessário

# Iniciar
pm2 start ecosystem.config.js

# Salvar configuração (auto-restart on boot)
pm2 save
pm2 startup  # Segue as instruções

# Verificar status
pm2 status
pm2 logs adsdash-app
pm2 logs adsdash-worker
pm2 logs adsdash-scheduler
```

### 5.5 Monitorar e atualizar

```bash
# Ver recursos em tempo real
pm2 monit

# Restart de um app
pm2 restart adsdash-app

# Tail logs
pm2 logs adsdash-app --lines 100

# Parar tudo
pm2 stop all
pm2 delete all
```

### 5.6 Nginx/Traefik na frente

Configure reverse proxy:

```nginx
# /etc/nginx/sites-available/adsdash
upstream adsdash_backend {
    server 127.0.0.1:3000;
}

server {
    listen 443 ssl http2;
    server_name adsdash.seudominio.com.br;

    ssl_certificate /etc/letsencrypt/live/adsdash.seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/adsdash.seudominio.com.br/privkey.pem;

    location / {
        proxy_pass http://adsdash_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/adsdash /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Variáveis de ambiente

### Obrigatórias

| Var | Exemplo | Descrição |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@bancodedados01:5432/adsdash` | Conexão PostgreSQL |
| `REDIS_URL` | `redis://redis:6379` | Conexão Redis |
| `NEXTAUTH_URL` | `https://adsdash.seudominio.com.br` | URL pública do app (para OAuth callbacks) |
| `NEXTAUTH_SECRET` | `$(openssl rand -base64 32)` | Secret para JWT do NextAuth |
| `ENCRYPTION_KEY` | `$(openssl rand -base64 32)` | Chave AES-256 para criptografar tokens das contas |

### Opcionais (Meta Ads OAuth)

| Var | Descrição |
|---|---|
| `META_APP_ID` | ID da app em developers.facebook.com |
| `META_APP_SECRET` | Secret da app |
| `META_REDIRECT_URI` | `${NEXTAUTH_URL}/api/oauth/meta/callback` (auto) |

### Não commitar .env

```bash
# Ignorado (adicionado em .gitignore)
.env
.env.local
.env.*.local

# Use .env.example como template:
cp .env.example .env
# Editar .env com valores reais
```

---

## 7. Troubleshooting

### Erro: "ECONNREFUSED — PostgreSQL"
- Verificar connection string (host, porta, credenciais)
- Ping do servidor: `ping bancodedados01`
- Firewall: porta 5432 aberta?
- Usuário tem acesso ao banco `adsdash`?

### Erro: "ECONNREFUSED — Redis"
- Verificar se Redis está rodando: `redis-cli ping`
- REDIS_URL correto? (host, porta)
- Intra-Swarm vs. host externo?

### App inicia mas Workspace Switcher vazio
- Verificar migrations foram executadas: `pnpm prisma migrate status`
- Seed foi rodado? `pnpm db:seed`
- Query ao banco funciona? `pnpm prisma studio`

### Worker não processa jobs
- Redis rodando? `redis-cli KEYS '*'`
- ENCRYPTION_KEY coincide entre app e worker?
- Logs: `pm2 logs adsdash-worker` ou `docker service logs adsdash_worker`

### Certificado HTTPS não funciona
- Traefik tem acesso a Let's Encrypt? Ver logs `docker service logs traefik`
- Domínio aponta para o servidor? `dig adsdash.seudominio.com.br`
- DNS TTL propagado? Aguardar ~5 min

---

## 8. Backup e recuperação

### Backup do banco

```bash
# Full dump
pg_dump -h bancodedados01 -U adsdash_user -d adsdash > backup_adsdash_$(date +%Y%m%d).sql

# Restaurar
psql -h bancodedados01 -U adsdash_user -d adsdash < backup_adsdash_20260519.sql
```

### Backup dos volumes (PM2)

```bash
# Se usando volumes ou dados armazenados localmente
tar -czf adsdash-data-backup.tar.gz /var/www/adsdash/public
```

---

## 9. Checklist de deploy

### Pré-deploy
- [ ] PostgreSQL criado e acessível
- [ ] Redis rodando e acessível
- [ ] Domínio registrado e DNS apontando
- [ ] Segredos gerados (NEXTAUTH_SECRET, ENCRYPTION_KEY)
- [ ] `.env.example` atualizado com todas as vars
- [ ] Build local testa: `pnpm build && pnpm exec tsc --noEmit` (exit 0)

### Deploy Docker Swarm
- [ ] Imagens built: `docker build -f docker/Dockerfile ...`
- [ ] Registry configurado (se private)
- [ ] Secrets criadas: `docker secret create nextauth_secret ...`
- [ ] docker-compose.yml atualizado com domínio real
- [ ] Stack deployed: `docker stack deploy -c docker/docker-compose.yml adsdash`
- [ ] Containers saudáveis: `docker stack ps adsdash`
- [ ] Migrations executadas (ver logs: `docker service logs adsdash_app`)

### Deploy PM2
- [ ] Node 20+ instalado
- [ ] pnpm instalado globalmente
- [ ] Código clonado para `/var/www/adsdash`
- [ ] `pnpm install && pnpm build` sem erros
- [ ] `.env` criado com valores reais
- [ ] Migrations rodadas: `pnpm prisma migrate deploy`
- [ ] Seed rodado: `pnpm db:seed`
- [ ] `pm2 start ecosystem.config.js` iniciou os 3 apps
- [ ] `pm2 save && pm2 startup` para auto-boot

### Pós-deploy
- [ ] App acessível: `curl https://adsdash.seudominio.com.br`
- [ ] Login funciona com seed user
- [ ] Workspace criado e acessível
- [ ] Botão de sincronização aparece em settings
- [ ] Worker está consumindo jobs (ver logs)
- [ ] Alertas/monitoramento configurados (PM2 Plus, DataDog, etc.)

---

## 10. Atualizações e rollback

### Atualizar código (Git)

```bash
# Docker Swarm
git pull origin main
docker build -f docker/Dockerfile -t adsdash-app:1.0.1 .
docker service update --image adsdash-app:1.0.1 adsdash_app

# PM2
cd /var/www/adsdash
git pull origin main
pnpm install
pnpm build
pnpm prisma migrate deploy  # Se houver novas migrations
pm2 restart adsdash-app
```

### Rollback

```bash
# Docker Swarm
docker service update --image adsdash-app:1.0.0 adsdash_app

# PM2
git reset --hard <commit-hash>
pnpm build
pm2 restart adsdash-app
```

---

## 11. Monitoramento e logs

### Docker Swarm

```bash
docker service logs -f adsdash_app     # App
docker service logs -f adsdash_worker  # Worker
docker service logs -f adsdash_scheduler  # Scheduler
```

### PM2

```bash
pm2 logs                   # Todos os apps
pm2 logs adsdash-app --lines 200
pm2 monit                  # Dashboard
```

### Alertas

Configure notificações de falha:
- PM2 Plus: `pm2 plus` (integra Slack, email)
- DataDog/Sentry: Instrumentar em app (opcional)

---

## Notas finais

- **Docker Swarm é a opção recomendada** — reutiliza infra existente, gerencia containerização, scaling e networking.
- **PM2 é alternativa** — útil se infra não tiver Docker, requer gerenciamento manual de processos.
- **Migrations:** Garanta que rodam exatamente uma vez (Prisma tem lock de migration integrado).
- **Segredos:** Nunca commitar no repo. Use Docker Secrets, variáveis de ambiente ou vaults (Vault, AWS Secrets Manager).
- **Backups:** Implementar rotina de backup automática do PostgreSQL e dados críticos.
