# docker/Dockerfile — AdsDash App (Next.js 14 standalone)
# Multi-stage build: dependencies → build → runtime

FROM node:20-alpine AS base
# Enable pnpm (Next.js recommendation)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

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
RUN pnpm build

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
RUN chmod +x /app/entrypoint.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use entrypoint script to run migrations before starting the server
ENTRYPOINT ["/app/entrypoint.sh"]
