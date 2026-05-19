# Database Migrations

## Overview

This file documents all schema changes. Actual SQL migrations are created and applied via `pnpm prisma migrate dev --name <name>` when a PostgreSQL database is available.

---

## Initial Schema (Sprint 1)

Created via `pnpm prisma migrate dev --name init` (pending when PostgreSQL is available).

All models from `prisma/schema.prisma`:
- User
- Workspace
- WorkspaceUser
- AdAccount
- Campaign
- AdSet
- Ad
- AdMetric
- SyncLog
- Annotation

---

## Sprint 2 — Integração Meta

No schema changes in Sprint 2. All required models were included in the initial schema.

---

## Sprint 3 — Dashboard

No schema changes in Sprint 3. Dashboard uses existing AdMetric model.

---

## Sprint 4 — Refinamentos

### Added field to Workspace model:

```prisma
model Workspace {
  id                  String   @id @default(uuid())
  name                String
  slug                String   @unique
  logoUrl             String?
  timezone            String   @default("America/Sao_Paulo")
  currency            String   @default("BRL")
  cpaAlertThreshold   Decimal? @db.Decimal(10, 2)  // NEW FIELD
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  ...
}
```

**Change:** Added `cpaAlertThreshold` (optional) to track per-workspace CPA alert limit (e.g., 50.00 for R$50).

**Migration command (when PostgreSQL is available):**
```bash
pnpm prisma migrate dev --name add_cpa_alert_threshold
```

This will:
1. Generate SQL ALTER TABLE to add the new column with NULL default
2. Apply the migration automatically
3. Regenerate Prisma client

No breaking changes — defaults to NULL for existing workspaces (alerts disabled).

---

## Notes

- All migrations created via Prisma will be stored in `prisma/migrations/` directory
- Each migration includes a timestamp and descriptive name
- SQL is deterministic and safe to apply across environments
- Always run `pnpm prisma migrate dev` during development, `pnpm prisma migrate deploy` in production
