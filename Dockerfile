# syntax=docker/dockerfile:1
# Build the two Next.js frontends from the pnpm/Turbo monorepo.
#   docker build --target web --build-arg RACETIFY_API_ORIGIN=http://api:8080 ...
#   docker build --target app --build-arg RACETIFY_API_ORIGIN=http://api:8080 ...

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /pnpm/store \
    && corepack enable \
    && corepack prepare pnpm@11.25.0 --activate \
    && pnpm config set store-dir /pnpm/store --global
WORKDIR /app

FROM base AS deps
# Every workspace manifest must be present for --frozen-lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/package.json
COPY apps/app/package.json apps/app/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/api-contract/package.json packages/api-contract/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS builder-web
ARG RACETIFY_API_ORIGIN=http://api:8080
ARG NEXT_PUBLIC_SITE_URL=https://racetify.com
ENV RACETIFY_API_ORIGIN=$RACETIFY_API_ORIGIN \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY . .
RUN pnpm --filter web build

FROM deps AS builder-app
ARG RACETIFY_API_ORIGIN=http://api:8080
ARG NEXT_PUBLIC_SITE_URL=https://app.racetify.com
ENV RACETIFY_API_ORIGIN=$RACETIFY_API_ORIGIN \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY . .
RUN pnpm --filter app build

FROM base AS web
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=builder-web --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder-web --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder-web --chown=node:node /app/apps/web/public ./apps/web/public
RUN mkdir -p /app/apps/web/.next/cache && chown -R node:node /app/apps/web/.next
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]

FROM base AS app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=builder-app --chown=node:node /app/apps/app/.next/standalone ./
COPY --from=builder-app --chown=node:node /app/apps/app/.next/static ./apps/app/.next/static
COPY --from=builder-app --chown=node:node /app/apps/app/public ./apps/app/public
RUN mkdir -p /app/apps/app/.next/cache && chown -R node:node /app/apps/app/.next
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/app/server.js"]
