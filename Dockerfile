# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS system
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM system AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS migrator
COPY prisma.config.ts ./
COPY prisma ./prisma

FROM dependencies AS builder
COPY . .
# Prisma reads DATABASE_URL while generating the client. The build does not
# connect to this placeholder database; Compose supplies the real URL at runtime.
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/exisel?schema=public"
ENV SESSION_SECRET="docker-build-only-secret-at-least-32-characters"
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED="1"
RUN pnpm db:generate && pnpm build

FROM system AS runner
WORKDIR /app
ENV NODE_ENV="production"
ENV HOSTNAME="0.0.0.0"
ENV PORT="3000"
ENV NEXT_TELEMETRY_DISABLED="1"

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs \
    && mkdir -p /app/uploads/community /app/uploads/avatars \
    && chown -R nextjs:nodejs /app/uploads

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
