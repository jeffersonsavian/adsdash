#!/bin/sh
# docker/entrypoint.sh — AdsDash App Entrypoint
# Executa migrations e inicia o servidor Next.js

set -e

echo "[AdsDash] Starting application..."
echo "[AdsDash] Environment: $NODE_ENV"

# Run Prisma migrations (idempotent). Do NOT let a migration failure abort
# startup — disable errexit just for this step so the `if` below is reachable.
# Start the Next.js server
echo "[AdsDash] Starting Next.js server..."
exec node server.js
