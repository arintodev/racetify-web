# Gallery Upload Redesign — Bulk Photos, Auto-Batching, Resize + EXIF

- **Date:** 2026-11-14
- **Status:** Implemented in `apps/app`
- **Scope:** Organizer event gallery upload (`/events/{eventId}/gallery/upload`)
- **Supersedes in part:** [Gallery Upload Frontend Plan](./2026-11-10-20-46-gallery-upload-frontend-plan.md)
- **UI revised by:** [Gallery Upload — Simple Queue](./2026-11-14-18-53-gallery-upload-simple-redesign.md)
  (linear layout, auto-start, search, export failed; the pipeline and limits below still apply)

## Why

Photographers add hundreds to thousands of photos per event. The previous screen created one upload
session for the whole selection (the API caps a session at 100 files), replaced the upload button
with "Open gallery" after a successful run, and polled processing. The result was a failed 500-file
selection and a page that had to be reloaded before another upload could start.

## What changed

### UX

- The upload screen is a persistent workspace: large dropzone, sticky add/start/stop toolbar, queue,
  batch progress, destination card, and run controls. **The add controls never disappear.**
- Files can be added by multi-file picker, folder picker (`webkitdirectory`), or by dropping files
  **and folders** (recursive). Folder paths are shown only as a queue label; all photos upload into
  the selected collection.
- Preparation (resize/EXIF) starts immediately on add. The first run starts when the user presses
  **Upload N photos** (so the destination can be chosen first). After that, batches continue
  automatically: a batch starts when 100 photos are ready, when preparation settles, after a 600 ms
  quiet window, or when the user presses **Start now**; photos added later auto-start in new
  batches.
- **No processing status and no polling.** The run ends when every PUT and `complete` call returns.
  A static note tells the user photos appear in the gallery after server processing.
- Queue rows are text-only (file icon, name, folder, final size, status, progress); there are no
  image previews. Queues over 40 rows are virtualized with `@tanstack/react-virtual`.
- Stop aborts in-flight PUTs, completes the current session with the files that succeeded, and
  returns unfinished rows to the queue. Retry failed rows form a new session.
- Leaving the page (sidebar, workspace switcher, breadcrumbs, back link, tab close) is blocked while
  a batch is uploading, using a shared leave guard with a confirmation dialog.

### Client pipeline

1. **Validate:** JPEG/PNG/WebP (extension fallback), reject HEIC/RAW/GIF/TIFF with specific
   messages, reject empty files and sources over 80 MB / 100 MP. Do not reject a large source that
   resizing can bring under 15 MB.
2. **Probe:** read dimensions (and EXIF orientation for JPEG) from the file header; fall back to
   `createImageBitmap` only when the header cannot be parsed.
3. **Resize:** longest edge 2100 px. Photos already within 2100 px upload **byte-identical** (no
   decode, no re-encode, EXIF untouched). Larger photos are drawn to a canvas with a white matte,
   encoded as JPEG at quality 0.9 (0.8/0.72 if needed to stay under 15 MB), and scaled with the
   orientation already applied by `createImageBitmap({ imageOrientation: "from-image" })`.
4. **EXIF:** for resized JPEGs, `piexif-ts` copies the original metadata, resets Orientation to 1,
   updates/removes stale dimension tags, and drops the embedded thumbnail. Capture date, camera,
   lens, exposure, and GPS are preserved. Failures are non-fatal (upload continues without EXIF).
   Oversized PNG/WebP files become JPEG (`.jpg`, `image/jpeg`) without metadata.
5. **Prepare pool:** 2 concurrent preparations (1 on low-end devices) and a 120-photo ready window
   to bound memory. Prepared bitmaps are closed immediately; completed items free their prepared
   blob.
6. **Batch runner:** ready photos are grouped into sessions of at most **100** (API cap), strictly
   sequential, with **3 concurrent PUTs** per session. Create and complete use stable
   `Idempotency-Key`s. Only successfully uploaded files are submitted to `complete`, so a partial
   batch never loses uploaded bytes. Presigned URLs are refreshed 90 s before expiry or once after a
   403.
7. **Finish:** after each successful batch (coalesced) and once at idle, invalidate gallery items,
   collections, and the event overview. There is no session polling; `GET /uploads/{id}` is used
   only to reconcile a `complete` conflict.

### Backend contract notes

- Sessions are capped at 100 files, 15 MiB/file, 24 h, with ~15-minute presigned URLs; there is no
  append endpoint, which is why each batch is a new session.
- The server verifies the declared size and content type via HEAD at complete; the client therefore
  declares the **post-resize** name, MIME, and size.
- The server sets `captured_at` to completion time. EXIF is preserved in the stored original but
  does not affect gallery ordering today; a backend change would be required for capture-time
  sorting.

## Files

```
apps/app/features/gallery/upload/
  gallery-upload-workspace.tsx, index.ts
  components/ upload-dropzone, upload-toolbar, upload-summary-bar, upload-destination-card,
              upload-run-controls, upload-queue, upload-queue-row, upload-batch-banner,
              upload-completion-panel, upload-skipped-files
  hooks/ use-upload-workspace
  lib/ types, constants, reducer, validation, file-collection, image-probe, image-prepare, exif,
       errors, upload-api, batch-runner, batch-selection
apps/app/app/(organizer)/events/[eventId]/gallery/upload/page.tsx   thin wrapper
apps/app/lib/navigation/leave-guard.tsx                              shared blocker/GuardedLink
apps/app/app/(organizer)/events/[eventId]/layout.tsx                 mounts LeaveGuardProvider
packages/api-client/src/uploads.ts                                   returns ETag + typed HTTP error
```

Dependencies added to `apps/app`: `@tanstack/react-virtual`, `piexif-ts`.

## Limits

- 2,000 files per add (protective cap); the total queue is otherwise unbounded and auto-batched.
- 15 MB per prepared file; 2100 px longest edge; JPEG/PNG/WebP only.
- The queue is not persisted across reloads or navigation; finished sessions remain safe
  server-side, but queued/preparing files are lost if the tab closes.

## Verification

Automated: `pnpm --filter app typecheck`, `lint`, and `build` pass.

Manual checklist: 500-file drop → five sequential sessions of ≤100 with ≤3 concurrent PUTs; add
files mid-run → next batch; folder pick/drop → flattened queue with skipped non-images; 4000×3000
JPEG with Orientation 6 → 2100 px longest edge, Orientation 1, date/camera/GPS kept, no thumbnail;
≤2100 JPEG/PNG → byte-identical stored original; oversized transparent PNG → `.jpg`/white background;
no `GET /uploads/{id}` polling in the Network panel; stop/retry/leave flows; 500-row scroll and
memory; responsive and keyboard-only passes.
