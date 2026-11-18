# Production Readiness

Status: implemented in code; live delivery/refunds still need the worker and credentials. No Docker,
worker start, or migrations were run by this work.

## Current runtime state (from the audit)

- The running API is **stale**: it predates the hardening/payments code, so newer routes return 404
  until it is rebuilt and restarted.
- Postgres and Redis are running with all migrations applied; the worker is **not running**, and an
  `email.send` outbox event is stuck.
- R2 bucket CORS allows `http://localhost:3001` but not `http://localhost:3000`, so organizer
  presigned uploads fail.
- Google and Midtrans credentials are absent; the database has no organizations/verified users
  (seed not run).
- API and both web apps are running on 8080/3000/3001.

## 1. Rebuild and start the services

```bash
# API (stop the old process first)
cargo run -p api --bin api

# Worker (separate terminal) — required for email, gallery, documents, webhooks, refunds
cargo run -p worker
```

Confirm the new routes exist: `GET /v1/public/events`, `GET /v1/me/system-access`,
`POST /v1/public/payments/notifications`.

## 2. Seed local data

```bash
cargo run -p api --bin seed -- --yes
```

Creates a verified superadmin (`admin@racetify.local`), owner (`owner@racetify.local`), the
`demo-running-club` organization, and `demo-city-run-2027` with a race/category. Default password
`RacetifyDev!123` (override with `RACETIFY_SEED_PASSWORD`). Development only.

## 3. R2 bucket CORS

On **both** buckets (`racetify-dev`, `racetify-dev-public`), allow the app origins:

- `http://localhost:3000` (organizer uploads)
- `http://localhost:3001` (public reads)
- production equivalents

Methods: `GET, PUT, HEAD`; allowed headers: `*`; expose `ETag`. Without this, gallery/branding
presigned PUTs fail in the browser. Re-run a presign → PUT → GET → DELETE smoke afterward.

## 4. Email

Development default is the logging adapter. To test real delivery with Mailpit:

```bash
EMAIL_TRANSPORT=smtp
SMTP_URL=smtp://localhost:1025
EMAIL_FROM=no-reply@racetify.local
EMAIL_FROM_NAME=Racetify
```

Production **must** use `EMAIL_TRANSPORT=smtp` with a real relay (`smtps://…`); config fails to
start otherwise. Templates: verify email, account exists, password reset/changed, organization
invitation, event invitation. Links use `APP_ORIGIN` (`/verify-email?token=`,
`/reset-password?token=`, `/invite/{token}`).

`RACETIFY_DEV_EMAIL_TOKENS=true` logs email variables (including tokens) from the logging adapter;
it is development-only and must never be enabled where logs are shared or shipped.

## 5. Google OAuth

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URL` to the app-origin proxy
callback: `http://localhost:3000/api/v1/auth/oauth/google/callback` (production:
`https://app.racetify.com/api/v1/auth/oauth/google/callback`). Register the exact URL in Google
Cloud. `RACETIFY_APP_ORIGIN` controls the post-login redirect.

## 6. Midtrans

```bash
PAYMENT_PROVIDER=midtrans
MIDTRANS_SERVER_KEY=<sandbox server key>
MIDTRANS_IS_PRODUCTION=false
PUBLIC_WEB_ORIGIN=http://localhost:3001
```

Register the notification URL in the Midtrans dashboard:
`https://<api-host>/v1/public/payments/notifications` (for local testing, expose the API with a
tunnel). Enable payment, expiry, and refund notifications (the webhook auto-acknowledges error
events but refund notifications are only needed if you use them).

Behavior:
- Public checkout creates a Snap transaction and redirects.
- Notifications verify the SHA-512 signature and update the order.
- Organizer manual settlement is rejected when a real provider is configured
  (`409 settlement_requires_provider`).
- Refunds are queued: the API writes a `pending` refund and `commerce.process_refund`; the worker
  calls the provider, then marks the refund/order succeeded. Failure marks the refund `failed`.
- The worker reconciles pending payments and re-queues stale refunds every 10 minutes
  (Midtrans `GET /v2/{order}/status`).

## 7. Smoke sequence

1. Sign in with the seeded owner (or verify a registered account through Mailpit/logs).
2. Open the organization and event; check the event overview orders/progress/gallery.
3. Import participants (CSV) and commit; retry with the same `Idempotency-Key` — expect a replay,
   not a duplicate.
4. Upload a gallery image; confirm the preview processes (worker running, bucket CORS fixed).
5. Public registration: create an order, get redirected to Snap, pay with a sandbox method.
6. Confirm the notification marks the order paid and the receipt shows paid.
7. Refund from the admin order/payment screen; confirm “Refund requested”, then refunded after the
   worker runs.
8. Check verification/reset/invitation emails (Mailpit or provider) and that links work.
9. Check the outbox drains (`email.send`, `commerce.process_refund`) and no stuck rows remain.

## Verification performed here

- Backend fmt/clippy/build (selected crates because the running API locks `api.exe`), tests,
  module dependency check, OpenAPI regenerated.
- Frontend contract sync/generate, typecheck, lints, builds.
- Email renderer unit tests for all templates.
- Live SMTP, Midtrans refunds/notifications, and outbox execution were **not** run.
