# Build & Deploy das imagens — AdsDash

Guia rápido para gerar as imagens Docker e atualizar produção.
Ambiente: **Windows + PowerShell** (build local) → **GHCR** (registry) → **Portainer/Swarm** (worker01).

---

## Qual imagem buildar?

| O que mudou | Buildar |
|---|---|
| Tela / rota / componente do app (`src/app`, `src/components`) | **app** |
| Schema Prisma, seed, worker, jobs (`prisma/`, `src/worker`, `src/jobs`) | **app + worker** |
| `package.json`, libs compartilhadas (`src/lib`) | **app + worker** |
| Na dúvida | **app + worker** |

> O **worker** carrega o Prisma CLI + schema; é por ele que rodamos `migrate deploy` e `db:seed-prod`. Por isso, sempre que o schema mudar, rebuilde o worker também.

---

## Pré-requisito (só 1ª vez)

Login no GHCR com um PAT do GitHub que tenha escopo `write:packages`:

```powershell
docker login ghcr.io -u jeffersonsavian
# senha = o Personal Access Token (NÃO a senha do GitHub)
```

---

## 1. Build + push

Rode na raiz do projeto (`J:\MetaDash`).

### App (Next.js)
```powershell
docker buildx build --provenance=false --sbom=false `
  -f docker/Dockerfile `
  -t ghcr.io/jeffersonsavian/adsdash-app:latest `
  --push .
```

### Worker (BullMQ + scheduler)
```powershell
docker buildx build --provenance=false --sbom=false `
  -f docker/Dockerfile.worker `
  -t ghcr.io/jeffersonsavian/adsdash-worker:latest `
  --push .
```

As imagens são **públicas** no GHCR, então o servidor puxa sem precisar de login.

---

## 2. Atualizar produção (Portainer)

1. Portainer → **Stacks** → `adsdash` → **Editor**.
2. As variáveis de ambiente ficam **inline** no stack (ver `docker/docker-compose.yml`).
3. Clique em **Update the stack** (com *Re-pull image* ligado) — ele baixa a tag `:latest` nova.

> Alternativa via CLI no **manager01**:
> ```bash
> docker stack deploy -c /var/lib/docker/volumes/portainer_data/_data/compose/21/docker-compose.yml adsdash --with-registry-auth
> ```

---

## 3. Migrations + seed (só quando o schema mudou)

Rodar **no worker01** (onde o container roda), via SSH:

```bash
CID=$(docker ps -q -f name=adsdash_worker)
docker exec $CID pnpm prisma migrate deploy   # aplica migrations pendentes
docker exec $CID pnpm db:seed-prod            # idempotente: planos + superadmin
```

---

## Verificação

- App no ar: https://adsdash.decisaobuilder.com.br
- Logs do app:    `docker service logs adsdash_app --tail 50` (no manager01)
- Logs do worker: `docker service logs adsdash_worker --tail 50`

---

## Notas / gotchas já resolvidos

- Dockerfiles usam **node:22-alpine** (pnpm 11 exige Node 22).
- `pnpm install` usa `--config.dangerouslyAllowAllBuilds=true` (pnpm 11 bloqueia build scripts por padrão).
- O build do Next recebe um `DATABASE_URL` dummy (`RUN DATABASE_URL=... pnpm build`) para não falhar na coleta de páginas.
- `entrypoint.sh` tem `sed -i 's/\r$//'` no Dockerfile para corrigir CRLF do Windows.
- **Sem HEALTHCHECK** no Dockerfile do app (a rota `/` faz 307 para o domínio externo e derrubava o container). Swarm + Traefik cuidam da saúde.
- App precisa de `AUTH_TRUST_HOST=true` (NextAuth v5 atrás do Traefik).
- Migrations NÃO rodam no entrypoint do app (engines do Prisma não vêm no standalone) — rodar pelo worker (passo 3).
