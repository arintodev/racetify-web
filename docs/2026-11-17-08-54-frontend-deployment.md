# Frontend Deployment on VPS A — web + app

> **Date:** 2026-11-17
> **Scope:** `apps/web` (public site) and `apps/app` (organizer) on VPS A
> **Related:** [`deploy/README.md`](../deploy/README.md) ·
> [API two-VPS runbook](../../racetify-api/docs/2026-11-16-16-14-two-vps-cloudflare-deployment.md)

Both Next.js apps run as standalone Node containers behind the existing API Nginx and Cloudflare
Tunnel. This is a separate Compose project (`racetify-web`) from `racetify-api`; it joins the
external network `racetify-api_edge` and publishes no host ports.

```
Cloudflare Tunnel
  ├─ racetify.com      -> nginx:80 -> web:3000   (apps/web)
  ├─ www.racetify.com  -> 301 to racetify.com
  ├─ app.racetify.com  -> nginx:80 -> app:3000   (apps/app)
  └─ api.racetify.com  -> nginx:80 -> api:8080   (existing)
```

## 1. Why this shape

- Both apps need a Node server: `apps/app/proxy.ts` middleware, `cookies()`/`headers()` in server
  components, dynamic routes, the streaming download route, and ISR. No static export.
- The browser calls the API **same-origin** through the Next rewrite `/api/v1/*`. There is no CORS
  layer in the API. `__Host-` cookies and Google OAuth require this; Nginx must never route
  `/api/v1` directly to `api:8080`.
- The API and frontends deploy independently. The API workflow owns Nginx/cloudflared; the web
  workflow only touches the `web`/`app` containers.

## 2. Files

| Path | Purpose |
| --- | --- |
| `Dockerfile` | Multi-stage build; targets `web` and `app`; standalone output |
| `.dockerignore` | Excludes `.next`, `node_modules`, `.env*`, docs, deploy files |
| `deploy/compose.web.yml` | `racetify-web` project; external `racetify-api_edge` |
| `deploy/env.web.example` / `env.app.example` | Runtime env templates |
| `deploy/scripts/deploy-web.sh` | Preflight, pull, `up --wait`, health, rollback |
| `.github/workflows/deploy-web.yml` | Build/push/deploy workflow |
| `apps/web/app/api/health/route.ts` | Public-site liveness |
| `apps/app/app/api/health/route.ts` | Organizer liveness |

## 3. Build and runtime

### 3.1 Next config

Both `apps/*/next.config.ts` add:

```ts
output: "standalone",
outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
```

`pnpm --filter <app> build` runs with cwd `apps/<app>`; `../..` is the monorepo root, so workspace
packages and the `@workspace/ui` / `@workspace/api-client` sources are traced into the standalone
output. The existing `/api/v1/:path*` rewrite is unchanged.

### 3.2 Build-time vs runtime

| Variable | When | Value |
| --- | --- | --- |
| `RACETIFY_API_ORIGIN` | **build** (baked rewrite) | `http://api:8080` |
| `NEXT_PUBLIC_SITE_URL` | build + runtime (server-side) | `https://racetify.com` / `https://app.racetify.com` |
| `RACETIFY_API_INTERNAL_URL` | runtime | `http://api:8080` |
| `RACETIFY_SESSION_COOKIE_NAME` | runtime (optional) | `__Host-racetify_session` |

The rewrite target is serialized into `.next/routes-manifest.json`; changing
`RACETIFY_API_ORIGIN` at container start has no effect. `RACETIFY_API_INTERNAL_URL` is read at
runtime by server components, route handlers, and the sitemap.

### 3.3 Dockerfile

- `node:22-bookworm-slim`, pnpm `11.25.0` via corepack, `--frozen-lockfile`.
- Separate `builder-web` / `builder-app` stages; the runtime copies
  `apps/<app>/.next/standalone`, `.next/static`, and `public`.
- Both containers listen on `PORT=3000`; the `apps/web` dev/start script's `3001` is local-only.
- `HEALTHCHECK` calls `/api/health` with Node's built-in `fetch`.
- `next/font/google` downloads fonts during the build, so the CI runner needs outbound internet.
- Do not set `NODE_ENV=production` before `pnpm install`; dev dependencies are required to build.

## 4. Compose

`deploy/compose.web.yml`:

- `name: racetify-web`
- `web` and `app` join `racetify-api_edge` (`external: true`); no `ports`.
- `read_only: true`, `cap_drop: ALL`, `no-new-privileges`, `init: true`.
- `tmpfs` for `/tmp` and `/app/apps/<app>/.next/cache` (ISR/sitemap revalidation).
- Healthcheck from the image gates `up --wait`.
- `env_file: .env.web` / `.env.app`.

Create the real env files once on VPS A:

```bash
cd /opt/racetify/racetify-web/deploy
cp env.web.example .env.web
cp env.app.example .env.app
chmod 600 .env.web .env.app
```

## 5. CI/CD

`.github/workflows/deploy-web.yml`:

- Push to `main`/`master` on `apps/**`, `packages/**`, lockfile/workspace/Dockerfile/deploy
  changes; or manual dispatch with an optional tag.
- Tag `sha-<12>`; builds `racetify-web` and `racetify-app` with
  `RACETIFY_API_ORIGIN=http://api:8080` and the per-app `NEXT_PUBLIC_SITE_URL`.
- Deploy job: verify images, prepare `/opt/racetify/racetify-web`, upload `deploy/`, log in to
  GHCR, run `scripts/deploy-web.sh`, then probe both public hosts.
- Preflight in `deploy-web.sh`: `racetify-api_edge` exists and `http://127.0.0.1:8080/healthz` is
  healthy; it refuses otherwise.
- Rollback: previous image per service on failure; manual rollback is a dispatch with the previous
  tag.

Secrets: `VPS_A_HOST`, `VPS_A_USER`, `VPS_A_SSH_KEY`, `VPS_A_FINGERPRINT`, `VPS_A_SSH_PORT=2026`,
optional `GHCR_READ_TOKEN`/`GHCR_USER`.

Variables: `WEB_PUBLIC_URL=https://racetify.com`, `APP_PUBLIC_URL=https://app.racetify.com`,
optional `IMAGE_PREFIX`, optional `DEPLOY_PATH=/opt/racetify/racetify-web`.

## 6. API and Cloudflare changes

### 6.1 Nginx (API repo)

`racetify-api/deploy/nginx.conf` adds server blocks for `racetify.com` and `app.racetify.com`
routing to `web:3000` / `app:3000`, a `www` redirect, and a default 404. All use the variable
upstream + `resolver 127.0.0.11` pattern, so Nginx passes config validation before the web
containers exist.

`nginx.conf` is a bind mount. `racetify-api/deploy/scripts/deploy-api.sh` runs `nginx -t` and
`nginx -s reload` after `up`, so the new routes take effect without recreating the container.

### 6.2 API env

```dotenv
API_PUBLIC_URL=https://api.racetify.com
OAUTH_ISSUER_URL=https://api.racetify.com
APP_ORIGIN=https://app.racetify.com
PUBLIC_WEB_ORIGIN=https://racetify.com
PUBLIC_ORIGINS=https://racetify.com,https://app.racetify.com
GOOGLE_REDIRECT_URL=https://app.racetify.com/api/v1/auth/oauth/google/callback
```

`PUBLIC_ORIGINS` is an exact Origin match for CSRF mutations. R2 CORS must allow both frontend
origins. The Google Console redirect URI must be exactly the app-origin callback.

### 6.3 Cloudflare

Tunnel public hostnames (token-managed dashboard):

- `racetify.com`, `app.racetify.com`, `api.racetify.com` → `http://nginx:80`
- optional `www.racetify.com` → `http://nginx:80` (Nginx 301s to the apex)

Cache `/_next/static/*`; bypass `/api/*`, HTML/SSR, and `Set-Cookie` responses. Disable Rocket
Loader/Bot Fight Mode on the frontend hosts. Do not use Cloudflare Access.

## 7. First deploy order

1. Update `racetify-api` `nginx.conf` and `.env.api`, then deploy the API stack. Nginx now has
   the frontend routes (502 until the containers exist); the API host is unaffected.
2. Add the Tunnel hostnames/DNS.
3. Create `.env.web` / `.env.app` on VPS A.
4. Push `racetify-web` to `main`, or run **deploy-web** with an empty tag.
5. Verify.

## 8. Verification

Local, compile-only:

```bash
cd racetify-web
RACETIFY_API_ORIGIN=http://localhost:8080 pnpm --filter web build
RACETIFY_API_ORIGIN=http://localhost:8080 pnpm --filter app build
# standalone layout:
# apps/web/.next/standalone/apps/web/server.js
# apps/app/.next/standalone/apps/app/server.js
pnpm typecheck
```

Remote:

```bash
curl -fsS https://racetify.com/api/health
curl -fsS https://app.racetify.com/api/health
curl -fsSI https://app.racetify.com/login
curl -fsSI https://www.racetify.com/            # 301 -> racetify.com
curl -fsS 'https://racetify.com/api/v1/public/events?limit=1' >/dev/null

docker compose -f /opt/racetify/racetify-web/deploy/compose.web.yml ps
ss -lntp | grep -E ':(3000|3001)\b' || echo "no host ports"
```

Functional checks:

- Email login sets `__Host-racetify_session` on `app.racetify.com`; authenticated API calls work.
- Google OAuth round-trips through `https://app.racetify.com/api/v1/auth/oauth/google/callback`.
- Public gallery loads; original download streams.
- R2 browser upload/preview works (both origins in R2 CORS).
- Rate-limit chain:

  ```bash
  docker run --rm --network racetify-api_edge curlimages/curl -s \
    -H 'Host: app.racetify.com' \
    -H 'CF-Connecting-IP: 198.51.100.8' \
    -H 'X-Forwarded-For: 203.0.113.9' \
    http://nginx/api/v1/public/events/missing
  ```

  The Redis `*rl:*` key must contain `198.51.100.8`, not the web container IP.

## 9. Rollback

Dispatch **deploy-web** with the previous `sha-<12>` tag. The build is skipped; the deploy script
rolls both services to that tag. A failed `up`/health check auto-rolls back each service to its
previous image.

## 10. Troubleshooting

| Symptom | Check |
| --- | --- |
| `502` on `racetify.com`/`app.racetify.com` | Containers healthy? `docker compose -f deploy/compose.web.yml ps`; both on `racetify-api_edge`? |
| Old routes after an API deploy | Nginx was not reloaded; run `nginx -t` + `nginx -s reload` (deploy-api.sh does this). |
| `network racetify-api_edge not found` | Deploy `racetify-api` first. |
| `EROFS` in Next logs | `.next/cache` tmpfs missing or not writable. |
| Login redirects back to `/login` | Session cookie not set on `app.racetify.com`; verify Next proxy `/api/v1` and OAuth callback origin. |
| `redirect_uri_mismatch` | Google Console URI must be the app-origin callback exactly. |
| 429 under load | Verify `x-forwarded-for` reaches the API through Nginx and the Next rewrite; check the server client forwarding. |
| Container unhealthy | `docker compose logs web`/`app`; `RACETIFY_API_INTERNAL_URL` and the `api` service. |
| GHCR unauthorized on the VPS | `GHCR_READ_TOKEN` needs `read:packages`; `GHCR_USER` must be its owner. |

## 11. Risks

- The API rewrite is baked at build time; `RACETIFY_API_ORIGIN` is a build arg.
- Do not route `/api/v1` directly to the API; cookies/OAuth are app-origin.
- Nginx config changes need an explicit reload; `up` alone does not apply bind-mounted changes.
- The web containers require the API network and a healthy API; the deploy script preflights both.
- `next/font/google` requires build-time egress.
- The first sitemap build has no events (the API is unreachable during the image build); it
  revalidates at runtime.
