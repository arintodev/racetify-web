# Backend API Plan — Rust Modular Monolith

> **Status:** Proposed for review
> **Owner:** Backend Tech Lead
> **Date:** 2026-11-11
> **Updated:** 2026-11-13 — Qdrant ownership moved into Racetify; face search implemented
> (see [Face embeddings + Qdrant search](./2026-11-13-15-06-face-embeddings-qdrant-search.md))
> **Architecture:** Rust modular monolith, PostgreSQL, Redis, Qdrant, object storage
> **Deployment:** `api` and `worker` on a VPS with Docker; PostgreSQL and Redis as Docker services
> **External services:** Bib detection and face detection as separate Google Cloud Run services
> **Contract:** [Frontend API Contract — General](./2026-11-10-19-17-frontend-api-contract-general.md)
> **Related:** [Database Schema Updates](./2026-11-11-00-49-database-schema-updates.md) ·
> [Model Schema](./2026-11-10-06-52-model-schema-complete.md) ·
> [Organizations & Access](./2026-11-10-19-17-api-contract-organizations.md) ·
> [Event Setup](./2026-11-10-19-17-api-contract-events.md) ·
> [Participants & Commerce](./2026-11-10-19-17-api-contract-participants-commerce.md) ·
> [Gallery & Media](./2026-11-10-19-17-api-contract-media-gallery.md) ·
> [Generators & Certificates](./2026-11-10-19-17-api-contract-generators-certificates.md) ·
> [Platform Admin](./2026-11-10-19-17-api-contract-platform-admin.md) ·
> [Public Content](./2026-11-10-19-17-api-contract-public.md)

This plan describes how to build the API behind the frontend contract as a **Rust modular
monolith**. It is not a microservice plan: one API container and one worker container share the same
codebase, database, and module boundaries, and both run on a VPS under Docker. Only the two ML
inference services — bib detection and face detection — are separate Google Cloud Run services.

The frontend contract remains the source of truth. This document adds backend structure,
integration design, data ownership, job orchestration, security, deployment, and delivery.

---

## 1. Architecture summary

```
                        ┌──────────────────────────────┐
                        │  apps/app / apps/web (Next)  │
                        └──────────────┬───────────────┘
                                       │ HTTPS /api → /v1
                        ┌──────────────▼───────────────┐
                        │ VPS: Caddy / Traefik (TLS)   │
                        └──────────────┬───────────────┘
                                       │ Docker network
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
┌───────▼────────┐          ┌──────────▼─────────┐          ┌─────────▼────────┐
│ Docker: api    │          │ Docker: worker     │          │ Docker: migrate  │
│ Axum modular   │          │ gallery, imports,  │          │ one-shot         │
│ monolith       │          │ documents,         │          └──────────────────┘
│ organizer +    │          │ webhooks,          │
│ admin + public │          │ notifications      │
└───┬────────┬───┘          └──────┬──────┬──────┘
    │        │                     │      │
┌───▼─────┐ ┌▼────────┐     ┌──────▼───┐ ┌▼─────────────────────┐
│ Docker  │ │ Docker  │     │ Object   │ │ Cloud Run:           │
│ Postgres│ │ Redis   │     │ storage  │ │ bib-detector         │
│ volume  │ │ volume  │     │ R2/S3    │ │ face-detector        │
└─────────┘ └─────────┘     └──────────┘ └──────────┬───────────┘
                                                    │
                                         ┌──────────▼───────────┐
                                         │ Qdrant               │
                                         │ owned by Racetify    │
                                         └──────────────────────┘
```

Both `api` and `worker` connect to PostgreSQL and Redis; the diagram highlights the worker's external
paths (object storage and detectors).

Key decisions:

| ID | Decision |
| --- | --- |
| BE-001 | One Rust workspace, two binaries: `api` and `worker`. |
| BE-002 | Modular monolith with compile-time module crates and explicit facade traits. |
| BE-003 | One PostgreSQL database, one schema per module, no cross-module table access. |
| BE-004 | Redis for cache, rate limits, OAuth state, permission snapshots, and job streams. |
| BE-005 | Postgres `jobs` + `outbox_events` are durable; Redis is the fast queue. |
| BE-006 | Bib detection and face detection are private Cloud Run services, called with OIDC. |
| BE-007 | Racetify owns Qdrant. The face service returns embeddings; the monolith writes, deletes, and searches points. PostgreSQL stores point IDs only, never vectors. |
| BE-008 | Gallery derivatives and watermarks are rendered by the Rust worker, not by the detectors. |
| BE-009 | Organizer, admin, and public routes share the API binary but use separate middleware stacks. |
| BE-010 | The API contract is generated from `utoipa` and checked into `packages/api-contract`. |
| BE-011 | API and worker run as Docker services on a VPS behind Caddy/Traefik; PostgreSQL and Redis run as Docker services on the same VPS (managed services optional). |
| BE-012 | Only the bib and face detectors run on Google Cloud Run; the VPS calls them with OIDC. |

---

## 2. Why a modular monolith

The product has strongly connected domains: an event owns races, registrations, orders, gallery
items, certificates, and audit records. The checkout path writes participants, registrations, orders,
and order items in one transaction. Microservices would add distributed transactions, network
failures, and duplicated auth for little benefit at this stage.

A modular monolith keeps:

- **one transaction** for participant/registration/order creation,
- **one Docker Compose stack** for API and worker,
- **one auth and permission model**,
- **one OpenAPI contract**,
- **simple local development** with Docker Compose,
- **clear seams** if a module later needs extraction (for example, gallery processing under load).

The constraint is discipline. Module boundaries are enforced by Cargo crates and dependency rules,
not by good intentions.

---

## 3. Workspace and crate layout

```
backend/
├─ Cargo.toml                         # workspace
├─ crates/
│  ├─ api/                            # Axum binary: organizer, admin, public routes
│  ├─ worker/                         # job consumer binary + internal triggers
│  ├─ shared/
│  │  ├─ kernel/                      # IDs, money, time, pagination, errors, Tx, events
│  │  ├─ auth/                        # session, CSRF, permission context
│  │  ├─ db/                          # pool, migrations runner, unit of work
│  │  ├─ observability/               # tracing, metrics, request IDs
│  │  └─ test-support/                # testcontainers, fixtures, detector mocks
│  ├─ modules/
│  │  ├─ identity/                    # users, sessions, verification, social accounts
│  │  ├─ access/                      # roles, permissions, effective access
│  │  ├─ organizations/               # orgs, members, invitations, org audit
│  │  ├─ events/                      # events, races, categories, team, registration config
│  │  ├─ participants/                # participants, registrations, imports, exports
│  │  ├─ commerce/                    # orders, items, payments, refunds
│  │  ├─ gallery/                       # collections, uploads, items, bibs, faces, watermarks
│  │  ├─ documents/                   # templates, fonts, generated documents, certificates
│  │  ├─ results/                     # race results (public read in v1)
│  │  ├─ notifications/               # in-app notifications, email dispatch
│  │  ├─ audit/                       # audit log writer and queries
│  │  ├─ jobs/                        # job records, outbox, retries, dead letter
│  │  ├─ storage/                     # storage providers, objects, presigning
│  │  ├─ webhooks/                    # webhook configs, deliveries
│  │  ├─ analytics/                   # read-only stats/read models for org/event/admin
│  │  └─ public/                      # public projections and read models
│  └─ integrations/
│     ├─ bib_detector/                # Cloud Run client
│     ├─ face_detector/               # Cloud Run client; returns embeddings
│     ├─ qdrant/                      # vector store client (writes, deletes, search)
│     ├─ object_storage/              # GCS/R2 signed URLs
│     └─ email/                       # provider adapter
├─ migrations/
│  ├─ identity/
│  ├─ access/
│  ├─ organizations/
│  ├─ events/
│  ├─ participants/
│  ├─ commerce/
│  ├─ gallery/
│  ├─ documents/
│  ├─ results/
│  ├─ notifications/
│  ├─ audit/
│  ├─ jobs/
│  ├─ storage/
│  ├─ webhooks/
│  ├─ analytics/                      # read-only views/read models
│  └─ public/                         # read-only public views/read models
├─ docker-compose.yml                 # Postgres, Redis, Qdrant, MinIO/R2 emulator
└─ Dockerfile                         # multi-stage; api, worker, and migrate targets
```

Each module crate uses the same internal shape:

```
src/
├─ domain/            # entities, value objects, policies (no I/O)
├─ application/       # use cases, facade implementation, transaction orchestration
├─ infrastructure/    # sqlx repositories, Redis, external adapters
├─ http/              # Axum handlers, DTOs, utoipa schemas
├─ jobs/              # job handlers owned by this module
├─ events.rs          # domain/outbox events
├─ facade.rs          # the only public API other modules may call
├─ error.rs           # module error → API problem mapping
└─ lib.rs             # pub use facade, http routes, jobs
```

Only `facade`, `http`, `jobs`, and DTOs are public outside the module. Repositories and SQL types stay
private.

---

## 4. Module ownership

| Module | Owns (PostgreSQL schema) | Public facade examples | Depends on |
| --- | --- | --- | --- |
| `identity` | `users`, `social_accounts`, `sessions`, `verification_tokens`, `face_enrollments`, `face_enrollment_images`, `face_embeddings` | `get_user`, `create_session`, `revoke_session`, `verify_email` | `access` (roles) |
| `access` | `roles`, `permissions`, `role_permissions`, `user_roles` | `permissions_for_roles`, `check_permission`, `list_roles` | none |
| `organizations` | `orgs`, `org_members`, `invitations` | `get_org`, `member_of`, `effective_org_roles`, `accept_invitation` | `identity`, `access`, `audit` |
| `events` | `events`, `races`, `race_categories`, `event_team` | `get_event`, `list_races`, `can_manage_event` | `organizations`, `access`, `audit` |
| `participants` | `participants`, `registrations`, `participant_imports` | `list_participant_rows`, `create_registration`, `import_participants` | `events`, `access`, `audit`, `jobs` |
| `commerce` | `orders`, `order_items`, `payments`, `refunds` | `create_order`, `refund_order`, `list_order_rows` | `participants`, `events`, `access`, `audit` |
| `gallery` | `gallery_collections`, `gallery_items`, `gallery_item_bibs`, `gallery_item_faces`, `watermarks`, `upload_sessions`, `upload_files` | `create_upload`, `complete_upload`, `media_rows`, `public_media` | `events`, `storage`, `jobs`, `access`, `audit`, `bib_detector`, `face_detector` |
| `documents` | `generator_templates`, `fonts`, `generated_documents`, `certificates` | `render_preview`, `generate_batch`, `certificate_search` | `events`, `storage`, `jobs`, `participants`, `access`, `audit` |
| `results` | `race_results` | `published_results`, `public_results` | `events`, `participants` |
| `notifications` | `notifications` | `notify`, `list_for_user`, `mark_read` | `identity` |
| `audit` | `audit_logs` | `record`, `list_org`, `list_event`, `list_platform` | none |
| `jobs` | `jobs`, `outbox_events`, `idempotency_keys` | `enqueue`, `mark_*`, `retry` | none |
| `storage` | `storage_providers`, `storage_objects` | `presign_upload`, `presign_download`, `record_object` | none |
| `webhooks` | `webhooks`, `webhook_deliveries` | `deliver`, `list_deliveries` | `jobs`, `audit` |
| `analytics` | Read-only views/read models in the `analytics` schema | `org_overview`, `event_overview`, `platform_overview` | `events`, `participants`, `commerce`, `gallery`, `documents`, `organizations` |
| `public` | Read-only views/read models in the `public` schema | `public_event`, `registration_config`, `public_media`, `certificate_search`, `public_results` | `events`, `gallery`, `documents`, `results`, `organizations`, `analytics` |

Notes:

- `admin` is an **API surface**, not a data-owning module. Platform endpoints compose query facades
  from `analytics`, `identity`, `organizations`, `access`, `storage`, `webhooks`, `jobs`, `audit`,
  and `face_enrollments`.
- `public` is also a **surface and read-model module**. It never writes domain tables.
- `analytics` exists to break a potential cycle: events/participants/commerce/gallery/documents must
  not depend on each other merely to render dashboards. The overview endpoints call `analytics`,
  which owns read-only views over their schemas. Domain modules never depend on `analytics`.
  It starts with SQL views; add materialized views or read tables refreshed by outbox events only if
  dashboard latency demands it.
- `gallery` and `documents` depend on `events` only to validate event scope; `events` does not depend
  on them.
- `access` never queries organization or event membership tables. Effective permissions are composed
  at the API edge by an `AccessResolver` implemented in the `api` crate, which unions system roles
  (`identity`), the organization role (`organizations`), and the event team role (`events`) using
  their facades and then asks `access` for each role's permissions.
- `audit` is called by every module through a small synchronous facade; audit failures are logged
  but never fail the primary business transaction.

---

## 5. Modular monolith rules

1. **No cross-module table access.** A domain module's SQL may reference only tables in its schema.
   Cross-module reads go through facade traits or dedicated read views owned by `analytics` or
   `public`.
2. **Facades are the only public API.** A module exposes traits and DTOs; repositories, SQL rows, and
   infrastructure errors stay private.
3. **No cyclic dependencies.** `cargo` enforces the crate graph; CI runs a dependency check against
   an allowlist.
4. **Transactions are explicit.** `shared::db::Tx` wraps a `sqlx::Transaction`. Cross-module use
   cases (checkout, import commit, invitation acceptance) accept `&mut Tx` through facades so the
   operation is atomic.
5. **Side effects go through the outbox.** Email, webhooks, detector calls, document rendering, and
   notifications are enqueued in the same transaction as the state change, then processed by the
   worker. No external call happens inside a database transaction.
6. **Domain events are internal.** Events are Rust enums in `events.rs`, serialized into
   `outbox_events`. They are not a public API contract.
7. **One schema per module.** Migrations are owned by the module that owns the tables. Tables are
   named as in the model schema, qualified by schema (`gallery.gallery_items`).
8. **Read models are explicit.** `analytics` and `public` own SQL views/read tables that join across
   schemas. They are read-only and versioned with the API contract.
9. **No shared mutable state.** In-process caching only for immutable reference data; all mutable
   state is Postgres/Redis.
10. **Extraction is possible, not assumed.** If gallery or documents need separate scaling, their
    module crates and job boundaries already provide a seam.

**Enforcement:**

- Cargo workspace crates with explicit dependencies.
- `cargo-deny` for licenses/advisories; a custom CI script to reject forbidden module dependencies.
- `clippy` with `-D warnings`.
- Architecture tests that assert the facade-only boundary (a small `trybuild`/source scan).
- Review checklist: no `infrastructure::` import across module crates, no SQL outside the owning
  module.

---

## 6. Runtime processes

### `api` — Docker on VPS

- Runs as a Docker service on the VPS; only Caddy/Traefik exposes ports 80/443. The API listens on an
  internal Docker network port and is not published directly.
- Axum + Tower.
- Route groups:
  - `/v1/auth`, `/v1/me`, `/v1/invitations` — identity.
  - `/v1/orgs/{orgId}/...` — organizations, events, access.
  - `/v1/events/{eventId}/...` — events, participants, commerce, gallery, documents.
  - `/v1/admin/...` — platform surface.
  - `/v1/public/...` — anonymous public surface.
- Middleware order:
  1. request ID and tracing,
  2. security headers, compression, body limit,
  3. rate limit (Redis),
  4. session resolution (skip for public/auth),
  5. CSRF and origin check for mutations,
  6. permission extraction/authorization,
  7. handler,
  8. problem+json error mapping.
- Public routes skip session/CSRF and apply public cache headers and stricter anonymous rate limits.
- Health: `/healthz` (liveness), `/readyz` (DB/Redis readiness).

### `worker` — Docker on VPS

- Runs as one or more Docker services on the VPS, sharing the Docker network with Postgres and Redis.
- Consumes Redis Streams with consumer groups; scale horizontally with
  `docker compose up --scale worker=2` if CPU and memory allow.
- Also exposes internal `POST /internal/jobs/*` endpoints for the scheduler container
  (shared-secret protected) for cron work: expire orders, clean sessions, clean uploads, deliver
  webhooks, retry jobs.
- Job handlers are registered by module. The worker binary composes the same module crates.
- Concurrency is controlled globally and per job type (gallery rendering low, notification delivery
  high).
- Each job:
  1. claims a `jobs` row with `SELECT ... FOR UPDATE SKIP LOCKED`,
  2. sets status `processing`, increments attempts,
  3. executes with a timeout,
  4. records success/failure, schedules retry with exponential backoff and jitter,
  5. moves to dead letter after max attempts.
- Redis Streams is the wake-up path; Postgres is the source of truth. A scheduled reconciler
  re-enqueues `pending` jobs that were not claimed.

### `scheduler` — Docker cron

- A small container running `supercronic` or `ofelia` on the VPS.
- Calls the worker's internal endpoints with a shared secret for:
  - expired order cleanup,
  - expired session/verification token cleanup,
  - abandoned upload cleanup,
  - webhook retries,
  - job reconciler,
  - public cache warmup (optional).
- Host cron is an acceptable alternative; keep the job definitions in the repository either way.

---

## 7. Data platform

The concrete table additions and alterations are listed in
[Database Schema Updates](./2026-11-11-00-49-database-schema-updates.md).

### PostgreSQL

- PostgreSQL 16 as a Docker service on the VPS with a persistent volume; a managed PostgreSQL
  instance can replace it via `DATABASE_URL` without changing the modules.
- One database, one schema per module.
- `timestamptz`, UUID v7 IDs, `BIGINT` money in IDR, `JSONB` for metadata.
- `sqlx` compile-time checked queries; `cargo sqlx prepare` for CI.
- Migrations: one directory per module, applied by a one-shot `migrate` container before the API
  and worker start.
- Expand/contract migrations for zero-downtime changes.
- Indexes: every tenant key (`org_id`, `event_id`), cursor keys, unique constraints from the model
  schema.
- Connection pooling: SQLx pool per API/worker container; cap total connections to the VPS
  PostgreSQL `max_connections`; PgBouncer is optional.
- Backups: nightly `pg_dump` to object storage plus WAL archiving if available; restore is tested
  monthly.
- Optional PostgreSQL RLS for defense in depth, but module repositories always filter by tenant.

### Redis (Docker on VPS)

| Use | Key/TTL |
| --- | --- |
| Session cache | `sess:{session_id}` → user/session summary, 5 min |
| Rate limits | `rl:{scope}:{id}:{window}` |
| CSRF token binding | `csrf:{session_id}`, session TTL |
| OAuth state/PKCE | `oauth:{state}`, 10 min |
| Permission snapshot | `perm:{user_id}:{scope}:{version}`, 60 s |
| Idempotency fast path | `idem:{key}`, 24 h (durable copy in Postgres) |
| Job queue | Redis Streams `jobs:{type}` with consumer groups |
| Locks | `lock:{resource}`, short TTL |
| Face search results | `face_search:{search_id}`, 15 min |
| Public cache | optional; prefer CDN/ETag |

- Redis runs as a Docker service with AOF persistence and a volume; a managed Redis instance is
  optional.
- Redis is not the only copy of durable data. A Redis outage degrades rate limiting/auth caches but
  must not lose jobs; the worker reconciles from `jobs`.

### Qdrant

- Owned and accessed by Racetify (`api` and `worker`), under `crates/integrations/qdrant`.
- Collections: `enrolled_faces`, `gallery_faces` (cosine, size `QDRANT_VECTOR_SIZE`, default 512);
  created and verified at worker/API startup.
- Payload: `enrollment_id` / `gallery_item_id`, `event_id`, `org_id`, `face_index`, model version.
- Point IDs are deterministic UUIDv5 values derived from the owning row, so retries overwrite the
  same points and deletes are idempotent.
- The monolith stores `qdrant_point_id` in `gallery.gallery_item_faces` and
  `identity.face_embeddings`; vectors stay in Qdrant and are never returned by the API.
- Writes/deletes happen inside outbox jobs (`gallery.detect_faces`, `identity.face_enrollment`,
  `face_search.*`); `delete_by_key` runs before an upsert so re-detection cannot leave stale points.
- Unset `QDRANT_URL` selects a no-op store for local development and tests.

### Object storage

- GCS (recommended for GCP-native IAM/signing) or Cloudflare R2 (cost) behind a `storage` trait.
- Buckets/prefixes:
  - `uploads/` private originals,
  - `derivatives/` private thumbnails/previews,
  - `public/` public derivatives served through a CDN,
  - `documents/` certificates and generated files,
  - `assets/` logos, watermarks, fonts.
- Presigned PUT for uploads; presigned GET for organizer/admin.
- Public gallery uses signed/CDN URLs; storage keys never reach clients.
- Lifecycle rules: abandoned uploads 24 h, temporary imports 24 h, generated ZIPs 90 days.

---

## 8. Authentication and authorization implementation

### Sessions

- `identity` owns `users`, `social_accounts`, `sessions`, `verification_tokens`.
- Opaque 256-bit session token; only its hash is stored.
- Cookie `__Host-racetify_session` (`HttpOnly; Secure; SameSite=Lax; Path=/`).
- 30-day absolute, 7-day idle, rotation on login/password change/24 h.
- Postgres is authoritative; Redis caches session lookups for 5 minutes. Revocation deletes both.
- Session middleware produces `RequestContext`:

```rust
pub struct RequestContext {
    pub request_id: RequestId,
    pub user: Option<AuthenticatedUser>,
    pub session_id: Option<SessionId>,
    pub scope: Option<TenantScope>,       // org or event, resolved from the path
    pub permissions: PermissionSet,       // resolved per scope
    pub email_verified: bool,
}
```

### Authorization

- Effective access is composed at the API edge by `AccessResolver`:
  system roles (`identity`) + organization membership role (`organizations`) + event team role
  (`events`), then each role's permission set (`access`). The union is cached per user/scope for 60 s.
- `access::check_permission(&ctx, Permission::EventParticipantsManage)` checks the composed set. It is
  called by the route extractor and again by the application use case.
- Permission snapshots cache for 60 s; role changes bump `perm_version`.
- Resource resolution:
  - `orgId` from path → verify membership.
  - `eventId` from path → load event `org_id` → verify org/event membership.
  - Child resources validate ownership through module facades/repositories.
- `404` for inaccessible tenant resources; `403` only when the resource is visible and the action is
  not permitted.
- No client-supplied `orgId`/`eventId` in bodies is trusted.

### CSRF, OAuth, tokens

- CSRF token bound to session; `X-CSRF-Token` on mutations; origin allowlist.
- Google OAuth: `oauth2`/`openidconnect` crates; state + nonce + PKCE in Redis; `email_verified`
  required.
- Password hashing: `argon2`. Reset/verification tokens: 256-bit random, SHA-256 hash at rest,
  single-use.
- Invitations: hashed single-use token, 7-day expiry, email match on accept.

---

## 9. API layer

- **Framework:** Axum + Tower + Tokio.
- **OpenAPI:** `utoipa` derives on DTOs and handlers; the generated document is published to
  `packages/api-contract/openapi.yaml`. CI diffs it against the approved contract.
- **DTOs:** one request/response type per operation; `serde(rename_all = "camelCase")`; enums
  `snake_case` values.
- **Errors:** a shared `ApiError` enum; modules map their errors to stable `code` values. The response
  is `application/problem+json` with `status`, `code`, `detail`, `requestId`, `errors[]`,
  `requiredPermission` where applicable.
- **Pagination:** cursor pagination helpers in `shared/kernel`; opaque signed cursors; `limit`,
  `nextCursor`, `hasMore`, optional `total`.
- **Idempotency:** extractor for `Idempotency-Key`; durable `jobs.idempotency_keys` table; replay
  stored response; `409` on key reuse with a different payload.
- **ETag/If-Match:** event settings, registration config, templates, roles.
- **Rate limits:** Redis sliding-window per IP/user; auth endpoints stricter; `429` with
  `Retry-After`.
- **Caching:** authenticated responses `private, no-store`; public responses `public, s-maxage` with
  ETag; CDN in front of public GETs.
- **Request IDs:** generated or accepted from `X-Request-Id`; propagated to logs, jobs, and detector
  calls.
- **Body limits:** JSON 1 MB; multipart import 2 MB; uploads never pass through the API.

---

## 10. Module plans

### Contract-to-module map

| Frontend contract | Modules involved | Main process |
| --- | --- | --- |
| General / auth / account | `identity`, `access`, `notifications` | API |
| Organizations & access | `organizations`, `access`, `audit` | API |
| Event setup | `events`, `organizations`, `access`, `analytics`, `audit` | API |
| Participants & commerce | `participants`, `commerce`, `events`, `storage`, `jobs`, `audit` | API + worker |
| Gallery & media | `gallery`, `storage`, `jobs`, `bib_detector`, `face_detector`, `audit` | API + worker + Cloud Run |
| Generators & certificates | `documents`, `participants`, `events`, `storage`, `jobs`, `audit` | API + worker |
| Platform admin | `analytics`, `identity`, `organizations`, `access`, `storage`, `webhooks`, `jobs`, `audit` | API |
| Public content | `public`, `events`, `gallery`, `documents`, `results`, `analytics` | API (+ CDN) |

### 10.1 Identity and access

- Registration, login, logout, session refresh, Google OAuth, email verification, password reset,
  change password, session list/revocation.
- Profile, notifications preferences.
- Invitation summary/accept/decline.
- Access resolution and `/me/access`, `/me/workspaces`.
- Face enrollments/admin metadata (no model inference; delegates to the face service for embedding
  operations when that flow is enabled).
- Tables: `users`, `social_accounts`, `sessions`, `verification_tokens`, `face_enrollments`,
  `face_enrollment_images`, `face_embeddings`; `access` tables.
- Jobs: session cleanup, verification token cleanup, email delivery.

### 10.2 Organizations and events

- Organization profile, members, invitations, roles, audit.
- Event CRUD, settings, races, categories, team, registration config.
- Organization and event overviews are served by the read-only `analytics` module; the events
  module does not depend on participants, commerce, gallery, or documents.
- Tables: `orgs`, `org_members`, `invitations`, `events`, `races`, `race_categories`, `event_team`.
- Key rules: last-owner protection, race/category in-use checks, status transitions, registration
  window validation, cutoff duration.
- Event logos accept SVG/PNG; SVG is sanitized and stored as both original and raster preview.

### 10.3 Participants and commerce

- Participant list/detail/edit, cancellation, bib assignment (bulk), exports.
- Fixed-template CSV import: template download, upload, validation job, review, commit.
- Orders, order items, payments, refunds; public checkout writes participants + registrations +
  orders + items in one transaction.
- Tables: `participants`, `registrations`, `participant_imports`, `orders`, `order_items`,
  `payments`, `refunds`.
- Import jobs are chunked (e.g., 100 rows per transaction), idempotent by import ID + row number.
- Refunds call the payment provider (future) and record a `refunds` row plus a job.
- Public order creation uses `Idempotency-Key`; order access cookie set by the API.
- PII is never logged; exports are audited and served by signed URL.

### 10.4 Gallery and detectors

- Upload sessions, presigned PUTs, completion, processing pipeline.
- Collections, items, bibs, faces, watermarks.
- Detector orchestration and Qdrant references.
- Tables: `gallery_collections`, `gallery_items`, `gallery_item_bibs`, `gallery_item_faces`,
  `watermarks`, `upload_sessions`, `upload_files`.
- Gallery pipeline in section 12.

### 10.5 Documents and certificates

- Generator templates (SVG/JSON), fonts (read-only v1), previews, batch generation, ZIP downloads.
- Certificates: generation, issuance, revocation, downloads.
- Tables: `generator_templates`, `fonts`, `generated_documents`, `certificates`.
- Rendering: SVG sanitize → rasterize with `resvg`; PDF via a Rust PDF renderer (evaluate `printpdf`
  or `typst`); batch jobs chunked; output to storage; signed URLs.
- Certificate numbers are globally unique, server-assigned.
- Revocation is idempotent and audited.

### 10.6 Public

- Read-only projections for event profile, registration config, public gallery, certificate search,
  and results.
- Uses query facades from `events`, `gallery`, `documents`, `results`, `organizations`.
- Public gallery filters: `is_public` collection and `published` item; no bib/face metadata.
- Face search orchestration: create a temporary search, call the face detector for an embedding,
  query Qdrant scoped to the event, map hits to public items, store results in Redis for 15 minutes.
- Certificate search caps at 3 candidates; no total count; rate limited.
- Cache headers and ETags per the contract.

### 10.7 Admin

- Platform overview, tenant snapshots, organizations, users, system roles, permissions, face
  enrollments, storage, webhooks, jobs, audit.
- Composes `analytics` and query facades; no tenant PII by default.
- Face enrollment image previews use short-lived signed URLs and are audited.
- System role changes bump permission versions.
- Job retry is allowlisted by job type and audited.

### 10.8 Notifications, audit, jobs, webhooks

- Notifications: in-app rows + email jobs; read/unread.
- Audit: append-only, metadata redacted at write; query by org/event/actor/action/date.
- Jobs: durable job table, outbox, retries, dead letter, admin retry.
- Webhooks: configs, deliveries, retries with backoff, signatures, redacted payload summaries.

---

## 11. Async jobs and outbox

### Outbox

- Every state change that triggers a side effect inserts an `outbox_events` row in the same
  transaction.
- A dispatcher (worker) publishes outbox rows to Redis Streams and marks them dispatched.
- At-least-once delivery; handlers are idempotent by event ID and business key.

### Job catalog

| Job | Owner | Trigger | Retry / notes |
| --- | --- | --- | --- |
| `participant.import.validate` | participants | import upload | 3 attempts; parse and validate |
| `participant.import.commit` | participants | commit | chunked, idempotent per row |
| `participant.export` | participants | export request | signed CSV, 15 min URL |
| `gallery.process_item` | gallery | upload complete | derivatives, watermark, publish |
| `gallery.detect_bibs` | gallery | item processed | call bib detector |
| `gallery.detect_faces` | gallery | item processed | call face detector |
| `gallery.delete_faces` | gallery | item delete | call face detector delete |
| `document.generate_batch` | documents | generation request | chunked render |
| `certificate.issue` | documents | generation row | idempotent per registration |
| `webhook.deliver` | webhooks | domain event | backoff, max attempts |
| `notification.send` | notifications | domain event | email provider |
| `order.expire` | commerce | scheduler | expire unpaid orders |
| `session.cleanup` | identity | scheduler | delete expired sessions/tokens |
| `upload.cleanup` | gallery | scheduler | abandon sessions > 24 h |
| `job.reconcile` | jobs | scheduler | re-enqueue stuck pending jobs |

### Retry policy

- Exponential backoff with jitter: 5 s, 30 s, 2 min, 10 min, 30 min.
- Max attempts per job type (default 5; detector calls 3).
- Dead letter after max; visible in admin jobs with sanitized error.
- Retry only transient failures (timeouts, 5xx, 429, network). Validation errors fail fast.

---

## 12. Gallery pipeline and Cloud Run integrations

### 12.1 Upload

1. `POST /gallery/uploads` creates `upload_sessions` + `upload_files`; the `storage` module presigns
   a PUT per file.
2. The client uploads directly to object storage.
3. `POST /uploads/{id}/complete` verifies objects (HEAD), creates `storage_objects` and
   `gallery_items` with `processing`, and enqueues `gallery.process_item` for each file.
4. The worker generates derivatives, applies the optional watermark, runs bib/face detection, and
   sets `published` or `failed`.

### 12.2 Derivative and watermark processing

- Worker downloads the original from storage.
- Reads dimensions/EXIF (capture time) with `kamadak-exif`/`image`.
- Generates:
  - thumbnail max 400 px,
  - optional watermarked preview/public derivative.
- Watermark:
  - optional; if no active default `gallery` watermark, skip.
  - text rendered with a font from `fonts` (`cosmic-text`/`ab_glyph`);
  - image watermarks accept PNG/WebP/SVG;
  - SVG event/org logos are sanitized and rasterized with `resvg`.
- Uses `image` + `fast_image_resize`; CPU-heavy, so worker concurrency is 1–2 per instance.
- Uploads derivatives to storage; records URLs; sets `published`.
- Detection runs on the **original**, not the watermarked derivative, so watermarks cannot obscure
  bibs or faces.

### Detector deployment

Both detectors are deployed to Cloud Run with `--no-allow-unauthenticated`. Because the VPS is
outside GCP, v1 uses `--ingress=all` with IAM invoker restricted to the VPS service account; the
endpoint is routable but not invokable without a valid OIDC token. If a VPN/Interconnect is added
later, switch to internal ingress. The VPS stores the service account key as a Docker secret and
mints ID tokens with the detector URL as the audience.

### 12.3 Bib detector contract (Cloud Run)

Public

```http
POST {BIB_DETECTOR_URL}/detect/single
Content-Type: application/json

{
  "photo_id": "string",
  "url": "string (HttpUrl)"
}
```

```json
{
  "requestId": "req_...",
  "modelVersion": "bib-2026-11",
  "detections": [
    {
      "text": "00123",
      "number": 123,
      "confidence": 0.98,
      "boundingBox": { "x": 0.12, "y": 0.44, "width": 0.06, "height": 0.03 }
    }
  ]
}
```

Rules:

- Stateless; no database writes.
- Returns `200` with an empty `detections` array when nothing is found.
- `400` for an unreadable image; `422` for unsupported dimensions; `503` when overloaded.
- Timeout: 60 s; retries: 2 with jitter; idempotent by `requestId`.
- The detector must not log the signed URL or image bytes.
- Signed URL TTL: 10 minutes; content type/size verified.

### 12.4 Face detector contract (Cloud Run)

> **Updated 2026-11-13.** The original design let the face service own Qdrant and search. That
> moved into Racetify; see [Face embeddings + Qdrant search](./2026-11-13-15-06-face-embeddings-qdrant-search.md).
> The detector now returns embeddings and has no point, delete, or search surface.

The face service owns the embedding model only: it detects faces and returns vectors. Racetify
writes, deletes, and searches Qdrant.

Detection:

```http
POST {FACE_DETECTOR_URL}/detect/single
X-Face-Embed-Key: <shared secret, optional>

{ "photo_id": "<opaque label>", "url": "https://storage.../signed-get" }
```

```json
{
  "status": "success",
  "error": "",
  "faces": [
    {
      "bbox": [600, 800, 648, 860],
      "det_score": 0.97,
      "embedding": [0.013, -0.204, 0.998, 0.004]
    }
  ]
}
```

`bbox` is a pixel box `[x1, y1, x2, y2]`; Racetify converts it to fractions of the stored image's
width/height before persisting. `status: "error"` carries a message in `error`. The service fetches
the image from `url` itself.

Enrollment uses the same endpoint once per image with an opaque `photo_id`; the service has no batch
`/enroll` and no `/delete`.

Rules:

- Racetify validates every embedding (length equals `QDRANT_VECTOR_SIZE`, all finite) and derives
  deterministic point IDs; it never trusts a detector-supplied point ID.
- `org_id`, `event_id`, `gallery_item_id` / `enrollment_id`, `face_index`, and model version live in
  the Qdrant payload written by Racetify.
- Search runs in Racetify (`QDRANT_SEARCH_MIN_SCORE`, `QDRANT_SEARCH_SCAN_LIMIT`) and maps hits to
  visible gallery items. No scores, vectors, or point IDs reach the client.
- **Query image handling:** the API receives the multipart image, writes it to a short-lived private
  object, signs a GET URL, calls the detector, and deletes the object immediately after a
  deterministic outcome. The image is never retained, logged, or used for analytics.
- Search results contain item IDs only and expire after 15 minutes (public flow).
- Deletion is idempotent: deterministic point IDs plus `delete_by_key` before re-upsert.
- Timeout: 15 s detector, 10 s Qdrant; retries through the outbox (public search) or the request
  error (organizer search returns `503 face_search_unavailable`).

### 12.5 Failure handling

- Detection failures do not fail the upload; the item stays `published` with missing bib/face
  metadata, or `failed` if derivatives failed.
- A detection job retries independently; the gallery remains usable.
- Each detector call carries an opaque `photo_id` (the gallery item ID, or `enrollment-image` for
  enrollment) and the signed image URL for tracing. The service reports no model version.
- Per-item isolation: one bad image does not block the batch.
- Circuit breaker: open after consecutive failures; jobs back off and retry later.
- Stored results record the configured `QDRANT_MODEL_VERSION`; the detector does not report a
  version.

---

## 13. Security and multi-tenancy

- Every tenant resource is scoped by `org_id`/`event_id`; repositories enforce the filter.
- Facade authorization checks are repeated inside application use cases.
- Cross-tenant IDs return `404`.
- Sessions/cookies/CSRF per the general contract.
- PII is never logged; errors and job payloads are sanitized.
- Storage keys and signed URLs are never logged.
- Detectors are private Cloud Run services with `roles/run.invoker` for a dedicated Google service
  account used by the VPS. The VPS obtains OIDC ID tokens from that service account key, stored as a
  Docker secret and rotated periodically. Workload Identity Federation is the preferred alternative
  if the VPS can use it.
- Qdrant credentials exist only in the API/worker; the face service never receives them and never
  stores vectors.
- Object storage presigned URLs are short-lived and scoped to one object.
- Public certificate search is rate-limited and capped at 3 candidates.
- Face search requires consent, does not persist the query image, and returns public items only.
- Admin metadata views do not expose tenant participant PII.
- VPS hardening: SSH keys only, no password login, UFW/iptables allow only 22/80/443, fail2ban,
  unattended security updates, Docker non-root containers where possible, read-only roots and
  resource limits.
- Only Caddy/Traefik publishes ports; Postgres, Redis, and the API/worker internal ports stay on the
  Docker network.
- Secrets in Docker secrets or SOPS-encrypted env files; no secrets in images or committed `.env`
  files.
- Audit events for auth, role changes, invitations, refunds, certificate revocation, data exports,
  and admin actions.

---

## 14. Observability

- `tracing` + `tracing-subscriber`; JSON logs with `requestId`, `userId` (opaque), `orgId`,
  `eventId`, route, status, latency.
- OpenTelemetry export to Grafana Cloud or a self-hosted Grafana stack: Tempo (traces), Prometheus
  (metrics), Loki (logs). On the VPS, run `node_exporter` and `cAdvisor` for host/container metrics;
  Grafana Cloud is the lower-maintenance option.
- Key metrics:
  - API request rate/latency/error rate,
  - DB pool saturation,
  - Redis queue depth and age,
  - job success/failure/retry counts,
  - detector latency/error rate/timeouts,
  - uploads completed/failed,
  - face search count (no PII),
  - certificate generation throughput.
- Alerts:
  - 5xx rate,
  - job backlog older than 10 minutes,
  - detector failure ratio,
  - DB connections > 80%,
  - Redis unavailable,
  - migration failures,
  - container restarts / unhealthy services,
  - VPS disk usage > 80%,
  - TLS certificate expiry,
  - backup job failure.
- Health endpoints and structured startup logs.
- No PII, tokens, signed URLs, or image URLs in logs/traces.

---

## 15. Testing

- **Unit:** domain policies, permission resolution, cursor encoding, error mapping.
- **Integration:** testcontainers for PostgreSQL, Redis, Qdrant, MinIO/GCS emulator;
  migrations applied; module facades. Qdrant client tests cover request bodies, chunking, point-ID
  determinism, and search merge/ordering.
- **Contract:** OpenAPI snapshot; generated frontend client compiles; request/response examples.
- **Detector integration:** Wiremock services for bib/face; simulate timeouts, 5xx, malformed
  responses, empty results.
- **Job tests:** idempotency, retry/backoff, dead letter, reconciler.
- **Security:** auth matrix, CSRF, open redirect, cross-tenant IDOR, rate limits, invitation email
  match, token reuse, PII redaction.
- **Media:** image fixture set for dimensions/EXIF/watermark; detector mocks; deletion sync.
- **Load:** public gallery/results, participant import, upload completion, detector fan-out.
- **CI gates:** `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`, `cargo audit`,
  `cargo deny`, OpenAPI diff, migration check, Docker build.

---

## 16. CI/CD and environments

### Local development

- `docker compose up` starts PostgreSQL, Redis, Qdrant, MinIO (or a GCS emulator), and MailHog.
- `sqlx migrate run` applies per-module migrations.
- `cargo run -p api` and `cargo run -p worker` run against local services.
- Detector mocks run as a Wiremock container; env vars point `BIB_DETECTOR_URL` and
  `FACE_DETECTOR_URL` at the mocks. Real Cloud Run services are used only in staging/prod.
- Seed data covers three organizations, six events, participants, gallery fixtures, and templates.

### CI/CD

- Environments: `dev`, `staging`, `prod`; separate Docker Compose projects on the VPS or separate
  VPS hosts.
- Build: multi-stage Dockerfile with `api`, `worker`, and `migrate` targets; distroless or slim
  runtime; non-root user; images tagged with the commit SHA and pushed to GHCR.
- Migrations: one-shot `migrate` container before `api`/`worker`; expand/contract; never destructive
  in one step.
- Deploy: GitHub Actions (or any CI) builds and pushes images, then SSHes to the VPS and runs
  `docker compose pull && docker compose up -d`. Health checks gate the deploy; rollback is
  `docker compose up -d` with the previous image tag.
- Zero-downtime option: run two `api` containers behind Caddy and update one at a time; a single
  container restart causes a brief reconnect.
- Detectors: deployed by the ML team on their own cadence; versioned contracts; compatibility tests
  in staging.
- Config: environment variables, Docker secrets, or SOPS-encrypted env files; no secrets in images.
- Backups: `pg_dump` and Redis AOF snapshots to object storage; restore tested monthly.
- Feature flags for public launch and detector rollout.

---

## 17. Deployment and scaling

| Component | Hosting | Notes |
| --- | --- | --- |
| `api` | VPS Docker | 1–2 containers behind Caddy; health checks; 1–2 vCPU each |
| `worker` | VPS Docker | 1–2 containers; Redis consumer groups; CPU/memory for image rendering |
| PostgreSQL | VPS Docker (or managed) | Persistent volume; nightly backups; WAL where available |
| Redis | VPS Docker (or managed) | AOF persistence; volume; private Docker network only |
| Qdrant | VPS Docker (or Qdrant Cloud) | Owned by Racetify; API key only in API/worker; snapshots with backups |
| Object storage | R2/S3 (or MinIO) | Signed URLs; CDN for public derivatives |
| Bib detector | Google Cloud Run | Private; OIDC; min instances for peak |
| Face detector | Google Cloud Run | Private; OIDC; returns embeddings only (no Qdrant access) |
| Scheduler | VPS Docker cron | `supercronic`/`ofelia` calls worker internal endpoints |
| Reverse proxy | VPS Caddy/Traefik | TLS via Let's Encrypt; only 80/443 exposed |
| Secrets | Docker secrets / SOPS | Google service account key for Cloud Run OIDC |
| Observability | Grafana stack / Grafana Cloud | Prometheus, Loki, Tempo, node_exporter, cAdvisor |

Networking:

- Docker bridge network; only Caddy/Traefik publishes 80/443. Postgres, Redis, API, and worker ports
  stay internal.
- Detectors are Cloud Run services with `--no-allow-unauthenticated`; the VPS uses a Google service
  account key (Docker secret) with `roles/run.invoker` to mint OIDC ID tokens. Ingress is `all` for
  v1 because the VPS is outside GCP; switch to internal ingress once VPN/Interconnect exists. Egress
  over HTTPS.
- Cloudflare in front is optional for CDN, WAF, and edge rate limiting. Otherwise Caddy/Traefik
  handles TLS and basic rate limits.
- UFW/iptables allows only SSH, HTTP, and HTTPS; fail2ban protects SSH.

Scaling notes:

- Vertical scaling is the first lever: more vCPU/RAM for API, worker, and Postgres.
- Run multiple worker containers with Redis consumer groups if gallery/document work backs up.
- Run two API containers behind Caddy for rolling updates and slightly higher availability.
- DB connections are the first bottleneck; cap API/worker pool sizes and consider PgBouncer or a
  managed PostgreSQL instance.
- Image rendering is CPU-bound; keep worker concurrency low and give the worker container a CPU
  quota.
- A single VPS is a single point of failure: keep tested backups, a documented restore, and a
  pre-built second-host Compose file for recovery. Move Postgres/Redis to managed services or add a
  second host when uptime requirements grow.

---

## 18. Delivery plan

| Phase | Work | Estimate |
| --- | --- | --- |
| **B0 Foundation** | Workspace, shared kernel, config, DB/migrations, Redis, auth/session, problem+json, OpenAPI, CI, Docker Compose | 2 weeks |
| **B1 Identity & access** | Users, sessions, OAuth, email/password, verification/reset, invitations, permissions, `/me/access` | 3 weeks |
| **B2 Organizations & events** | Orgs, members, roles, audit, events, races, categories, team, registration config, org/event analytics read models | 3 weeks |
| **B3 Participants & commerce** | Participants, registrations, fixed-template import, orders, payments, refunds, public checkout | 4 weeks |
| **B4 Gallery** | Uploads, presigning, derivatives, watermark, bib/face integration, gallery, public gallery, face search | 4 weeks |
| **B5 Documents & certificates** | Templates, preview, batch generation, certificates, downloads | 3 weeks |
| **B6 Admin & public** | Platform console APIs, platform analytics, storage/webhooks/jobs/audit, public certificates/results | 3 weeks |
| **B7 Hardening** | Load, security, observability, backup/restore, runbooks | 2 weeks |

**Total:** ~24 backend weeks with 3–4 engineers, plus ML service work. Some phases overlap after B0.

Suggested team split:

- Backend A: identity, access, organizations, events, admin.
- Backend B: participants, commerce, public checkout.
- Backend C: gallery, storage, detectors, documents.
- Platform/DevOps: GCP, CI/CD, observability, security.

---

## 19. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Modular monolith erodes into a ball of mud | Cargo crate boundaries, facade-only rule, dependency CI, architecture review |
| Cloud Run detector cold starts/timeouts | Async jobs, min instances, timeouts/retries, circuit breaker |
| Face/Qdrant consistency | Racetify owns Qdrant; outbox + deterministic point IDs + delete-by-key; manual reconciliation runbook |
| Image processing CPU/memory | Worker concurrency 1–2; dedicated container with CPU quota; scale worker containers or run a one-off batch container for large jobs |
| DB connection exhaustion | Pool caps per container, PostgreSQL `max_connections`, PgBouncer or managed PostgreSQL at scale |
| Cross-module transactions | Shared `Tx` for atomic use cases; outbox for side effects |
| PII leakage in logs | Structured redaction, lint/tests, no raw payload logging |
| Certificate enumeration | Rate limits, 3-candidate cap, `noindex`, future verification |
| Public traffic spikes | Cloudflare/CDN, ETag/cache headers, vertical scaling, read replica later |
| Detector contract drift | Versioned contracts, staging compatibility tests, modelVersion fields |
| Migration downtime | Expand/contract, one-shot `migrate` container, backups |
| Single VPS outage | Nightly backups, tested restore runbook, pre-built second-host Compose, managed DB/Redis if uptime grows |
| VPS disk exhaustion | Originals/derivatives in object storage, retention rules, disk alerts |
| Reverse proxy/TLS misconfiguration | Caddy automatic TLS, config in git, health checks, staging rehearsal |

---

## 20. Open decisions

| # | Decision | Recommendation | Needed by |
| --- | --- | --- | --- |
| 1 | API hosting | **VPS + Docker confirmed** for `api` and `worker`; move to managed/GKE only if availability or scale demands it | B0 |
| 2 | Queue | **Redis Streams + Postgres jobs**; Postgres-only polling as a fallback if Redis is unavailable | B0 |
| 3 | Qdrant hosting | **Qdrant Cloud** owned by Racetify, or the Docker service on the VPS; the face service never owns it | B4 — decided 2026-11-13 |
| 4 | Object storage | **R2/S3** for signed URLs and durability; GCS optional; MinIO on the VPS only for development | B0 |
| 5 | Detector protocol | **JSON over HTTP** for v1; gRPC later if payload/latency demands | B4 |
| 6 | Detection input | **Original image**, not the watermarked derivative | B4 |
| 7 | Face service ownership | **Racetify owns Qdrant**; the face service returns embeddings and the monolith stores point IDs only | B4 — decided 2026-11-13 |
| 8 | Public API deployment | One API binary initially; split public routes later if scale differs | B6 |
| 9 | PostgreSQL RLS | Optional defense-in-depth after module scoping is proven | Later |
| 10 | Document renderer | Evaluate `printpdf` vs `typst`; SVG via `resvg` | B5 |
| 11 | Email provider | SES/Postmark/Resend behind an adapter; choose before B1 | B1 |
| 12 | Worker scaling | Vertical first, then multiple worker containers with Redis consumer groups | B4 |
| 13 | Postgres/Redis hosting | Docker on the VPS for v1 with tested backups; managed instances when uptime requirements grow | B0 |
| 14 | Reverse proxy | **Caddy** for automatic TLS and simple config; Traefik if dynamic routing is needed | B0 |
| 15 | VPS sizing | Start with 8 vCPU / 16–32 GB RAM / NVMe; monitor and scale vertically | B0 |
| 16 | Backup retention | Nightly Postgres dumps + Redis AOF, 30-day retention, monthly restore drill | B0 |

---

## 21. Acceptance criteria

1. `api` and `worker` build from one workspace; module dependency CI passes.
2. Every domain module's SQL touches only its own schema; `analytics`/`public` read-only views are
   the explicit exception; facades are the only cross-module domain API.
3. The OpenAPI generated by `utoipa` matches the approved frontend contract (or documents approved
   deviations).
4. Auth, CSRF, sessions, invitations, and permissions pass the security matrix.
5. Checkout writes participant, registration, order, and order item atomically.
6. Participant import runs as a job, is idempotent, and returns validation/result status.
7. Upload sessions use presigned PUTs; completion creates items and enqueues processing.
8. Derivative/watermark processing runs in the worker; watermarks stay optional.
9. Bib detector calls are OIDC-authenticated, retried, and idempotent.
10. Racetify writes, deletes, and searches Qdrant; detector responses supply embeddings only, and
    the API never returns vectors, scores, or point IDs.
11. Face search returns public items only and stores results for 15 minutes without retaining the
    query image.
12. Jobs retry with backoff, dead-letter, and are visible/retryable in admin.
13. Public endpoints respect cache headers, rate limits, and PII rules.
14. Observability covers request/job/detector failure and latency; alerts are wired.
15. Migrations, backups, and restore are rehearsed in staging.
16. `docker compose up -d` on the VPS starts the API, worker, Postgres, Redis, and reverse proxy with
    health checks; only 80/443 are publicly exposed.
17. Deploys and rollbacks use immutable image tags; the one-shot migration container runs before the
    new API/worker containers.
18. TLS, firewall rules, SSH hardening, and backup/restore are verified on the VPS.
