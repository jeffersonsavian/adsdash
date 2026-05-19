#!/bin/sh
# docker/entrypoint.sh — AdsDash App Entrypoint
# Executa migrations e inicia o servidor Next.js

set -e

echo "[AdsDash] Starting application..."
echo "[AdsDash] Environment: $NODE_ENV"

# Run Prisma migrations (idempotent). Do NOT let a migration failure abort
# startup — disable errexit just for this step so the `if` below is reachable.
echo "[AdsDash] Running database migrations..."
set +e
npx prisma migrate deploy
MIGRATE_EXIT=$?
set -e

if [ "$MIGRATE_EXIT" -eq 0 ]; then
    echo "[AdsDash] Migrations completed successfully"
else
    echo "[AdsDash] Migration step failed (exit $MIGRATE_EXIT) — continuing (may be first deploy / no migrations yet)"
fi

# Start the Next.js server
echo "[AdsDash] Starting Next.js server..."
exec node server.js
