# Gallery — Move Items to a Collection (Bulk) + Collection Filter

- **Date:** 2026-11-14
- **Status:** Implemented
- **Scope:** Organizer gallery (`/events/{eventId}/gallery`) and the gallery API
- **Related:** [Gallery & Media API Contract](./2026-11-10-19-17-api-contract-gallery-media.md) ·
  [UI Guidelines](./2026-11-10-07-26-frontend-ui-guidelines.md)

## Why

Photos were assigned to a collection only at upload time. Organizers need to file photos after the
fact — one photo at a time or a selection — and need an "unfiled" filter to find photos that still
need a collection.

The previous API only supported `PATCH /gallery/items/{itemId}` per item. Bulk moves now use one
true bulk endpoint rather than a client-side fan-out.

## API

```
PATCH /v1/events/{eventId}/gallery/items
Permission: event:gallery:manage
```

```json
{ "itemIds": ["<uuid>", "..."], "collectionId": "<uuid>" }
{ "itemIds": ["<uuid>", "..."], "clearCollection": true }
```

- Exactly one destination field; both → `422 conflicting_collection`.
- `itemIds` deduplicated server-side; 1–1,000 per request (`422 too_many_items` above the cap).
- The target collection must belong to the event (`422 collection_event_mismatch`).
- All matching, non-deleted items are updated in **one transaction**. Missing ids are skipped and
  returned; the rest still move.
- Response:
  ```json
  { "updatedItemIds": ["<uuid>"], "missingItemIds": ["<uuid>"] }
  ```
- One audit entry per request (`gallery_items.bulk_updated`) with counts and the destination.
- Backend: `crates/api/src/routes/gallery.rs`, `crates/modules/gallery/src/{http/dto,service,repository}.rs`,
  `crates/api/src/openapi.rs`; contract regenerated with `cargo run -p api --bin openapi`.
- Frontend contract: synced/generated into `packages/api-client/src/generated/schema.d.ts`.
- The per-item `PATCH` remains for archive/status updates; the move UI uses only the bulk endpoint.

## Frontend

### Top collection filter

`[All photos] [No collection] [collection…]`

- "No collection" sends `collectionId=none`, which the list endpoint maps to unassigned items.
- Filter changes reset the cursor, exit selection mode, and clear the selection.

### Per-item actions

The tile's direct trash button is replaced by an overflow menu:

- Move to collection…
- Remove photo (destructive)

The lightbox gains **Move to collection** below "Open original". Opening the dialog from the
lightbox closes the lightbox first to avoid stacked modal focus traps.

### Bulk selection

- A **Select** toggle in the search/filter row reveals tile checkboxes and a selection bar.
- Clicking a tile in selection mode toggles it; the image no longer opens the lightbox.
- The selection bar shows the count ("Includes photos from other pages" when applicable),
  Select/Deselect page, Clear, Move to collection…, and Done.
- Selection persists across cursor pages, is capped at 1,000, clears on filter changes, Done, and
  after a full move. Deleting a selected photo removes it from the selection.

### Move dialog

- Destination `Select`: "No collection" plus each collection (private ones labeled).
- Shows the current collection, an already-there hint, and a public-gallery warning when published
  photos are moved to a private collection or unfiled.
- Collections loading/error/empty states; "No collection" stays usable.
- One bulk request on submit; the button shows a spinner while moving and dismissal is blocked.
- On success: toast, close, and remove both updated and missing ids from the selection. Missing ids
  are reported as "no longer available".
- On failure: the dialog stays open with the mapped API error (the request is atomic, so there is
  no per-item retry loop).

### Invalidation

After a move (and after delete), invalidate:

- `["event", eventId, "gallery", "items"]` (all cursor/filter variants)
- `queryKeys.galleryCollections(eventId)`
- `["event", eventId, "gallery", "item"]` (item detail)
- `queryKeys.eventOverview(eventId)`

`GalleryCollectionDto.itemCount` counts only published items, so counts are never adjusted
optimistically.

## Files

```
racetify-api/
  crates/api/src/routes/gallery.rs                 bulk_update_items handler + route
  crates/api/src/openapi.rs                        path + schema registration
  crates/modules/gallery/src/http/dto.rs           BulkUpdateItemsRequest/Response
  crates/modules/gallery/src/service.rs            bulk_update_items (transaction, audit)
  crates/modules/gallery/src/repository.rs         set_items_collection
  packages/api-contract/openapi.yaml               regenerated

racetify-web/
  packages/api-contract/openapi.yaml               synced
  packages/api-client/src/generated/schema.d.ts    regenerated
  apps/app/features/gallery/items/                 api, errors, hook, tile, selection bar, dialog
  apps/app/app/(organizer)/events/[eventId]/gallery/page.tsx
  apps/app/components/gallery/gallery-lightbox.tsx
  docs/2026-11-10-19-17-api-contract-gallery-media.md
```

## Verification

- Backend: `cargo check -p api`; `cargo run -p api --bin openapi`.
- Frontend: `contract:sync`, `contract:generate`, `typecheck`, `lint`, `build`.
- Manual when the API is running: single move from tile and lightbox; bulk across cursor pages;
  move to No collection; private-collection warning; filtered by No collection; collections
  loading/error; missing ids reported; permission-denied response; keyboard-only and responsive
  passes.
