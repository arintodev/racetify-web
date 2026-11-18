# Racetify web

pnpm/Turbo monorepo for the two Next.js frontends:

| App | URL | Purpose |
| --- | --- | --- |
| `apps/web` | `https://racetify.com` | public marketing site, event registration, galleries, certificates |
| `apps/app` | `https://app.racetify.com` | organizer workspace, authentication, event/gallery management |

Shared packages live in `packages/` (`@workspace/ui`, `@workspace/api-client`,
`@workspace/api-contract`, lint/TS configs).

## Development

```bash
pnpm install --frozen-lockfile
pnpm dev                 # both apps via Turbo
pnpm --filter web dev    # public site on :3001
pnpm --filter app dev    # organizer app on :3000
pnpm typecheck
pnpm lint
pnpm build
```

Both apps proxy browser API calls same-origin: `/api/v1/*` is rewritten to
`RACETIFY_API_ORIGIN` (default `http://localhost:8080`). Server components use
`RACETIFY_API_INTERNAL_URL`. The rewrite is baked at build time.

## Deployment

Frontends run as two standalone Next.js containers on VPS A behind the API Nginx/Cloudflare
Tunnel. See:

- [`deploy/README.md`](./deploy/README.md) — setup, workflow, env, rollback
- [`docs/2026-11-17-08-54-frontend-deployment.md`](./docs/2026-11-17-08-54-frontend-deployment.md)
  — architecture and full runbook
- [`../racetify-api/deploy/README.md`](../racetify-api/deploy/README.md) — the API/worker stack
