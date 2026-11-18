# Frontend F4 — Public App Integration

Status: complete and build-green. `apps/web` no longer depends on `@workspace/demo-data`; every
public route now reads the Rust API through the shared client. The `packages/demo-data` package was
deleted in F5.

> **Update 2026-11-15:** the public gallery now has anonymous face search and explicit-submit bib
> search; see [Public face search + bib submit](./2026-11-15-00-08-public-face-search-and-bib-submit.md).
> This document otherwise records the F4 state as of 2026-11-12.

## Routes

| Route | API |
| --- | --- |
| `/e/{eventSlug}` | `GET /v1/public/events/{slug}` |
| `/e/{eventSlug}/register` | `GET /v1/public/events/{slug}/registration-config`, `POST .../orders` |
| `/e/{eventSlug}/register/success/{orderNumber}` | `GET /v1/public/orders/{orderNumber}` |
| `/e/{eventSlug}/gallery` | public events, collections, and cursor-paginated items |
| `/e/{eventSlug}/gallery/{photoId}` | `GET .../gallery/items/{itemId}` |
| `/e/{eventSlug}/certificates` | event profile + `GET .../certificates/search?q=` |
| `/e/{eventSlug}/results` | `GET .../results/races` |
| `/e/{eventSlug}/results/{raceSlug}` | `GET .../results/races/{raceSlug}` |
| `/cert/{certificateNumber}` | `GET /v1/public/certificates/{certificateNumber}` |
| `/cert/{certificateNumber}/opengraph-image` | same endpoint via a cookie-less server client |

## What changed

### Event shell and profile
- `app/e/[eventSlug]/layout.tsx` resolves the public event server-side, returns `notFound()` on
  `404`, builds metadata and `SportsEvent` JSON-LD from the API, and renders the event header and
  tab navigation (the navigation component existed but was previously unused).
- `EventHeader` takes `PublicEventDto`; the signed cover URL uses a plain `<img>` instead of the
  Next image optimizer.
- New `app/e/[eventSlug]/page.tsx` event profile: description, race list with fees/capacity, and
  register/gallery/results/certificates links.
- Removed the "Public demo" badge from the public header and demo wording from the footer.

### Registration
- The wizard renders a normalized `PublicRegistrationConfig` (`features/public-registration/api.ts`)
  built from `PublicRegistrationConfigDto`, so the existing multi-step UI is unchanged.
- Submission posts `CreateOrderRequest` to `POST /v1/public/events/{slug}/orders` with one
  `Idempotency-Key` per checkout attempt, then navigates to the real order number returned by the
  API. Client-generated order numbers and the `?entry=` query are gone.
- `422 errors[]` pointers (`/participants/0/firstName`) are mapped onto React Hook Form fields; the
  wizard jumps to the participant or checkout step and shows the error summary.
- Registration-closed, upcoming, and no-races states use the API's `registrationOpen`/`phase`.
- Removed demo payment/consent copy.

### Receipt
- The success page fetches the order server-side; `getServerApi()` forwards cookies so the
  `__Host-racetify_order_access` cookie set at checkout authorizes the receipt.
- Renders API order lines, category names, total, status, and a pending-payment note (the payment
  provider is still a stub). `404` renders the not-found page.

### Gallery
- Server-prefetched collections and the first 24 items; the client uses TanStack Query
  (`useInfiniteQuery`) for bib search, collection filters, URL sync, cursor "Load more", retry, and
  empty states. Filters are executed by the API, not in the browser.
- Gallery grid, lightbox, and photo detail page use `PublicGalleryItemDto` with plain `<img>` for
  signed preview URLs (later replaced by stable public WebP previews on 2026-11-15). The lightbox
  links to the shareable photo page.
- The simulated face-search tab/panel was removed. There was no public face-search endpoint at F4
  time, so the feature was hidden rather than faked (wired for real on 2026-11-15).

### Certificates
- Search calls a server action backed by
  `GET /v1/public/events/{slug}/certificates/search?q=`, keeping the top-3 candidate UX.
- Certificate detail and the OG image read `GET /v1/public/certificates/{number}`. `404` → not
  found; `410` or a non-`issued` status → "certificate unavailable".
- Certificate preview/detail use the API fields (`event.name`, optional race/category,
  `organizationName`, `finishStatus`). The demo download placeholder was removed because the public
  API does not expose a certificate file URL.

### Results
- Results index lists published races with distance, finisher count, and publish date.
- Race results page supports server-side `q`, category, gender, and status filters plus cursor
  pagination through a GET form; renders rank, bib, gun/chip times, status, and official badge.

### Client
- `packages/api-client/src/browser.ts`: `/v1/public/*` is treated as CSRF-token exempt, matching the
  backend middleware. Anonymous checkout previously failed because the client tried to fetch a
  session-bound CSRF token before posting.
- `apps/web` dropped `@workspace/demo-data` from its dependencies and `transpilePackages`; the
  `/demo` internal link index was deleted.

## Deferred gaps (unchanged backend limits)

- No public event list endpoint, so `sitemap.ts` still lists only static marketing routes; event
  URLs are discoverable through links and `drafts` are never exposed.
- No public gallery/certificate download endpoints; only preview URLs are available (public WebP
  since 2026-11-15).
- Public face search and Qdrant indexing were unimplemented at F4 time; both landed later (backend
  2026-11-13, public UI 2026-11-15).
- Payments remain a backend stub; orders finish as `pending`.
- Google OAuth and system permission exposure remain deferred. Organization onboarding is now
  admin-provisioned (see `2026-11-12-11-30-admin-activated-organizations.md`).

## Verification

- `pnpm --filter web typecheck` / `pnpm --filter app typecheck` — pass
- `pnpm --filter web lint` / `pnpm --filter app lint` — pass
- `pnpm --filter web build` / `pnpm --filter app build` — pass
- `grep @workspace/demo-data apps/` — no importers
- No backend changes; no Docker or migrations run.

## Runtime prerequisites

- API reachable at `RACETIFY_API_INTERNAL_URL` (server components) and `RACETIFY_API_ORIGIN`
  (rewrites), default `http://localhost:8080`.
- The API origin allowlist must include the public app origin (default `http://localhost:3001`).
- S3 bucket CORS is still required for organizer-side presigned uploads; public pages only read
  signed URLs.
