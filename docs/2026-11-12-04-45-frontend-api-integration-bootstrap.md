# Frontend API Integration — Bootstrap (F0)

Status: scaffolded and build-green. No screen reads the API yet; the demo UI is unchanged.

## What exists now

- `packages/api-contract` — synced `openapi.yaml` from
  `racetify-api/packages/api-contract/openapi.yaml` and a codegen script.
- `packages/api-client` — generated OpenAPI types plus a runtime-agnostic client:
  - `core` request/envelope/`problem+json` handling
  - `browser` client for `/api` with CSRF cookie refresh
  - `server` client factory (no Next.js imports)
  - presigned upload helper and shared query keys
- Both apps mount `QueryClientProvider`.
- Both `next.config.ts` files rewrite `/api/v1/:path*` to the API origin.

## Environment

The apps read these server-side variables (defaults in parentheses):

| Variable | Purpose | Default |
| --- | --- | --- |
| `API_ORIGIN` | Rewrite target for `/api/v1/*` | `http://localhost:8080` |
| `API_INTERNAL_URL` | API origin for Server Components/actions | `http://localhost:8080` |
| `NEXT_PUBLIC_SITE_URL` | App origin for links and Origin checks | unset |

Do not put credentials or service secrets in `NEXT_PUBLIC_*`.

The API's `PUBLIC_ORIGINS` must include the app origins used in development
(`http://localhost:3000`, `http://localhost:3001`). Presigned browser `PUT`s also require bucket
CORS on the S3-compatible endpoint.

## Commands

```bash
pnpm contract:sync      # copy the backend OpenAPI
pnpm contract:generate  # regenerate packages/api-client/src/generated/schema.d.ts
pnpm typecheck
pnpm lint
pnpm build
```

`pnpm contract:check` syncs, regenerates, and fails if the checked-in contract or schema changed.
Run it after codegen once the files are tracked.

## Next increment (F1)

Wire the organizer session/CSRF flow and layout guards to the existing auth and `/me` endpoints.
Keep the demo UI compiling until each route is replaced.
