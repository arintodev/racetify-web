# Face Embeddings in Qdrant + Face Search (as built)

- **Date:** 2026-11-13
- **Scope:** Backend (`racetify-api`); contracts synced to `packages/api-contract` and
  `packages/api-client`. No frontend screens in the original pass; the public selfie search UI was
  wired later (2026-11-15).
- **Related:** [Backend API Plan](./2026-11-11-00-01-backend-api-plan.md) ·
  [OAuth Face Enrollment](./2026-11-11-14-12-oauth-organizer-face-enrollment-plan.md) ·
  [Public Contract](./2026-11-10-19-17-api-contract-public.md) ·
  [Public Face Search + Bib Submit](./2026-11-15-00-08-public-face-search-and-bib-submit.md) ·
  [Gallery & Media](./2026-11-10-19-17-api-contract-gallery-media.md)

## 1. Ownership change

Previously the external face service owned Qdrant and returned point IDs. Racetify stored the
references and never saw vectors. Now:

| Concern | Owner |
| --- | --- |
| Face detection and embeddings | Face service (`POST /detect/single`) |
| Qdrant writes, deletes, searches, point IDs, payloads | Racetify (`api` + `worker`) |
| Point references and model version | PostgreSQL (`gallery.gallery_item_faces`, `identity.face_embeddings`) |

The detector contract shrank: it returns `embedding` per face and no model version, delete, or
search surface. The service has no batch enrollment endpoint, so Racetify calls `/detect/single`
once per enrollment image and derives point IDs itself.

## 2. Collections and point IDs

- `enrolled_faces` and `gallery_faces` (names configurable), cosine distance, vector size
  `QDRANT_VECTOR_SIZE` (default 512). Both are created and checked at startup; an existing collection
  with a different size fails loudly rather than silently mixing models.
- Payload indexes on `org_id`, `event_id`, `gallery_item_id`, `enrollment_id`.
- Payloads contain identifiers only:
  - gallery: `org_id`, `event_id`, `gallery_item_id`, `face_index`, `model_version`
  - enrollment: `org_id`, `enrollment_id`, `image_id`, `face_index`, `model_version`
- Point IDs are deterministic UUIDv5 values derived from the owning row, so a retried job
  overwrites the same points and a delete can be replayed. A re-detection deletes by
  `gallery_item_id` before upserting, so fewer faces cannot leave stale vectors.

## 3. Write flows

**Gallery detection** (`gallery.detect_faces`): detector → validate embeddings (size, finite) →
`delete_by_key(gallery_item_id)` → upsert → store point IDs + model version. Deleting an item or
`gallery.delete_faces` removes points first, then metadata; the outbox retries until Qdrant
succeeds.

**Enrollment** (`identity.face_enrollment`): one `/detect/single` call per image → validate
embeddings → generate point IDs → upsert → same transaction writes `face_embeddings` and activates
→ purge images. Each image must contain exactly one face. Upsert happens before the image purge so
a Qdrant failure keeps the source images and the job retries. Revocation deletes points for every
enrollment image, then tombstones and purges.

## 4. Search surfaces

### Public anonymous (async)

| Method | Path | Result |
| --- | --- | --- |
| `POST` | `/v1/public/events/{eventSlug}/gallery/face-searches` | `202 FaceSearchDto` |
| `GET` | `/v1/public/events/{eventSlug}/gallery/face-searches/{searchId}` | `200 FaceSearchDto` |

- `multipart/form-data`: `image` (JPEG/PNG/WebP, ≤ 10 MB, magic-byte sniffed) and `consent=true`.
- Rate limit 5 per IP per 10 minutes; `429 rate_limited`.
- Redis record: `pending → processing → completed | failed`, 15-minute TTL, plus a 24-hour `seen`
  marker so an expired ID returns `410 face_search_expired` instead of `404`.
- The job requires exactly one face (`face_search_no_face` / `face_search_multiple_faces`
  otherwise), searches with an `org_id` + `event_id` filter, filters hits to `published`,
  non-deleted items in `is_public` collections, and stores item IDs only.
- The query image is deleted on every deterministic outcome; a transient detector/Qdrant error
  keeps it and retries via the outbox.
- Response (`FaceSearchDto`): `id`, `eventSlug`, `status`, `consentAt`, `itemIds`, `resultCount`,
  `expiresAt`, `error { code, message }?`.

### Organizer (sync)

| Method | Path | Permission |
| --- | --- | --- |
| `POST` | `/v1/events/{eventId}/gallery/face-searches/enrolled` | `event:gallery:view` + `org:face-enrollments:view` |
| `POST` | `/v1/events/{eventId}/gallery/face-searches/selfie` | `event:gallery:view` (+ `org:face-enrollments:view` for OAuth clients) |

- Enrolled query: JSON with exactly one of `enrollmentId`, `subjectUserId`, `subjectRef`. Reads the
  active enrollment's vectors from `enrolled_faces`, searches each (max 3), merges by item with the
  max score. Missing vectors → `409 face_enrollment_not_indexed` (legacy enrollments must
  re-enroll).
- Selfie query: multipart `image`, detect one face, search. `422 face_search_no_face` /
  `face_search_multiple_faces`; detector/Qdrant failure → `503 face_search_unavailable`.
- Response (`FaceSearchResultDto`): `items` (`GalleryItemSummaryDto[]`, score-ordered) and
  `matchCount`. Organizer search is **not** public-visibility filtered: any non-deleted item in the
  event can match, including unpublished and archived-but-not-deleted items. No scores, vectors, or
  point IDs.
- Audited as `face_search.organizer`; OAuth-originated searches include `clientId` in the metadata.
- Both routes accept an organization-bound OAuth client holding `event:gallery:view` (the event must
  belong to the client's organization, otherwise `404 event_not_found`) as well as a session user.
  Selfie search additionally requires `org:face-enrollments:view` for clients.
- Enrollment activation and terminal failure emit organization-wide webhooks
  (`face_enrollment.activated` / `face_enrollment.failed`); the organizer owner configures the
  endpoints at `/v1/orgs/{orgId}/webhooks`. Polling remains the reconciliation path.

## 5. Privacy and safety

- Explicit consent required; no query-image retention; results expire in 15 minutes.
- Responses never include embeddings, scores, face metadata, or Qdrant IDs.
- Public results are limited to public items of that event.
- Logs never include image bytes/URLs, embeddings, point IDs, or detector payloads.
- Org/event filters are mandatory on every query; cross-tenant vectors cannot match.

## 6. Configuration

`QDRANT_URL` (`http://qdrant:6333` in Compose) enables the real client; unset selects a no-op store
for local development and tests. Production requires it when the face detector or enrollment is
enabled.

| Variable | Default |
| --- | --- |
| `QDRANT_API_KEY` | unset |
| `QDRANT_TIMEOUT_SECS` | 10 |
| `QDRANT_VECTOR_SIZE` | 512 |
| `QDRANT_ENROLLED_COLLECTION` | `enrolled_faces` |
| `QDRANT_GALLERY_COLLECTION` | `gallery_faces` |
| `QDRANT_MODEL_VERSION` | `unknown` (stored with every point) |
| `QDRANT_SEARCH_MIN_SCORE` | 0.5 |
| `QDRANT_SEARCH_SCAN_LIMIT` | 200 |
| `PUBLIC_FACE_SEARCH_RESULT_LIMIT` | 50 |
| `PUBLIC_FACE_SEARCH_RATE_LIMIT` | 5 |
| `FACE_SEARCH_IMAGE_MAX_BYTES` | 10485760 |

## 7. Operations notes

- Backfill: re-run `gallery.detect_faces` per item to populate `gallery_faces`.
- Existing active enrollments cannot be backfilled (images purged); subjects must re-enroll.
- Snapshots: `POST /collections/{name}/snapshots` for both collections; losing `enrolled_faces`
  costs every subject a re-enrollment.
- Tune `QDRANT_SEARCH_MIN_SCORE` against the deployed model; changing `QDRANT_VECTOR_SIZE`
  requires fresh collections and a full backfill.
- Full incident steps live in the backend runbook
  (`racetify-api/docs/2026-11-11-13-00-operations-runbook.md`).

## 8. Frontend status

Public selfie search is wired in `apps/web` (2026-11-15): **Find my photos** on the public gallery
opens a consent + selfie dialog, polls the async search, and shows the matched public items in the
same grid and lightbox. It is **anonymous for now** — no public login, owner binding, or OAuth
changes — and the dialog carries the privacy copy (selfie deleted after processing, 15-minute result
expiry). See
[Public face search + bib submit](./2026-11-15-00-08-public-face-search-and-bib-submit.md).

Organizer face search (enrolled/selfie endpoints) still has no UI in `apps/app`. The generated
contract (`packages/api-contract/openapi.yaml`,
`packages/api-client/src/generated/schema.d.ts`) includes all operations and DTOs, so an organizer
panel needs no further contract work. Making public face search require login, or tightening the
biometric policy, remains a separate decision pending DPIA review.
