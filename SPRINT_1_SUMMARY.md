# Sprint 1 — Resumo de Implementação

**Status:** ✅ COMPLETO (sem conexão ao banco PostgreSQL)

## O que foi implementado

### 1. Core Auth + Session
- **`src/lib/auth.ts`** — NextAuth v5 (Auth.js) com Credentials provider, JWT session, role armazenado no token
- **`src/app/api/auth/[...nextauth]/route.ts`** — handlers de autenticação
- **`src/app/(auth)/login/page.tsx`** + **`(auth)/layout.tsx`** — UI de login com form email+senha
- Demo user: `owner@example.com` / `password123` (criado via seed)

### 2. Criptografia de Tokens
- **`src/lib/crypto.ts`** — encrypt/decrypt AES-256-GCM para armazenar tokens de AdAccount encriptados
- Usa `ENCRYPTION_KEY` do .env (32 bytes em base64)

### 3. Prisma + Schema
- **`prisma/schema.prisma`** — Schema Prisma v7 completo com 10 models:
  - User, Workspace, WorkspaceUser (multi-tenant)
  - AdAccount, Campaign, AdSet, Ad (hierarquia de anúncios)
  - AdMetric (métricas genericadas por `entityId`)
  - SyncLog, Annotation
- **`src/lib/prisma.ts`** — Singleton PrismaClient (com fallback para build offline)
- **`prisma/seed.ts`** — Script que cria usuário `owner` + workspace demo + vínculo

### 4. Middleware + Isolamento
- **`src/middleware.ts`** — Redirecciona não autenticado para `/login`, injeta `x-user-id` no header
- **`src/lib/workspace.ts`** — `getWorkspaceOrFail(slug, userId)` valida acesso ao workspace via `WorkspaceUser`

### 5. Dashboard Pages
- **`src/app/(dashboard)/layout.tsx`** — Sidebar com WorkspaceSwitcher, nav, user section, logout
- **`src/app/(dashboard)/page.tsx`** — Home com lista de workspaces ou redireciona ao único
- **`src/app/(dashboard)/[workspace]/page.tsx`** — Dashboard do workspace (placeholder com KPIs)
- **`src/app/(dashboard)/[workspace]/settings/page.tsx`** — Config workspace, lista ad-accounts
- **`src/app/(dashboard)/workspaces/new/page.tsx`** — Form para criar novo workspace

### 6. API Routes
- **`src/app/api/workspaces/route.ts`**
  - GET: Lista workspaces do usuário (autenticado)
  - POST: Cria workspace + WorkspaceUser owner (apenas para owners)

### 7. Componentes UI
- **`src/components/WorkspaceSwitcher.tsx`** — Selector + botão "novo workspace" (client component)
- shadcn/ui: button, card, input, label, select (customizado manualmente)

### 8. Migration (Offline)
- **`prisma/migrations/0_init/migration.sql`** — SQL inicial gerado offline
- **`MIGRATIONS.md`** — Instruções para aplicar migration quando banco estiver disponível
- Próximo passo: rodar `pnpm prisma migrate deploy` ou `prisma migrate resolve --applied 0_init`

## Status de Validação

### ✅ TypeScript
```bash
pnpm exec tsc --noEmit
# ✓ Sem erros
```

### ✅ Build
```bash
pnpm build
# ✓ Compiled successfully
# ✓ Generating static pages
# Route types validated
```

### ✅ Prisma Client
```bash
pnpm exec prisma generate
# ✓ Generated Prisma Client v7.8.0
```

## Estrutura de Pasta Sprint 1

```
src/
├── lib/
│   ├── auth.ts           (NextAuth v5 config)
│   ├── crypto.ts         (AES-256-GCM)
│   ├── prisma.ts         (Singleton + offline fallback)
│   ├── workspace.ts      (getWorkspaceOrFail)
│   └── utils.ts          (cn() helper)
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx    (Sidebar + WorkspaceSwitcher)
│   │   ├── page.tsx      (Workspaces list)
│   │   ├── [workspace]/
│   │   │   ├── page.tsx  (Dashboard placeholder)
│   │   │   └── settings/page.tsx
│   │   └── workspaces/new/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── workspaces/route.ts (GET/POST)
│   └── middleware.ts
├── components/
│   ├── WorkspaceSwitcher.tsx
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── select.tsx
└── prisma/
    ├── schema.prisma
    ├── seed.ts
    └── migrations/0_init/migration.sql
```

## Pendências (Aguardando Banco)

1. **Rodar migration** — Após PostgreSQL estar em `bancodedados01:5432`:
   ```bash
   export DATABASE_URL=postgresql://user:senha@bancodedados01:5432/adsdash
   pnpm exec prisma migrate deploy
   pnpm exec prisma db seed
   ```

2. **Testar fluxo completo** — Login, criar workspace, trocar workspace, settings

3. **Next Steps — Sprint 2** — Meta Ads API, BullMQ worker, sync

## Notas Técnicas

- **NextAuth v5 vs v4** — Mudanças: `auth()` em vez de `getServerSession()`, sintaxe de config
- **Prisma v7** — Requer `adapter` ou `accelerateUrl` em runtime, durante build usamos fallback
- **Dynamic routes** — Rotas com Prisma marcadas com `export const dynamic = 'force-dynamic'`
- **middleware.ts** — Arquivo `.ts` de middleware é deprecated em favor de `./proxy`, usando warning suprimido
- **Relações AdMetric** — Removidas relações explícitas para Campaign/AdSet/Ad pois usa `entityId` genérico

## Como Rodar Localmente (pós-banco)

```bash
# 1. Aplique migration
pnpm exec prisma migrate deploy

# 2. Rode seed
pnpm exec prisma db seed

# 3. Inicie dev server
pnpm dev

# 4. Acesse http://localhost:3000/login
#    Email: owner@example.com
#    Senha: password123
```

---

**Implementado por:** Claude Code (Agent)  
**Data:** 2026-05-19  
**Sprint:** 1/4 completa
