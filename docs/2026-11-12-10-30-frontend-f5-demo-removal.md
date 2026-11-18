# Frontend F5 — Demo Removal and Contract Doc Corrections

Status: complete and build-green. Both Next.js apps now depend only on the live API and the generated
contract; the demo data package is gone.

## Removed

- `packages/demo-data` — deleted from the workspace and `pnpm-lock.yaml` (zero references remain).
- Earlier in F3/F4: `lib/auth/demo-session.tsx`, `lib/role-permissions.ts`,
  `lib/auth/permission-catalog.ts`, `components/demo-only-alert.tsx`, `components/app-shell/demo-badge.tsx`,
  the demo role switcher, the simulated face-search panel, the download placeholder, the `/demo`
  link index, and the participant column-mapping wizard.
- `@workspace/demo-data` was removed from both app `package.json` files and `transpilePackages`.

## Grep gates

Verified after deletion:

- `@workspace/demo-data` — no matches in `apps/` or `packages/`.
- `useDemoSession`, `setPreviewRole`, `DemoBadge` — no matches.
- Direct `fetch(` — none outside `packages/api-client/src/core.ts` (the typed client) and
  `packages/api-client/src/uploads.ts` (the presigned `PUT`, which must not send API credentials).

## Documentation corrections

Updated `docs/2026-11-10-19-17-*` so the contract matches the shipped API and wiring:

- **General contract** — status now "Implemented"; API local port corrected to 8080; the same-origin
  surface is `/api/v1/:path*` → `/v1/:path*`; idempotency coverage narrowed to what is actually
  enforced (public orders, order cancel/refund, document/certificate jobs, face enrollments);
  order cookie corrected to `__Host-racetify_order_access` with `Path=/` and expiry-derived lifetime;
  face search marked deferred; `/admin/**` gating documented as an overview probe plus `403`
  handling; admin system permissions documented as not exposed; package/client layout updated to
  the real files; `proxy.ts` documented as an optimistic cookie-presence redirect that does not
  redirect signed-in users away from auth screens; receipt URL documented as order number only.
- **Public content** — status "Implemented, face search deferred"; face-search endpoints marked not
  implemented; order cookie/path corrected; gallery responses documented as signed `previewUrl`
  only; success URL no longer carries race/category entries; gallery filters documented as
  server-executed.
- **Gallery & media** — public gallery is preview-only, public face search deferred, watermark
  presets and upload flow noted, admin storage screens noted as removed.
- **Platform admin** — storage provider/object screens marked removed; system-permission exposure
  and the admin probe documented.
- **Participants & commerce** — fixed-template import flow noted; import idempotency not enforced
  while order cancellation/refund is; payments were later moved to a provider abstraction.
- **Generators & certificates** — status updated; jobs poll through
  `GET /v1/events/{eventId}/generated-documents/{documentJobId}`.

## Verification

- `pnpm typecheck` — 4 workspace tasks pass
- `pnpm --filter app lint` / `pnpm --filter web lint` — pass
- `pnpm --filter app build` / `pnpm --filter web build` — pass
- `pnpm-lock.yaml` — no `demo-data` entries
- No backend changes; no Docker or migrations run.

## Remaining deferred backend gaps

- ~~Organization onboarding~~ — resolved after F5 by admin-created, admin-activated organizations:
  `POST /v1/admin/orgs` creates a `pending` org (see `2026-11-12-11-30-admin-activated-organizations.md`).
- ~~Google OAuth~~ — implemented after F5 (`/v1/auth/oauth/google/start|callback`, PKCE + state store, account linking); see `2026-11-12-12-30-google-oauth.md`.
- Public face search and Qdrant indexing (UI hidden).
- ~~System permission exposure~~ — `GET /v1/me/system-access` now drives admin nav/actions.
- ~~Dev seed / verification-token delivery~~ — `cargo run -p api --bin seed -- --yes` and
  `RACETIFY_DEV_EMAIL_TOKENS=true` (development only).
- Idempotency: payments, gallery uploads, and invitations now accept keys; participant imports still
  do not.
- ~~Public event list~~ — `GET /v1/public/events` now feeds the sitemap. Public download URLs for
  gallery originals and certificate files remain missing.
- ~~Payments stub~~ — a provider abstraction with Midtrans Snap is implemented; live credentials
  and provider-refund reconciliation remain operational work (see `2026-11-12-16-00-payments-midtrans.md`).

Runtime smoke still requires the API at `RACETIFY_API_INTERNAL_URL`/`RACETIFY_API_ORIGIN`
(default `http://localhost:8080`), an origin allowlist that includes both app origins, and S3 bucket
CORS for organizer uploads.
