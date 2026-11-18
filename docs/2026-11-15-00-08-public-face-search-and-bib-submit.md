# Public Gallery — Explicit Bib Search + Anonymous Face Search (as built)

- **Date:** 2026-11-15
- **Scope:** `apps/web` public gallery only. No backend, contract, or organizer (`apps/app`) changes.
- **Status:** Implemented. Verified with typecheck, lint, and production build; live API testing is
  still pending because the backend is not running in this workspace.
- **Related:** [Public Contract](./2026-11-10-19-17-api-contract-public.md) ·
  [Face Embeddings + Qdrant Search](./2026-11-13-15-06-face-embeddings-qdrant-search.md) ·
  [Public Web App Plan](./2026-11-10-12-20-public-web-app-plan.md)

## 1. What changed

Two independent changes to the public event gallery (`/e/[eventSlug]/gallery`):

1. **Bib search submits on demand.** Typing no longer triggers a request. The visitor types a bib,
   then presses **Search** or Enter. This removes the 300 ms debounce and its surprise mid-word
   requests and cursor resets.
2. **Face search is now usable.** The gallery offers **Find my photos**, which uploads a selfie,
   searches the event's public gallery, and renders the matches in the same grid and lightbox.

**Anonymous by decision.** This pass deliberately does not add a public login, Google multi-origin
OAuth, or backend authentication/owner binding for face search. The existing
`/v1/public/events/{eventSlug}/gallery/face-searches` endpoints are used as they are, so OAuth
client-credentials and server-to-server organizers are unaffected.

## 2. Bib search: explicit submit

`apps/web/features/public-gallery/public-gallery.tsx` now keeps two pieces of state:

| State | Meaning |
| --- | --- |
| `bibInput` | Exactly what is in the input; changes on every keystroke |
| `submittedBib` | The applied term; only changes on submit or clear |

- The input and clear button live in `<form role="search">` with a visible **Search** submit
  button. `enterKeyHint="search"` makes mobile keyboards show a search key.
- Submit trims the input, clears face results and the lightbox selection, and then:
  - same term as `submittedBib` → `query.refetch()` (re-runs the same query deliberately);
  - different term → `setSubmittedBib(next)` (the query key changes and cursor pagination resets).
- The clear **X** resets the input, the applied term, and face results.
- Collection pills stay immediate: they change the collection, keep the applied bib, reset
  pagination, and clear face results.
- `submittedBib` feeds the query key/fn, the `?bib=` URL sync, the initial-data comparison, and the
  empty-state copy. Refreshing therefore still restores the search from the URL and the server
  prefetch.
- The `aria-live` result count ("Searching photos…" / "N photos shown") is unchanged.

## 3. Face search

New folder: `apps/web/features/public-gallery/face-search/`

| File | Responsibility |
| --- | --- |
| `face-search-api.ts` | Create/status requests, client validation, error mapping |
| `selfie-image.ts` | Silent downscale to ≤1280 px / ≤2 MB JPEG before preview and upload |
| `use-face-search.ts` | Create mutation + status polling state machine |
| `use-face-match-items.ts` | Resolves matched item IDs into `PublicGalleryItemDto`s |
| `face-search-dialog.tsx` | Selfie picker, preview, consent, progress, errors, no-results |
| `face-search-banner.tsx` | Match count, **Search again**, **Show all photos**, retry |
| `index.ts` | Barrel export |

### Endpoints used

| Step | Request |
| --- | --- |
| Start | `POST /v1/public/events/{slug}/gallery/face-searches`, `multipart/form-data` with `image` and `consent=true` → `202 FaceSearchDto` |
| Poll | `GET /v1/public/events/{slug}/gallery/face-searches/{id}` every 2.5 s until terminal |
| Resolve matches | `GET /v1/public/events/{slug}/gallery/items/{itemId}`, one per returned ID |

The responses carry public item IDs only — never scores, embeddings, face metadata, or Qdrant IDs.

### Flow

1. **Find my photos** next to the bib form opens the lazily loaded `FaceSearchDialog`
   (`next/dynamic`, `ssr: false`). Nothing is fetched until the dialog opens.
2. The visitor picks a selfie (file input `accept="image/jpeg,image/png,image/webp"`). The client
   validates non-empty, ≤ 10 MB, and an allowed MIME type (with extension fallback for empty types
   and `image/jpg`/`image/pjpeg` normalization).
3. The image is silently downscaled to at most 1280 px on its longest edge and re-encoded as JPEG
   under 2 MB (`selfie-image.ts`), then that small file drives both the preview and the upload.
   Re-encoding also drops EXIF/GPS. No resize copy is shown in the UI.
4. A local preview is shown with Change/Remove; the object URL is revoked on replace, remove, and
   unmount.
5. Consent is required. The checkbox copy states the selfie is used only for this search, deleted
   after processing, no face profile is stored, only public photos are searched, and results expire
   in 15 minutes; it links to `/privacy`. The server also rejects a missing consent.
6. Submit posts `FormData` (no manual `Content-Type`), shows "Uploading your selfie…", then
   "Searching for your photos…" in a `role="status"` live region while polling.
7. Terminal states:
   - `completed` with IDs → the dialog closes, the gallery switches to face mode.
   - `completed` with zero IDs → the dialog stays open with a no-results message; the visitor can
     try another selfie.
   - `failed` → the server's error code is mapped to friendly copy (no face, multiple faces,
     invalid image/embedding, unavailable).
   - `410`/`404` while polling → "expired or no longer available; start a new search".
   - `429` → "Too many searches. Try again in a few minutes."
8. Closing the dialog while polling unmounts the hook; the server job completes or expires on its
   own and no state is persisted.

### Results

- `PublicGallery` holds `faceResultIds: string[] | null`; `null` means normal gallery mode.
- `useFaceMatchItems` deduplicates IDs, preserves the backend order, fetches each item with
  `queryKeys.publicGalleryItem(slug, id)` (`staleTime` 60 s, one retry), and reports
  `pending`/`failedCount`/`retryFailed`.
- Face mode renders `FaceSearchBanner` plus either skeletons while details load, the same
  `GalleryGrid`, or an all-failed state with **Retry** and **Show all photos**. Partial failures
  keep the loaded matches and show a non-blocking note.
- The same `PhotoLightbox` is used, with `activePhotos` resolved from the face results in face mode.
- Any bib submit, clear, or collection change clears face results so filters and face matches never
  mix.
- The banner's **Search again** reopens the dialog; **Show all photos** returns to the normal
  gallery, preserving the current bib and collection.
- Face results are ephemeral: a refresh returns the normal filtered gallery. The search ID is not
  written to the URL.

### Cache key

`packages/api-client/src/query-keys.ts`:

```ts
publicFaceSearch: (slug: string, searchId: string) =>
  ["public", "event", slug, "gallery", "face-search", searchId] as const,
```

The poll stops once the status is `completed`, `failed`, or the request errors; retries are
disabled for `404`/`410` and any `4xx`, and capped at two for transient failures.

## 4. Edge cases

| Case | Behavior |
| --- | --- |
| Typing a bib | No request; only Search/Enter applies it |
| Submitting the same bib again | Explicit `refetch()` |
| Clear bib / change collection | Clears face results and lightbox selection |
| No face / multiple faces | Terminal error mapped to friendly copy; retry with another selfie |
| Unsupported type / > 10 MB | Blocked client-side; server `422`/`413` mapped as a fallback |
| Large phone photo (≤ 10 MB) | Silently reduced to ≤1280 px and ≤2 MB JPEG before preview/upload |
| Very large pixel or corrupt image | Decode/encode failure → "This image couldn't be processed". |
| Consent unchecked | Submit disabled; server rejects without consent |
| Rate limited | `429` copy |
| Detector/Qdrant unavailable | `503` at start or terminal `failed`; retry copy |
| Expired/unknown search | `410`/`404` copy; start again |
| Zero matches | No-results state inside the dialog |
| Partial detail failures / item unpublished mid-search | Loaded matches plus note and **Retry** |
| Close dialog while polling | Polling stops; server job expires |
| Refresh while face results shown | Face results reset; filtered gallery returns |

## 5. Verification

- `corepack pnpm --filter web typecheck` — passed
- `corepack pnpm --filter web lint` — passed
- `corepack pnpm --filter web build` — passed (`BUILD_EXIT=0`)

Not performed: live API testing (no backend running in this workspace) and a near-10 MB selfie
through the Next `/api` rewrite. If a near-limit upload is truncated in a live environment, add
`experimental: { proxyClientMaxBodySize: "12mb" }` to `apps/web/next.config.ts`; the documented
default applies to `proxy.ts`, and this app uses `rewrites()`, so no config change was made here.

## 6. Deferred

- Public login and Google multi-origin OAuth.
- Backend authentication/owner binding for public face search.
- Public registration.
- Batch public item lookup for face results (currently one detail request per ID, max 50).
- URL persistence/resume of an in-progress face search.
- Organizer face-search UI (the enrolled/selfie endpoints remain backend-only).
