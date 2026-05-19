# AdsDash — Plano de Projeto Completo
> Dashboard multi-tenant para gestores de tráfego — Meta Ads
> Stack: Node.js + Next.js 14 + PostgreSQL + BullMQ
> Versão 2.0 | Para execução via Claude Code

---

## 1. Visão geral

**Problema:** Gestor de tráfego que administra múltiplos clientes precisa
visualizar métricas de diferentes contas de anúncios em um só lugar,
com isolamento de dados por cliente e visão consolidada para o gestor.

**Solução:** Dashboard SaaS multi-tenant onde o gestor acessa todos os
clientes via workspace switcher, e cada cliente (se quiser dar acesso)
vê apenas os próprios dados.

**Nome:** AdsDash

---

## 2. Stack tecnológico

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Já usa, SSR nativo, Server Actions |
| Backend API | Next.js API Routes + Route Handlers | Tudo num projeto só |
| Banco | PostgreSQL | Já tem servidor rodando |
| ORM | Prisma | Type-safe, migrations simples, ótimo com Next |
| Fila de jobs | BullMQ + Redis | Sync assíncrono das contas |
| Auth | NextAuth v5 (Auth.js) | Session, JWT, simples de configurar |
| UI | Tailwind CSS + shadcn/ui | Componentes prontos, fácil de customizar |
| Gráficos | Recharts | Leve, funciona bem com Next |
| Deploy | Docker no Swarm existente | Mesmo ambiente atual |
| Package manager | pnpm | Mais rápido, já tem no ambiente |

---

## 3. Arquitetura multi-tenant

### Modelo: schema único com `workspace_id`

Todas as tabelas têm `workspace_id` como chave de isolamento.
Simples de manter, sem schemas separados por tenant.

```
Você (owner)
  └── Workspace: Coach Jack
        └── Contas: Meta Ads ID 123
  └── Workspace: Cliente B
        └── Contas: Meta Ads ID 456
  └── Workspace: Cliente C
        └── Contas: Meta Ads ID 789
```

### Níveis de acesso

| Role | O que vê |
|---|---|
| `owner` | Todos os workspaces, painel consolidado |
| `manager` | Workspaces atribuídos a ele |
| `client` | Apenas o próprio workspace (leitura) |

---

## 4. Estrutura de pastas

```
adsdash/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx            # Layout com sidebar + workspace switcher
│   │   │   ├── page.tsx              # Visão consolidada (owner)
│   │   │   └── [workspace]/
│   │   │       ├── page.tsx          # Dashboard do workspace
│   │   │       ├── campaigns/
│   │   │       │   ├── page.tsx      # Lista de campanhas
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx  # Detalhe campanha → adsets → ads
│   │   │       ├── reports/
│   │   │       │   └── page.tsx      # Relatórios + exportação
│   │   │       └── settings/
│   │   │           └── page.tsx      # Config workspace + contas vinculadas
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts
│   │       ├── workspaces/
│   │       │   └── route.ts
│   │       ├── [workspace]/
│   │       │   ├── dashboard/
│   │       │   │   └── route.ts      # KPIs + gráficos
│   │       │   ├── campaigns/
│   │       │   │   └── route.ts
│   │       │   ├── ad-accounts/
│   │       │   │   ├── route.ts
│   │       │   │   └── [id]/
│   │       │   │       ├── route.ts
│   │       │   │       └── sync/
│   │       │   │           └── route.ts  # Sync manual
│   │       │   └── reports/
│   │       │       └── route.ts
│   │       └── jobs/
│   │           └── sync/
│   │               └── route.ts      # Endpoint interno pro worker
│   ├── components/
│   │   ├── ui/                       # shadcn/ui (gerados)
│   │   ├── MetricCard.tsx
│   │   ├── TrendChart.tsx
│   │   ├── CampaignTable.tsx
│   │   ├── WorkspaceSwitcher.tsx
│   │   ├── DateRangePicker.tsx
│   │   └── SyncStatus.tsx
│   ├── lib/
│   │   ├── prisma.ts                 # Cliente Prisma singleton
│   │   ├── auth.ts                   # Config NextAuth
│   │   ├── meta-api.ts              # Integração Meta Ads API
│   │   ├── queue.ts                  # Setup BullMQ
│   │   ├── metrics.ts               # Funções de agregação
│   │   └── workspace.ts             # Helper: pega workspace da sessão
│   ├── jobs/
│   │   └── sync-meta.ts             # Job de sync Meta Ads
│   └── worker/
│       └── index.ts                 # Processo worker BullMQ separado
├── prisma/
│   └── schema.prisma
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   └── docker-compose.yml
├── .env.example
└── package.json
```

---

## 5. Schema do banco (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Workspace {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  logoUrl   String?
  timezone  String   @default("America/Sao_Paulo")
  currency  String   @default("BRL")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users      WorkspaceUser[]
  adAccounts AdAccount[]
  campaigns  Campaign[]
  adSets     AdSet[]
  ads        Ad[]
  metrics    AdMetric[]
  annotations Annotation[]
  syncLogs   SyncLog[]

  @@map("workspaces")
}

model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String
  role         String   @default("client") // owner | manager | client
  createdAt    DateTime @default(now())

  workspaces   WorkspaceUser[]
  annotations  Annotation[]

  @@map("users")
}

model WorkspaceUser {
  workspaceId String
  userId      String
  role        String @default("client")

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([workspaceId, userId])
  @@map("workspace_users")
}

model AdAccount {
  id                String    @id @default(uuid())
  workspaceId       String
  platform          String    // 'meta' | 'google'
  externalAccountId String    // ID da conta na plataforma
  name              String?
  accessToken       String    // encriptado
  tokenExpiresAt    DateTime?
  isActive          Boolean   @default(true)
  lastSyncedAt      DateTime?
  createdAt         DateTime  @default(now())

  workspace Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  metrics   AdMetric[]
  syncLogs  SyncLog[]

  @@unique([workspaceId, externalAccountId, platform])
  @@map("ad_accounts")
}

model Campaign {
  id              String    @id @default(uuid())
  workspaceId     String
  adAccountId     String
  externalId      String
  platform        String
  name            String
  status          String?   // ACTIVE | PAUSED | ARCHIVED
  objective       String?
  dailyBudget     Decimal?  @db.Decimal(12, 2)
  lifetimeBudget  Decimal?  @db.Decimal(12, 2)
  startDate       DateTime?
  endDate         DateTime?
  createdAt       DateTime  @default(now())

  workspace Workspace  @relation(fields: [workspaceId], references: [id])
  adSets    AdSet[]
  metrics   AdMetric[]

  @@unique([adAccountId, externalId])
  @@map("campaigns")
}

model AdSet {
  id          String   @id @default(uuid())
  workspaceId String
  campaignId  String
  externalId  String
  name        String
  status      String?
  dailyBudget Decimal? @db.Decimal(12, 2)
  bidStrategy String?
  targeting   Json?
  createdAt   DateTime @default(now())

  workspace Workspace  @relation(fields: [workspaceId], references: [id])
  campaign  Campaign   @relation(fields: [campaignId], references: [id])
  ads       Ad[]
  metrics   AdMetric[]

  @@unique([campaignId, externalId])
  @@map("ad_sets")
}

model Ad {
  id            String   @id @default(uuid())
  workspaceId   String
  adSetId       String
  externalId    String
  name          String
  status        String?
  creativeType  String?  // image | video | carousel
  thumbnailUrl  String?
  createdAt     DateTime @default(now())

  workspace Workspace  @relation(fields: [workspaceId], references: [id])
  adSet     AdSet      @relation(fields: [adSetId], references: [id])
  metrics   AdMetric[]

  @@unique([adSetId, externalId])
  @@map("ads")
}

model AdMetric {
  id               String   @id @default(uuid())
  workspaceId      String
  adAccountId      String
  entityType       String   // 'campaign' | 'adset' | 'ad'
  entityId         String
  externalEntityId String?
  date             DateTime @db.Date
  platform         String

  // Entrega
  impressions  Int     @default(0)
  reach        Int     @default(0)
  frequency    Decimal? @db.Decimal(8, 4)
  clicks       Int     @default(0)
  uniqueClicks Int     @default(0)
  linkClicks   Int     @default(0)

  // Custo
  spend Decimal  @default(0) @db.Decimal(12, 2)
  cpm   Decimal? @db.Decimal(10, 4)
  cpc   Decimal? @db.Decimal(10, 4)
  ctr   Decimal? @db.Decimal(8, 4)

  // Conversões
  leads           Int     @default(0)
  purchases       Int     @default(0)
  addToCart       Int     @default(0)
  viewContent     Int     @default(0)
  conversions     Int     @default(0)
  conversionValue Decimal @default(0) @db.Decimal(12, 2)

  // Calculadas
  cpl  Decimal? @db.Decimal(10, 4)
  cpa  Decimal? @db.Decimal(10, 4)
  roas Decimal? @db.Decimal(10, 4)

  rawData  Json?
  syncedAt DateTime @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id])
  adAccount AdAccount @relation(fields: [adAccountId], references: [id])

  @@unique([entityType, entityId, date, platform])
  @@index([workspaceId, date])
  @@index([entityType, entityId])
  @@map("ad_metrics")
}

model SyncLog {
  id             String    @id @default(uuid())
  workspaceId    String
  adAccountId    String
  platform       String
  status         String    // success | error | partial
  dateRangeStart DateTime? @db.Date
  dateRangeEnd   DateTime? @db.Date
  recordsSynced  Int       @default(0)
  errorMessage   String?
  durationMs     Int?
  startedAt      DateTime  @default(now())
  finishedAt     DateTime?

  workspace Workspace @relation(fields: [workspaceId], references: [id])
  adAccount AdAccount @relation(fields: [adAccountId], references: [id])

  @@map("sync_logs")
}

model Annotation {
  id          String   @id @default(uuid())
  workspaceId String
  date        DateTime @db.Date
  title       String
  description String?
  type        String   @default("note") // note | creative_change | budget_change | pause
  createdById String
  createdAt   DateTime @default(now())

  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  createdBy   User      @relation(fields: [createdById], references: [id])

  @@map("annotations")
}
```

---

## 6. Integração Meta Ads API

```typescript
// src/lib/meta-api.ts

const BASE_URL = 'https://graph.facebook.com/v19.0'

const INSIGHT_FIELDS = [
  'campaign_id', 'campaign_name',
  'adset_id', 'adset_name',
  'ad_id', 'ad_name',
  'impressions', 'reach', 'frequency',
  'clicks', 'unique_clicks', 'inline_link_clicks',
  'spend', 'cpm', 'cpc', 'ctr',
  'actions',
  'action_values',
  'cost_per_action_type',
].join(',')

export async function fetchInsights({
  accessToken,
  accountId,
  dateStart,
  dateEnd,
  level = 'campaign',
}: {
  accessToken: string
  accountId: string
  dateStart: string   // 'YYYY-MM-DD'
  dateEnd: string
  level?: 'campaign' | 'adset' | 'ad'
}) {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: INSIGHT_FIELDS,
    level,
    time_range: JSON.stringify({ since: dateStart, until: dateEnd }),
    time_increment: '1',
    limit: '500',
  })

  const res = await fetch(
    `${BASE_URL}/act_${accountId}/insights?${params}`
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Meta API error: ${err.error?.message}`)
  }

  const data = await res.json()
  return data.data as MetaInsightRow[]
}

// Extrai valor de uma action específica (ex: 'lead', 'purchase')
export function getActionValue(
  actions: MetaAction[] | undefined,
  actionType: string
): number {
  if (!actions) return 0
  const action = actions.find(a => a.action_type === actionType)
  return action ? Number(action.value) : 0
}

// Normaliza uma linha da API para o formato do banco
export function normalizeInsightRow(row: MetaInsightRow, level: string) {
  const leads     = getActionValue(row.actions, 'lead')
  const purchases = getActionValue(row.actions, 'purchase')
  const addToCart = getActionValue(row.actions, 'add_to_cart')
  const spend     = Number(row.spend) || 0
  const convValue = getActionValue(row.action_values, 'purchase')

  return {
    entityType:       level,
    externalEntityId: row[`${level}_id`],
    date:             new Date(row.date_start),
    platform:         'meta',
    impressions:      Number(row.impressions) || 0,
    reach:            Number(row.reach)       || 0,
    frequency:        Number(row.frequency)   || null,
    clicks:           Number(row.clicks)      || 0,
    uniqueClicks:     Number(row.unique_clicks)     || 0,
    linkClicks:       Number(row.inline_link_clicks) || 0,
    spend,
    cpm:              Number(row.cpm) || null,
    cpc:              Number(row.cpc) || null,
    ctr:              Number(row.ctr) || null,
    leads,
    purchases,
    addToCart,
    conversionValue:  convValue,
    cpl:              leads     > 0 ? spend / leads     : null,
    cpa:              purchases > 0 ? spend / purchases : null,
    roas:             spend     > 0 ? convValue / spend : null,
    rawData:          row,
  }
}
```

---

## 7. Sistema de filas (BullMQ)

```typescript
// src/lib/queue.ts
import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

export const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
})

export const syncQueue = new Queue('sync-meta', { connection })

// Adicionar job de sync
export async function enqueueSyncJob(payload: {
  adAccountId: string
  dateStart: string
  dateEnd: string
}) {
  await syncQueue.add('sync', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  })
}
```

```typescript
// src/worker/index.ts — processo separado
import { Worker } from 'bullmq'
import { connection } from '../lib/queue'
import { prisma } from '../lib/prisma'
import { fetchInsights, normalizeInsightRow } from '../lib/meta-api'
import { decrypt } from '../lib/crypto'

const worker = new Worker(
  'sync-meta',
  async (job) => {
    const { adAccountId, dateStart, dateEnd } = job.data

    const account = await prisma.adAccount.findUniqueOrThrow({
      where: { id: adAccountId },
    })

    const log = await prisma.syncLog.create({
      data: {
        workspaceId: account.workspaceId,
        adAccountId: account.id,
        platform: 'meta',
        status: 'running',
        dateRangeStart: new Date(dateStart),
        dateRangeEnd: new Date(dateEnd),
      },
    })

    const startedAt = Date.now()
    let recordsSynced = 0

    try {
      const accessToken = decrypt(account.accessToken)

      for (const level of ['campaign', 'adset', 'ad'] as const) {
        const rows = await fetchInsights({
          accessToken,
          accountId: account.externalAccountId,
          dateStart,
          dateEnd,
          level,
        })

        for (const row of rows) {
          const normalized = normalizeInsightRow(row, level)

          await prisma.adMetric.upsert({
            where: {
              entityType_entityId_date_platform: {
                entityType: normalized.entityType,
                entityId:   normalized.externalEntityId,
                date:       normalized.date,
                platform:   normalized.platform,
              },
            },
            update: normalized,
            create: {
              ...normalized,
              workspaceId: account.workspaceId,
              adAccountId: account.id,
              entityId:    normalized.externalEntityId,
            },
          })

          recordsSynced++
        }
      }

      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: 'success',
          recordsSynced,
          durationMs:  Date.now() - startedAt,
          finishedAt:  new Date(),
        },
      })

      await prisma.adAccount.update({
        where: { id: adAccountId },
        data: { lastSyncedAt: new Date() },
      })
    } catch (err: any) {
      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: 'error',
          errorMessage: err.message,
          durationMs:   Date.now() - startedAt,
          finishedAt:   new Date(),
        },
      })
      throw err
    }
  },
  { connection, concurrency: 3 }
)

console.log('Worker AdsDash iniciado')
```

---

## 8. Scheduler (sync automático diário)

```typescript
// src/worker/scheduler.ts — roda separado via cron do Docker

import { prisma } from '../lib/prisma'
import { enqueueSyncJob } from '../lib/queue'

async function scheduleDaily() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const date = yesterday.toISOString().split('T')[0]

  const accounts = await prisma.adAccount.findMany({
    where: { isActive: true, platform: 'meta' },
  })

  for (const account of accounts) {
    await enqueueSyncJob({
      adAccountId: account.id,
      dateStart: date,
      dateEnd: date,
    })
  }

  console.log(`Agendado sync de ${accounts.length} contas para ${date}`)
  process.exit(0)
}

scheduleDaily()
```

---

## 9. API Routes principais

```typescript
// src/app/api/[workspace]/dashboard/route.ts

export async function GET(
  req: Request,
  { params }: { params: { workspace: string } }
) {
  const session = await getServerSession()
  const workspace = await getWorkspaceOrFail(params.workspace, session)

  const { searchParams } = new URL(req.url)
  const dateStart = searchParams.get('dateStart') ?? last30Days().start
  const dateEnd   = searchParams.get('dateEnd')   ?? last30Days().end

  // KPIs agregados
  const kpis = await prisma.adMetric.aggregate({
    where: {
      workspaceId: workspace.id,
      entityType: 'campaign',
      date: { gte: new Date(dateStart), lte: new Date(dateEnd) },
    },
    _sum: {
      spend: true,
      impressions: true,
      clicks: true,
      leads: true,
      purchases: true,
      conversionValue: true,
    },
  })

  // Evolução diária
  const daily = await prisma.$queryRaw`
    SELECT
      date,
      SUM(spend)::float           AS spend,
      SUM(leads)::int             AS leads,
      SUM(purchases)::int         AS purchases,
      CASE WHEN SUM(leads) > 0
        THEN (SUM(spend) / SUM(leads))::float ELSE 0 END AS cpl,
      CASE WHEN SUM(spend) > 0
        THEN (SUM("conversionValue") / SUM(spend))::float ELSE 0 END AS roas
    FROM ad_metrics
    WHERE workspace_id = ${workspace.id}
      AND entity_type = 'campaign'
      AND date BETWEEN ${new Date(dateStart)} AND ${new Date(dateEnd)}
    GROUP BY date
    ORDER BY date
  `

  // Campanhas rankeadas
  const campaigns = await prisma.$queryRaw`
    SELECT
      c.name,
      c.status,
      SUM(m.spend)::float           AS spend,
      SUM(m.impressions)::int       AS impressions,
      SUM(m.clicks)::int            AS clicks,
      SUM(m.leads)::int             AS leads,
      SUM(m.purchases)::int         AS purchases,
      CASE WHEN SUM(m.leads) > 0
        THEN (SUM(m.spend) / SUM(m.leads))::float ELSE NULL END AS cpl,
      CASE WHEN SUM(m.spend) > 0
        THEN (SUM(m."conversionValue") / SUM(m.spend))::float ELSE NULL END AS roas
    FROM ad_metrics m
    JOIN campaigns c ON c."externalId" = m."externalEntityId"
      AND c."workspaceId" = ${workspace.id}
    WHERE m.workspace_id = ${workspace.id}
      AND m.entity_type = 'campaign'
      AND m.date BETWEEN ${new Date(dateStart)} AND ${new Date(dateEnd)}
    GROUP BY c.id, c.name, c.status
    ORDER BY spend DESC
  `

  return Response.json({ kpis: kpis._sum, daily, campaigns })
}
```

---

## 10. Middleware de isolamento por workspace

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })

  // Redireciona pra login se não autenticado
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Nas rotas de workspace, verifica acesso
  const workspaceSlug = request.nextUrl.pathname.split('/')[1]
  if (workspaceSlug && workspaceSlug !== 'api') {
    // Passa o userId no header para uso nas Server Components
    const response = NextResponse.next()
    response.headers.set('x-user-id', token.sub!)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
}
```

```typescript
// src/lib/workspace.ts — helper usado nas API routes e Server Components
import { prisma } from './prisma'

export async function getWorkspaceOrFail(slug: string, userId: string) {
  const workspaceUser = await prisma.workspaceUser.findFirst({
    where: {
      workspace: { slug },
      userId,
    },
    include: { workspace: true },
  })

  if (!workspaceUser) {
    throw new Error('Workspace não encontrado ou sem acesso')
  }

  return workspaceUser.workspace
}
```

---

## 11. Docker

```dockerfile
# docker/Dockerfile — app Next.js
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

```dockerfile
# docker/Dockerfile.worker — processo BullMQ separado
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma generate
RUN pnpm build

CMD ["node", "dist/worker/index.js"]
```

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  app:
    image: adsdash-app:latest
    build:
      context: ..
      dockerfile: docker/Dockerfile
    environment:
      DATABASE_URL: postgresql://user:pass@bancodedados01:5432/adsdash
      REDIS_URL: redis://redis:6379
      NEXTAUTH_URL: https://adsdash.seudominio.com.br
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
    networks:
      - traefik-public
      - internal
    deploy:
      replicas: 1
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.adsdash.rule=Host(`adsdash.seudominio.com.br`)"
        - "traefik.http.routers.adsdash.entrypoints=websecure"
        - "traefik.http.routers.adsdash.tls.certresolver=letsencrypt"
        - "traefik.http.services.adsdash.loadbalancer.server.port=3000"

  worker:
    image: adsdash-worker:latest
    build:
      context: ..
      dockerfile: docker/Dockerfile.worker
    environment:
      DATABASE_URL: postgresql://user:pass@bancodedados01:5432/adsdash
      REDIS_URL: redis://redis:6379
    networks:
      - internal
    deploy:
      replicas: 1

  scheduler:
    image: adsdash-worker:latest
    # Roda o scheduler a cada minuto via loop
    command: sh -c "while true; do node dist/worker/scheduler.js; sleep 3600; done"
    environment:
      DATABASE_URL: postgresql://user:pass@bancodedados01:5432/adsdash
      REDIS_URL: redis://redis:6379
    networks:
      - internal
    deploy:
      replicas: 1

networks:
  traefik-public:
    external: true
  internal:
    driver: overlay
```

---

## 12. Variáveis de ambiente

```env
# .env.example

# Banco
DATABASE_URL=postgresql://user:senha@bancodedados01:5432/adsdash

# Redis
REDIS_URL=redis://redis:6379

# Auth
NEXTAUTH_URL=https://adsdash.seudominio.com.br
NEXTAUTH_SECRET=gere-com-openssl-rand-base64-32

# Criptografia dos tokens das contas (AES-256)
ENCRYPTION_KEY=gere-com-openssl-rand-base64-32

# Meta (App criado em developers.facebook.com)
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=${NEXTAUTH_URL}/api/oauth/meta/callback
```

---

## 13. Ordem de desenvolvimento (sprints)

### Sprint 1 — Fundação (dias 1-3)
- [ ] Criar projeto Next.js 14 com TypeScript + Tailwind + shadcn/ui
- [ ] Configurar Prisma + rodar migrations no PostgreSQL
- [ ] Auth com NextAuth (login/logout com email+senha)
- [ ] CRUD de workspaces
- [ ] Middleware de isolamento por workspace
- [ ] WorkspaceSwitcher no layout

### Sprint 2 — Integração Meta (dias 4-6)
- [ ] meta-api.ts com fetchInsights
- [ ] Tela para vincular conta Meta (token manual ou OAuth)
- [ ] Job BullMQ de sync
- [ ] Worker rodando separado
- [ ] Scheduler configurado
- [ ] Sync manual via botão na UI + SyncStatus

### Sprint 3 — Dashboard (dias 7-10)
- [ ] API route /dashboard com KPIs + daily + campaigns
- [ ] Página de dashboard com MetricCard
- [ ] Gráfico de evolução diária (Recharts)
- [ ] Tabela de campanhas ordenável
- [ ] DateRangePicker com presets (hoje, 7d, 30d, mês atual)
- [ ] Comparativo vs período anterior

### Sprint 4 — Refinamentos (dias 11-14)
- [ ] Drill-down campanha → adsets → ads
- [ ] Relatórios + exportação CSV
- [ ] Sistema de anotações
- [ ] Convite de membros (acesso do cliente)
- [ ] Visão consolidada do owner (todos os workspaces)
- [ ] Alertas: CPA acima do limite configurado

---

## 14. Prompt para iniciar no Claude Code

```
Vou criar do zero o projeto AdsDash — dashboard SaaS multi-tenant
para gestão de Meta Ads de múltiplos clientes.

Stack:
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL
- BullMQ + Redis (filas de sync)
- NextAuth v5 (autenticação)
- pnpm como package manager
- Docker para deploy no Swarm com Traefik

Tenho o plano completo com schema Prisma, estrutura de pastas,
integração Meta Ads API, sistema de filas e Docker Compose.

Ambiente: Windows + PowerShell. Servidor Docker Swarm com
manager01 e bancodedados01 (PostgreSQL já rodando).
Traefik e Redis já configurados no Swarm.

Vamos começar pela Sprint 1:
1. Criar projeto Next.js 14 com TypeScript, Tailwind e shadcn/ui via pnpm
2. Configurar Prisma com o schema completo
3. Rodar as migrations
4. Implementar auth com NextAuth
5. CRUD de workspaces com middleware de isolamento

Pode começar?
```
