# Frontend API Contract — Gallery & Media

> **Status:** Implemented (2026-11-12); public gallery is preview-only. Face search (public and
> organizer) is implemented in the backend (2026-11-13) with no frontend UI yet. The media worker
> bakes the active gallery watermark into processed photos (2026-11-16).
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Applies to:** Gallery, collections, upload, and watermark screens in `apps/app`
> **Related:** [General Contract](./2026-11-10-19-17-frontend-api-contract-general.md) ·
> [Event Setup](./2026-11-10-19-17-api-contract-events.md) ·
> [Public Content](./2026-11-10-19-17-api-contract-public.md) ·
> [Gallery Upload Frontend Plan](./2026-11-10-20-46-gallery-upload-frontend-plan.md) ·
> [Model Schema](./2026-11-10-06-52-model-schema-complete.md)

This feature covers gallery collections, uploads, gallery items, read-only bib and face metadata,
signed image URLs, and watermarks. Public gallery reads are specified in
[Public Content](./2026-11-10-19-17-api-contract-public.md).

**Implementation notes (2026-11-12):** the organizer screens use the live API. Upload sessions use
three concurrent presigned `PUT`s and poll processing. Watermarks are managed as presets with a raw
image upload. Public gallery JSON exposes `previewUrl` only (no original URL); the separate download
endpoint streams original bytes. The platform-admin storage screens were removed, so no endpoint
exposes storage providers or object metadata.

**Implementation notes (2026-11-16):** watermark configuration is resolution-independent. Sizes
are expressed relative to the photo's longest edge and margins/spacing relative to the shortest
edge; the legacy `scale` multiplier was retired and existing rows were re-based. Presets are still
event-scoped and `isDefault` is the activation state (the UI labels it **Active**). Switching a
preset between `image` and `text` is supported on `PATCH`. The shared frontend/worker calculation
rules live in [Watermark Rendering Rules](./2026-11-16-10-53-watermark-rendering-rules.md). The
editor and preview are documented in
[Watermark Configuration UI](./2026-11-16-10-53-watermark-configuration-ui.md).

**Watermark application (2026-11-16):** during `gallery.process_item` the worker bakes the active
default `gallery` preset into the stored private original **before** bib/face detection, then
generates the public preview from the watermarked image. The original is overwritten in its source
format (JPEG/PNG/WebP); EXIF/ICC metadata is dropped and orientation is baked into the pixels.
`gallery.refresh_preview` does not apply watermarks, and existing photos are not backfilled. A
per-item claim prevents a retried job from double-applying the preset; render failures publish the
photo unwatermarked. Because detection runs after application, detectors analyse watermarked pixels.
See `racetify-api/docs/2026-11-16-12-04-gallery-watermark-application.md`.

**Implementation notes (2026-11-15):** previews are lossy WebP objects in the public bucket and
`previewUrl` is a stable cacheable URL. Anonymous visitors can download the private original through
`GET /v1/public/events/{eventSlug}/gallery/items/{itemId}/download` — the API enforces the same
published/public-collection visibility, streams the bytes as an attachment, and rate-limits the
route at 30 requests per minute per IP. No storage key or signed original URL is returned.

**Implementation notes (2026-11-13):** the face service returns embeddings and Racetify owns all
Qdrant writes, deletes, and search. Public anonymous search and organizer event search exist in the
API but have no screens yet. See
[Face embeddings + Qdrant search](./2026-11-13-15-06-face-embeddings-qdrant-search.md).

---

## 1. Scope

| Screen | Route | Data |
| --- | --- | --- |
| Gallery | `/events/[eventId]/gallery` | Collections, items, bib/face metadata |
| Lightbox | — | Full item detail and metadata |
| Collections | `/events/[eventId]/gallery/collections` | Collection CRUD and ordering |
| Upload | `/events/[eventId]/gallery/upload` | Upload sessions, progress, retry |
| Watermarks | `/events/[eventId]/gallery/watermarks` | Watermark CRUD and preview (optional) |

Out of scope:

- Gallery moderation and verification. Bib/face metadata is read-only in v1.
- Public gallery — public contract. Face search is deferred.
- Certificate and bib document rendering — [Generators & Certificates](./2026-11-10-19-17-api-contract-generators-certificates.md).

---

## 2. Permissions

| Action | Permission |
| --- | --- |
| View collections, items, bib/face metadata | `event:gallery:view` |
| Upload images | `event:gallery:upload` |
| Create/edit/delete collections, items, and assignments | `event:gallery:manage` |
| Manage watermarks | `event:watermarks:manage` |

`event:gallery:upload` may be granted without `event:gallery:manage` (the photographer role): the
user can create uploads and see processing results, but cannot delete items or manage collections.

---

## 3. Endpoints

### Collections

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/events/{eventId}/gallery/collections` | `event:gallery:view` | Collections with item counts |
| `POST` | `/v1/events/{eventId}/gallery/collections` | `event:gallery:manage` | Create a collection |
| `PATCH` | `/v1/events/{eventId}/gallery/collections/{collectionId}` | `event:gallery:manage` | Rename, describe, set visibility/cover |
| `DELETE` | `/v1/events/{eventId}/gallery/collections/{collectionId}` | `event:gallery:manage` | Delete or move items |
| `PUT` | `/v1/events/{eventId}/gallery/collections/order` | `event:gallery:manage` | Reorder collections |

### Gallery items

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/events/{eventId}/gallery/items` | `event:gallery:view` | Filtered, paginated items |
| `GET` | `/v1/events/{eventId}/gallery/items/{itemId}` | `event:gallery:view` | Item detail with bibs/faces |
| `PATCH` | `/v1/events/{eventId}/gallery/items` | `event:gallery:manage` | Bulk move up to 1,000 items to/from a collection |
| `PATCH` | `/v1/events/{eventId}/gallery/items/{itemId}` | `event:gallery:manage` | Move collection, archive |
| `DELETE` | `/v1/events/{eventId}/gallery/items/{itemId}` | `event:gallery:manage` | Delete item and storage object |

### Uploads

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `POST` | `/v1/events/{eventId}/gallery/uploads` | `event:gallery:upload` | Start an upload session |
| `GET` | `/v1/events/{eventId}/gallery/uploads/{uploadId}` | `event:gallery:upload` | Session and per-file status |
| `PATCH` | `/v1/events/{eventId}/gallery/uploads/{uploadId}` | `event:gallery:upload` | Change the collection for files still pending |
| `POST` | `/v1/events/{eventId}/gallery/uploads/{uploadId}/files/{fileId}/presign` | `event:gallery:upload` | Refresh a failed/expired file URL |
| `DELETE` | `/v1/events/{eventId}/gallery/uploads/{uploadId}/files/{fileId}` | `event:gallery:upload` | Remove a file from the session |
| `POST` | `/v1/events/{eventId}/gallery/uploads/{uploadId}/complete` | `event:gallery:upload` | Confirm uploaded files |
| `POST` | `/v1/events/{eventId}/gallery/uploads/{uploadId}/abort` | `event:gallery:upload` | Abort remaining files |

### Watermarks

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/events/{eventId}/watermarks` | `event:watermarks:manage` | List watermarks |
| `POST` | `/v1/events/{eventId}/watermarks` | `event:watermarks:manage` | Create a watermark |
| `PATCH` | `/v1/events/{eventId}/watermarks/{watermarkId}` | `event:watermarks:manage` | Update a watermark |
| `DELETE` | `/v1/events/{eventId}/watermarks/{watermarkId}` | `event:watermarks:manage` | Delete a watermark |
| `POST` | `/v1/events/{eventId}/watermarks/uploads` | `event:watermarks:manage` | Presign a watermark image |

---

## 4. Query parameters

### Gallery items

| Parameter | Type | Notes |
| --- | --- | --- |
| `collectionId` | UUID or `none` | `none` selects unassigned items |
| `hasBib` | boolean | Items with at least one bib |
| `hasFace` | boolean | Items with at least one detected face |
| `bib` | string | Bib text or normalized number |
| `photographerId` | UUID | Exact photographer |
| `status` | `uploading, processing, published, failed, archived` | Comma-separated list; unknown values yield an empty page |
| `capturedFrom`, `capturedTo` | timestamp | Capture range |
| `q` | string | Original filename |
| `sort` | `capturedAt, publishedAt, createdAt` | Default `-capturedAt`; prefix `-` for descending |
| `limit`, `cursor` | — | Cursor pagination, default 25, max 100 |

### Collections

`GET /gallery/collections?includeCounts=true` accepts `includeCounts` but ignores it: item counts
and the cover item's preview URL are always returned (a stable public WebP URL when the preview is
public, otherwise a signed legacy URL). `itemCount` counts published, non-deleted items. Collections
are a small bounded list in v1; no pagination.

**OAuth read access (2026-11-15):** an organization-bound OAuth client holding `event:gallery:view`
may call the collections, item-list, and item-detail routes for events in its organization (the event
ID is in the path; cross-org events return `404 event_not_found`). Uploads, collection/item
mutations, and watermarks remain session-only. See
`racetify-api/docs/2026-11-15-08-57-organizer-gallery-face-search-api.md`.

---

## 5. DTOs

```ts
type GalleryCollectionDTO = {
  id: string
  eventId: string
  name: string
  slug: string
  description: string
  coverItemId: string | null
  coverThumbnailUrl: string | null
  isPublic: boolean
  sortOrder: number
  itemCount: number
  createdAt: string
  updatedAt: string
}

type GalleryBibDTO = {
  id: string
  bibText: string
  bibNumber: number | null
  confidence: number
  source: "ocr" | "manual"
  isVerified: boolean
}

type GalleryFaceDTO = {
  id: string
  faceIndex: number
  confidence: number
  boundingBox: { x: number; y: number; width: number; height: number } | null
}

type GalleryItemDTO = {
  id: string
  eventId: string
  photographer: { id: string; name: string } | null
  collection: { id: string; name: string; slug: string } | null
  type: "image"
  status: "uploading" | "processing" | "published" | "failed" | "archived"
  capturedAt: string
  publishedAt: string | null
  originalName: string
  width: number
  height: number
  previewUrl: string
  originalUrl: string
  urlExpiresAt: string
  bibs: GalleryBibDTO[]
  faces: GalleryFaceDTO[]
}

type GalleryItemSummaryDTO = Omit<GalleryItemDTO, "bibs" | "faces" | "originalUrl"> & {
  bibCount: number
  faceCount: number
  bibs: Array<Pick<GalleryBibDTO, "id" | "bibText" | "bibNumber">>
}

type UploadSessionDTO = {
  id: string
  eventId: string
  collectionId: string | null
  status: "awaiting_upload" | "completing" | "processing" | "completed" | "partial" | "aborted"
  files: Array<{
    id: string
    clientId: string
    originalName: string
    mimeType: string
    size: number
    status: "pending" | "uploaded" | "failed" | "processing" | "published"
    uploadUrl: string | null
    method: "PUT" | null
    headers: Record<string, string>
    expiresAt: string | null
    galleryItemId: string | null
    error: { code: string; message: string } | null
  }>
  createdAt: string
}

type WatermarkDTO = {
  id: string
  eventId: string
  name: string
  scope: "gallery" | "certificate"
  type: "image" | "text"
  imageUrl: string | null
  imageUrlExpiresAt: string | null
  imageName: string | null
  imageWidth: number | null
  imageHeight: number | null
  text: string | null
  position:
    | "top_left" | "top_center" | "top_right"
    | "center_left" | "center" | "center_right"
    | "bottom_left" | "bottom_center" | "bottom_right"
  opacity: number          // 0..1, default 0.35
  sizeRatio: number        // 0.05..0.5 of the longest edge, default 0.2
  marginRatio: number      // 0..0.2 of the shortest edge, default 0.03
  spacingXRatio: number    // 0..1 of the shortest edge, default 0.12
  spacingYRatio: number    // 0..1 of the shortest edge, default 0.12
  rotation: number         // -180..180
  repeatMode: "none" | "tiled"
  fontFamily: string       // default "Inter"
  fontWeight: number       // 100..900, default 600
  textColor: string        // "#rrggbb", default "#ffffff"
  isDefault: boolean       // surfaced as "Active" in the UI
  createdAt: string
  updatedAt: string
}
```

The API never returns `storage_object.object_key`, provider credentials, Qdrant point IDs, or face
embeddings. `previewUrl` is the single derivative: a lossy WebP object in the public bucket with a
stable cacheable URL (tiles and lightbox both use it; there is no `thumbnailUrl`). `originalUrl` is a
15-minute signed private URL and is included only for `gallery:view` and `upload`; item lists return
previews only. `urlExpiresAt` is `null` when the preview uses a stable public base URL.

---

## 6. Upload flow

```
Client                         API                         Object storage          Workers
  │ POST /gallery/uploads       │                                │                     │
  │ { files, collectionId }     │ create upload session          │                     │
  │────────────────────────────►│ presign each file              │                     │
  │◄────────────────────────────│ { uploadUrl, headers }         │                     │
  │ PUT file bytes ─────────────────────────────────────────────►│                     │
  │ POST /uploads/{id}/complete │                                │                     │
  │ { files: [{ id, etag }] }   │ verify objects, create         │                     │
  │────────────────────────────►│ storage_objects + gallery_items│                     │
  │                             │ enqueue OCR/face jobs ─────────┼────────────────────►│
  │◄────────────────────────────│ 202 session processing         │                     │
  │ GET /uploads/{id}           │                                │                     │
  │────────────────────────────►│ per-file status                │                     │
  │                             │ update item status to published│                     │
```

Rules:

- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`. No video in v1.
- Limits: **15 MB per file**, 100 files per session, maximum 12,000 px on either side.
- **Watermarks are optional.** If the event has an active default `gallery` watermark when an item is
  processed, the media worker applies it. If none exists, processing proceeds without a watermark.
  There is no readiness gate, no `watermark_required` error, and no organizer apply action.
- The session records a collection chosen at creation. Files created while the session is open inherit
  it. `PATCH /uploads/{uploadId}` with `{ "collectionId": "..." }` updates the collection for every
  file still in `pending`; files already uploaded or processing keep their original collection.
  Moving completed items uses `PATCH /items/{itemId}`.
- Uploads are direct-to-storage with presigned `PUT` URLs. The client uploads at most 3 files
  concurrently. The API is not in the file-byte path.
- `POST /uploads/{uploadId}/files/{fileId}/presign` returns a fresh URL for a `pending` or `failed`
  file. It does not reset a completed file.
- `DELETE /uploads/{uploadId}/files/{fileId}` removes a `pending`, `failed`, or uploaded-but-not-
  completed file and any unconfirmed object. It is idempotent. It is rejected after `complete`.
- `complete` is idempotent: it accepts the same file IDs and ETags and returns the same session.
  ETag is optional when the storage provider does not expose it through CORS; the server still
  verifies size and content type.
  A session may be completed with a subset of successfully uploaded files; the session status is
  `partial` when failed files remain. If no file uploaded successfully → `409 no_uploaded_files`.
  Once completed, the session is terminal; retrying failed files requires a new session.
- The server verifies object existence, size, and content type with the storage provider before
  creating metadata. A verification failure is per-file, not a whole-session failure.
- Each completed file becomes a `gallery_item` with status `processing`, then `published` after OCR
  and face jobs finish. A processing failure sets `failed` and exposes a retry action if the file is
  still valid.
- Uploading does not publish an item into a public collection until the item status is `published`.
- Abandoned sessions and unconfirmed objects expire after 24 hours.
- The client never receives a storage bucket name, object key, or credential.
- The frontend flow, state model, and code changes are specified in the
  [Gallery Upload Frontend Plan](./2026-11-10-20-46-gallery-upload-frontend-plan.md).

---

## 7. Business rules

### Collections

- Collection names are unique per event (case-insensitive) → `409 collection_name_taken`.
- `slug` is unique per event and generated from the name; it is stable after creation.
- `coverItemId` must be an item in the same event. If the cover item is deleted, the cover becomes
  `null`; the next available item may be used for display.
- `isPublic` controls public gallery visibility. Changing it does not change item publication status;
  both conditions apply on the public endpoint.
- Deleting a collection with items requires `moveItemsTo`:
  ```json
  { "moveItemsTo": "none" }
  ```
  or another collection ID. Without it → `409 collection_not_empty`. Moving to another collection in
  the same event is atomic.
- Reordering writes a dense sequence.

### Items

- An item belongs to one event and at most one collection.
- `published` items with a public collection are visible publicly; private collections are never
  public.
- Moving an item between collections is allowed with `event:gallery:manage`.
- **Bulk move:** `PATCH /v1/events/{eventId}/gallery/items` with
  `{ itemIds, collectionId }` or `{ itemIds, clearCollection: true }` updates every matching item in
  one transaction. `itemIds` is 1–1,000 (deduplicated server-side); ids that are unknown or deleted
  are returned in `missingItemIds` instead of failing the whole request. Sending both destination
  fields → `422 conflicting_collection`; a collection from another event →
  `422 collection_event_mismatch`.
  ```json
  { "itemIds": ["…"], "collectionId": "…" }
  { "updatedItemIds": ["…"], "missingItemIds": [] }
  ```
- Archiving hides the item from organizer default views; it remains inaccessible publicly. A filter
  can include archived items.
- Deleting an item soft-deletes metadata, marks the storage object for deletion, and enqueues
  Qdrant point deletion through the outbox. The delete is idempotent.
- Bibs and faces are read-only in v1. There are no verify/reject/approve endpoints.
- Face bounding boxes are optional. When present, coordinates are normalized `0..1` relative to the
  image dimensions.

### Watermarks

- `scope` is `gallery` or `certificate`.
- `type = image` requires an uploaded image; `type = text` requires `text`.
- `opacity` is `0..1`; `scale > 0`; `rotation` is `-180..180`.
- `position` and `repeatMode` are validated enums.
- Only one default watermark per `(event, scope)`; setting a new default clears the old one
  transactionally.
- The live preview is client-side using the watermark fields and a sample image. No server preview
  endpoint is required.
- **Watermarks are optional and applied by the backend.** If an active default `gallery` watermark
  exists when an item is processed, the media worker applies it to the uploaded derivatives. If none
  exists, processing continues without a watermark. There is no organizer “apply” action.
- Changing a watermark affects items processed after the change. Re-rendering existing items is an
  internal backend operation, not a client-facing endpoint in v1.
- Image watermarks are sanitized: SVG watermarks are not accepted in v1; use PNG/WebP.

### Face and bib metadata

- OCR and face detection run asynchronously after upload. The API exposes results, counts, and
  confidence; it does not expose embeddings or Qdrant internals.
- Public face search uses a separate anonymous endpoint in the public contract and never stores the
  query image.
- Deleting an item removes its Qdrant face points (`delete_points` / `delete_by_key`) through the
  outbox. The operation is retried and
  visible in jobs.

---

## 8. Error codes

| HTTP | `code` | Condition |
| --- | --- | --- |
| 404 | `collection_not_found` | Unknown/cross-tenant collection |
| 404 | `gallery_item_not_found` | Unknown/cross-tenant item |
| 404 | `upload_not_found` | Unknown upload session |
| 409 | `collection_name_taken` | Duplicate collection name |
| 409 | `collection_not_empty` | Delete without `moveItemsTo` |
| 409 | `upload_already_completed` | Complete called for a completed session with different files |
| 409 | `no_uploaded_files` | Complete called with zero successfully uploaded files |
| 409 | `file_not_removable` | Delete a file after the session is completed |
| 409 | `watermark_default_conflict` | Unreachable; defaults are reassigned atomically |
| 410 | `upload_expired` | Session exceeded its 24-hour lifetime |
| 422 | `unsupported_media_type` | Not JPEG/PNG/WebP |
| 422 | `file_too_large` | Over 15 MB |
| 422 | `too_many_files` | Over 100 files in a session |
| 422 | `image_dimensions_invalid` | Over the dimension limit |
| 422 | `collection_event_mismatch` | Cover/move target in another event |
| 422 | `watermark_invalid` | Invalid opacity/scale/rotation/text |
| 422 | `svg_not_allowed` | SVG watermark or unsupported image |
| 503 | `storage_unavailable` | Storage provider is unreachable; retry |

Per-file verification failures are returned inside the session's file status, not as a top-level
HTTP error:

- `upload_object_missing` — the object was not found at completion.
- `upload_verification_failed` — size, type, or checksum did not match.
- `upload_url_expired` — the presigned URL expired before the upload finished; call the presign
  endpoint again.

---

## 9. Frontend mapping

| Screen / component | Query | Key |
| --- | --- | --- |
| Gallery grid | `GET /gallery/items` with filters | `["event", eventId, "gallery", "items", filters]` |
| Lightbox | `GET /gallery/items/{itemId}` | `["event", eventId, "gallery", "item", itemId]` |
| Collections page | `GET /gallery/collections` | `["event", eventId, "gallery", "collections"]` |
| Upload page | upload session endpoints | `["event", eventId, "gallery", "upload", uploadId]` |
| Watermarks | `GET /watermarks` | `["event", eventId, "watermarks"]` |

Invalidation:

- Upload completion → gallery items, collections (counts/cover), event overview (photo count).
- Item move/delete/archive → gallery items, item detail, collections, event overview.
- Collection create/update/delete/reorder → collections, gallery items (collection labels).
- Watermark changes → watermarks. Uploads are not blocked by watermark state.

UI rules:

- The grid uses 24-item cursor pages with "Load more" as the route map specifies.
- Tile metadata uses list fields (`bibCount`, `faceCount`, up to two bibs); the lightbox uses the
  detail endpoint.
- Watermarks are optional. If a default gallery watermark exists, the backend applies it during
  processing; the upload page does not gate on watermark configuration.
- Uploads use the card-based collection selector from the demo; the selected collection is sent once
  when the session is created. Changing the selection before starting a file updates the session
  request; a file already uploading keeps its original collection.
- Progress is per file; retry uses a new presigned URL for that file.
- Without `event:gallery:manage`, item/collection management actions are hidden.
- Without `event:watermarks:manage`, the watermark screen is hidden or read-only.
- A broken image renders the neutral placeholder from the UI guidelines.

---

## 10. Acceptance criteria

1. Collections list with counts and covers; create/edit/delete/reorder work with the documented
   rules.
2. Uploads use presigned URLs; the API never exposes object keys or credentials.
3. Upload completion is idempotent and creates items with `processing` status.
4. Items transition to `published` after OCR/face jobs; failures are visible and retryable.
5. Gallery filters (collection, bib, face, photographer, status, capture date) work with cursor
   pagination.
6. Lightbox metadata matches the contract and is read-only; no moderation actions exist.
7. Deleting an item removes its storage object and Qdrant face points through the outbox.
8. Watermarks validate and preview client-side; they are optional, and the backend applies the
   default gallery watermark during processing when one exists.
9. Cross-tenant collection/item/upload IDs return `404`.
10. All screens typecheck against the generated client and respect permissions.

---

## 11. Open decisions

| # | Decision | Recommendation | Needed by |
| --- | --- | --- | --- |
| 1 | Video support | Out of v1; model already has `type` | Later |
| 2 | Item retry semantics | Retry OCR/face only, not the upload, when the object is valid | Gallery implementation |
| 3 | Per-file collection override | Session-level collection only in v1 | Gallery implementation |
| 4 | Watermark application | **Resolved:** optional; backend applies the default gallery watermark if configured; no organizer apply action | Gallery implementation |
| 5 | Signed URL lifetime | **Resolved:** originals stay 15-minute presigned; public WebP previews use a 24-hour CDN cache | Gallery implementation |
| 6 | Bib/face verification | Not in v1; read-only metadata | Later |
