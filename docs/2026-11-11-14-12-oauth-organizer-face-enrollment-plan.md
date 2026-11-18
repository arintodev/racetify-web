# OAuth Clients for Organizer-Managed Face Enrollment

**Status:** Implemented (backend), v1 is server-to-server only; see README B8 for as-built notes
**Date:** 2026-11-11
**Updated:** 2026-11-13 — Racetify now owns Qdrant for enrollment writes/deletes and exposes face
search; see [Face embeddings + Qdrant search](./2026-11-13-15-06-face-embeddings-qdrant-search.md)
**Owners:** Backend (identity + admin), platform security, legal/privacy
**Scope:** Let an organization register a confidential OAuth client and use it, server-to-server,
to create and manage face enrollments for its own users.

---

## 1. Problem and confirmed decisions

Today:

- Face-enrollment tables and the read-only admin surface exist, but there is no enrollment
  creation flow.
- API authentication is session/cookie based for humans. There is no way for an organizer's own
  backend (HR portal, membership system, onboarding service) to call tenant APIs.
- Google login is a stub; Racetify has no OAuth authorization server.

Confirmed decisions:

1. **Racetify is the OAuth 2.1 authorization server.** Organizer backends are confidential clients.
2. **Only server-to-server.** v1 supports the `client_credentials` grant only. There is no browser
   authorization endpoint, no authorization-code flow, no PKCE, and no organizer-facing consent
   screen.
3. **Organizer-attested consent is acceptable.** The organizer is responsible for capturing the
   subject's consent and must submit a consent attestation for every enrollment.
4. **Immediate purge.** Enrollment images are deleted as soon as the face service finishes
   processing them, whether processing succeeded or terminally failed. There is no image-retention
   window and no manual review of source images.

Deferred: authorization-code/PKCE delegated apps, self-enrollment, public face search, admin
review/approve/reject actions, third-party IdP federation.

---

## 2. Goals and non-goals

### Goals

- Register, rotate, and revoke per-organization confidential OAuth clients.
- Issue short-lived organization-scoped bearer tokens with the `client_credentials` grant.
- Map OAuth scopes to existing permission names and enforce tenant isolation.
- Provide a server-to-server enrollment lifecycle API: create with consent attestation → upload
  image → submit → active → revoke/delete.
- Store versioned consent evidence and audit every action.
- Integrate the face service enrollment contract behind a trait, with a stub fallback. As built, the
  service returns embeddings and Racetify writes/deletes Qdrant points.
- Purge source images immediately after processing; store only Qdrant point references.

### Non-goals

- Browser-based authorization, PKCE, refresh tokens, or user-delegated tokens.
- Self-service subject consent or withdrawal UI.
- Subjects are either a platform user (`subjectUserId`, active org member) or the tenant's opaque
  user identifier (`subjectRef`). Both are supported.
- Admin enrollment review, billing/quota. (Public face search and organizer face search were added
  in the 2026-11-13 backend pass; no frontend UI yet.)

---

## 3. Architecture decisions

| # | Decision | Rationale / trade-off |
| --- | --- | --- |
| D1 | Racetify is the OAuth 2.1 authorization server; organizer backends are confidential clients. | We control scope, org binding, audit, and revocation. External IdPs cannot express Racetify scopes or our consent record. |
| D2 | `client_credentials` only; no authorization endpoint, codes, PKCE, or refresh tokens. | Matches "server-to-server only". Simpler attack surface for biometric access. The client re-authenticates with its secret when the 15-minute token expires. |
| D3 | Opaque bearer access tokens, hashed at rest; no JWT/JWKS in v1. | Reuses `auth::generate_opaque_token` / `hash_token`; instant revocation; no key distribution. Cost: one indexed DB lookup per request, same as sessions. |
| D4 | Scopes are the existing permission strings: `org:face-enrollments:view`, `org:face-enrollments:manage`. | One authorization vocabulary. Client tokens are checked against the client's registered scopes and `client.org_id == path orgId`. |
| D5 | Tokens carry `(client_id, org_id, scopes)` and no user. | Client-credential actions are audited as the client, not as an impersonated user. |
| D6 | Consent is organizer-attested and mandatory per enrollment. | Legal approved attested consent for this server-to-server use case. Every enrollment stores the attestation: method, policy version, timestamp, attesting organizer reference, jurisdiction, and an evidence hash. Missing evidence → `422 face_enrollment_consent_required`. |
| D7 | Enrollment ownership evolves: `user_id` for self-enrollment, `org_id` for org-managed enrollment, plus `subject_user_id` for the data subject. | The current XOR `user_id`/`org_id` cannot express "org owns the enrollment, user is the subject". v1 always creates org-managed rows with `subject_user_id` set. |
| D8 | Source images are purged immediately after the face service call; metadata and Qdrant refs remain. | Minimizes biometric data at rest. Admin previews work only while an image is still pending processing; after purge the preview returns `410 enrollment_image_purged`. |
| D9 | The face service enrollment call lives behind a trait and returns embeddings; Racetify owns Qdrant writes and deletes. | The face contract stays swappable while point IDs, collection names, and idempotent retries stay under our control. Stubs keep the metadata API shippable. |
| D10 | Client secrets and tokens are stored as hashes; secrets are shown once. | Prevents credential disclosure from DB reads or logs. |

---

## 4. Actors and flow

Actors: organization owner (manages clients in the web UI), organizer backend (OAuth client), data
subject (platform user), Racetify token endpoint, tenant API, face service, Qdrant, worker.

```text
Organizer backend            Racetify auth/API               Face service / Qdrant
       |                            |                                |
       |-- POST /oauth/token ------>|  client_id + secret            |
       |<-- access token (15m) -----|                                |
       |                            |                                |
       |-- POST /orgs/{id}/face-enrollments ----------------------> |
       |   (subjectUserId + consent attestation)                   |
       |-- POST .../images (presigned upload) -------------------> |
       |-- POST .../submit --------------------------------------> |
       |                            |-- presign image URL ---------->|
       |                            |-- POST /detect/single (xN) --->|
       |                            |<-- embeddings -----------------|
       |                            |-- upsert enrolled_faces ------>| (Qdrant, Racetify-owned)
       |                            |-- purge source image --------->|
       |                            |-- store refs, activate         |
       |<-- 200 active -------------|                                |
       |                            |                                |
       |-- POST .../revoke -------->|-- delete points ------------>| (Qdrant, Racetify-owned)
       |                            |-- audit, tombstone metadata    |
```

1. An organization owner registers a client in Racetify and receives a `client_id` and a one-time
   secret (stored hashed).
2. The organizer backend calls `POST /v1/oauth/token` with `grant_type=client_credentials`, its
   `client_id`/`client_secret`, and the requested scope subset.
3. The backend creates an enrollment draft with the subject and consent attestation, uploads one
   image via a presigned PUT, and submits.
4. The worker calls the face service with a short-lived signed image URL, validates the returned
   embeddings, writes deterministic points to the Racetify-owned `enrolled_faces` collection,
   stores the point references and the configured model version, purges the source image, and
   activates the enrollment.
5. Revocation marks the enrollment deleted and deletes its Qdrant points (idempotent by
   deterministic point ID).
6. Every mutation and image access is audited.

### Consent attestation

The organizer must provide, per enrollment:

```json
{
  "method": "organizer_attested",
  "policyVersion": "biometric-2026-11",
  "capturedAt": "2026-11-11T14:10:00Z",
  "capturedBy": "hr-onboarding-2026-11",
  "jurisdiction": "ID",
  "evidenceHash": "sha256:..."
}
```

- `capturedBy` is an opaque organizer-side reference, not PII.
- The API stores the attestation and never returns raw evidence.
- Withdrawal is requested through the organizer's client (`POST .../revoke`) or support in v1.
  Self-service withdrawal is deferred; `revoked_at` and audit records preserve the trail.

---

## 5. OAuth API surface

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/v1/orgs/{orgId}/oauth-clients` | org owner session | Register client; secret returned once |
| `GET` | `/v1/orgs/{orgId}/oauth-clients` | org owner session | List clients (no secrets) |
| `POST` | `/v1/orgs/{orgId}/oauth-clients/{clientRowId}/rotate-secret` | org owner session | Rotate secret with a 24-hour overlap |
| `DELETE` | `/v1/orgs/{orgId}/oauth-clients/{clientRowId}` | org owner session | Revoke client and all tokens |
| `POST` | `/v1/oauth/token` | client authentication | `client_credentials` grant |
| `POST` | `/v1/oauth/revoke` | client authentication | RFC 7009 token revocation |
| `POST` | `/v1/oauth/introspect` | client authentication | RFC 7662 introspection |
| `GET` | `/.well-known/oauth-authorization-server` | public | Metadata |

Rules:

- Client authentication: HTTP Basic or `client_id`/`client_secret` form fields; constant-time hash
  comparison.
- Access token: 15 minutes; opaque, 32+ bytes; returned once; stored as a hash.
- No refresh token is issued. A new token is requested with the client credentials.
- Requested scopes must be a subset of the client's registered scopes.
- Client secrets: 32+ bytes, Argon2id hash, shown once; last four characters stored for display.
- Client registration is restricted to the organization owner session; biometric writes are
  owner-scoped in v1.
- Rate limits: 10 token requests/min/client, 30 introspection/min/client, plus per-IP limits.
- Revoking a client, rotating its secret, suspending the org, or deleting the org invalidates all
  outstanding tokens immediately.

### Token response

```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "org:face-enrollments:manage"
}
```

---

## 6. Enrollment API surface

All paths are `/v1/orgs/{orgId}/...` and accept either the organizer owner session or an
org-scoped client bearer token.

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| `POST` | `/face-enrollments` | manage | Create draft with consent attestation |
| `GET` | `/face-enrollments` | view | List/filter |
| `GET` | `/face-enrollments/{enrollmentId}` | view | Detail (no embeddings/points) |
| `POST` | `/face-enrollments/{enrollmentId}/images` | manage | Presigned image upload |
| `DELETE` | `/face-enrollments/{enrollmentId}/images/{imageId}` | manage | Remove an image before submit |
| `POST` | `/face-enrollments/{enrollmentId}/submit` | manage | Validate and enqueue processing |
| `POST` | `/face-enrollments/{enrollmentId}/revoke` | manage | Withdraw consent, delete vectors |
| `DELETE` | `/face-enrollments/{enrollmentId}` | manage | Soft-delete and purge |

### Create draft

```json
POST /v1/orgs/{orgId}/face-enrollments
Idempotency-Key: <uuid>
Authorization: Bearer <token>

{
  "subjectUserId": "018f...",
  "consent": {
    "method": "organizer_attested",
    "policyVersion": "biometric-2026-11",
    "capturedAt": "2026-11-11T14:10:00Z",
    "capturedBy": "hr-onboarding-2026-11",
    "jurisdiction": "ID",
    "evidenceHash": "sha256:..."
  }
}
```

- Provide exactly one of `subjectUserId` (an active user in the organization) or `subjectRef` (the
  tenant's opaque user identifier, `^[A-Za-z0-9_.:-]{1,200}$`). The as-built API supports both.
- Guardian/minor checks are deferred: the platform has no date-of-birth field for subjects, so v1
  relies on the organizer attestation for age eligibility.
- The server rejects a second active or in-flight enrollment for the same `(org, subject)`.
- The draft starts at `status: pending` with consent recorded inline.
- Response: enrollment ID, subject, status, consent metadata summary, timestamps.

### Image upload

- `POST .../images` returns a presigned PUT (JPEG/PNG/WebP, max 10 MB, TTL 10 min) and an image ID.
- The client PUTs the file, then calls submit. The server verifies size and content type.
- At most 3 images per enrollment; exactly one successfully processed image activates the
  enrollment.
- Images are purged immediately after the face service call completes. The API stores only a
  content hash, dimensions, and processing outcome.

### Submit

- Requires: consent attestation, ≥1 uploaded image, draft status.
- Sets `status = processing`, enqueues `identity.face_enrollment.process`.
- Idempotent by `Idempotency-Key`; submitting twice returns `409 face_enrollment_not_draft`.

### Revoke/delete

- `revoke` records `revoked_at`, sets `status = deleted`, enqueues face-service point deletion, and
  writes an audit row.
- `DELETE` is a soft delete followed by the same revocation path.
- Metadata is retained as a deletion/consent tombstone; images are already gone.

### Admin preview after purge

The admin image-preview endpoint remains for in-flight images only. Once the image is purged it
returns `410 enrollment_image_purged`. This must be reflected in the admin UI copy.

---

## 7. Data model

### New `oauth` schema

```sql
CREATE SCHEMA IF NOT EXISTS oauth;

CREATE TABLE oauth.clients (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations.orgs (id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    client_id VARCHAR(64) NOT NULL UNIQUE,
    secret_hash TEXT NOT NULL,
    secret_last_four VARCHAR(4) NOT NULL,
    scopes TEXT[] NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES identity.users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT oauth_clients_status_check CHECK (status IN ('active', 'revoked'))
);

CREATE TABLE oauth.tokens (
    id UUID PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL,
    org_id UUID NOT NULL,
    scopes TEXT[] NOT NULL,
    access_token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX oauth_tokens_client_idx ON oauth.tokens (client_id);
CREATE INDEX oauth_tokens_org_idx ON oauth.tokens (org_id);
CREATE INDEX oauth_tokens_expiry_idx ON oauth.tokens (expires_at);
```

There is no authorization-code table, no OAuth consent table, and no refresh-token column.

### Enrollment schema evolution

```sql
ALTER TABLE identity.face_enrollments
    ADD COLUMN subject_user_id UUID REFERENCES identity.users (id) ON DELETE SET NULL,
    ADD COLUMN subject_ref VARCHAR(200),
    ADD COLUMN created_by_user_id UUID REFERENCES identity.users (id) ON DELETE SET NULL,
    ADD COLUMN created_by_client_id VARCHAR(64),
    ADD COLUMN consent_source VARCHAR(30) NOT NULL DEFAULT 'organizer_attested',
    ADD COLUMN consent_policy_version VARCHAR(40),
    ADD COLUMN consent_evidence_hash TEXT,
    ADD COLUMN consent_captured_at TIMESTAMPTZ,
    ADD COLUMN consent_captured_by VARCHAR(120),
    ADD COLUMN consent_jurisdiction VARCHAR(2),
    ADD COLUMN failure_reason TEXT;

ALTER TABLE identity.face_enrollments
    DROP CONSTRAINT face_enrollments_owner_check;

ALTER TABLE identity.face_enrollments
    ADD CONSTRAINT face_enrollments_owner_check CHECK (
        (user_id IS NOT NULL AND org_id IS NULL)
        OR (org_id IS NOT NULL)
    );

ALTER TABLE identity.face_enrollments
    DROP CONSTRAINT face_enrollments_status_check;

ALTER TABLE identity.face_enrollments
    ADD CONSTRAINT face_enrollments_status_check CHECK (
        status IN ('pending', 'processing', 'active', 'failed', 'deleted')
    );

CREATE UNIQUE INDEX face_enrollments_active_subject_unique
    ON identity.face_enrollments (org_id, subject_user_id)
    WHERE status IN ('pending', 'processing', 'active') AND subject_user_id IS NOT NULL;
```

Image additions: `content_sha256`, `width`, `height`, `processed_at`, `error`, `purged_at`.
Embedding additions: `model_version`, `status`, `deleted_at`.

Org-managed enrollments require exactly one of `subject_user_id` or `subject_ref`; user-owned rows
keep `user_id` and no org. The unique active-subject indexes cover both subject kinds. Current
tables are empty in production, so no backfill is needed.

### Permission additions

Seed `org:face-enrollments:view` and `org:face-enrollments:manage`; grant both to `org:owner` in v1.
Admin delegations can be added later after biometric access is reviewed.

---

## 8. Code changes by module

| Area | Change |
| --- | --- |
| `identity` | New `oauth` module: client registry, secret hashing/rotation, token issue/revoke/introspect. |
| `api` middleware | Bearer auth path for OAuth tokens; request principal distinguishes session user vs OAuth client; `Authorization` header redacted from logs. |
| `api` authorization | New `authorize_org_client` check: token scope + `client.org_id == path orgId` + client active + org active. Session path unchanged. |
| `identity` (enrollment) | Domain/repository/service for create/list/detail/images/submit/revoke/delete; routes under `/v1/organizations/{orgId}/face-enrollments`. |
| `storage` | Presigned uploads; object deletion and purge helper for enrollment images. |
| `jobs`/`worker` | Events `identity.face_enrollment.process`, `.delete`; immediate purge in the same job; retries/dead-letter visible to admins. |
| `face-detector` integration | As built: `FaceEnroller` trait (`enroll`) calling `POST /detect/single` once per image; stub adapter. Racetify owns Qdrant writes/deletes, so there is no `/enroll` or `/delete` call. |
| `access` | Permission seeds and owner grants. |
| `admin` | Face-enrollment read surface shows new fields/statuses; preview returns `410 enrollment_image_purged` after purge. |
| `config` | `oauth_issuer_url`, `oauth_access_ttl`, `face_enrollment_enabled`, `face_service_enroll_timeout_secs`. |
| `openapi` | New schemas/paths; regenerate contract. |
| Docs | Integration guide, consent attestation template, revocation/purge runbook. |

---

## 9. Privacy and retention

- **Legal basis:** explicit consent for biometric processing, captured and attested by the
  organizer. DPIA and a DPA with the face-service operator remain launch blockers.
- **Consent record:** policy version, subject, org, client, timestamp, method, attesting reference,
  jurisdiction, and evidence hash. Withdrawal through the organizer client or support in v1.
- **Minors:** guardian consent is not yet supported; v1 relies on the organizer attestation until a
  date-of-birth source exists.
- **Images:** purged immediately after the face service call (success or terminal failure). No
  configurable retention window.
- **Metadata:** retained as an active enrollment, then as a deletion/consent tombstone after
  revocation; Racetify deletes the Qdrant points through the `identity.face_enrollment.delete`
  outbox job (idempotent, retried on failure).
- **Data subject rights:** export and deletion handled through support operations in v1; deletion
  audit trail retained.
- **Responses/logs:** no embeddings, Qdrant IDs, image bytes, signed URLs, secrets, or tokens.

---

## 10. Security controls

- Argon2id client-secret hashing; constant-time comparison; rotation with a 24-hour overlap.
- Token lookup by hash; revoke on secret rotation, client deletion, org suspension, or user action.
- Exact tenant check: a token for org A returns `404` for org B resources, never `403`.
- Bearer routes are CSRF-exempt; CORS is not needed for server-to-server and should remain closed.
- Rate limits: token, introspection, enrollment creates, uploads, submits.
- Audit actions: `oauth.client.created`, `oauth.client.secret_rotated`, `oauth.client.revoked`,
  `oauth.token.issued`, `oauth.token.revoked`, `face_enrollment.created`, `.submitted`,
  `.activated`, `.failed`, `.revoked`, `.image_purged`.
- Penetration test focused on client authentication, scope escalation, cross-tenant access, and
  consent bypass.

---

## 11. Delivery phases

| Phase | Duration | Deliverables | Exit criteria |
| --- | --- | --- | --- |
| P0 — Design & legal | 0.5 week | ADR, migration draft, permission seeds, consent attestation template, DPIA kickoff | Legal confirms attested-consent wording; security signs off on token model |
| P1 — OAuth server | 1.5 weeks | Client registry, secret rotation, token/revoke/introspect, bearer middleware, rate limits | Client-credentials flow passes integration tests; cross-org isolation verified |
| P2 — Enrollment API | 2 weeks | Create with attestation, images, submit, list/detail, revoke/delete, audit, permissions | Enrollment reaches `processing` with stubbed face client; state machine/idempotency tested |
| P3 — Face integration | 1.5 weeks | Enrollment adapter returning embeddings, worker jobs, Racetify-owned Qdrant writes/deletes, immediate purge, retries | Active enrollment with real/stub service; images purged; revocation deletes points |
| P4 — Hardening & pilot | 1 week | Integration guide, sandbox client, pen test, runbook, feature flag rollout | Pilot org completes enrollment end-to-end; criticals closed |

Total: ~6.5 weeks with 2 backend engineers plus legal review.

---

## 12. Test plan

- Unit: client secret hashing/rotation, token issue/expiry/revocation, scope subset checks, consent
  attestation validation, enrollment state transitions, idempotency.
- Integration: token → create → upload → submit → active; revoke cascade; cross-org denial;
  missing attestation; duplicate active enrollment; expired/revoked token.
- Failure: face service timeout/5xx, per-image rejection, purge failure/retry, worker dead-letter.
- Security: client secret brute force, scope escalation, token replay after revocation, oversized
  uploads, unsupported formats, header/log leakage.
- Observability: token issuance/revocation, auth failures by reason, enrollment funnel, face-service
  latency/errors, purge backlog age. Alert on purge failures and face-service error budget burn.

---

## 13. Alternatives considered

| Option | Why not |
| --- | --- |
| API keys per organization | No scopes, weaker rotation/audit, no OAuth interoperability. |
| Authorization code + PKCE | Rejected for v1 by the server-to-server decision; revisit for delegated apps. |
| JWT access tokens | Adds key management and delays revocation; opaque tokens match existing primitives. |
| Subject-confirmed consent screen | Rejected in favor of organizer attestation; self-service consent remains a later feature. |
| Retain images for review | Rejected: immediate purge minimizes biometric data at rest. |

---

## 14. Remaining open decisions (non-blocking)

1. **Liveness / anti-spoofing:** is a single still image acceptable, or must the face service add a
   liveness endpoint before production? Recommendation: require liveness before general
   availability; the enrollment API already carries a per-image processing result.
2. **Subject withdrawal:** support-only in v1 vs. an organizer-initiated withdrawal endpoint. The
   plan supports `POST .../revoke`; a self-service path is deferred.
3. **Pilot scope:** one organization behind `face_enrollment_enabled`; confirm the pilot org and
   DPIA owner.

---

## 15. Rollout

- Feature flag `face_enrollment_enabled` per organization, default off.
- Pilot with one organizer and a signed DPIA; monitor enrollment funnel, face-service errors, and
  purge metrics.
- Kill switch revokes all client tokens and stops enrollment writes without deleting metadata.
- Publish an integration guide with a sandbox client and sample cURL/TypeScript flows.
- Add the new endpoints to the generated OpenAPI contract and the frontend permission catalog.
