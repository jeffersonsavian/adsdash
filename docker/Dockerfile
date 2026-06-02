# docker/Dockerfile — AdsDash App (Next.js 14 standalone)
# Multi-stage build: dependencies → build → runtime

FROM node:22-alpine AS base
# Enable pnpm (Next.js recommendation)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --config.dangerouslyAllowAllBuilds=true

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy entire project (excluding .dockerignore)
COPY . .

# Generate Prisma Client (required before build)
# This ensures @prisma/client is present and the engine is bundled
RUN pnpm prisma generate

# Build Next.js (outputs to .next/standalone)
RUN DATABASE_URL="postgresql://build:build@localhost/build" pnpm build

# Stage 3: Runtime (minimal image)
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy standalone server.js and dependencies from builder
COPY --from=builder /app/.next/standalone ./
# Copy static assets (CSS, JS, etc.)
COPY --from=builder /app/.next/static ./.next/static
# Copy public assets
COPY --from=builder /app/public ./public
# Copy prisma schema and migration files (needed by Prisma Client engine)
COPY --from=builder /app/prisma ./prisma

# Copy entrypoint script
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000

# No Docker HEALTHCHECK: a rota `/` retorna 307 para o domínio externo,
# inacessível de dentro do container. Swarm restart_policy + Traefik cuidam da saúde.

# Use entrypoint script to run migrations before starting the server
ENTRYPOINT ["/app/entrypoint.sh"]
