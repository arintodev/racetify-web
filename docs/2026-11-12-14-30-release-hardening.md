# Release Hardening

Status: implemented; backend and both apps build green. No Docker or migrations were run.

## What changed

### Dashboards
- Event overview (`GET /v1/events/{eventId}/overview`) now returns:
  - per-race registration progress (`registered`, `confirmed`, percentage of capacity),
  - the latest 10 orders,
  - up to 8 published gallery previews, signed by the API route (the analytics crate stays
    storage-free).
- Organization overview reports registrations per upcoming event instead of `0`.

### System access and admin gating
- New `GET /v1/me/system-access` returns the caller's platform roles, effective permissions, and
  email-verified flag.
- The admin layout fetches it and wraps the console in `AccessProvider`, so the existing
  `WorkspaceShell`/`RequirePermission`/`useCan` filtering now applies to admin navigation and
  actions. The `/v1/admin/overview` probe remains the section gate.

### Public discoverability
- New `GET /v1/public/events` lists published/ongoing/completed events of active organizations with
  cursor pagination and public cache headers.
- `apps/web/app/sitemap.ts` consumes it (cookie-less server client, 20-page cap, static fallback,
  hourly revalidation).

### Idempotency
- `Idempotency-Key` is now honored by:
  - payment initiate and settle (replay 200; no duplicate payments/order transitions),
  - gallery upload create and complete (replay reloads the session and re-signs presigned URLs),
  - organization and event invitation creation (replay reloads the invitation).
- Same key + different request → `409 idempotency_key_reuse`; keys are limited to 255 characters.
- Participant imports still rely on their existing state machine (`409 import_already_committed`)
  and do **not** accept a key yet.

### Development tooling
- `cargo run -p api --bin seed -- --yes` creates a verified superadmin, a verified owner, an active
  organization with owner membership, and a published event/race/category. It refuses to run outside
  `RACETIFY_ENV=development`; override credentials with `RACETIFY_SEED_PASSWORD`.
- `RACETIFY_DEV_EMAIL_TOKENS=true` (development only; other environments fail at startup) makes the
  logging email adapter include email variables, including verification/reset/invitation tokens.
  Never enable it where logs are shipped or shared.

### Frontend completions
- Webhook delivery detail sheet using the existing admin delivery endpoint.
- Admin audit-log detail sheet using `GET /v1/admin/audit-logs/{logId}`.
- `loading.tsx` skeletons for the organizer, admin, and public event segments.
- Removed unused placeholder components, the stale face-search comment, and the profile page's
  unused timezone constant/description.

## Verification

- Backend: `cargo fmt --all --check`, clippy `-D warnings`, `cargo build --workspace --locked`
  (built in `target/verify` because the running API locks the default target), `cargo test
  --workspace --locked` (7 unit tests pass), `scripts/check-module-dependencies.sh`, OpenAPI
  regenerated.
- Frontend: contract sync/generate, `pnpm typecheck`, both lints, both builds.
- No Docker or migrations run.

## Still outstanding

- Live Midtrans configuration and sandbox verification (the adapter, outbox refunds, and worker
  reconciliation are implemented).
- Public face search/Qdrant, self-service enrollment/admin review, results ingestion, webhook
  configuration mutation, font uploads, public downloads, watermark application, EXIF capture time,
  email change, notification preferences, MFA, legal/support copy, analytics consent, OpenAPI
  `x-required-permissions`, unverified-email write gate, RLS.
- Ops: start the worker (an outbox event is stuck), configure R2 bucket CORS for both app origins,
  Google OAuth credentials, an email provider/Mailpit, and run an S3 presign → PUT → GET → DELETE
  smoke. The database currently has one unverified superadmin and no organizations; run the seed
  binary to exercise the apps.
