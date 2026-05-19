# AdsDash — Plano de Implementação (execução por Sprint)

Referência canônica de código (schema, snippets, Docker): `adsdash-plano-node.md`.
Regras do projeto: `CLAUDE.md`.

Marcar `[x]` ao concluir cada item. Validar (`pnpm build` / typecheck) ao final de cada sprint antes de avançar.

---

## Sprint 0 — Setup do projeto

- [x] `git init` na raiz `J:\MetaDash`
- [x] Criar projeto Next.js 14 + TypeScript + Tailwind, App Router, `src/`, alias `@/*`, pnpm
      (`pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --use-pnpm`)
- [x] Inicializar shadcn/ui (criados button, card, input, label; demais via pnpm dlx add quando necessários)
- [x] Instalar deps: `prisma @prisma/client next-auth@beta bullmq ioredis recharts bcryptjs zod date-fns`
      e dev: `@types/bcryptjs tsx`
- [x] Criar `.env.example` (conforme seção 12 do plano) e `.env` local com `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`
- [x] Adicionar `.gitignore` cobrindo `.env`, `node_modules`, `.next`, `dist`
- [x] Scripts em `package.json`: `worker` (`tsx src/worker/index.ts`), `scheduler` (`tsx src/worker/scheduler.ts`), `db:migrate`, `db:generate`
- [x] Configurar `next.config` com `output: 'standalone'` (necessário para o Dockerfile)
- [x] Schema Prisma completo criado em `prisma/schema.prisma`

## Sprint 1 — Fundação (auth + workspaces)

- [x] `prisma/schema.prisma` com o schema completo da seção 5 do plano (todos os models)
- [x] `src/lib/prisma.ts` — singleton do Prisma Client
- [ ] Migration inicial — ADIADA: `prisma migrate diff` não gera SQL na Prisma v7.8 e migration manual não é válida. Será criada via `pnpm prisma migrate dev --name init` quando o PostgreSQL existir. Ver `MIGRATIONS.md`.
- [x] `src/lib/crypto.ts` — encrypt/decrypt AES-256-GCM usando `ENCRYPTION_KEY` (usado para tokens de AdAccount)
- [x] `src/lib/auth.ts` — NextAuth v5 com Credentials provider (email + senha, bcrypt), sessão JWT, role no token
- [x] `src/app/api/auth/[...nextauth]/route.ts`
- [x] `src/app/(auth)/login/page.tsx` + `(auth)/layout.tsx` — tela de login
- [x] Seed: script `prisma/seed.ts` criando 1 usuário `owner` para acesso inicial
- [x] `src/middleware.ts` — redireciona não autenticado para `/login`, injeta `x-user-id` (seção 10)
- [x] `src/lib/workspace.ts` — `getWorkspaceOrFail(slug, userId)` (valida vínculo WorkspaceUser)
- [x] API `src/app/api/workspaces/route.ts` — GET (lista do usuário) + POST (criar workspace, cria WorkspaceUser owner)
- [x] `src/app/(dashboard)/layout.tsx` — sidebar + `WorkspaceSwitcher`
- [x] `src/components/WorkspaceSwitcher.tsx`
- [x] Validação fim de sprint: TypeScript ✓, build ✓ (sem conexão banco)

## Sprint 2 — Integração Meta

- [x] `src/lib/meta-api.ts` — `fetchInsights`, `getActionValue`, `normalizeInsightRow` + tipos `MetaInsightRow`/`MetaAction` (seção 6)
- [x] `src/lib/queue.ts` — conexão Redis + `syncQueue` + `enqueueSyncJob` (seção 7)
- [x] `src/worker/index.ts` — Worker BullMQ que sincroniza campaign/adset/ad e grava SyncLog (seção 7)
- [x] `src/jobs/sync-meta.ts` — lógica de sync reutilizável (extrair do worker se útil para reuso pela rota manual)
- [x] `src/worker/scheduler.ts` — enfileira sync diário das contas ativas (seção 8)
- [x] API `src/app/api/[workspace]/ad-accounts/route.ts` — GET/POST (vincular conta Meta: salva token encriptado)
- [x] API `src/app/api/[workspace]/ad-accounts/[id]/route.ts` — GET/PATCH/DELETE
- [x] API `src/app/api/[workspace]/ad-accounts/[id]/sync/route.ts` — dispara `enqueueSyncJob` manual
- [x] `src/app/(dashboard)/[workspace]/settings/page.tsx` — vincular conta + listar contas + botão sync
- [x] `src/components/SyncStatus.tsx` — mostra status do último SyncLog
- [x] Validação fim de sprint (typecheck + build): `pnpm exec tsc --noEmit` ✓ (exit 0), `pnpm build` ✓ (exit 0)

### Notas da implementação Sprint 2:

**Arquivos criados:**
- `src/lib/meta-api.ts` — Integração com Meta Ads API (fetchInsights, normalizeInsightRow, etc)
- `src/lib/queue.ts` — Setup BullMQ com Redis (sincronização assíncrona)
- `src/worker/index.ts` — Worker BullMQ (processa jobs de sync)
- `src/worker/scheduler.ts` — Scheduler para sync diário automático
- `src/jobs/sync-meta.ts` — Lógica reutilizável de sync (usada por worker e rotas)
- `src/app/api/[workspace]/ad-accounts/route.ts` — GET/POST (listar e vincular contas)
- `src/app/api/[workspace]/ad-accounts/[id]/route.ts` — GET/PATCH/DELETE (gerenciar conta)
- `src/app/api/[workspace]/ad-accounts/[id]/sync/route.ts` — POST para disparar sync manual
- `src/app/api/[workspace]/ad-accounts/[id]/sync-log/route.ts` — GET para obter último sync
- `src/app/(dashboard)/[workspace]/settings/settings-content.tsx` — Componente cliente para settings
- `src/components/SyncStatus.tsx` — Componente para exibir status de sync

**Decisões e desvios:**
- Todos os tokens de AdAccount são criptografados com AES-256-GCM antes de persistir (via `encrypt()`)
- O `rawData` é excluído das queries Prisma para evitar conflitos de tipo JSON
- As rotas API foram atualizadas para suportar `params: Promise<>` (Next.js 16 padrão)
- O componente settings foi dividido em page (Server) + settings-content (Client) para melhor arquitetura
- Worker pode ser executado via `pnpm worker` e scheduler via `pnpm scheduler`

**Arquivos Sprint 2 (13 arquivos):**
- Meta API: meta-api.ts, queue.ts
- Worker: worker/index.ts, worker/scheduler.ts, jobs/sync-meta.ts
- API Routes: 4 rotas de ad-accounts (GET/POST, GET/PATCH/DELETE, sync, sync-log)
- UI: SyncStatus.tsx, settings-content.tsx, settings/page.tsx atualizado
- Crypto: atualizado para lazy init (suporta build sem ENCRYPTION_KEY)

**Pendências até infra disponível:**
- Não é possível testar worker + Redis/PostgreSQL sem a infra ativa
- Sync job enqueue está pronto mas requer Redis rodando
- Decrypt de tokens só acontece dentro do worker (nunca na API, nunca em logs)
- Fluxo end-to-end (vincular conta → enqueue sync → worker executa → métricas gravadas) requer Redis + PostgreSQL

## Sprint 3 — Dashboard

- [x] `src/lib/metrics.ts` — helpers de agregação + presets de período (hoje, 7d, 30d, mês atual) e período anterior
- [x] API `src/app/api/[workspace]/dashboard/route.ts` — KPIs agregados + evolução diária + campanhas rankeadas (seção 9)
- [x] `src/components/MetricCard.tsx`
- [x] `src/components/TrendChart.tsx` (Recharts)
- [x] `src/components/CampaignTable.tsx` (ordenável)
- [x] `src/components/DateRangePicker.tsx` (presets)
- [x] `src/app/(dashboard)/[workspace]/page.tsx` — monta dashboard (cards + gráfico + tabela + date picker)
- [x] Comparativo vs período anterior nos MetricCards (delta %)
- [x] Validação fim de sprint: `pnpm exec tsc --noEmit` ✓ (exit 0), `pnpm build` ✓ (exit 0)

### Notas da implementação Sprint 3:

**Arquivos criados:**
- `src/lib/metrics.ts` — Helpers de agregação, presets de período (hoje, 7d, 30d, mês atual), cálculo de período anterior para comparativo, formatação (moeda, número, decimal), cálculo de delta %
- `src/app/api/[workspace]/dashboard/route.ts` — API REST que retorna KPIs agregados (current + previous), evolução diária, campanhas top 10 rankeadas por spend
- `src/components/MetricCard.tsx` — Card exibindo label, valor, delta % com cor (verde/vermelho)
- `src/components/TrendChart.tsx` — Gráfico de linhas (Recharts) com spend, leads, purchases vs data
- `src/components/CampaignTable.tsx` — Tabela ordenável por qualquer coluna (client component), formatação de valores
- `src/components/ui/table.tsx` — Componente shadcn table criado manualmente (CLI falhou)
- `src/components/DateRangePicker.tsx` — Seletor de período com 4 presets (hoje, 7d, 30d, mês atual)
- `src/app/(dashboard)/[workspace]/page.tsx` — Dashboard completo: 6 MetricCards com deltas, TrendChart, CampaignTable, DateRangePicker (client component que busca dados via API)

**Decisões e desvios:**
- Dashboard refatorado para client component que busca dados via fetch da API (alternativa a Server Component + async fetch direto ao Prisma). Mantém reatividade ao mudar período.
- API usa `prisma.$queryRaw` com template tags parametrizados (nunca interpolação string crua) para CAMPAIGN-level aggregation
- Período anterior calculado em `metrics.ts::getPreviousPeriod()` e retornado na API para comparativo
- MetricCard exibe delta % com cores (verde se positivo, vermelho se negativo, cinza se nulo)
- CampaignTable é client component com useState para sortKey/sortOrder - clique nas colunas reordena (sem chamada ao servidor)
- DateRangePicker usa select simples (shadcn) com 4 presets - no lugar de calendar complex
- TrendChart exibe 3 series: spend (eixo esquerdo em azul), leads e purchases (eixo direito em verde/âmbar)

**Validação:**
- `pnpm exec tsc --noEmit` → exit 0 ✓
- `pnpm build` → exit 0 ✓ (Next.js build completo, incluindo rota dinâmica `/api/[workspace]/dashboard`)

**Pendências até infra disponível (PostgreSQL + Redis):**
- Renderização de dashboard com dados reais não é possível sem banco conectado
- Sync de métricas é prerequisite (worker enfileira jobs, scheduler roda, métricas preenchidas no AdMetric)
- API está pronta para receber queries; estrutura funcional verificada apenas por typecheck/build

## Sprint 4 — Refinamentos

- [x] Drill-down: `src/app/(dashboard)/[workspace]/campaigns/page.tsx` (lista) + `[id]/page.tsx` (campanha → adsets → ads)
- [x] API `src/app/api/[workspace]/campaigns/route.ts` + campaign detail route
- [x] Relatórios + export CSV: `src/app/(dashboard)/[workspace]/reports/page.tsx` + `api/[workspace]/reports/route.ts`
- [x] Sistema de anotações (model Annotation): criar/listar por data, sobrepor no TrendChart (ReferenceLine)
- [x] Convite de membros: API `src/app/api/[workspace]/members/route.ts` (GET lista, POST adiciona)
- [x] Visão consolidada do owner: `src/app/(dashboard)/page.tsx` agregando todos os workspaces
- [x] Alertas: CPA acima do limite (campo `cpaAlertThreshold` adicionado ao Workspace, destaque visual em CampaignTable)
- [x] Validação fim de sprint: `pnpm exec tsc --noEmit` ✓ (exit 0), `pnpm build` ✓ (exit 0)

### Notas da implementação Sprint 4:

**Arquivos criados:**
- `src/app/api/[workspace]/campaigns/route.ts` — GET lista de campanhas com métricas agregadas
- `src/app/api/[workspace]/campaigns/[id]/route.ts` — GET detalhe campanha (adsets + ads)
- `src/app/(dashboard)/[workspace]/campaigns/page.tsx` — Página de lista de campanhas (client component)
- `src/app/(dashboard)/[workspace]/campaigns/[id]/page.tsx` — Página de detalhe campanha com abas de adsets/ads
- `src/app/api/[workspace]/reports/route.ts` — GET endpoint que gera CSV com escape de campos
- `src/app/(dashboard)/[workspace]/reports/page.tsx` — UI para exportação CSV (seletor de período + tipo de entidade)
- `src/app/api/[workspace]/annotations/route.ts` — GET/POST anotações por período
- `src/app/api/[workspace]/members/route.ts` — GET lista de membros, POST para adicionar (role client/manager)
- `MIGRATIONS.md` — Documentação de schema changes

**Arquivos atualizados:**
- `prisma/schema.prisma` — Adicionado campo `cpaAlertThreshold` ao Workspace
- `src/components/TrendChart.tsx` — Suporte para anotações (ReferenceLine overlay de datas com anotação)
- `src/components/CampaignTable.tsx` — Suporte para CPA alert threshold (row highlight em vermelho)
- `src/lib/metrics.ts` — Adicionada função `isCpaAboveThreshold()`
- `src/app/(dashboard)/page.tsx` — Visão consolidada para owners (agregação de métricas de todos os workspaces)

**Decisões e desvios:**
- CSV export usa função `escapeCsvField()` para escape seguro (vírgulas, aspas, quebras) — sem injeção de fórmula
- Anotações aparecem como ReferenceLine tracejada vermelha no TrendChart, com label do título
- CPA alert é visual (row highlight em vermelho) quando `cpa > workspace.cpaAlertThreshold`
- Members API verifica role (manager/owner) antes de permitir adicionar — clientes não podem convidar
- Owner tem acesso à visão consolidada automática na raiz do dashboard (`/dashboard`)
- Campaigns detail page mostra adsets e ads em abas de tabela separadas (mesma página)
- ReferenceLine não é tipado como array em Recharts — iteramos manualmente sobre anotações

**Validação:**
- `pnpm exec tsc --noEmit` → exit 0 ✓
- `pnpm build` → exit 0 ✓ (11 arquivos novos, todas as rotas dinâmicas compiladas)

**Pendências até infra disponível (PostgreSQL + Redis):**
- Drill-down campanha → adsets → ads requer dados de métricas no banco (funcionalidade pronta, aguarda sync)
- Export CSV funciona quando métricas estão sincronizadas
- Anotações podem ser criadas via API mas renderização no gráfico depende de query bem-sucedida
- Members invite funciona se User existe (não cria usuários, apenas vincula aos workspaces)
- Visão consolidada owner funciona quando múltiplos workspaces têm métricas sincronizadas

## Sprint 5 — Deploy

- [x] `docker/Dockerfile`, `docker/Dockerfile.worker`, `docker/docker-compose.yml` (seção 11) — ajustar host do banco/dominio reais
- [x] `docker/entrypoint.sh` — executar migrations automaticamente no startup
- [x] `.dockerignore` — excluir node_modules, .next, .env, docs
- [x] `ecosystem.config.js` — configuração PM2 (alternativa sem Docker)
- [x] `DEPLOY.md` — guia completo (pré-requisitos, setup banco, migrations, Docker Swarm, PM2, troubleshooting, checklist)

**Status:** Artefatos gerados. Build local ✓ (exit 0), tsc ✓ (exit 0). Pendente: executar `docker build` e `docker stack deploy` no servidor com acesso à infra Docker Swarm + PostgreSQL + Redis.

---

## Notas de execução para o agente

- Implementar sprint por sprint, na ordem. Não pular para sprint seguinte sem o build passar.
- Reusar os snippets de `adsdash-plano-node.md` literalmente quando existirem; adaptar apenas o necessário para compilar (tipos, imports, assinaturas do NextAuth v5).
- NextAuth v5 muda a API vs v4 — usar `auth()` em vez de `getServerSession()` nas rotas/Server Components; ajustar `getWorkspaceOrFail` para receber o `userId` da sessão v5.
- Toda rota/Server Component que lê dados de workspace passa por `getWorkspaceOrFail`.
- Antes de marcar item `[x]`, confirmar que compila/typecheck. Atualizar este arquivo conforme avança.
- Não commitar segredos. Confirmar com o usuário antes de qualquer `git push` ou deploy.
