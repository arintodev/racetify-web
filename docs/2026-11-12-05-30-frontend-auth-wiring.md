# Frontend Auth Wiring (F1)

Status: implemented and build-green. The organizer app now uses the real cookie session and CSRF
flow. Event/participant screens still read demo data until F2.

## What changed

- **Session**: root layout resolves `GET /v1/auth/session` server-side; a client `SessionProvider`
  exposes the session and sign-out. `proxy.ts` performs an optimistic cookie-presence redirect for
  protected route groups only; the API remains the authorization authority.
- **Auth screens**:
  - login: `POST /v1/auth/login`
  - register: `POST /v1/auth/register` (neutral 202 state; no email delivery in this phase)
  - forgot/reset: `POST /v1/auth/password/{forgot,reset}`
  - verify: `POST /v1/auth/email/verify`
  - invitations: `GET /v1/invitations/{token}`, `accept`, `decline`
- **CSRF**: the browser client reads `__Host-racetify_csrf`, fetches `GET /v1/auth/csrf` when
  needed, and retries once on `csrf_failed`. Auth entry endpoints and invitation decline are
  exempt.
- **Workspaces**: `/workspaces` uses `GET /v1/me/workspaces`; no organization-creation UI (the
  backend onboarding endpoint is still deferred). An empty state points users to invitations.
- **Access**: org/event layouts fetch `GET /v1/me/access?orgId=|eventId=` and filter navigation
  with the returned permissions. Admin access is probed with `GET /v1/admin/overview` and hidden on
  403 until the backend exposes system permissions.
- **Branding**: organizer org/event layouts now resolve the real organization/event names from
  `GET /v1/orgs/{orgId}` and `GET /v1/events/{eventId}`.
- Google sign-in is implemented; the buttons render only when `GET /v1/auth/providers` reports it is configured. See `2026-11-12-12-30-google-oauth.md`.

## Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `API_ORIGIN` | `/api/v1` rewrite target | `http://localhost:8080` |
| `API_INTERNAL_URL` | Server Component API origin | `http://localhost:8080` |
| `SESSION_COOKIE_NAME` | Proxy cookie check | `__Host-racetify_session` |
| `NEXT_PUBLIC_SITE_URL` | App origin | unset |

The API's `PUBLIC_ORIGINS` must include the app origins.

## Transitional gaps

- Organizer pages other than auth/workspaces still use `@workspace/demo-data`. Opening a real event
  or organization shows the real shell but the child page content may be empty until F2.
- No self-service organization onboarding: organizations are created and activated by a platform
  administrator (`POST /v1/admin/orgs`), and users join through membership or invitation.
- Dev email delivery does not expose verification/reset tokens; use an existing verified account or
  inspect the outbox payload.
- Admin pages remain demo reads until F3; the admin shell is gated by the overview probe.

## Verification

- `pnpm typecheck` — pass
- `pnpm --filter app lint` / `web lint` — pass
- `pnpm --filter app build` / `web build` — pass
- `proxy.ts` is recognized by the Next 16 build as middleware.
