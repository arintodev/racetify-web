# Frontend API Contract — General Contract

> **Status:** Implemented — frontend integration complete 2026-11-12
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Scope:** Contract foundation, backend platform, identity, authentication, authorization, and the
> cross-cutting frontend integration plan
> **Applies to:** Every feature contract in the API contract set
> **Related:** [Model Schema](./2026-11-10-06-52-model-schema-complete.md) ·
> [Frontend Architecture](./2026-11-10-07-26-frontend-architecture.md) ·
> [Route Map](./2026-11-10-07-26-frontend-route-map.md) ·
> [Public Web App Plan](./2026-11-10-12-20-public-web-app-plan.md) ·
> [Public Registration UX Plan](./2026-11-10-15-11-public-registration-ux-plan.md)

This is the **general contract** for the API that replaced `packages/demo-data`. It defines the
rules every endpoint follows, the identity and permission model, the authentication and
authorization mechanisms, and the cross-cutting frontend integration plan. Both Next.js apps are
now fully wired to the API; `packages/demo-data` was deleted in F5.

The domain endpoints are specified in separate feature contracts. They reuse this document and only
document what is specific to their feature.

**Implementation notes (2026-11-12):** this document was written before the API existed. Where the
implementation diverges, the paragraphs below carry an inline note; the authoritative surface is
`packages/api-contract/openapi.yaml` and the generated `schema.d.ts`.

---

## Document map

| Document | Answers |
| --- | --- |
| **This document — General** | Contract conventions, backend platform, identity, authn/authz, integration, testing, delivery |
| [Backend API Plan](./2026-11-11-00-01-backend-api-plan.md) | How the Rust modular monolith is structured, deployed, and integrated with the Cloud Run detectors |
| [Organizations & Access](./2026-11-10-19-17-api-contract-organizations.md) | Organization profile, members, roles, audit, workspace picker data |
| [Event Setup](./2026-11-10-19-17-api-contract-events.md) | Events, races, categories, team, registration configuration |
| [Participants & Commerce](./2026-11-10-19-17-api-contract-participants-commerce.md) | Participants, registrations, imports, orders, payments, refunds |
| [Gallery & Media](./2026-11-10-19-17-api-contract-gallery-media.md) | Collections, uploads, gallery items, bib/face metadata, watermarks, signed URLs |
| [Generators & Certificates](./2026-11-10-19-17-api-contract-generators-certificates.md) | Templates, fonts, batch generation, certificates, downloads |
| [Platform Admin](./2026-11-10-19-17-api-contract-platform-admin.md) | Tenants, users, system roles, storage, webhooks, jobs, platform audit |
| [Public Content](./2026-11-10-19-17-api-contract-public.md) | Event profile, registration config, anonymous orders, public gallery, certificates, results |

A feature contract may add endpoints, DTOs, and feature-specific filtering. It may not change the
envelope, error format, pagination, auth model, or permission format defined here.

---

## 1. Why the general contract comes first

Every screen in `apps/app` and `apps/web` depends on four questions being answered before it can
fetch anything:

1. **Who is calling?** — an organizer, a platform admin, or an anonymous public visitor.
2. **Which tenant scope is the call in?** — organization, event, or platform.
3. **What may this caller do in that scope?** — the effective permission set.
4. **How do we represent "not allowed"?** — consistent `401` / `403` / `404` behavior that the UI
   can map to `RequireSession`, `ForbiddenState`, and `notFound()`.

The demo answers these with an in-memory session and a client-side role preview. The real contract
must answer them on the server, on every request, without trusting the browser. Building domain
endpoints before this contract exists would force each module to invent its own auth rules.

---

## 2. Contract foundation

These rules apply to every endpoint in every feature contract.

### 2.1 Backend platform (planned)

The API backend is planned with **Rust, PostgreSQL, Redis, and Qdrant**, plus object storage for
files. It is a **Rust modular monolith**: one API service and one worker service share the codebase
and database, and both run on a VPS with Docker. Bib detection and face detection are separate
Google Cloud Run services. See the
[Backend API Plan](./2026-11-11-00-01-backend-api-plan.md) for module boundaries, jobs, and
deployment. The frontend contract is deliberately independent of the Rust framework, but the
platform choices shape a few guarantees the contract relies on.

| Component | Planned role | Contract impact |
| --- | --- | --- |
| **Rust** | API service and background workers | Generated OpenAPI 3.1, strict DTOs, consistent `problem+json` errors, request IDs, no internal error leakage |
| **PostgreSQL** | System of record for tenants, users, events, registrations, orders, payments, media metadata, certificates, audit, and sessions | Transactions, foreign-key and uniqueness guarantees, cursor pagination, durable idempotency for money and bulk operations |
| **Redis** | Ephemeral state: rate limits, OAuth state, cache, job queue, locks, short-lived permission snapshots | Fast auth and abuse controls. Redis is never the only copy of durable data |
| **Qdrant** | Vector index for enrolled and detected faces | Async indexing and search; the API returns match metadata, never vectors; deletion is synchronized with PostgreSQL |
| **Object storage** | Binary files for gallery, watermarks, fonts, certificates, and generated documents | Presigned upload/download URLs; storage keys are never exposed to clients |

**Rust implementation notes (recommended, not contractual):**

- Axum + Tower middleware is the recommended HTTP stack; `utoipa` generates OpenAPI 3.1.
- `serde` uses `rename_all = "camelCase"` so Rust types serialize to the frontend contract directly.
- A single API error enum implements `IntoResponse` and maps to the `problem+json` envelope. Database
  and storage errors are mapped to stable codes; raw `sqlx`/storage errors never reach the client.
- `sqlx` or SeaORM with compile-time-checked queries; `uuid` v7 for sortable IDs; `time` or
  `chrono` in UTC; `argon2` for passwords; `sha2` for token hashes; `tower-http` for compression,
  timeouts, and security headers; `tracing` + OpenTelemetry for logs, metrics, and traces.
- Integration tests use test containers for PostgreSQL, Redis, and Qdrant. OpenAPI snapshots are
  checked in CI.

**Durability and consistency rules:**

1. **PostgreSQL is the only system of record.** Redis and Qdrant may be rebuilt from PostgreSQL and
   object storage.
2. **Sessions:** PostgreSQL is authoritative; Redis may cache session lookups with a short TTL.
   Revocation deletes the Redis entry immediately.
3. **Idempotency:** records for orders, payments, imports, uploads, and batch generation are stored
   durably in PostgreSQL. Redis may hold a fast-path copy but is not the source of truth.
4. **Rate limits and OAuth state:** Redis with TTLs. A Redis outage fails closed for login/abuse
   controls and returns `503 service_unavailable` rather than silently disabling them.
5. **Permission cache:** Redis, maximum 60 seconds, keyed by user and scope version. Role changes
   bump the version; session revocation is checked directly against PostgreSQL/Redis session state.
6. **Jobs:** the durable job record is in PostgreSQL (`jobs`), the queue is in Redis. The API
   returns a job ID and status; workers update both.
7. **Qdrant:** Racetify owns the vector store. Face embedding writes and deletes go through an
   outbox in PostgreSQL, then a worker applies them to Qdrant. Point IDs are deterministic UUIDs
   derived from the owning row. A failed sync is retried and visible in the job/admin surfaces.
8. **Object storage:** uploads are presigned direct-to-storage; the API records `storage_objects`
   only after the client confirms the upload. Downloads use short-lived signed URLs.

**Contract consequences:**

- Timestamps are UTC ISO-8601 strings; PostgreSQL `timestamptz` never leaks a local offset.
- IDs are UUID strings; the API does not promise a sortable order beyond what the field provides.
- Money is a `BIGINT` integer in IDR; the API never returns floats for money.
- Lists use cursor pagination backed by indexed columns, not offset scans.
- Async work is always represented as a job resource (status, attempts, error, result), never as a
  long-running HTTP request.
- Vector similarity scores are optional, low-precision numbers; the API does not expose embeddings,
  Qdrant point IDs, or collection names.

### 2.2 Applications and hosts

| Application | Production host | Local port | API access |
| --- | --- | --- | --- |
| Organizer app (`apps/app`) | `app.racetify.com` | 3000 | Same-origin `/api/v1/*`, reverse-proxied to the API |
| Public app (`apps/web`) | `racetify.com` | 3001 | Same-origin `/api/v1/*`, reverse-proxied to the API |
| API | `api.racetify.com` | 8080 | Direct for service-to-service; not called cross-origin by browsers |

Both Next.js apps expose `/api/v1/:path*` as a same-origin surface and rewrite it to the API's
`/v1/:path*` (default target `http://localhost:8080`). This keeps
session cookies first-party, removes CORS from the browser path, and lets Server Components call the
API directly. The browser never sees `api.racetify.com`.

The Next.js `proxy.ts` file is used only for **optimistic** redirects (for example, no session
cookie → `/login`). It is never the authorization authority. Every API endpoint re-verifies the
session and permission, as recommended by the Next.js authentication and data-security guides.

### 2.3 Protocol conventions

| Topic | Decision |
| --- | --- |
| Style | REST over HTTPS, JSON bodies |
| Versioning | Major version in the path: `/v1/...`. Additive changes only within `v1` |
| JSON casing | Keys `camelCase`; enum values `snake_case`; Rust and PostgreSQL internals `snake_case`; no runtime transformation |
| IDs | Opaque UUID strings. Never parse or infer type from an ID |
| Dates | Date-only values as `YYYY-MM-DD`; timestamps as ISO-8601 UTC with `Z` |
| Time zones | Stored and returned in UTC. The client formats in the event's IANA time zone |
| Money | Integer in the smallest currency unit. For IDR, integer rupiah (no decimals) |
| Currency | ISO-4217, currently `IDR` |
| Nullability | Optional fields are omitted only when absent by design; nullable values are explicit `null` |
| Enums | Lowercase `snake_case`, matching the schema document |
| Content type | `application/json`; errors are `application/problem+json` |
| Compression | Brotli or gzip |
| Correlation | Every request returns `X-Request-Id`; clients may send it for tracing |
| Time | All server timestamps are UTC; clients never trust the local clock for eligibility |

**ADR-API-001 — JSON casing (Approved 2026-11-10):** JSON keys are `camelCase`; enum values are
`snake_case`; Rust and PostgreSQL internals are `snake_case`. Translation happens once in the Rust
DTO layer. Alternative considered: `snake_case` on the wire, rejected for this stack because it
moves translation into the browser (runtime mappers or unidiomatic TypeScript) while the primary
consumers are the two Next.js apps and the existing types are already camelCase.

**Casing rationale (Rust + Next.js):**

- **JSON keys are `camelCase`.** TypeScript, React props, Zod schemas, and generated OpenAPI clients
  consume them directly. `firstName`, `bibNumber`, `createdAt` need no mapping.
- **Rust stays idiomatic.** Field names remain `snake_case`; only the API DTO layer carries
  `#[serde(rename_all = "camelCase")]`. Do not put wire casing on domain or database structs.
- **PostgreSQL stays `snake_case`.** Column names never leak into the JSON boundary; the DTO layer
  maps them.
- **Enum values are `snake_case`.** They are data values, not language identifiers: `top_left`,
  `bottom_right`, `invalid_credentials`, `email_verified`. This matches the schema, check
  constraints, and the existing frontend fixtures.
- **Query and path parameters use `camelCase`** (`eventId`, `raceId`, `sort`, `cursor`) so the whole
  request surface is consistent. HTTP headers remain kebab-case (`X-Request-Id`, `Idempotency-Key`).
- **No runtime key transformation.** Avoid `camelcase-keys`/`snakecase-keys` middleware on either
  side. It adds cost, breaks generated types, and mishandles nested objects and maps.
- **Snapshot-test the OpenAPI schema.** `utoipa` must emit the same names as `serde`; if a version
  ignores `#[serde(rename_all = "camelCase")]` for schemas, add
  `#[schema(rename_all = "camelCase")]` and verify in CI.

```rust
#[derive(Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ParticipantDto {
    pub first_name: String,
    pub last_name: String,
    pub bib_number: Option<String>,
    pub created_at: DateTime<Utc>,
}
// JSON: { "firstName": "...", "lastName": "...", "bibNumber": null, "createdAt": "..." }

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum WatermarkPosition {
    Center,
    TopLeft,
    BottomRight,
}
// JSON: "center", "top_left", "bottom_right"
```

```ts
// Generated schema, used directly by React, forms, and TanStack Query.
type ParticipantDto = {
  firstName: string
  lastName: string
  bibNumber: string | null
  createdAt: string
}
```

### 2.4 Response envelope

Single resource:

```json
{
  "data": {
    "id": "018f7f7a-6f2b-7c31-9b1e-8f1d4d46a001",
    "name": "Nusantara Run"
  },
  "meta": {
    "requestId": "req_01JQ9M4T7K9V5W8Q2S3R6X1A0B"
  }
}
```

Collection:

```json
{
  "data": [],
  "meta": {
    "requestId": "req_01JQ9M4T7K9V5W8Q2S3R6X1A0B",
    "pagination": {
      "limit": 25,
      "nextCursor": "eyJrIjoiMjAyNi0xMS0xMFQwMDowMDowMFoiLCJpIjoiMDE4ZiJ9",
      "hasMore": true,
      "total": 248
    }
  }
}
```

- Mutations return the updated resource when the client needs it, otherwise `204 No Content`.
- `total` is optional and returned only when it can be computed cheaply. Lists must not require it.
- The client never assumes an unwrapped object. This keeps room for `meta` without a breaking change.

### 2.5 Errors

Errors use RFC 9457 `application/problem+json` with stable `code` values for the frontend to branch
on. Human-readable `detail` is English in the contract; the UI localizes its own copy.

```json
{
  "type": "https://api.racetify.com/problems/forbidden",
  "title": "Forbidden",
  "status": 403,
  "code": "forbidden",
  "detail": "You do not have permission to perform this action.",
  "instance": "/v1/events/018f.../participants",
  "requestId": "req_01JQ9M4T7K9V5W8Q2S3R6X1A0B",
  "requiredPermission": "event:participants:manage",
  "errors": [
    {
      "pointer": "/participants/0/email",
      "code": "invalid_email",
      "message": "Enter a valid email address."
    }
  ]
}
```

Rules:

- `code` is stable and machine-readable. `title` and `detail` are not parsed by clients.
- Validation failures use `422 validation_failed` with `errors[]` pointers so forms can map messages
  to fields.
- Unexpected errors use `500 internal_error` and never include stack traces, SQL, or internal IDs.
- The API never returns a generic `400` when a specific `code` exists.

### 2.6 Pagination, filtering, sorting, search

- **Pagination:** cursor-based on every collection. Query: `limit` (1–100, default 25) and an opaque
  `cursor`. Response: `pagination.nextCursor`, `pagination.hasMore`, optional `pagination.total`.
- **Reason:** participant lists, gallery items, audit logs, job lists, and race results are
  append-heavy and can be large. Cursor pagination stays stable while rows change.
- **UI behavior:** tables use next/previous cursor stacks rather than numbered page jumps. Gallery
  and audit feeds use "Load more". If a module needs jump-to-page, that is a module-specific
  exception, not the default.
- **Sorting:** `sort=field` ascending, `sort=-field` descending. Only documented fields are allowed;
  unknown sort fields return `422 invalid_sort`.
- **Filtering:** explicit, documented query parameters (`status=paid`, `raceId=...`,
  `categoryId=...`, `from=...`, `to=...`). No generic query language in v1.
- **Search:** `q` for free text where documented. Server defines matching and ranking.
- **Stability:** cursors are opaque, signed or encrypted, and expire after 24 hours. Expired cursors
  return `410 cursor_expired`; the UI resets to the first page.

### 2.7 Idempotency and concurrency

- `Idempotency-Key` is accepted for POST requests that create money, files, or bulk work:
  public orders, payments, participant imports, upload sessions, batch generation, and invitations.
- **Implemented today:** public order creation, organizer order cancel/refund, payment
  initiation/settlement, document/certificate generation jobs, face enrollments, gallery upload
  create/complete, and organization/event invitations. Participant imports still do not enforce an
  idempotency key (their state machine rejects duplicate commits).
- The server stores `key + request hash + response` for 24 hours.
  - Same key and same request: replay the stored response.
  - Same key and different request: `409 idempotency_key_reuse`.
- Updates may use `ETag` / `If-Match` on resources where lost updates are plausible (event settings,
  registration config, templates, roles). A mismatch returns `412 precondition_failed`.
- The API does not rely on client-generated IDs.

### 2.8 Caching

| Surface | Cache policy |
| --- | --- |
| Authenticated API responses | `Cache-Control: private, no-store` |
| Public event, gallery, results | `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` with `ETag` |
| Public photo binaries | Long-lived immutable caching with signed, versioned URLs |
| Error responses | `no-store` |

The client caches authenticated data only in TanStack Query memory. It never writes API responses to
`localStorage`, `sessionStorage`, IndexedDB, or cookies.

### 2.9 Rate limiting

- Every endpoint has a per-IP and, where authenticated, per-user limit.
- Responses include `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`.
- Exceeding a limit returns `429 rate_limited` with `Retry-After`.
- Authentication endpoints have stricter limits (section 4.10).

### 2.10 Contract source of truth

```
packages/
├─ api-contract/
│  ├─ openapi.yaml                 # hand-reviewed source of truth
│  ├─ examples/                    # canonical request/response examples
│  └─ README.md                    # ownership, change process, versioning
└─ api-client/
   ├─ src/generated/schema.d.ts    # generated by openapi-typescript
   ├─ src/client.ts                # typed fetch wrapper, error normalization
   └─ src/index.ts
```

- **OpenAPI 3.1** is the source of truth. Backend and frontend review it together.
- TypeScript types are generated. We do not hand-maintain a second copy of the DTOs.
- CI runs: OpenAPI lint, generated-client typecheck, and a breaking-change check against `main`.
- `x-required-permissions` on each operation declares the authorization requirement. CI fails if an
  authenticated operation has no declaration.
- MSW handlers are generated from the contract so the frontend can be built before the backend is
  complete.

### 2.11 Schema additions required by this contract

**Implementation note (2026-11-12):** all additions below exist in the live schema. The list is kept
as contract history.

The model schema did not originally contain the tables this contract needed. They were added before
implementation:

| Required addition | Why |
| --- | --- |
| `sessions` (`id`, `user_id`, `token_hash`, `user_agent`, `ip_address`, `created_at`, `last_seen_at`, `expires_at`, `revoked_at`) | Server-side, revocable, per-device sessions. The schema currently has no session table. |
| `verification_tokens` (`id`, `user_id`, `type` = `email_verify` / `password_reset`, `token_hash`, `expires_at`, `used_at`) | Single-use hashed tokens. Never store raw tokens. |
| `invitations.status` adds `declined` | The current enum is `pending, accepted, expired, revoked`. Declining is a distinct state. |
| `orders.user_id` becomes nullable and adds `contact_email`, `contact_phone` | Public registration creates orders without a user account. The schema currently requires `orders.user_id`. |
| `participants.email` and `participants.phone` become nullable, or are populated from the order contact | Public registration collects one contact for the whole order, not per participant. |
| Global uniqueness on `certificates.certificate_number` | Public URLs are `/cert/[certificateNumber]`. The schema only guarantees uniqueness per event. Either add a global unique index or change the public URL to include the event slug. |
| `oauth_states` (short-lived cache/table) | State, nonce, and PKCE verifier for Google OAuth. Redis/cache is acceptable; it need not be durable. |

Additional notes:

- `participants.user_id` is already nullable, which correctly supports login-free registration.
- `gallery_items` must expose signed public URLs derived from `storage_objects`; storage object keys
  are never returned to clients.
- `users.email_verified_at` already exists and is the source of truth for `emailVerified`.

---

## 3. Identity model

### 3.1 Two populations

| Population | Table | Can sign in? | Used by |
| --- | --- | --- | --- |
| Users | `users` | Yes | Organizers, event team, platform admins |
| Participants | `participants` | No (v1) | Public registration; scoped to one event |

A participant can have a nullable `user_id` for a future participant account, but v1 deliberately
has **no participant accounts**. Public buyers and participants never authenticate.

### 3.2 Membership and role sources

```
users
├─ social_accounts                 Google identity
├─ user_roles → roles              platform/system roles
├─ org_members → roles             organization membership (one role per org)
└─ event_team → roles              event membership (one role per event)
```

- Roles are data. Their permission bundles are seeded and editable only within their scope.
- System roles (`scope = system`) are immutable by tenants.
- Organization roles (`scope = org`, `org_id` set) belong to one organization.
- Event roles (`scope = event`, `org_id` set) belong to the organization that owns the event.
- `role_permissions` maps roles to the permission catalog.
- The frontend never hardcodes permissions for people. It reads effective permissions from the API.

### 3.3 Permission strings

Format:

```
<scope>:<resource>:<action>
```

Examples: `org:members:manage`, `event:gallery:upload`, `system:jobs:retry`.

- Scope is one of `system`, `org`, `event`.
- The catalog is additive. Unknown permissions are denied.
- The client renders navigation and actions from the catalog constants, but only the API's response
  decides what the user actually has.

### 3.4 Tenant scoping

- Organization routes are `/v1/orgs/{orgId}/...`.
- Event routes are `/v1/events/{eventId}/...`. Event URLs never include the organization ID, matching
  the route map.
- The server resolves an event to its `org_id` and validates the entire parent chain before any
  query. A race must belong to the event; a participant registration must belong to the event.
- `orgId` and `eventId` from the request body are ignored for scope. Only the path and the resolved
  resource define scope.

---

## 4. Authentication

### 4.1 Decisions

| ID | Decision | Rationale |
| --- | --- | --- |
| ADR-AUTH-001 | **Opaque, server-side sessions in HttpOnly cookies.** No JWT in the browser. | Revocable per device, no token leakage through XSS, supports "sign out everywhere". |
| ADR-AUTH-002 | **Same-origin `/api` reverse proxy** from both Next.js apps. | First-party cookies, no CORS, Server Components can forward the cookie. |
| ADR-AUTH-003 | **Google OAuth 2.0 Authorization Code + PKCE**, handled by the API. | The primary sign-in path from the demo. PKCE protects the code exchange. |
| ADR-AUTH-004 | **Email + password** with Argon2id and verified email. | Fallback for users without Google and for platform admins. |
| ADR-AUTH-005 | **Generic auth responses** for registration, login, and password reset. | Prevents account enumeration. The UI shows neutral copy. |
| ADR-AUTH-006 | **Session ID rotates on login and privilege change.** Password reset revokes all sessions. | Prevents session fixation and stale access. |
| ADR-AUTH-007 | **No demo role preview in production.** | The real API returns the caller's actual permissions; a client override would be a privilege escalation. |

### 4.2 Session and cookie specification

| Property | Value |
| --- | --- |
| Cookie | `__Host-racetify_session` |
| Value | 256-bit opaque random token. The server stores only its hash |
| Attributes | `HttpOnly; Secure; SameSite=Lax; Path=/`; no `Domain` |
| Absolute lifetime | 30 days |
| Idle timeout | 7 days, sliding on authenticated requests |
| Rotation | New session token on login, password change, password reset, and every 24 hours of active use |
| Storage | `sessions` table; one row per device/session |
| Revocation | Logout, "sign out other devices", password reset, account suspension, or admin action |
| Cookie clearing | `Set-Cookie` with `Max-Age=0` on logout and on revoked sessions |

Response to a successful login `POST /v1/auth/login` (or OAuth callback) sets the cookie and
returns `200` with a `Session` object.

Sliding renewal writes a new cookie only when more than half the idle window has elapsed. This
avoids a `Set-Cookie` on every request.

### 4.3 CSRF defense

Because the session is a cookie, mutations need CSRF protection:

1. `GET /v1/auth/csrf` returns `{ "data": { "token": "..." } }` and sets
   `__Host-racetify_csrf` (`Secure; SameSite=Lax; Path=/`, readable by JavaScript).
2. Every non-GET request sends `X-CSRF-Token` with that value.
3. The API verifies the header against the session-bound token and verifies `Origin` against an
   allowlist (`https://app.racetify.com`, `https://racetify.com`, and the configured local origins).
4. Missing or mismatched token → `403 csrf_failed`.
5. `SameSite=Lax` is defense in depth, not the only control.

The CSRF token is issued after authentication. Anonymous public requests do not need it, except that
public order creation is protected by `Idempotency-Key`, rate limits, and origin checks.

### 4.4 Google OAuth flow

```
Browser                     Next.js app                    API                         Google
  │                             │                            │                            │
  │ GET /api/auth/oauth/google/start?redirect=/workspaces   │                            │
  ├────────────────────────────►│ rewrite                    │                            │
  │                             ├───────────────────────────►│                            │
  │                             │                            │ create state, nonce, PKCE  │
  │                             │                            ├───────────────────────────►│
  │◄────────────────────────────┴────────────────────────────┤ 302 to Google consent      │
  │                                                                                      │
  │ GET /api/auth/oauth/google/callback?code=...&state=...                              │
  ├─────────────────────────────────────────────────────────────────────────────────────►│
  │                             │                            │◄───────────────────────────┤
  │                             │                            │ verify state, exchange code│
  │                             │                            │ require email_verified     │
  │                             │                            │ create/link user + session │
  │◄────────────────────────────┴────────────────────────────┤ Set-Cookie + 302 to app    │
```

Rules:

- Endpoints:
  - `GET /v1/auth/oauth/google/start?redirect=/workspaces`
  - `GET /v1/auth/oauth/google/callback?code=...&state=...`
- `redirect` must be a **relative path** beginning with `/` and not `//`. Absolute URLs are rejected.
  The API falls back to `/workspaces` on the configured app origin.
- `state`, `nonce`, and the PKCE verifier are stored server-side for 10 minutes and are single-use.
  The state is also bound to an HttpOnly cookie.
- Google's `email_verified` must be `true`. An unverified Google email is rejected.
- Linking rules:
  - Existing `social_accounts` row for `(google, sub)` → sign in that user.
  - No social row, but a user with the same verified email exists → link the social account and sign
    in.
  - No user → create an active user with `email_verified_at` set and no password.
- A suspended or deleted user is rejected with `403 account_suspended` and no session.
- The callback redirects to `https://app.racetify.com{redirect}` on success, or
  `https://app.racetify.com/login?error=oauth_failed` on failure. Error details are never placed in
  the URL beyond a stable code.

**Implementation note (2026-11-12):** the flow is implemented in `identity/src/google.rs` and
`AuthService::google_oauth_start|google_oauth_callback`. The state/PKCE record is stored in Redis for
10 minutes and deleted on use; the profile is read from Google's userinfo endpoint; an unverified
email is rejected; accounts link by provider subject, then by verified email, else a password-less
verified user is created and linked. `GET /v1/auth/providers` reports whether Google is configured;
the web app only renders the Google buttons when it returns `true`.

### 4.5 Email/password flows

**Registration** (`POST /v1/auth/register`)

- Request: `{ "firstName": "Ayu", "lastName": "Pradita", "email": "ayu@example.com", "password": "..." }`.
  `lastName` is optional and may be `null` or an empty string. The legacy `name` field is still
  accepted when the name parts are absent; the API splits it into first and last names. `name` in
  responses is always the derived display value.
- Response: `202` with `{ "data": { "status": "verification_sent" } }` — regardless of whether the
  email already exists.
- No session is created at registration. The user verifies email, and verification signs them in.
- If the email already belongs to an account, the API sends an "account already exists" email
  instead of a verification email. The response is identical.
- Password policy: 12–128 characters, any characters allowed, no forced composition rules. Reject
  known-breached passwords when a breach-list service is available.

**Email verification** (`POST /v1/auth/email/verify`)

- Request: `{ "token": "..." }`.
- Success: `200` with a `Session` object and `Set-Cookie`. Verification also sets
  `users.email_verified_at`.
- Invalid, used, or expired token: `410 email_verification_invalid`.
- Idempotent if the email is already verified: `200` with a session or `204` when already signed in.

**Resend verification** (`POST /v1/auth/email/resend`)

- Request: `{ "email": "..." }` when unauthenticated, or no body when authenticated.
- Response: `202` always. Rate-limited per email and per IP.

**Login** (`POST /v1/auth/login`)

- Request: `{ "email": "...", "password": "..." }`.
- Success: `200` with a `Session`, rotated session ID, updated `last_login_at`.
- Wrong email or password: `401 invalid_credentials`, identical timing and message.
- Correct credentials but `status = suspended`: `403 account_suspended`.
- Correct credentials but unverified email: the session is still issued, but the session reports
  `emailVerified: false`. Read endpoints work; write endpoints that require a verified email return
  `403 email_not_verified` (section 5.6).

**Forgot password** (`POST /v1/auth/password/forgot`)

- Request: `{ "email": "..." }`.
- Response: `202` always. Sends a reset link if the account exists.
- Token: 256-bit random, hashed at rest, single-use, 30-minute expiry.

**Reset password** (`POST /v1/auth/password/reset`)

- Request: `{ "token": "...", "newPassword": "..." }`.
- Success: `204`. Revokes **all** sessions for the user and sends a security notification.
- Invalid, used, or expired token: `410 password_reset_invalid`.

**Change password** (`POST /v1/auth/password/change`)

- Authenticated. Request: `{ "currentPassword": "...", "newPassword": "..." }`.
- Success: `204`. Revokes every **other** session and keeps the current one.

### 4.6 Account lifecycle

| Event | Session effect | Data effect |
| --- | --- | --- |
| Email verified | Existing session stays; `emailVerified` becomes true | `email_verified_at` set |
| Password changed | Other sessions revoked | Password hash rotated |
| Password reset | All sessions revoked | Password hash rotated; notification sent |
| Role or permission changed | No forced logout | Effective access is recomputed on the next request |
| User suspended | All sessions revoked | `users.status = suspended`; login returns `403 account_suspended` |
| User deleted (soft) | All sessions revoked | `users.status = deleted`, `deleted_at` set |
| Social account unlinked | No effect | The provider row is removed; password must exist first |

### 4.7 Invitations

Invitations cover both organization membership and event team membership (`event_id` null or set).

- `GET /v1/invitations/{token}` — public summary. Returns organization name, event name when
  applicable, role name, inviter display name, `expiresAt`, and `status`. Never returns the invitee
  email or other member data. Unknown token → `404 invitation_not_found`. Expired or revoked → `200`
  with the status so the UI can explain it.
- `POST /v1/invitations/{token}/accept` — requires a session. Accepts only when the signed-in user's
  email matches the invitation email (case-insensitive). Otherwise `403 invitation_email_mismatch`.
  Creates the `org_members` or `event_team` row, marks the invitation `accepted`, and is idempotent:
  accepting an already-accepted invitation returns `200` without duplicating the membership.
- `POST /v1/invitations/{token}/decline` — marks the invitation `declined`; no session required,
  but rate-limited.
- Tokens: 256-bit random, hashed at rest, single-use, 7-day expiry. Resending an invitation revokes
  the previous token.
- Role validation: an organization invitation must reference a role for that organization or a
  system role; an event invitation must reference an event role owned by the event's organization.
- Every invitation event is written to `audit_logs`.

### 4.8 Anonymous access for the public app

Public visitors do not authenticate.

- Public content endpoints (`/v1/public/...`) require no session.
- Registration is login-free. `POST /v1/public/events/{eventSlug}/orders` creates the participant,
  registration, order, and order-item rows atomically.
- The order response returns the order number, event, and package lines, never participant PII.
- The API sets `__Host-racetify_order_access` for the receipt (`RACETIFY_ORDER_COOKIE_NAME`):
  - `HttpOnly; Secure; SameSite=Lax`
  - `Path=/`
  - Lifetime derived from the order expiry (minimum 60 seconds, 30 minutes when no expiry)
  - Value is an opaque order-access token, not the order number and not PII.
- `GET /v1/public/orders/{orderNumber}` requires that cookie (or an explicit `?token=` value
  returned by order creation). An order number alone must not expose the receipt.
- **Public face search is wired but anonymous.** `apps/web` uses the public (`POST`/`GET
  /v1/public/events/{slug}/gallery/face-searches`) endpoints from a consent-gated selfie dialog
  (2026-11-15); it requires an explicit consent flag, never persists the uploaded selfie, and never
  logs image data. Organizer face search remains endpoint-only. Public login and owner binding are
  still open decisions.
- Certificate search is anonymous and capped at three candidates. Every request is rate-limited.
  Certificate pages are `noindex`, and unknown or revoked numbers return a safe state with no
  personal data.

### 4.9 Authentication error codes

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 401 | `unauthenticated` | No session or invalid session |
| 401 | `session_expired` | Session exceeded its absolute or idle lifetime |
| 401 | `invalid_credentials` | Email/password did not match |
| 403 | `forbidden` | Authenticated but lacks the required permission |
| 403 | `account_suspended` | Account is suspended or deleted |
| 403 | `email_not_verified` | The operation requires a verified email |
| 403 | `csrf_failed` | CSRF header or origin check failed |
| 403 | `invitation_email_mismatch` | Signed-in email does not match the invitation |
| 404 | `invitation_not_found` | Unknown invitation token |
| 409 | `email_already_registered` | Internal signal only; never returned to an unauthenticated caller |
| 410 | `email_verification_invalid` | Verification token is used, expired, or unknown |
| 410 | `password_reset_invalid` | Reset token is used, expired, or unknown |
| 423 | `organization_not_active` | Organization is pending activation |
| 423 | `organization_suspended` | Organization is suspended |
| 423 | `organization_archived` | Organization is archived |
| 429 | `rate_limited` | Too many attempts; see `Retry-After` |
| 422 | `validation_failed` | Field-level validation errors |

### 4.10 Rate limits for authentication

| Endpoint | Limit |
| --- | --- |
| `POST /auth/login` | 5 attempts per account per 15 minutes; 20 per IP per 15 minutes |
| `POST /auth/register` | 3 per IP per hour; 5 per email per day |
| `POST /auth/password/forgot` | 3 per email per hour; 10 per IP per hour |
| `POST /auth/password/reset` | 5 per IP per hour |
| `POST /auth/email/resend` | 3 per email per 10 minutes |
| `GET /auth/oauth/google/start` | 10 per IP per minute |
| `POST /invitations/{token}/accept` | 10 per IP per minute |
| `GET /invitations/{token}` | 30 per IP per minute |

A successful login clears the per-account failure counter. Failed attempts are logged with the
request ID, IP, and email hash — never the password or raw email in application logs.

### 4.11 Security requirements

- Passwords: Argon2id with a per-user salt and parameters reviewed at implementation time.
- Tokens (session, verify, reset, invitation, order access): 256-bit random, stored hashed, never
  logged, single-use where applicable.
- OAuth: Authorization Code + PKCE, state, nonce, exact redirect allowlist, and `email_verified`
  required.
- Cookies: `HttpOnly`, `Secure`, `SameSite=Lax`; no session token in JavaScript, URLs, or storage.
- Session fixation: rotate on login and privilege change.
- Password reset and suspension revoke sessions.
- CSRF: session-bound token plus origin checking on every mutation.
- Open redirects: only relative paths are accepted for post-login and OAuth redirects.
- Audit: login success/failure, logout, password change/reset, session revocation, invitation
  acceptance/decline, role changes, and permission changes are recorded in `audit_logs`.
- Logging: no passwords, tokens, raw emails, selfies, identity numbers, or participant contact
  details.
- Platform-admin accounts: require MFA before production. The contract reserves
  `POST /v1/auth/mfa/...` for a later contract; v1 does not implement it.

---

## 5. Authorization

### 5.1 Permission catalog

This is the canonical API catalog; it mirrors the organizer app's permission strings so the UI does
not need translation. The catalog lives in the contract, and the frontend re-exports generated
constants.

**Organization**

```
org:overview:view
org:settings:view        org:settings:update
org:members:view         org:members:manage
org:roles:manage
org:events:view          org:events:create        org:events:update
org:audit:view
```

**Event**

```
event:overview:view
event:settings:update
event:races:manage
event:team:manage
event:registration:manage
event:participants:view  event:participants:manage
event:orders:view        event:orders:manage
event:payments:view      event:payments:manage
event:gallery:view       event:gallery:upload      event:gallery:manage
event:watermarks:manage
event:generators:manage
event:certificates:view  event:certificates:generate  event:certificates:revoke
event:audit:view
```

**Platform**

```
system:overview:view
system:orgs:view         system:orgs:manage
system:users:view        system:users:manage
system:roles:view        system:roles:manage
system:permissions:view
system:face-enrollments:view
system:webhooks:view
system:jobs:view         system:jobs:retry
system:audit:view
```

Rules:

- `view` is read-only. `manage` implies create, update, and delete within the resource.
- Imports and exports of participant data require `event:participants:manage`.
- Refunds require `event:orders:manage` for order refunds and `event:payments:manage` for payment
  refunds.
- Certificate generation and revocation are separate permissions.
- Platform `system:orgs:view` exposes organization metadata, not participant PII or private event
  content.

### 5.2 Role resolution

A caller's effective permissions for a scope are the **union** of permissions from every applicable
role:

| Request scope | Roles considered |
| --- | --- |
| Organization `/v1/orgs/{orgId}` | System roles + the user's `org_members` role in that organization |
| Event `/v1/events/{eventId}` | System roles + the organization membership role + the user's `event_team` role for that event |
| Platform `/v1/admin/...` | System roles only |

Seeded bundles (roles are data; these are defaults):

| Role | Scope | Effective bundle |
| --- | --- | --- |
| `system:superadmin` | system | All `system:*` permissions, plus tenant access for support operations |
| `org:owner` | org | All `org:*` and all `event:*` permissions for events in the organization |
| `org:admin` | org | `org:overview:view`, `org:members:*`, `org:roles:manage`, `org:events:*`, `org:audit:view`, and all `event:*` permissions |
| `event:admin` | event | All `event:*` permissions for the assigned event |
| `event:photographer` | event | `event:overview:view`, `event:gallery:view`, `event:gallery:upload` |
| `event:volunteer` | event | `event:overview:view`, `event:participants:view`, `event:gallery:view` |

**Decision — implicit event access:** Organization owners and admins receive event permissions for
every event in their organization. Event team members receive only their event permissions. Both
are unions, never replacements. This preserves the demo's role behavior while keeping `event_team`
independent, as the schema requires.

### 5.3 Enforcement rules

1. **Deny by default.** Every operation declares its required permission in OpenAPI
   (`x-required-permissions`). An operation without a declaration is either explicitly `public` or
   a contract error.
2. **Authenticate, then resolve, then authorize.**
   - Verify the session.
   - Resolve the path resource and its tenant chain.
   - Load the caller's memberships and roles for that scope.
   - Check the permission.
   - Execute the query, always filtered by the resolved scope.
3. **Never trust client scope.** A body or query `orgId` cannot widen access. Scope comes from the
   path and the resolved parent resource.
4. **No cross-tenant existence leaks.**
   - Unknown resource → `404 not_found`.
   - Resource exists but the caller has no membership in its tenant → `404 not_found`.
   - Caller has a membership and a visible resource but lacks the action → `403 forbidden` with
     `requiredPermission`.
5. **Child resources validate the chain.** A `raceId` must belong to the event in the path; a
   `participantId` must belong to that event; a `collectionId` must belong to that event.
6. **Writes re-authorize.** A page-level guard does not protect a mutation. Every Route Handler,
   Server Action, and API operation re-verifies inside the handler.
7. **Field-level rules are explicit.** PII-bearing fields are returned only to permissions that
   imply them (`event:participants:view`), never to platform admin metadata views.
8. **No impersonation.** The API does not accept a role or user override header. "View as" is a
   demo-only mechanism and is removed during integration.

### 5.4 Authorization data returned to the frontend

**Session**

`GET /v1/auth/session` returns:

```ts
type SessionDTO = {
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    phone: string | null
    avatarUrl: string | null
    status: "active" | "suspended" | "deleted"
  }
  memberships: Array<{
    id: string
    scope: "org" | "event"
    orgId: string
    eventId: string | null
    role: { id: string; name: string; slug: string; scope: "system" | "org" | "event" }
    status: "invited" | "active" | "suspended"
  }>
  session: {
    id: string
    createdAt: string
    lastSeenAt: string
    expiresAt: string
    current: true
  }
}
```

**Access for a scope**

Permissions are fetched per workspace, not embedded in the session, so role changes take effect
without a new login and the session payload stays small.

`GET /v1/me/access?orgId={orgId}` or `GET /v1/me/access?eventId={eventId}`:

```ts
type AccessDTO = {
  scope:
    | { type: "org"; id: string; orgId: string }
    | { type: "event"; id: string; orgId: string; eventId: string }
  roles: Array<{ id: string; name: string; slug: string; scope: string }>
  permissions: string[]
  emailVerified: boolean
}
```

- Exactly one of `orgId` or `eventId` is required. Both → `422 validation_failed`.
- No membership in the scope → `404 scope_not_found`.
- The UI caches this per scope with a short `staleTime` (60 seconds) and refetches on workspace
  navigation and after role changes.
- The server never trusts this response for enforcement; it recomputes permissions for every
  request.

### 5.5 Frontend guard mapping

| Route group | Server guard | UI guard | Permission source |
| --- | --- | --- | --- |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/invite/[token]` | Public | Redirect signed-in users away from auth screens | Session |
| `/workspaces` | Session | Workspace picker | Session memberships |
| `/settings/**`, `/notifications` | Session | Account shell | Session |
| `/orgs/[orgId]/**` | Session + org access | Nav filtered; direct URL → `ForbiddenState` | `GET /me/access?orgId=` |
| `/events/[eventId]/**` | Session + event access | Nav filtered; direct URL → `ForbiddenState` | `GET /me/access?eventId=` |
| `/admin/**` | Session | `GET /v1/admin/overview` probe; 403 → `ForbiddenState` | Admin probe (system permissions are not exposed) |
| `/e/[eventSlug]/**`, `/cert/[certificateNumber]` | Public | Public shell | None |
| `/api/**` | API session | — | API |

Replacements for demo mechanisms:

| Demo | Production |
| --- | --- |
| `DemoSessionProvider` in memory | Server-resolved session + client `SessionProvider` hydrated from a DTO |
| `setPreviewRole()` | Removed. No role preview in production |
| Client `RequirePermission` only | Server guard + API enforcement; client guard only for UI |
| Permissions from `lib/role-permissions.ts` | `GET /me/access` and generated permission constants |
| Static workspace lists | `GET /me/workspaces` |
| Demo notifications | `GET /me/notifications` |

### 5.6 Verified-email policy

- Reads are allowed while the email is unverified.
- These mutations require `emailVerified = true` and return `403 email_not_verified` otherwise:
  - creating an organization or event,
  - inviting members,
  - changing organization settings,
  - uploading gallery items or generating documents,
  - managing webhooks, roles, or storage.
- Public registration and public content do not depend on a user session and are unaffected.

### 5.7 Permission-change propagation

- Permissions are computed per request from current roles and memberships. A role change applies to
  the next API call; no re-login is required.
- A short-lived server cache (≤ 60 seconds) is allowed for role resolution. Revocation of a user or
  session is immediate and does not use that cache.
- The client invalidates `["access", scope]` after any mutation that changes roles, members, or
  event team assignments, and refetches on focus.
- If a request returns `403` for a permission the UI believed it had, the client invalidates access
  and shows `ForbiddenState` rather than retrying.

---

## 6. Authentication API reference

### 6.1 Endpoint summary

| Method | Path | Auth | Permission | Success |
| --- | --- | --- | --- | --- |
| `GET` | `/v1/auth/session` | Session | — | `200 SessionDTO` |
| `POST` | `/v1/auth/session/refresh` | Session | — | `200 SessionDTO` |
| `POST` | `/v1/auth/register` | Public | — | `202` |
| `POST` | `/v1/auth/login` | Public | — | `200 SessionDTO` |
| `POST` | `/v1/auth/logout` | Session | — | `204` |
| `GET` | `/v1/auth/csrf` | Session | — | `200 { token }` |
| `GET` | `/v1/auth/oauth/google/start` | Public | — | `302` |
| `GET` | `/v1/auth/oauth/google/callback` | Public | — | `302` + session cookie |
| `POST` | `/v1/auth/email/verify` | Public | — | `200 SessionDTO` |
| `POST` | `/v1/auth/email/resend` | Public/Session | — | `202` |
| `POST` | `/v1/auth/password/forgot` | Public | — | `202` |
| `POST` | `/v1/auth/password/reset` | Public | — | `204` |
| `POST` | `/v1/auth/password/change` | Session | — | `204` |
| `GET` | `/v1/auth/sessions` | Session | — | `200 SessionListDTO` |
| `DELETE` | `/v1/auth/sessions/{sessionId}` | Session | — | `204` |
| `DELETE` | `/v1/auth/sessions?keepCurrent=true` | Session | — | `204` |
| `GET` | `/v1/invitations/{token}` | Public | — | `200 InvitationSummaryDTO` |
| `POST` | `/v1/invitations/{token}/accept` | Session | — | `200 MembershipDTO` |
| `POST` | `/v1/invitations/{token}/decline` | Public | — | `204` |
| `GET` | `/v1/me` | Session | — | `200 UserDTO` |
| `PATCH` | `/v1/me` | Session | — | `200 UserDTO` |
| `GET` | `/v1/me/workspaces` | Session | — | `200 WorkspacesDTO` |
| `GET` | `/v1/me/access` | Session | — | `200 AccessDTO` |
| `GET` | `/v1/me/system-access` | Session | — | `200 SystemAccessDTO` |
| `GET` | `/v1/me/notifications` | Session | — | `200 NotificationListDTO` |
| `PATCH` | `/v1/me/notifications/{notificationId}` | Session | — | `200 NotificationDTO` |
| `POST` | `/v1/me/notifications/read-all` | Session | — | `204` |

### 6.2 Core DTOs

```ts
type UserDTO = {
  id: string
  firstName: string
  lastName: string | null
  /** Derived display name: `firstName` and `lastName` joined by a space. */
  name: string
  email: string
  emailVerified: boolean
  phone: string | null
  avatarUrl: string | null
  status: "active" | "suspended" | "deleted"
  lastLoginAt: string | null
  createdAt: string
}

type MembershipDTO = {
  id: string
  scope: "org" | "event"
  orgId: string
  eventId: string | null
  role: { id: string; name: string; slug: string; scope: "system" | "org" | "event" }
  status: "invited" | "active" | "suspended"
}

type SessionDTO = {
  user: UserDTO
  memberships: MembershipDTO[]
  session: {
    id: string
    createdAt: string
    lastSeenAt: string
    expiresAt: string
    current: true
  }
}

type SessionListDTO = {
  items: Array<{
    id: string
    current: boolean
    userAgent: string
    ipAddress: string
    createdAt: string
    lastSeenAt: string
    expiresAt: string
  }>
}

type InvitationSummaryDTO = {
  organization: {
    id: string
    name: string
    slug: string
    status: "pending" | "active" | "suspended" | "archived"
  }
  event: { id: string; name: string; slug: string } | null
  role: { id: string; name: string; slug: string; scope: "org" | "event" }
  invitedBy: { name: string }
  status: "pending" | "accepted" | "expired" | "revoked" | "declined"
  expiresAt: string
}

type WorkspacesDTO = {
  organizations: Array<{
    id: string
    name: string
    slug: string
    logoUrl: string | null
    status: "pending" | "active" | "suspended" | "archived"
    role: { id: string; name: string; slug: string }
    eventCount: number
  }>
  events: Array<{
    id: string
    name: string
    slug: string
    orgId: string
    startDate: string
    endDate: string
    status: "draft" | "published" | "ongoing" | "completed" | "cancelled"
    // Org owners/admins see events through their organization role; event team
    // members see them through an event role. `role` is null for org-based access.
    accessSource: "org" | "event"
    role: { id: string; name: string; slug: string } | null
  }>
}

type NotificationDTO = {
  id: string
  type: string
  title: string
  message: string
  data: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

type NotificationListDTO = {
  items: NotificationDTO[]
  unreadCount: number
}
```

### 6.3 Canonical examples

**Session**

```http
GET /v1/auth/session
Cookie: __Host-racetify_session=...
```

```json
{
  "data": {
    "user": {
      "id": "018f7f7a-6f2b-7c31-9b1e-8f1d4d46a001",
      "firstName": "Ayu",
      "lastName": "Pradita",
      "name": "Ayu Pradita",
      "email": "ayu@example.com",
      "emailVerified": true,
      "phone": "+62 812 0000 0000",
      "avatarUrl": null,
      "status": "active",
      "lastLoginAt": "2026-11-10T10:15:00Z",
      "createdAt": "2026-01-04T08:00:00Z"
    },
    "memberships": [
      {
        "id": "018f...org-member",
        "scope": "org",
        "orgId": "018f...org-nusantara",
        "eventId": null,
        "role": { "id": "018f...role-owner", "name": "Owner", "slug": "org:owner", "scope": "org" },
        "status": "active"
      }
    ],
    "session": {
      "id": "018f...session",
      "createdAt": "2026-11-10T10:15:00Z",
      "lastSeenAt": "2026-11-10T10:15:00Z",
      "expiresAt": "2026-12-10T10:15:00Z",
      "current": true
    }
  },
  "meta": { "requestId": "req_01JQ9M4T7K9V5W8Q2S3R6X1A0B" }
}
```

**Access for an event**

```http
GET /v1/me/access?eventId=018f...event-borobudur
```

```json
{
  "data": {
    "scope": {
      "type": "event",
      "id": "018f...event-borobudur",
      "orgId": "018f...org-nusantara",
      "eventId": "018f...event-borobudur"
    },
    "roles": [
      { "id": "018f...role-photographer", "name": "Photographer", "slug": "event:photographer", "scope": "event" }
    ],
    "permissions": [
      "event:overview:view",
      "event:gallery:view",
      "event:gallery:upload"
    ],
    "emailVerified": true
  },
  "meta": { "requestId": "req_01JQ9M4T7K9V5W8Q2S3R6X1A0B" }
}
```

**Login failure**

```http
POST /v1/auth/login
Content-Type: application/json

{ "email": "ayu@example.com", "password": "wrong" }
```

```json
{
  "type": "https://api.racetify.com/problems/invalid-credentials",
  "title": "Invalid credentials",
  "status": 401,
  "code": "invalid_credentials",
  "detail": "The email or password is incorrect.",
  "instance": "/v1/auth/login",
  "requestId": "req_01JQ9M4T7K9V5W8Q2S3R6X1A0B"
}
```

---

## 7. Frontend integration plan

### 7.1 Packages and boundaries

```
packages/
├─ api-contract/                 # synced openapi.yaml + generate/sync scripts
└─ api-client/                   # generated schema + framework-agnostic client
   └─ src/{core,browser,server,uploads,query-keys}.ts

apps/app/
├─ lib/api/
│  ├─ browser.ts                 # browser singleton (credentials + CSRF)
│  └─ server.ts                  # forwards cookies; React cache() session
├─ lib/auth/
│  ├─ session.ts                 # server session resolution
│  ├─ session-provider.tsx       # SessionProvider + AccessProvider + Can
│  └─ require-permission.tsx     # client UI guard
└─ components/providers.tsx      # QueryClientProvider, SessionProvider

apps/web/
├─ lib/api/
│  ├─ browser.ts                 # anonymous interactive widgets
│  └─ server.ts                  # Server Components + receipt cookies
└─ lib/query/                    # public query provider
```

- `@workspace/api-client` is the only place that knows the wire format.
- `@workspace/demo-data` no longer has importers; both apps depend only on `@workspace/api-client`
  and generated contract types.
- No screen imports `fetch` directly; the only raw `fetch` is the presigned `PUT` in
  `api-client/src/uploads.ts` (it must not carry API credentials).

### 7.2 Request pipeline

`packages/api-client/src/browser.ts` (used by both apps):

1. Base URL `/api` (same-origin).
2. `credentials: "include"`.
3. Read the CSRF cookie and send `X-CSRF-Token` on non-GET requests.
4. Send `X-Request-Id` when retrying or when the caller supplies one.
5. Normalize `application/problem+json` into a typed `ApiError` with `status`, `code`, `detail`,
   `requestId`, `requiredPermission`, and `errors`.
6. On `401 unauthenticated` or `session_expired`:
   - clear the query cache,
   - redirect to `/login?next={safe relative path}`,
   - never retry automatically.
7. On `403 forbidden`:
   - invalidate the access query for the current scope,
   - render `ForbiddenState` for the route or disable the action.
8. On `409 idempotency_key_reuse` or `429 rate_limited`, surface a specific message.
9. On `5xx`, show `ErrorState` with the request ID for support.

The client never retries non-idempotent POSTs unless the same `Idempotency-Key` is reused.

### 7.3 Next.js integration

- `proxy.ts` (Next.js 16 replaces middleware with proxy):
  - runs only for protected app route groups,
  - reads the session cookie for an **optimistic** redirect,
  - redirects visitors without a session cookie to `/login?next=...`,
  - does not redirect authenticated users away from auth screens; the auth layout performs the
    authoritative server check,
  - never calls the API and never decides permissions.
- Server Components and Route Handlers call the API directly with a server-only client that forwards
  the incoming cookie. They do not call the app's own `/api` Route Handlers.
- Client Components use TanStack Query against `/api`.
- Layouts resolve the session once per request with React `cache()` and pass a minimal, serializable
  DTO to client providers.
- Auth checks in layouts are not treated as route protection; each data fetch and mutation
  re-authorizes at the API and, where applicable, in the server-side data access layer.
- No API token, session secret, or service credential is exposed to the client bundle.

### 7.4 TanStack Query conventions

| Query key | Data | `staleTime` | Invalidated by |
| --- | --- | --- | --- |
| `["session"]` | `SessionDTO` | 5 min | Login, logout, profile change, role change |
| `["access", "org", orgId]` | `AccessDTO` | 60 s | Member/role mutations, 403 |
| `["access", "event", eventId]` | `AccessDTO` | 60 s | Team/role mutations, 403 |
| `["workspaces"]` | `WorkspacesDTO` | 5 min | Org/event creation, membership change |
| `["me"]` | `UserDTO` | 5 min | Profile update |
| `["notifications"]` | `NotificationListDTO` | 60 s | Mark read, focus |

Rules:

- Authenticated data is never persisted to browser storage.
- Mutations invalidate the narrowest relevant keys and the access query when roles may change.
- Optimistic updates are allowed for read/unread toggles only. Money, participant, and permission
  mutations await the server.
- Public queries use their own keys (`["public", "event", slug, ...]`) and may be prefetched and
  cached according to the public plan.

### 7.5 Session wiring changes in `apps/app`

| Current demo file | Target |
| --- | --- |
| `lib/auth/demo-session.tsx` | `lib/auth/session.ts` + `SessionProvider` hydrated from the server DTO |
| `lib/auth/require-session.tsx` | Server guard + `RequireSession` client boundary |
| `lib/auth/require-permission.tsx` | Client guard backed by `GET /me/access` |
| `lib/auth/permissions.ts` | Generated permission constants from the contract |
| `lib/role-permissions.ts` | Deleted; roles and permissions come from the API |
| `lib/navigation.ts` role filtering | Same UI logic, fed by `AccessDTO.permissions` |
| `lib/demo-data` selectors | Query hooks per domain |

The "View as" role switcher and the visible demo badge were removed; both apps now use the real
session and workspace picker.

### 7.6 Public app wiring

- No session provider, no login route dependencies.
- Public endpoints use `public-client.ts` and may be fetched in Server Components with caching.
- Registration uses `POST /public/events/{slug}/orders` with an `Idempotency-Key` generated once per
  checkout attempt. The key lives in component state, not in storage.
- The success receipt reads the `__Host-racetify_order_access` cookie through the server; the URL
  keeps only the order number. The client no longer appends race/category `entry` data; the server
  returns the order lines.
- Face search uses the consented public endpoint (anonymous UI as of 2026-11-15). It must never
  simulate matches, must show only public item projections, and must keep the selfie out of
  storage, logs, and analytics.
- Certificate search calls `GET /public/events/{slug}/certificates/search?q=` and renders at most
  three candidates. It must not paginate or request more.

---

## 8. Test and acceptance criteria

### 8.1 Contract and CI

- OpenAPI lint passes; every operation has a tag, schema, success response, and error responses.
- Every authenticated operation declares `x-required-permissions`.
- Breaking-change check passes against `main`.
- Generated client typechecks with the apps.
- MSW handlers match the contract examples.

### 8.2 Authentication matrix

| Case | Expected |
| --- | --- |
| No cookie on a protected endpoint | `401 unauthenticated` |
| Expired session | `401 session_expired`; cookie cleared |
| Suspended user with a valid session | `401` and all sessions revoked |
| Login with wrong password | `401 invalid_credentials`; same timing as unknown email |
| Login with unverified email | `200`, `emailVerified: false`; writes blocked |
| Password reset | `204`; all sessions revoked; token cannot be reused |
| Email verification token reuse | `410 email_verification_invalid` |
| Invitation token reuse | Second accept is idempotent; no duplicate membership |
| Invitation email mismatch | `403 invitation_email_mismatch` |
| OAuth state mismatch or replay | Rejected; no session |
| OAuth redirect to an absolute URL | Rejected; no open redirect |
| CSRF header missing or wrong | `403 csrf_failed` |
| Cross-origin POST with a valid cookie | Rejected by origin check |
| Rate limit exceeded | `429` with `Retry-After` |

### 8.3 Authorization matrix

| Case | Expected |
| --- | --- |
| Org A user requests Org B event | `404 not_found` (no existence leak) |
| Event team member requests an unassigned event | `404 not_found` |
| Viewer requests a manage action | `403 forbidden` with `requiredPermission` |
| Photographer uploads to the gallery | `200`/`201` |
| Photographer requests participants | `403 forbidden` |
| Volunteer reads participants | `200`, read-only |
| Org owner sees all events | `200` via implicit org-role event permissions |
| System admin requests tenant participant PII | `403`; system metadata permissions do not grant tenant PII |
| Client sends a different `orgId` in the body | Ignored; path scope wins |
| Role removed while the user is signed in | Next request reflects the new access; UI refetches on `403` |

### 8.4 Frontend acceptance

1. Navigation items and action buttons match `AccessDTO.permissions`; no permission string is
   written inline in a component.
2. A direct URL without permission renders `ForbiddenState`, not a partial page.
3. A missing or inaccessible entity renders `notFound()`.
4. Signing out clears the query cache and returns to `/login`.
5. Refreshing keeps the user signed in through the cookie; no session data is read from
   `localStorage`.
6. "View as" and any client-supplied role override no longer exist.
7. There are no tokens, participant PII, or certificate numbers in analytics events.
8. Both apps typecheck, lint, and build against the generated client.

---

## 9. Delivery plan

| Phase | Work | Estimate |
| --- | --- | --- |
| **A0 Contract scaffolding** | OpenAPI skeleton, envelope, problem+json, generated client, MSW, CI checks | 2 days |
| **A1 Session and email/password** | Register, login, logout, verification, reset, cookies, CSRF, session table, server/client wiring | 5 days |
| **A2 Authorization** | Permission catalog, role resolution, `/me/access`, workspace picker, guards, navigation, 401/403/404 handling | 4 days |
| **A3 OAuth, invitations, account security** | Google flow, invitation accept/decline, sessions list, change password, notifications | 3 days |
| **A4 Public access boundaries** | Anonymous order creation, order-access cookie, public certificate/gallery access rules, rate limits | 3 days |
| **A5 Hardening and acceptance** | Security matrix, enumeration and rate-limit tests, audit events, observability, acceptance pass | 3 days |

**Total:** ~20 frontend + contract person-days, with backend implementation in parallel. Domain
module contracts start after A2 so screens can migrate with authorization already stable.

---

## 10. Open decisions

| # | Decision | Recommendation | Needed by |
| --- | --- | --- | --- |
| 1 | Rust framework and OpenAPI generation | **Axum + `utoipa`** recommended; the client depends only on the generated contract, not the framework | A0 |
| 2 | Implicit event access for org owners/admins | **Yes** — matches the demo and organizer expectations | A2 |
| 3 | Public order lookup | **Order number + HttpOnly order-access cookie**; no enumeration by number alone | A4 |
| 4 | Registration response when the email exists | **Generic `202`** to prevent enumeration; the email explains the next step | A1 |
| 5 | MFA for platform admins | **Required before production**; contract reserves the endpoints, v1 may ship without | Production |
| 6 | Session lifetimes | 30-day absolute / 7-day idle as proposed; revisit after organizer feedback | A1 |
| 7 | Certificate number URL | Add a **global unique index** on `certificate_number`, or change `/cert/[number]` to include the event slug | A4 |
| 8 | Participant PII on platform admin views | **Not granted** by `system:orgs:view`; add a separate audited support permission if needed | A2 |
| 9 | Declined invitations | Add `declined` to the invitation status enum | A3 |
| 10 | Email delivery provider | Needed for verification, reset, and invitations; choose before A1 | A1 |

---

## 11. Feature contracts

| Feature | Document | Endpoints | Main permissions |
| --- | --- | --- | --- |
| Organizations & access | [Organizations & Access](./2026-11-10-19-17-api-contract-organizations.md) | `/orgs/{orgId}`, members, roles, audit | `org:*` |
| Event setup | [Event Setup](./2026-11-10-19-17-api-contract-events.md) | `/events/{eventId}`, settings, races, categories, team, registration config | `event:*` |
| Participants & commerce | [Participants & Commerce](./2026-11-10-19-17-api-contract-participants-commerce.md) | participants, registrations, imports, orders, payments, refunds | `event:participants:*`, `event:orders:*`, `event:payments:*` |
| Gallery & media | [Gallery & Media](./2026-11-10-19-17-api-contract-gallery-media.md) | collections, uploads, items, bibs, faces, watermarks, signed URLs | `event:gallery:*`, `event:watermarks:manage` |
| Generators & certificates | [Generators & Certificates](./2026-11-10-19-17-api-contract-generators-certificates.md) | templates, fonts, batch generation, certificates, downloads | `event:generators:manage`, `event:certificates:*` |
| Platform admin | [Platform Admin](./2026-11-10-19-17-api-contract-platform-admin.md) | organizations, users, system roles, permissions, storage, webhooks, jobs, audit | `system:*` |
| Public content | [Public Content](./2026-11-10-19-17-api-contract-public.md) | event profile, registration config, anonymous orders, gallery, certificate search, results | None (anonymous) |

Each feature contract reuses sections 2, 3, 4, and 5 of this document unchanged. A feature may add
permissions only through the catalog, and may add response fields only additively.

Identity and account endpoints — sessions, registration, login, email verification, password reset,
Google OAuth, invitations, workspaces, access, profile, and notifications — are cross-cutting and
remain in section 6 of this document. The organizations feature owns organization membership and
role management, not the invitation acceptance flow itself.
