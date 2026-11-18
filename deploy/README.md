# Frontend deployment on VPS A

The public site (`apps/web`) and organizer app (`apps/app`) run as two Next.js standalone
containers behind the existing API Nginx and Cloudflare Tunnel. This is a **separate Compose
project** (`racetify-web`) from `racetify-api`; both join the external network
`racetify-api_edge`.

```
racetify.com      -> nginx -> web:3000   (public site)
app.racetify.com  -> nginx -> app:3000   (organizer app)
api.racetify.com  -> nginx -> api:8080   (existing API)
```

The browser calls the API **same-origin** through the Next rewrite `/api/v1/*`; Nginx must never
route `/api/v1` directly to the API. `__Host-` session cookies and Google OAuth depend on this.

## Files

| File | Purpose |
| --- | --- |
| `compose.web.yml` | `racetify-web` project: `web`, `app`; external `racetify-api_edge` |
| `env.web.example` / `env.app.example` | Runtime env templates |
| `scripts/deploy-web.sh` | Preflight, pull, `up --wait`, health, rollback |
| `../Dockerfile` | Multi-target `web` / `app` standalone images |
| `../.github/workflows/deploy-web.yml` | Build/push/deploy workflow |
| `../apps/*/app/api/health/route.ts` | `/api/health` liveness endpoints |

## Prerequisites

On VPS A:

- The `racetify-api` stack is running, so `racetify-api_edge` exists and `api` is healthy.
- The API's Nginx has the `racetify.com` / `app.racetify.com` blocks. Deploy the API stack after
  updating its `deploy/nginx.conf`; `deploy-api.sh` runs `nginx -s reload` so the bind-mounted
  config takes effect.
- Cloudflare Tunnel public hostnames for `racetify.com`, `app.racetify.com` (and optionally
  `www.racetify.com`) point to `http://nginx:80`.
- The API `.env.api` has `APP_ORIGIN=https://app.racetify.com`,
  `PUBLIC_WEB_ORIGIN=https://racetify.com`, and
  `PUBLIC_ORIGINS=https://racetify.com,https://app.racetify.com`.
- R2 CORS allows both frontend origins; Google OAuth redirect URI is
  `https://app.racetify.com/api/v1/auth/oauth/google/callback`.

On VPS A, create the runtime env files once (mode 600, owned by `racetify`):

```bash
cd /opt/racetify/racetify-web/deploy
cp env.web.example .env.web
cp env.app.example .env.app
chmod 600 .env.web .env.app
```

The workflow uploads `deploy/` but never writes `.env*`.

## GitHub configuration

Secrets (repository or `production` environment):

| Secret | Value |
| --- | --- |
| `VPS_A_HOST` | VPS A host/IP |
| `VPS_A_USER` | `racetify` |
| `VPS_A_SSH_KEY` | CI private key |
| `VPS_A_FINGERPRINT` | ECDSA host key `SHA256:...` fingerprint (`ssh-keyscan -p 2026 -t ecdsa <A_IP> \| ssh-keygen -lf - \| awk '{print $2}'`) |
| `VPS_A_SSH_PORT` | `2026` |
| `GHCR_READ_TOKEN` | optional PAT with `read:packages` |
| `GHCR_USER` | optional PAT owner |

Variables:

| Variable | Value |
| --- | --- |
| `WEB_PUBLIC_URL` | `https://racetify.com` |
| `APP_PUBLIC_URL` | `https://app.racetify.com` |
| `IMAGE_PREFIX` | optional; default `ghcr.io/<lowercase owner>` |
| `DEPLOY_PATH` | optional; default `/opt/racetify/racetify-web` |

Run `pnpm lint` and `pnpm typecheck` locally before merging; the deploy workflow does not run the
frontend test suite.

## Deploy order

1. Update `racetify-api/deploy/nginx.conf` and `.env.api`, deploy the API stack.
2. Add the Cloudflare Tunnel hostnames/DNS.
3. Create `.env.web` / `.env.app` on VPS A.
4. Push `racetify-web` to `main`, or run **deploy-web** with an empty tag.

The web workflow builds `racetify-web` and `racetify-app`, joins `racetify-api_edge`, and starts
both. It refuses to run if the network or API is missing.

## Manual deploy

```bash
cd /opt/racetify/racetify-web/deploy
docker login ghcr.io
TAG=sha-<12> IMAGE_PREFIX=ghcr.io/<owner> bash scripts/deploy-web.sh
```

The script captures each service's previous image, pulls, waits for healthchecks, verifies
`/api/health` and API reachability from inside the containers, and rolls back on failure.

## Rollback

Dispatch **deploy-web** with the previous `sha-<12>` tag. The build is skipped and the same
script deploys the existing images. A failed rollout also auto-rolls back.

## Verification

```bash
curl -fsS https://racetify.com/api/health
curl -fsS https://app.racetify.com/api/health
curl -fsSI https://app.racetify.com/login
curl -fsSI https://www.racetify.com/            # 301 -> racetify.com
curl -fsS 'https://racetify.com/api/v1/public/events?limit=1'

docker compose -f compose.web.yml ps
ss -lntp | grep -E ':(3000|3001)\b' || echo "no host ports"
```

Also verify email login, the Google OAuth round-trip, a public gallery download, and an R2 browser
upload. The rate-limit key check is in the API runbook: requests through
`app.racetify.com/api/v1/*` must bucket by the Cloudflare client IP, not the web container.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `502` on a frontend host | `docker compose -f compose.web.yml ps`; are both containers on `racetify-api_edge`? |
| `502` after an API deploy | Nginx wasn't reloaded; `deploy-api.sh` should run `nginx -t` + `nginx -s reload`. |
| `network racetify-api_edge not found` | Deploy `racetify-api` first. |
| `EROFS` in Next logs | The `.next/cache` tmpfs is missing or not writable; check the compose `tmpfs` paths. |
| Login succeeds but pages redirect to login | The session cookie wasn't set on `app.racetify.com`; OAuth callback or Nginx `/api/v1` routing is wrong. |
| Google OAuth `redirect_uri_mismatch` | Console URI must be exactly the app-origin callback. |
| 413 uploads | Uploads go directly to R2 via presigned PUT; Nginx limits do not apply. |
| 429 under load | Check the API rate-limit keys; ensure `x-forwarded-for` is forwarded (Nginx + server client). |
| Container unhealthy | `docker compose -f compose.web.yml logs web` (or `app`); verify `RACETIFY_API_INTERNAL_URL` and the `api` service. |
