# Database Schema Updates — API Contract Delta

> **Status:** Proposed for review
> **Owner:** Backend Tech Lead
> **Date:** 2026-11-11
> **Source of truth:** [Model Schema](./2026-11-10-06-52-model-schema-complete.md)
> **Related:** [Backend API Plan](./2026-11-11-00-01-backend-api-plan.md) ·
> [General Contract](./2026-11-10-19-17-frontend-api-contract-general.md)

The current model schema covers the core domain, but the approved API contract and backend plan
require several additions and corrections. This document lists every database/table change needed
before implementation.

The model schema has already been updated for `races.cut_off_duration`. Everything else below is a
required migration.

---

## 1. Summary

| Change | Module / schema | Type |
| --- | --- | --- |
| `sessions` | identity | New table |
| `verification_tokens` | identity | New table |
| `upload_sessions` | media | New table |
| `upload_files` | media | New table |
| `participant_imports` | participants | New table |
| `refunds` | commerce | New table |
| `outbox_events` | jobs | New table |
| `idempotency_keys` | jobs | New table |
| `events.registration_config` | events | New JSONB column |
| `orgs.timezone`, `orgs.currency`, `orgs.public_contact` | organizations | New columns |
| `races.cut_off_time` → `cut_off_duration` | events | Rename/retype |
| `orders.user_id` nullable + contact fields | commerce | Alter |
| `participants.email` / `phone` nullable | participants | Alter |
| `participants.club_name`, `participants.blood_type` | participants | New columns |
| `registrations.jersey_size`, `registrations.chip_number` | participants | New columns |
| `invitations.status` adds `declined` | organizations | Enum/value |
| `certificates` global unique number / per registration | documents | Constraints |
| `generated_documents` progress/output fields | documents | New columns |
| `storage_objects` verification fields | storage | New columns |
| `gallery_items` processing error fields | media | New columns |
| `gallery_item_bibs` / `gallery_item_faces` model version | media | New columns |
| `jobs` retry/lease/idempotency fields | jobs | New columns |
| `audit_logs.request_id` + indexes | audit | New column/indexes |

---

## 2. New tables

### 2.1 `sessions` (identity)

Server-side, revocable sessions. The schema currently has no session table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | Session ID returned to the client for management |
| `user_id` | UUID FK `users.id` | Cascade on user delete? Prefer explicit revoke |
| `token_hash` | VARCHAR(255) | SHA-256 of the opaque cookie token; unique |
| `user_agent` | TEXT | Device/browser label |
| `ip_address` | INET | Last known IP |
| `created_at` | TIMESTAMPTZ | |
| `last_seen_at` | TIMESTAMPTZ | Sliding idle timeout |
| `expires_at` | TIMESTAMPTZ | 30-day absolute |
| `revoked_at` | TIMESTAMPTZ | Nullable |

Indexes: unique `token_hash`, `(user_id)`, `(expires_at)`.

### 2.2 `verification_tokens` (identity)

Single-use, hashed tokens for email verification and password reset.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | |
| `user_id` | UUID FK `users.id` | |
| `type` | VARCHAR(30) | `email_verify`, `password_reset` |
| `token_hash` | VARCHAR(255) | Unique |
| `expires_at` | TIMESTAMPTZ | 24 h email, 30 min reset |
| `used_at` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | |

Indexes: unique `token_hash`, `(user_id, type)`, `(expires_at)`.

### 2.3 `upload_sessions` (media)

One row per gallery upload batch.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | |
| `event_id` | UUID FK `events.id` | |
| `collection_id` | UUID FK `gallery_collections.id` | Nullable |
| `created_by` | UUID FK `users.id` | |
| `status` | VARCHAR(20) | `awaiting_upload`, `completing`, `processing`, `completed`, `partial`, `aborted`, `expired` |
| `created_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | 24 h |
| `completed_at` | TIMESTAMPTZ | Nullable |

Indexes: `(event_id, status)`, `(expires_at)`.

### 2.4 `upload_files` (media)

One row per file in an upload session.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | Server file ID |
| `upload_id` | UUID FK `upload_sessions.id` | |
| `gallery_item_id` | UUID FK `gallery_items.id` | Nullable until completion |
| `storage_object_id` | UUID FK `storage_objects.id` | Nullable until upload |
| `client_id` | VARCHAR(100) | Client-generated mapping ID |
| `original_name` | VARCHAR(255) | |
| `mime_type` | VARCHAR(100) | |
| `size` | BIGINT | |
| `etag` | VARCHAR(255) | Nullable; storage may not expose it |
| `status` | VARCHAR(20) | `pending`, `uploaded`, `failed`, `processing`, `published` |
| `error_code` | VARCHAR(100) | Nullable |
| `error_message` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

Constraints: unique `(upload_id, client_id)`. Indexes: `(upload_id, status)`.

### 2.5 `participant_imports` (participants)

Async fixed-template CSV import state.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | |
| `event_id` | UUID FK `events.id` | |
| `template_version` | VARCHAR(30) | |
| `file_object_id` | UUID FK `storage_objects.id` | Temporary private object |
| `error_report_object_id` | UUID FK `storage_objects.id` | Nullable |
| `status` | VARCHAR(20) | `validating`, `ready`, `importing`, `completed`, `failed`, `cancelled` |
| `row_count`, `valid_count`, `invalid_count` | INTEGER | |
| `duplicate_count`, `imported_count`, `skipped_count`, `failed_count` | INTEGER | |
| `summary` | JSONB | Validation summary |
| `issues` | JSONB | Row-level issues (also written to the error report) |
| `created_by` | UUID FK `users.id` | |
| `created_at`, `completed_at` | TIMESTAMPTZ | |

Indexes: `(event_id, status, created_at)`, `(created_at)` for cleanup.

### 2.6 `refunds` (commerce)

The contract exposes order/payment refunds, but the schema has no refund record.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | |
| `order_id` | UUID FK `orders.id` | |
| `payment_id` | UUID FK `payments.id` | Nullable |
| `amount` | BIGINT | IDR; full order total in v1 |
| `currency` | VARCHAR(3) | `IDR` |
| `reason` | TEXT | |
| `status` | VARCHAR(20) | `pending`, `succeeded`, `failed` |
| `provider_reference` | VARCHAR(255) | Nullable |
| `requested_by` | UUID FK `users.id` | |
| `created_at`, `processed_at` | TIMESTAMPTZ | |
| `error` | TEXT | Nullable, sanitized |

Constraint: at most one non-failed refund per order (partial refunds are later). Index:
`(order_id, status)`, `(created_at)`.

### 2.7 `outbox_events` (jobs)

Durable side-effect dispatcher.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | |
| `aggregate_type` | VARCHAR(100) | e.g. `gallery_item`, `order`, `certificate` |
| `aggregate_id` | UUID | |
| `event_type` | VARCHAR(150) | |
| `payload` | JSONB | Sanitized |
| `status` | VARCHAR(20) | `pending`, `dispatched`, `failed` |
| `attempts` | INTEGER | |
| `available_at` | TIMESTAMPTZ | Backoff |
| `dispatched_at` | TIMESTAMPTZ | Nullable |
| `error` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |

Index: `(status, available_at)`.

### 2.8 `idempotency_keys` (jobs)

Durable idempotency for orders, payments, imports, uploads, and generation.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | |
| `scope` | VARCHAR(100) | Route/operation key |
| `key` | VARCHAR(255) | Client `Idempotency-Key` |
| `request_hash` | VARCHAR(64) | SHA-256 of canonical request |
| `response_status` | INTEGER | |
| `response_body` | JSONB | Stored response |
| `created_at`, `expires_at` | TIMESTAMPTZ | 24 h |

Constraint: unique `(scope, key)`. Index: `(expires_at)`.

---

## 3. Altered tables

### 3.1 `events`

Add:

| Column | Type | Notes |
| --- | --- | --- |
| `registration_config` | JSONB NOT NULL DEFAULT `'{}'` | `allowMultipleParticipants`, `maxParticipantsPerOrder`, `identityNumberRequired`, `emergencyContactRequired`, `fields` |

The public registration config and the organizer registration setup both read this. Backfill existing
rows with the defaults used by the demo (multiple participants allowed, max 4, identity/emergency
optional).

### 3.2 `orgs`

Add:

| Column | Type | Notes |
| --- | --- | --- |
| `timezone` | VARCHAR(50) NOT NULL DEFAULT `'Asia/Jakarta'` | IANA zone |
| `currency` | VARCHAR(3) NOT NULL DEFAULT `'IDR'` | |
| `public_contact` | BOOLEAN NOT NULL DEFAULT `false` | Whether public pages expose org email/phone |

`public_contact` supports the public organizer-contact decision; the API returns `null` contact when
false.

### 3.3 `races`

- Rename `cut_off_time TIMESTAMP` → `cut_off_duration INTEGER` (minutes from `start_time`).
- Backfill: `round(extract(epoch from (cut_off_time - start_time)) / 60)`.
- Drop `cut_off_time` after the application stops reading it (expand/contract).
- Add a check `cut_off_duration > 0`.

### 3.4 `orders`

- `user_id` becomes nullable (public anonymous orders).
- Add `contact_email VARCHAR(255)` and `contact_phone VARCHAR(30)`.
- Backfill existing rows from `users.email`/`users.phone` where `user_id` is present.
- Consider `cancelled_at TIMESTAMPTZ` if cancellation timestamps are needed (optional; status alone
  may suffice).

### 3.5 `participants`

- `email` and `phone` become nullable. Public registration collects one order contact; participant
  rows may not have per-person contact.
- Add `import_id UUID FK participant_imports.id` (nullable) for traceability, if imports are audited
  per row; otherwise skip.
- Optional `source VARCHAR(20)` (`public`, `import`, `manual`) for support.
- Add `club_name VARCHAR(150)` (nullable) for the runner's club/team.
- Add `blood_type VARCHAR(5)` (nullable). This is health data; restrict access and never include it
  in generic list responses or logs.

### 3.6 `invitations`

- Add `declined` to the status values.
- Add `declined_at TIMESTAMPTZ` (nullable).
- Existing statuses: `pending`, `accepted`, `expired`, `revoked`.

### 3.7 `certificates`

- Change `UNIQUE(event_id, certificate_number)` to a **global unique** on `certificate_number` so
  `/cert/{certificateNumber}` is unambiguous. Verify existing global duplicates first.
- Add `UNIQUE(event_id, registration_id)` for idempotent generation (one certificate per
  registration). If product wants multiple certificates per registration, use a different
  idempotency key.
- Keep `storage_object_id`, `issued_at`, `revoked_at`.

### 3.8 `generated_documents`

Add:

| Column | Type | Notes |
| --- | --- | --- |
| `job_id` | UUID FK `jobs.id` | Async generation job |
| `template_version` | INTEGER | Version used |
| `output_mime_type` | VARCHAR(50) | `image/png` or `application/pdf` |
| `total_count` | INTEGER | Recipients |
| `processed_count` | INTEGER | |
| `failed_count` | INTEGER | |
| `file_count` | INTEGER | Output files |
| `recipient_filter` | JSONB | Sanitized filter |
| `requested_by` | UUID FK `users.id` | |
| `error_code` | VARCHAR(100) | Nullable |
| `error_message` | TEXT | Nullable |

Keep `status`, `generated_at`, `storage_object_id`.

### 3.9 `storage_objects`

Add:

| Column | Type | Notes |
| --- | --- | --- |
| `checksum` | VARCHAR(64) | SHA-256, nullable |
| `etag` | VARCHAR(255) | Provider ETag, nullable |
| `status` | VARCHAR(20) | `pending`, `verified`, `deleted` |
| `verified_at` | TIMESTAMPTZ | Nullable |
| `deleted_at` | TIMESTAMPTZ | Nullable |

This supports upload verification, cleanup, and lifecycle. Existing rows default to `verified` with
`verified_at = created_at`.

### 3.10 `gallery_items`

Add:

| Column | Type | Notes |
| --- | --- | --- |
| `error_code` | VARCHAR(100) | Nullable processing failure |
| `error_message` | TEXT | Nullable, sanitized |
| `processed_at` | TIMESTAMPTZ | Nullable |
| `model_version` | JSONB | Nullable; e.g. `{"bib":"...","face":"..."}` |

The existing status enum already covers `uploading`, `processing`, `published`, `failed`, `archived`.

### 3.11 `gallery_item_bibs` / `gallery_item_faces`

- Add `model_version VARCHAR(50)` (nullable) to both, for detector version traceability.
- `gallery_item_faces.qdrant_point_id` should be unique and indexed; as built (2026-11-13) Racetify
  generates the deterministic point ID itself, so a retried detection writes the same point.
- Add `(gallery_item_id)` indexes on both.

### 3.12 `jobs`

Add:

| Column | Type | Notes |
| --- | --- | --- |
| `idempotency_key` | VARCHAR(255) | Nullable; unique per type/scope |
| `max_attempts` | INTEGER NOT NULL DEFAULT 5 | |
| `scheduled_at` | TIMESTAMPTZ | Next attempt |
| `locked_at` | TIMESTAMPTZ | Lease |
| `locked_by` | VARCHAR(100) | Worker ID |
| `dead_lettered_at` | TIMESTAMPTZ | Nullable |
| `result` | JSONB | Nullable; sanitized summary |

Indexes: `(status, scheduled_at)`, `(type, status)`, `(org_id)`, `(event_id)`.

### 3.13 `audit_logs`

- Add `request_id VARCHAR(100)` (nullable) for correlation.
- Add indexes: `(org_id, created_at)`, `(event_id, created_at)`, `(user_id, created_at)`,
  `(action, created_at)`, `(resource_type, resource_id)`.

### 3.14 `webhook_deliveries`

- Add `(next_retry_at)` index for the retry scheduler.
- `payload` stays JSONB; API returns a redacted summary, not the raw payload.

### 3.15 `registrations`

Add only these fields for now:

| Column | Type | Notes |
| --- | --- | --- |
| `jersey_size` | VARCHAR(10) | Nullable; store a size code such as `XS`, `S`, `M`, `L`, `XL`, `2XL`, `3XL` |
| `chip_number` | VARCHAR(50) | Nullable; string to preserve leading zeros; timing chip identifier |

Notes:

- `jersey_size` is registration-scoped because the selected size can change per event.
- `chip_number` is registration/race-scoped. If chips are unique per event, add a partial unique
  index on `(event_id, chip_number)` where `chip_number IS NOT NULL`; if chips can be reused across
  events, scope the unique index to `(race_id, chip_number)`.
- Wave and corral assignment are deferred; do not add `wave_id`, `corral_id`, wave/corral tables, or
  check-in columns yet.
- Add `(event_id, jersey_size)` and `(event_id, chip_number)` indexes for organizer filters.
- Extend `ParticipantDTO` with `clubName`/`bloodType` and `RegistrationDTO` with `jerseySize`/
  `chipNumber`. Add `jersey_size` and `chip_number` columns to the fixed import template; keep
  `blood_type` optional and out of generic list responses.

---

## 4. Redis-only state (no table)

These are intentionally not PostgreSQL tables:

| State | Store | TTL |
| --- | --- | --- |
| Session cache | Redis | 5 min |
| Rate limits | Redis | window |
| CSRF binding | Redis | session |
| OAuth state/PKCE | Redis | 10 min |
| Permission snapshot | Redis | 60 s |
| Idempotency fast path | Redis | 24 h (durable copy in `idempotency_keys`) |
| Job queue | Redis Streams | consumer-managed |
| Face search results | Redis | 15 min |
| Locks | Redis | short |

`oauth_states` does not need a database table. `face_searches` does not need a table in v1.

---

## 5. Migration order

Use expand/contract; never make a destructive change in the same deploy that stops reading the old
shape.

1. **Identity:** create `sessions`, `verification_tokens`; indexes.
2. **Organizations:** add `orgs.timezone`, `currency`, `public_contact`; add `invitations.declined_at`
   and allow `declined`.
3. **Events:** add `events.registration_config`; add `races.cut_off_duration`, backfill from
   `cut_off_time`, keep both until the app reads only the new column, then drop the old column.
4. **Participants:** relax `participants.email`/`phone`; add `club_name`, `blood_type`,
   `jersey_size`, `chip_number`; create `participant_imports`; add the chip/jersey indexes.
5. **Commerce:** make `orders.user_id` nullable; add contact fields and backfill; create `refunds`.
6. **Storage/media:** add verification fields to `storage_objects`; create `upload_sessions` and
   `upload_files`; add processing fields to `gallery_items`; add model versions; indexes.
7. **Documents:** add progress fields to `generated_documents`; add certificate uniqueness
   constraints after duplicate cleanup.
8. **Jobs/audit:** create `outbox_events`, `idempotency_keys`; add job retry/lease fields; add audit
   indexes and `request_id`.
9. **Backfill validation:** counts, null checks, duplicate certificate scan, duration calculation.
10. **Cleanup:** drop `races.cut_off_time` after the contract window; remove temporary objects.

---

## 6. Validation and risks

- **Certificate duplicates:** scan `certificates` for duplicate `certificate_number` values across
  events before adding the global unique index.
- **Cutoff backfill:** verify `cut_off_time > start_time` and the computed minutes are positive;
  decide how to handle rows that fail.
- **Existing events:** `registration_config` defaults must match the demo/public expectations.
- **Existing orders:** public orders may have no `user_id`; ensure the nullable migration and contact
  backfill are complete before enabling public checkout.
- **Participant contact:** existing rows keep email/phone; new public rows may have null. The API and
  UI must handle null.
- **Generated documents:** progress counters must be updated transactionally with the job; do not
  rely on the `jobs` table for user-facing progress unless the contract allows it.
- **Storage verification:** existing storage objects need a backfill to `verified`; otherwise upload
  completion checks may treat them as pending.
- **Indexes:** add them concurrently on large tables in production.
- **RLS:** if enabled, policies must cover the new tables and schemas.

---

## 7. Open decisions

| # | Decision | Recommendation |
| --- | --- | --- |
| 1 | `orgs.public_contact` | Add it; default `false` until the public contact policy is approved |
| 2 | `certificates` one per registration | Enforce with `UNIQUE(event_id, registration_id)` |
| 3 | `participants.import_id` / `source` | Add both for traceability if import audit is required; otherwise skip |
| 4 | `refunds` partial refunds | v1 full refunds only; add partial columns later |
| 5 | `jobs` result payload | Keep a sanitized JSON summary; never store PII or provider raw responses |
| 6 | `gallery_items.model_version` JSONB vs two columns | Use JSONB for detector versions |
| 7 | `orders.cancelled_at` | Add only if the UI needs the timestamp; status may suffice |
| 8 | `chip_number` uniqueness | Unique per event by default; switch to per race if chips are reused within an event |
| 9 | `blood_type` visibility | Restrict with a dedicated medical permission; never return it in generic participant lists |
| 10 | Jersey size codes | Store codes only; add a size chart if fit/type (men/women/youth) is needed later |

---

## 8. Acceptance

1. Migrations apply cleanly on an empty database and on a copy of production data.
2. Every new table has tenant/foreign-key indexes and unique constraints.
3. `cut_off_duration` is backfilled and the old column is removed after the compatibility window.
4. Public checkout works with nullable `orders.user_id` and contact fields.
5. Certificate numbers are globally unique and generation is idempotent per registration.
6. Upload sessions/files and participant imports are auditable and cleanable.
7. Jobs/outbox/idempotency tables support retries and replay.
8. Backups and restore include all new tables.
