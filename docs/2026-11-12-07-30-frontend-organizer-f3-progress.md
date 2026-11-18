# Frontend F3 Progress — Remaining Organizer Domains

Status: complete and build-green. All organizer and admin screens now use the live API; the
organizer app no longer depends on `@workspace/demo-data`. The public app (`apps/web`) is still on
demo data and is the remaining phase (F4).

## What changed

### Orders
- `GET /v1/events/{eventId}/orders` with server-side search/status filters and cursor pagination.
- Order detail from the list row (buyer, participants, items, payment summary).
- Cancel pending orders via `POST /v1/events/{eventId}/orders/{orderId}/cancel`.
- Refund paid orders via `POST .../orders/{orderId}/refund` with a required reason.

### Payments
- `GET /v1/events/{eventId}/payments` with server filters and cursor pagination.
- Payment detail with provider reference, method, order, amount, and participants.
- Refund successful payments via `POST .../payments/{paymentId}/refund` with a reason.
- The payment provider remains the backend stub.

### Gallery
- `GET /v1/events/{eventId}/gallery/collections` and item listing with collection, bib-presence,
  face-presence, search, and cursor pagination.
- Gallery grid uses signed `previewUrl` images directly (no Next image optimizer); the lightbox
  fetches `GET /gallery/items/{itemId}` on demand for the original URL.
- Photo deletion via `DELETE /gallery/items/{itemId}` for gallery managers.
- Collection create/update/delete with `moveItemsTo`, including public/private and cover previews.
- Upload flow: `POST /gallery/uploads` → three concurrent presigned `PUT`s with the exact returned
  headers and real progress → `POST /gallery/uploads/{uploadId}/complete` → poll
  `GET /gallery/uploads/{uploadId}` until processing completes.
- Watermark presets: list, create (raw image upload), update (opacity/position/active), delete.

### Documents
- Certificate templates from `GET /v1/events/{eventId}/generator-templates`; generation via
  `POST .../certificates/generate` returning a document job, polled by
  `GET /v1/events/{eventId}/generated-documents/{documentJobId}`.
- Certificate list, revoke, and download (signed URL).
- Bib generator: template/race selection, `POST .../bib-generator` document job, poll, history,
  download.

### Team, registration, organization
- Event team: list members, invite by email, change role, remove.
- Event registration config: `GET|PUT /v1/events/{eventId}/registration-config`.
- Organization settings and logo presign → `PUT` → attach.
- Organization overview, members, roles, and audit logs (`GET /v1/orgs/{orgId}/audit-logs`).
- Event audit logs show a pointer to the organization log because the API has no event-scoped
  endpoint.

### Platform admin
- Overviews (list + detail), organizations, users (list + detail with suspend/activate), roles,
  permissions, jobs (with retry), audit logs, webhooks (list, detail, deliveries with replay), and
  face enrollments.
- `admin/layout.tsx` probes `GET /v1/admin/overview`; `403` renders `ForbiddenState`. System
  permissions are not exposed by the API, so admin navigation is gated by the probe only.

### Account
- Notifications: list, mark one read, mark all read.
- Profile: name/phone updates, avatar presign → PUT → attach, avatar removal via empty URL.
- Security: password change, active session list, sign out other sessions, current session badge.
- Google sign-in was implemented after this phase (see `2026-11-12-12-30-google-oauth.md`); the account security page still has no link/unlink card.

### Cleanup
- Removed the `@workspace/demo-data` dependency from `apps/app`, along with `lib/role-permissions.ts`
  and `lib/auth/permission-catalog.ts`.
- `lib/status.ts` now declares its own status string unions instead of importing demo types.
- Replaced demo-specific copy in the not-found page, profile page, and `next.config.ts`.

## Remaining work

- Public app integration (F4) is complete; see `2026-11-12-09-00-frontend-public-f4.md`.
- F5 cleanup is complete: `packages/demo-data` was deleted.
- Organization onboarding is now implemented as admin-provisioned pending organizations (see
  `2026-11-12-11-30-admin-activated-organizations.md`).
- Deferred backend gaps at the time: Google OAuth (since implemented), public face search, system
  permission exposure (since added), dev seed/verification-token logging (since added), OpenAPI
  hardening.
- Public face search stays hidden/disabled until the backend endpoint exists.

## Verification

- `pnpm --filter app typecheck` / `web typecheck` — pass
- `pnpm --filter app lint` / `web lint` — pass
- `pnpm --filter app build` / `web build` — pass
- `grep @workspace/demo-data apps/app` — no matches
- No backend changes; no Docker or migrations run.
- Runtime uploads require bucket CORS for the app origins.
