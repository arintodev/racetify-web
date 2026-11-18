# Gallery Upload — Frontend Implementation Plan

> **Status:** Superseded in part (2026-11-14) — see
> [Gallery Upload Redesign — Bulk Photos](./2026-11-14-17-02-gallery-upload-bulk-redesign.md).
> Processing polling, single-session uploads, collection PATCH, previews, and the 100-file cap no
> longer apply. The navigation-guard intent and the reducer/feature-module shape remain.
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Applies to:** `apps/app` gallery upload screen
> **Related:** [Gallery & Media API Contract](./2026-11-10-19-17-api-contract-gallery-media.md) ·
> [General Contract](./2026-11-10-19-17-frontend-api-contract-general.md) ·
> [Frontend Architecture](./2026-11-10-07-26-frontend-architecture.md) ·
> [Route Map](./2026-11-10-07-26-frontend-route-map.md) ·
> [UI Guidelines](./2026-11-10-07-26-frontend-ui-guidelines.md)

This plan replaces the simulated upload queue in
`apps/app/app/(organizer)/events/[eventId]/gallery/upload/page.tsx` with the real flow: create an
upload session, upload files directly to object storage with presigned URLs, complete the session,
and track OCR/face processing until the items appear in the gallery.

The UI shape, collection-card selector, queue rows, and status language stay. The simulation
(`setInterval` progress, “demo only” toasts) is removed.

---

## 1. Current state

The existing page already implements the presentation layer:

- Destination collection cards, including “No collection”, with name, visibility, and photo count.
- Dropzone accepting JPEG/PNG/WebP up to 15 MB.
- Local queue with `queued → uploading → completed / failed`.
- Per-file previews using `URL.createObjectURL`.
- Progress bars, retry, remove, clear completed, pause/resume.
- Collection changes update files that are still queued.
- Object URLs are revoked on remove and unmount.
- Completion is a toast; the gallery is never changed.

What is missing is the API session, real uploads, server-side verification, processing status, and
gallery cache invalidation.

---

## 2. Target architecture

```
Browser (Next.js)                Rust API                     Object storage
─────────────────                ────────                     ──────────────
create session ────────────────► validate permission
                                create session + file rows
                                generate object keys
                                presign PUT URLs
◄────────────────────────────── { uploadUrl, headers, expiresAt }

PUT file bytes ──────────────────────────────────────────────► store object
◄────────────────────────────────────────────────────────────── 200 + ETag

complete session ──────────────► verify objects (HEAD)
                                create storage_objects
                                create gallery_items(processing)
                                enqueue OCR/face jobs
◄────────────────────────────── 202 { status: processing }

poll status ───────────────────► per-file processing/published
```

Principles:

- The API never receives file bytes.
- The API owns object keys, presigns, verification, and metadata.
- The browser owns scheduling, progress, retries, and local previews.
- Processing is asynchronous; upload completion is not gallery publication.
- Watermarks are optional. If a default gallery watermark exists, the backend applies it during
  processing. There is no organizer “apply” action.
- No token, bucket name, object key, or storage credential reaches the client.

---

## 3. User flow

1. **Choose a collection.** The card selector sets the session’s destination collection. “No
   collection” is represented as `null`.
2. **Add files.** Validate type, size, and count locally; create previews; append to the queue.
3. **Create the session.** On the first file (or on “Start upload”), send the collection and file
   metadata with an `Idempotency-Key`.
4. **Upload.** The scheduler runs at most 3 concurrent XHR `PUT`s. Each row shows real progress.
5. **Retry failures.** Retry the same presigned URL if it is still valid; otherwise request a fresh
   URL and re-upload.
6. **Change collection.** Pending files follow the selection; uploading/completed files keep theirs.
7. **Complete.** Send the successfully uploaded files and ETags.
8. **Process.** Poll the session until every file is published or failed.
9. **Finish.** Invalidate gallery queries, show a summary, and offer “View gallery” and “Upload
   more”.
10. **Leave.** If uploads are active, confirm; abort the session on confirmation.

---

## 4. Local state model

Keep the queue in a reducer, not in TanStack Query. `File` and `AbortController` are local,
non-serializable values.

```ts
type RowStatus = "queued" | "uploading" | "uploaded" | "processing" | "published" | "failed"

type UploadRow = {
  clientId: string              // stable React key; also sent to the API
  file: File
  previewUrl: string            // URL.createObjectURL
  status: RowStatus
  progress: number              // 0..100
  serverFileId: string | null
  galleryItemId: string | null
  collectionId: string | null
  uploadUrl: string | null
  uploadHeaders: Record<string, string>
  uploadUrlExpiresAt: string | null
  abortController: AbortController | null
  attempts: number
  error: { code: string; message: string } | null
}

type QueueState = {
  sessionId: string | null
  sessionStatus:
    | "idle" | "creating" | "uploading" | "completing"
    | "processing" | "completed" | "partial" | "aborted"
  collectionId: string | null
  rows: UploadRow[]
  paused: boolean
}
```

Reducer actions:

```
add-files
remove-row
set-progress
mark-uploading
mark-uploaded
mark-failed
mark-processing
mark-published
retry-row
set-collection
set-session
set-session-status
set-paused
reset
```

Rules:

- `clientId` is generated once and maps the server’s `files[].clientId` back to the row.
- `serverFileId` is set from the create-session response; no upload starts without it.
- Progress updates are throttled to avoid a render per XHR event (e.g., 100 ms).
- Completed rows keep their previews until the user clears them or unmounts.
- On unmount, abort active XHRs and revoke every object URL.

---

## 5. API client functions

Create `apps/app/features/gallery/upload/upload-api.ts` (or add these to the shared API client):

```ts
createUploadSession(eventId, body, idempotencyKey)
getUploadSession(eventId, uploadId)
patchUploadSession(eventId, uploadId, { collectionId })
refreshUploadFileUrl(eventId, uploadId, fileId)
removeUploadFile(eventId, uploadId, fileId)
completeUploadSession(eventId, uploadId, { files }, idempotencyKey)
abortUploadSession(eventId, uploadId)
```

All use the shared API client, which already handles cookies, CSRF, `problem+json`, `401`/`403`,
and request IDs.

The create request:

```ts
{
  collectionId: string | null,
  files: Array<{
    clientId: string
    originalName: string
    mimeType: "image/jpeg" | "image/png" | "image/webp"
    size: number
  }>
}
```

The response’s `files[]` provides `id`, `clientId`, `status`, `uploadUrl`, `method`, `headers`, and
`expiresAt`.

---

## 6. Hooks

### `useUploadQueue`

Owns the reducer and exposes:

```ts
{
  rows, sessionId, sessionStatus, collectionId, paused,
  addFiles(files: FileList),
  removeRow(clientId),
  retryRow(clientId),
  setCollection(collectionId),
  pause(), resume(),
  clearCompleted(),
  abort(),
}
```

### `useUploadSession`

Wrap the create/complete/abort mutations:

- `createSession()` maps the server files to rows and starts the scheduler.
- `completeSession()` sends uploaded rows and switches to the status polling state.
- `abortSession()` stops the scheduler, aborts XHRs, and calls the abort endpoint.

### `useUploadStatus`

A query for `GET /uploads/{uploadId}`:

```ts
useQuery({
  queryKey: ["event", eventId, "gallery", "upload", uploadId],
  queryFn: () => getUploadSession(eventId, uploadId),
  enabled: Boolean(uploadId) && sessionStatus === "processing",
  refetchInterval: (query) => {
    const status = query.state.data?.status
    return status === "processing" || status === "completing" ? 2000 : false
  },
})
```

Map per-file server status back to rows. On terminal status, stop polling and invalidate gallery
queries.

### `uploadFileWithProgress`

A plain helper, not a hook:

```ts
function uploadFileWithProgress(
  file: File,
  presigned: { uploadUrl: string; method: "PUT"; headers: Record<string, string> },
  onProgress: (percent: number) => void,
  signal: AbortSignal
): Promise<{ etag: string | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(presigned.method, presigned.uploadUrl)
    for (const [key, value] of Object.entries(presigned.headers)) {
      xhr.setRequestHeader(key, value)
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ etag: xhr.getResponseHeader("ETag") })
      } else {
        reject(new Error(`Upload failed with ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error("Network error"))
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"))
    signal.addEventListener("abort", () => xhr.abort(), { once: true })
    xhr.send(file)
  })
}
```

`XMLHttpRequest` is deliberate: `fetch` does not expose upload progress in browsers. The bucket’s
CORS configuration must expose the `ETag` response header; otherwise send `etag: null` and let the
server verify size and content type.

---

## 7. Scheduling, progress, and pause

- Concurrency limit: **3** uploads. Remaining rows stay `queued`.
- A single scheduler effect picks the next queued row when a slot frees. Use refs for the active
  count and current rows to avoid stale closures.
- Progress is per row and aggregated:

  ```
  overall = sum(bytes sent per row) / sum(bytes of all rows)
  ```

- Pause stops scheduling new rows. Active uploads are allowed to finish; this avoids wasting
  bandwidth and matches the demo’s pause behavior closely enough.
- Resume restarts the scheduler with `queued` and `failed` rows.
- Removing a row aborts its XHR if active, calls `DELETE /files/{fileId}` if the session exists, and
  revokes its object URL.
- `clearCompleted` removes only UI rows; completed items already exist in the gallery.

---

## 8. Retry

A failed row can be retried:

1. If `uploadUrlExpiresAt` is in the future, reuse the existing URL.
2. Otherwise call `POST /files/{fileId}/presign` and replace the URL and headers.
3. Reset progress to 0 and mark `queued`.
4. Re-upload.

Automatic retries: at most 2, with a short backoff (`1s`, `2s`). After that, require a manual retry.
A session-level `410 upload_expired` means the 24-hour session is gone; create a new session for the
remaining files.

---

## 9. Collection changes

| Session state | Behavior |
| --- | --- |
| No session yet | Update the local collection for all queued rows |
| Session active | `PATCH /uploads/{uploadId}` with the new collection |
| Rows `queued`/`failed` | Update their collection badge to the new value |
| Rows `uploading`/`uploaded`/`processing` | Keep their original collection |
| No pending rows | No PATCH call; just store the selection for the next session |

Debounce the PATCH by 300 ms and ignore stale responses with a request sequence number. On failure,
revert the local selection and show an inline error.

---

## 10. Completion and processing

When no row is `queued` or `uploading`:

- If at least one row is `uploaded`, call `complete` with those rows:

  ```ts
  { files: uploadedRows.map((row) => ({ id: row.serverFileId, etag: row.etag })) }
  ```

- If failed rows remain and the user chooses to finish anyway, complete with the successful subset.
  The session becomes `partial`; retrying the failed files requires a new session. Show this in the
  confirmation copy.
- If no row uploaded, do not call complete; offer retry/remove.

After a successful complete:

1. Set `sessionStatus = "processing"`.
2. Start `useUploadStatus` polling.
3. Update rows with per-file status and `galleryItemId`.
4. On terminal status:
   - `completed`: toast “Photos uploaded”; invalidate gallery items, collections, and event overview.
   - `partial`: show failed rows and a “Retry in a new session” action.
   - `failed`: show the error and allow a new session.
5. Offer **View gallery** and **Upload more**.

Processing failures are per item. Retrying OCR/face does not re-upload the file and is a separate
gallery action.

---

## 11. Leaving the page

The route map requires a confirmation when uploads are active.

Use the Next.js 16 `onNavigate` link API plus `beforeunload`:

1. **Blocking state.** A `UploadNavigationGuardProvider` exposes `isBlocked`, `requestLeave(href)`,
   and `confirmLeave()`. The upload page sets `isBlocked` while any row is `queued`, `uploading`, or
   `uploaded` and the session is not terminal.
2. **Internal links.** Wrap the shell navigation links (`nav-menu.tsx` and the account links) with a
   shared `GuardedLink`:

   ```tsx
   import type { ComponentProps } from "react"
   import Link from "next/link"

   export function GuardedLink({
     href,
     ...props
   }: ComponentProps<typeof Link>) {
     const { isBlocked, requestLeave } = useUploadNavigationGuard()

     return (
       <Link
         href={href}
         onNavigate={(event) => {
           if (!isBlocked) return
           event.preventDefault()
           requestLeave(typeof href === "string" ? href : href.toString())
         }}
         {...props}
       />
     )
   }
   ```

   The `onNavigate` event only guarantees `preventDefault()`; derive the destination from the link's
   `href` prop. It fires only for client-side same-origin navigation, which is exactly what the
   shell uses.
3. **Programmatic navigation.** `workspace-switcher.tsx` and other dropdown items use
   `router.push(...)`, which `onNavigate` does not see. Replace those calls with a shared
   `navigateSafely(href)` helper from the guard context:

   ```ts
   function navigateSafely(href: string) {
     if (isBlocked) {
       requestLeave(href)
       return
     }
     router.push(href)
   }
   ```

   Use the same helper for the page’s own “Upload more” and “View gallery” actions. When the session
   is terminal, the guard is already released.
4. **Browser close/refresh.** Add a `beforeunload` listener while blocked. The browser shows its
   native prompt; we cannot customize it.
5. **Confirmation.** Use the existing `AlertDialog`, not `window.confirm()`. On confirm:
   - call `abort` for active sessions,
   - abort active XHRs,
   - revoke object URLs,
   - `router.push(pendingHref)`. This intentional programmatic navigation bypasses the guard
     because the user has confirmed.

Processing continues on the server after leaving; only active uploads are aborted.

---

## 12. Error handling

| Source | Code / condition | UI behavior |
| --- | --- | --- |
| Local validation | Unsupported type | Reject file, toast, do not add |
| Local validation | Over 15 MB | Reject file, toast |
| Local validation | Over 100 files | Cap the queue and explain |
| Create session | `403 forbidden` | `ForbiddenState`; no queue |
| Create session | `404 event_not_found` | `notFound()` |
| Create session | `422 unsupported_media_type` / `file_too_large` | Mark the offending rows; remove or replace them |
| Create session | `503 storage_unavailable` | Keep the queue, show retry |
| Upload | Network error / 5xx | Mark row failed, auto-retry up to 2, then manual |
| Upload | URL expired | Refresh presign, retry |
| Complete | `upload_object_missing` / `upload_verification_failed` | Per-row error; re-upload that file |
| Complete | `409 no_uploaded_files` | Keep rows; offer retry |
| Complete | `409 upload_already_completed` | Refetch the session and reconcile |
| Session | `410 upload_expired` | Explain; create a new session for remaining files |
| Any | `401` | Redirect to login with `next`; the queue is lost by design |
| Any | `429` | Show `Retry-After`; do not auto-retry aggressively |

Per-file errors live on the row; session errors appear in an `Alert` above the queue. Do not collapse
a per-file failure into a single toast.

---

## 13. Accessibility and UX

- The dropzone is a labeled file input; drag/drop has a keyboard-accessible equivalent.
- Each row has a visible filename, size, collection badge, status text, and progress with an
  accessible value.
- Status changes and completion are announced through `aria-live="polite"`.
- Retry/remove buttons have accessible names including the filename.
- The leave confirmation is a focus-trapped `AlertDialog`; focus returns to the triggering link on
  cancel.
- Buttons are at least 44×44 px on mobile.
- Respect `prefers-reduced-motion` for progress and row transitions.
- The queue is single-column on mobile; rows may wrap the actions below the metadata.
- “Pause”, “Resume”, “Clear completed”, and “Upload more” are keyboard reachable.
- Do not claim files are saved until `complete` succeeds; do not claim processing is finished until
  the session is terminal.

---

## 14. File layout

```
apps/app/features/gallery/upload/
├─ gallery-upload-view.tsx        # page composition; uses the queue hook
├─ collection-picker.tsx          # destination cards (existing UI extracted)
├─ upload-dropzone.tsx            # input + drag/drop + local validation
├─ upload-queue.tsx               # list + summary
├─ upload-row.tsx                 # preview, progress, status, retry/remove
├─ use-upload-queue.ts            # reducer + scheduler
├─ use-upload-session.ts          # create/complete/abort mutations
├─ use-upload-status.ts           # processing poll
├─ upload-api.ts                  # typed API functions
├─ upload-file.ts                 # XHR helper
├─ types.ts
└─ index.ts

apps/app/app/(organizer)/events/[eventId]/gallery/upload/page.tsx   # thin wrapper
apps/app/components/navigation-blocker/                            # guard context + GuardedLink
apps/app/components/app-shell/nav-menu.tsx                         # use GuardedLink
apps/app/components/app-shell/workspace-switcher.tsx               # use navigateSafely()
```

Keep the page file thin: resolve the event and render `<GalleryUploadView event={event} />` inside
`RequirePermission permission="event:gallery:upload"`.

---

## 15. TanStack Query keys and invalidation

| Key | Use |
| --- | --- |
| `["event", eventId, "gallery", "upload", uploadId]` | Session status polling |
| `["event", eventId, "gallery", "items", filters]` | Gallery grid |
| `["event", eventId, "gallery", "collections"]` | Collection counts/covers |
| `["event", eventId, "overview"]` | Photo count |

Invalidate the last three when the session reaches `completed` or when an item becomes `published`.
Do not put `File`, blobs, presigned URLs, or the queue in the query cache.

---

## 16. Demo-to-real mapping

| Current demo | Real implementation |
| --- | --- |
| `setInterval` progress | XHR `upload.onprogress` |
| Files never leave the browser | Presigned `PUT` to object storage |
| Local `items` state only | Reducer + server session and per-file IDs |
| Collection change updates queued rows | Same, plus `PATCH /uploads/{id}` |
| Retry resets progress | Refresh presign if needed, then re-upload |
| Remove deletes the row | Abort XHR + `DELETE /files/{fileId}` |
| Completion toast | `complete` + processing poll + gallery invalidation |
| Gallery unchanged | Items appear after processing |
| 15 MB limit | Same; enforced by the API too |
| No leave guard | `onNavigate` + `beforeunload` + confirmation dialog |
| No watermark handling | Optional: if a default gallery watermark exists, the backend applies it during processing |

---

## 17. Testing

Unit / integration:

- Reducer transitions for add, progress, upload, fail, retry, remove, complete, publish.
- Scheduler never exceeds 3 concurrent uploads and drains the queue.
- `uploadFileWithProgress` reports progress and handles abort/error.
- Session mapping uses `clientId` correctly.
- Retry reuses a valid URL and refreshes an expired one.
- Collection PATCH updates only pending/failed rows.
- Complete sends only uploaded rows and handles partial sessions.
- Leave guard blocks internal links and `beforeunload` while active, and releases after completion.
- Error mapping for 401/403/404/409/410/422/429/503.

Manual:

- One file, ten files, and more than 3 files.
- Pause/resume mid-queue.
- Fail a file (network) and retry.
- Expire a presigned URL in a test environment and refresh it.
- Change collection while queued and while uploading.
- Remove a queued, uploading, and uploaded file.
- Complete with all files and with some failures.
- Processing failure and gallery item retry.
- Leave the page with active uploads; confirm and cancel.
- Photographer role (`event:gallery:upload` without `event:gallery:manage`).
- 15 MB boundary and unsupported type.
- 375px, 768px, and 1440px; light and dark.
- Keyboard-only: dropzone, queue actions, leave dialog.

Acceptance:

1. Files upload directly to storage with real progress.
2. No storage key, bucket, or credential reaches the browser.
3. Failed uploads are retryable without losing the rest of the queue.
4. Collection changes apply only to pending files.
5. Completion creates gallery items and they appear after processing.
6. Leaving with active uploads requires confirmation.
7. Watermarks are optional; there is no apply action and no upload gate.
8. The queue is not persisted across reloads; no localStorage/sessionStorage.
9. `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.

---

## 18. Estimate

| Work | Estimate |
| --- | --- |
| Extract view, collection picker, queue, dropzone | 0.5 day |
| API client + session/complete/abort hooks | 1 day |
| XHR upload, scheduler, progress, pause/resume | 1.5 days |
| Retry, presign refresh, collection PATCH, remove | 1 day |
| Processing poll, gallery invalidation, summary | 0.5 day |
| Leave guard and navigation integration | 0.5 day |
| Accessibility, responsive, error polish | 0.5 day |
| **Total** | **~5.5 days** |

Backend work (session endpoints, presigning, verification, processing jobs) is tracked separately
and must land first or behind a mock server.

---

## 19. Decisions

| # | Decision | Choice |
| --- | --- | --- |
| 1 | File size limit | **15 MB**, matching the current UI and the API contract |
| 2 | Upload path | **Direct-to-object-storage presigned PUT**, not through the API |
| 3 | Concurrency | **3** parallel uploads |
| 4 | Partial completion | Allowed; session becomes `partial`; failed files need a new session |
| 5 | Per-file removal | `DELETE /uploads/{uploadId}/files/{fileId}` |
| 6 | Pause | Stop scheduling; allow active uploads to finish |
| 7 | Reload persistence | **None**; the queue is lost and the session expires after 24 hours |
| 8 | Progress transport | `XMLHttpRequest`; `fetch` upload progress is not reliable |
| 9 | Leave guard | Next.js 16 `Link.onNavigate` + `beforeunload` + `AlertDialog` |
| 10 | Processing retry | Gallery-level retry; not part of the upload queue |
| 11 | Watermark handling | Optional; if a default gallery watermark exists, the backend applies it during processing; no organizer apply action |
