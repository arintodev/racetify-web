# Gallery Upload — Simple Queue, Auto-Start, Search + Export

- **Date:** 2026-11-14
- **Status:** Implemented in `apps/app`
- **Scope:** Organizer event gallery upload (`/events/{eventId}/gallery/upload`)
- **Revises the UI of:** [Gallery Upload Redesign — Bulk Photos](./2026-11-14-17-02-gallery-upload-bulk-redesign.md)
- **Keeps:** presigned PUT uploads, automatic batches of 100, client-side resize to 2100 px, EXIF preservation

## Why

The bulk redesign fixed the 100-file session cap and made the add controls persistent, but the screen
had grown into a two-column workspace with four overlapping progress/control surfaces. Photographers
wanted the original simple shape back, plus a way to find a photo in a 500–2,000 row queue and to
deal with failures. The batch runner also had a **finalization bug**: it called `complete` with a
null session id, so uploads could reach 100% and never finish.

## What changed

### Layout

A single column (`max-w-5xl`), top to bottom:

1. `PageHeader` — title, one-line behavior summary, Back to gallery.
2. **Collection cards** — "No collection" plus every event collection; name, public/private badge,
   photo count; the selected card uses the primary border/background and a check. Changes apply to
   the next batch; photos already uploading keep theirs.
3. **Add surface** — always mounted. Large dashed drop target when the queue is empty; a compact
   sticky bar once files exist. Drag files **or folders** (recursive), or press **Upload files** /
   **Upload folder** inside the drop target. Copy is reduced to two lines: drag hint plus
   formats/resize/EXIF.
4. **Queue card**
   - Title, active batch badge, and small stat `Badge`s with counts: total, waiting, uploading,
     uploaded, failed. **No top progress bar and no aggregate summary line.**
   - Search by file name or folder, a visible Stop/Resume button, and a More menu:
     Retry all failed, Export failed (.csv), Clear uploaded, View skipped files.
   - Virtualized rows with a generic **image icon**, name, folder, original → final size,
     2100 px / EXIF copy, and per-row progress. Status lives on the **right** as an icon:
     circle check for uploaded, spinner for optimizing/uploading/finishing, clock for waiting,
     circle-X for failed. An uploaded row has **no remove button**; other rows keep retry/remove
     as applicable.
   - Only actionable alerts remain: paused, paused-error, or "no photos could be uploaded".
     There is **no "Upload finished" card**.
5. **Skipped files** — a compact alert with a details dialog (first 50 rows shown, true total
   counted).

The right rail, the separate Start button, the batch banner, the summary bar, the run-controls card,
the destination `Select`, and the old completion panel were removed.

### Auto-start and batching

- Removing files starts preparation immediately; uploads start automatically. No manual Start.
- A batch starts when 100 photos are ready, when preparation settles, after a 600 ms quiet window,
  or when the preparation window is stalled (large files can saturate the byte budget).
- Batches remain sequential sessions of at most 100 with 3 concurrent PUTs. Files added during a
  run join the next batch; files added after completion start a new batch without a reload.
- Stop aborts in-flight PUTs, completes the session with the files that succeeded, returns
  unfinished rows to the queue, and leaves the run paused. Add files, Resume, or Retry lifts it.

### Client-side status only

`Queued → Optimizing → Ready → Uploading % → Finishing → Uploaded`, plus `Failed`. There is no
server processing poll; the completion alert notes that photos appear in the gallery after the
server finishes processing.

### Search, export, retry

- Search is local, case-insensitive, and matches file names and folder paths. The filtered list
  drives the virtualizer; the inner scroll resets when the query changes.
- Export failed writes CSV columns `file_name, folder_path, original_size_bytes,
  uploaded_size_bytes, error_stage, error_message, retryable, attempts, server_file_id` with RFC
  4180 escaping and a UTF-8 BOM, named `failed-uploads-YYYY-MM-DD-HH-mm.csv`.
- Retry all failed retries only `retryable` rows; validation failures stay listed with their reason.

### Critical fix — session id

`runUploadBatch` used the local `UploadBatch` object, whose `sessionId` stays `null` because only
reducer state is updated by `onBatchCreated`. `complete` therefore targeted
`/uploads/null/complete`, and presign refresh/reconcile always failed.

The runner now keeps `const uploadId = session.id` immediately after create and threads it through
`uploadOne`, `refreshFile`, `completeWithRetry`, and `reconcile`; abort paths use the same id. An
empty id fails the batch with a clear message. `batch.sessionId` remains reducer state only.

### Scale and robustness

- Rows virtualize above 40 items; keys are stable `clientId`s.
- Preparation is bounded by 120 items **and** 400 MB of prepared/estimated bytes. A stalled window
  triggers a partial batch rather than deadlocking preparation against uploads.
- Completed rows release both the prepared body and the source `File`.
- Preparation no longer rescans the queue on every 200 ms progress tick; it reruns only when the
  queue composition changes.
- 2,000 files per add; queue total is otherwise unbounded and auto-batched.

### Resize and EXIF

Unchanged: validate → header probe → longest edge 2100 px → JPEG (quality 0.9/0.8/0.72 until
≤15 MB) → `piexif-ts` EXIF copy for JPEG sources (Orientation reset to 1, dimensions updated,
thumbnail dropped). Photos already ≤2100 px upload byte-identical with EXIF untouched. PNG/WebP
that need resizing become JPEG and lose metadata; the row says "converted to JPEG" rather than
claiming EXIF was kept.

## Files

```
apps/app/features/gallery/upload/
  gallery-upload-workspace.tsx                     linear layout, search, export, toasts
  components/
    upload-destination-picker.tsx                  collection cards
    upload-dropzone.tsx                            persistent add surface + recursive drop
    upload-queue-summary.tsx                       stat badges, summary line
    upload-queue-toolbar.tsx                       search, Stop/Resume, More menu
    upload-queue.tsx                               virtualized filtered list, empty states
    upload-queue-row.tsx                           image icon, status, meta, progress, actions
    upload-run-alert.tsx                           paused/error/nothing alerts
    upload-rejected-files.tsx                      skipped-files alert + dialog
  hooks/use-upload-workspace.ts                    auto-start, pause, retry counts, prep window
  lib/
    batch-runner.ts                                session-id threading fix
    queue-view.ts                                  status map, search filter, file-type label
    export-failed.ts                               failed CSV
    reducer.ts / types.ts                          rejected total, release completed files
    constants.ts                                   PREPARE_WINDOW_BYTES
app/lib/download.ts                                shared downloadBlob (also used by template studio)
```

Removed: `upload-toolbar`, `upload-run-controls`, `upload-summary-bar`, `upload-batch-banner`,
`upload-destination-card`, `upload-completion-panel`, `upload-skipped-files`.

## Limits

- JPEG/PNG/WebP only (HEIC/AVIF/RAW/GIF/TIFF are rejected with hints).
- 15 MB per prepared file, 80 MB raw source, 100 MP source, 2100 px longest edge.
- 2,000 files per add; sessions of 100; 3 concurrent PUTs.
- The queue is in memory only; a reload loses queued/preparing rows (completed sessions remain
  safe server-side). The UI no longer requires a reload to add more files.

## Verification

- `corepack pnpm --filter app typecheck`
- `corepack pnpm --filter app lint`
- `corepack pnpm --filter app build`
- Manual/code-path: 500-file add → five sessions; add mid-run and after completion; folder drop
  with nested folders and non-images; search by name/folder; Retry all failed + Export CSV; Stop and
  Resume; 4000×3000 JPEG Orientation 6 → 2100 px + EXIF; ≤2100 px byte-identical; responsive and
  keyboard passes.
