# AdsDash

Dashboard SaaS multi-tenant para gestores de tráfego — métricas de Meta Ads de múltiplos clientes em um só lugar, com isolamento de dados por workspace.

Documento de referência completo: `adsdash-plano-node.md` (schema Prisma, integração Meta API, filas, Docker — sempre consultar antes de implementar).
Plano de execução passo a passo: `PLAN.md`.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL
- BullMQ + Redis (filas de sync)
- NextAuth v5 (Auth.js)
- Recharts (gráficos)
- pnpm (package manager)
- Docker (deploy em Swarm com Traefik)

## Ambiente

- Windows + PowerShell (sintaxe PowerShell: `$env:VAR`, `$null`, backtick para continuação de linha).
- Servidor Docker Swarm: nós `manager01` e `bancodedados01`.
- PostgreSQL já rodando em `bancodedados01:5432`. Redis e Traefik já configurados no Swarm.
- Projeto ainda **não** é um repositório git — inicializar com `git init` antes do primeiro commit.
- Código-fonte vive sob `src/` (App Router em `src/app/`).

## Arquitetura multi-tenant

- Schema único: toda tabela de dados tem `workspaceId` como chave de isolamento.
- Roles: `owner` (todos os workspaces + visão consolidada), `manager` (workspaces atribuídos), `client` (somente leitura do próprio workspace).
- **Toda query de dados DEVE filtrar por `workspaceId`.** Acesso ao workspace é validado via `getWorkspaceOrFail(slug, userId)` em `src/lib/workspace.ts`. Nunca confiar no slug da URL sem checar o vínculo `WorkspaceUser`.

## Convenções

- Tokens de contas de anúncio (`AdAccount.accessToken`) são armazenados **encriptados** (AES-256 via `src/lib/crypto.ts`). Nunca persistir ou logar token em texto puro.
- Métricas: `entityType` é `campaign | adset | ad`. Upsert por chave única `(entityType, entityId, date, platform)` — sync é idempotente.
- Datas no formato `YYYY-MM-DD` na fronteira da Meta API; `@db.Date` no banco.
- Worker BullMQ roda como processo separado (`src/worker/index.ts`), não dentro do Next.
- Não commitar `.env` — só `.env.example`. Gerar segredos com `openssl rand -base64 32`.
- Componentes UI shadcn em `src/components/ui/` são gerados — não editar manualmente salvo necessidade.

## Comandos

- `pnpm dev` — Next.js em dev
- `pnpm build` — build de produção
- `pnpm prisma migrate dev` — criar/aplicar migration (dev)
- `pnpm prisma generate` — regenerar client Prisma
- `pnpm prisma studio` — inspecionar banco
- `pnpm worker` — rodar worker BullMQ local (definir script em package.json)

## Estado / progresso

Acompanhar progresso por sprint marcando os checkboxes em `PLAN.md`. Atualizar ao concluir cada item.
