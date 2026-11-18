# Frontend API Contract — Public Content

> **Status:** Implemented for `apps/web` (2026-11-12). Face search is implemented in the backend
> (2026-11-13) and wired into the public gallery UI anonymously (2026-11-15).
> **Updated:** 2026-11-15 — public face-search UI and explicit-submit bib search; see
> [Public face search + bib submit](./2026-11-15-00-08-public-face-search-and-bib-submit.md) ·
> [Face embeddings + Qdrant search](./2026-11-13-15-06-face-embeddings-qdrant-search.md)
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Applies to:** `apps/web` public routes
> **Related:** [General Contract](./2026-11-10-19-17-frontend-api-contract-general.md) ·
> [Public Web App Plan](./2026-11-10-12-20-public-web-app-plan.md) ·
> [Public Registration UX Plan](./2026-11-10-15-11-public-registration-ux-plan.md) ·
> [Gallery & Media](./2026-11-10-19-17-api-contract-gallery-media.md)

This feature covers everything anonymous visitors use: the public event profile, login-free
registration and receipt, public gallery and bib search, certificate search and display, and
published race results.

**Implementation notes (2026-11-12):** `apps/web` is fully wired to these endpoints. Face search has
no backend endpoint and is hidden in the UI. Public gallery items expose signed `previewUrl` values
only (no original/download URL). The order-access cookie name and path below match the backend
configuration (`__Host-racetify_order_access`, `Path=/`).

**Implementation notes (2026-11-13):** the backend now implements both face-search endpoints
(multipart upload with consent, async status polling, 15-minute results, rate limiting). The response
returns item IDs only — no scores, embeddings, or Qdrant IDs.

**Implementation notes (2026-11-15):** `apps/web` wires the face-search endpoints through the
**Find my photos** dialog (consent, selfie upload, polling, results in the same grid and lightbox).
The flow is anonymous by product decision: no public login, no owner binding, and no change to
OAuth client or server-to-server callers. Bib search in the gallery now applies on explicit
**Search**/Enter instead of a typing debounce; the URL and server prefetch behavior are unchanged.

**Implementation notes (2026-11-15, previews):** the gallery preview derivative is now lossy WebP in
the public bucket (`preview.webp`), and `previewUrl` is a stable cacheable URL instead of a signed
JPEG. The gallery list and photo pages emit `noindex, follow`; `robots.txt` and the sitemap are
unchanged. Legacy private JPEG previews keep working until the backend backfill replaces them.

No endpoint in this feature requires a user session. Public responses are minimal projections and
never include participant contact data, storage keys, or face embeddings.

---

## 1. Scope

| Screen | Route | Data |
| --- | --- | --- |
| Event header | `/e/[eventSlug]/*` | Public event profile |
| Registration | `/e/[eventSlug]/register` | Registration config, order creation |
| Confirmation | `/e/[eventSlug]/register/success/[orderNumber]` | Order receipt |
| Gallery | `/e/[eventSlug]/gallery` | Public collections and photos |
| Photo | `/e/[eventSlug]/gallery/[photoId]` | Public photo detail |
| Certificate search | `/e/[eventSlug]/certificates` | Up to 3 public candidates |
| Certificate | `/cert/[certificateNumber]` | Public certificate |
| Results index | `/e/[eventSlug]/results` | Published races |
| Race results | `/e/[eventSlug]/results/[raceSlug]` | Published official results |

Out of scope:

- Event discovery, participant accounts, registration history, and real payment.
- Organizer gallery/collections — [Gallery & Media](./2026-11-10-19-17-api-contract-gallery-media.md).
- Marketing landing pages and share cards — frontend-only.

---

## 2. Permissions

None. Every endpoint is anonymous.

Protection is by rate limiting, strict public projections, short-lived signed URLs, and privacy
rules. There is no CSRF requirement for anonymous GETs; `POST` order and face-search endpoints
require origin checks and rate limiting.

---

## 3. Endpoints

### Event profile and registration

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/public/events` | Published event list (active organizations), cursor-paginated |
| `GET` | `/v1/public/events/{eventSlug}` | Public event profile |
| `GET` | `/v1/public/events/{eventSlug}/registration-config` | Races, categories, fees, phase, requirements |
| `POST` | `/v1/public/events/{eventSlug}/orders` | Create an anonymous order |
| `GET` | `/v1/public/orders/{orderNumber}` | Receipt, requires the order-access cookie |

### Gallery

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/public/events/{eventSlug}/gallery/collections` | Public collections |
| `GET` | `/v1/public/events/{eventSlug}/gallery/items` | Published public items |
| `GET` | `/v1/public/events/{eventSlug}/gallery/items/{itemId}` | Item detail |
| `GET` | `/v1/public/events/{eventSlug}/gallery/items/{itemId}/download` | Original image as an attachment |
| `POST` | `/v1/public/events/{eventSlug}/gallery/face-searches` | Start a consented face search (anonymous, UI wired) |
| `GET` | `/v1/public/events/{eventSlug}/gallery/face-searches/{searchId}` | Poll face-search status and results (anonymous, UI wired) |

### Certificates

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/public/events/{eventSlug}/certificates/search` | Search, max 3 candidates |
| `GET` | `/v1/public/certificates/{certificateNumber}` | Public certificate |

### Results

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/public/events/{eventSlug}/results/races` | Published race summaries |
| `GET` | `/v1/public/events/{eventSlug}/results/races/{raceSlug}` | Published official results |

Payment integration is deferred. The public registration page's payment step is a local placeholder
and does not call the API in v1. A future `POST /v1/public/orders/{orderNumber}/payment-intents` will
be added with the payment provider.

---

## 4. Query parameters

### Registration config

None. The event slug identifies the config.

### Gallery items

| Parameter | Type | Notes |
| --- | --- | --- |
| `collection` | slug | Public collection slug |
| `bib` | string | Bib text or normalized number |
| `mode` | `bib` | Optional explicit search mode; default `bib` when `bib` is present |
| `cursor` | string | Cursor |
| `limit` | integer | Default 24, max 48 |

Only public collections and `published` items are returned.

### Certificate search

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | Minimum 2 characters; certificate number, name, or bib |

No pagination. The server returns at most 3 candidates and a `hasMore` flag. It never returns a total
count.

### Results

| Parameter | Type | Notes |
| --- | --- | --- |
| `category` | slug or ID | Category filter |
| `gender` | `male, female` | Gender filter |
| `status` | `finished, dns, dnf, dq` | Result status |
| `q` | string | Bib or participant name |
| `sort` | `rank` | Official rank ascending |
| `cursor`, `limit` | — | Default 50, max 200 |

### Face search

`POST` body is `multipart/form-data`:

- `image` — JPEG/PNG/WebP, max 10 MB.
- `consent` — must be `true`.

---

## 5. DTOs

```ts
type PublicEventDTO = {
  slug: string
  name: string
  description: string
  shortDescription: string
  logoUrl: string | null
  coverUrl: string | null
  startDate: string
  endDate: string
  timezone: string
  location: string
  status: "published" | "ongoing" | "completed"
  organizer: {
    name: string
    website: string | null
    contact: { email: string | null; phone: string | null } | null
  }
}

type PublicRegistrationConfigDTO = {
  event: {
    slug: string
    name: string
    startDate: string
    endDate: string
    timezone: string
    location: string
    coverUrl: string | null
  }
  phase: "upcoming" | "open" | "closed"
  registrationOpen: boolean
  registrationStartAt: string
  registrationEndAt: string
  maxParticipantsPerOrder: number
  identityNumberRequired: boolean
  emergencyContactRequired: boolean
  races: Array<{
    id: string
    name: string
    slug: string
    distanceKm: number
    startTime: string
    capacity: number
    fee: number
    categories: Array<{
      id: string
      name: string
      code: string
      gender: "male" | "female" | "mixed" | "open"
      minAge: number
      maxAge: number
      quota: number
    }>
  }>
}

type PublicOrderRequest = {
  participants: Array<{
    raceId: string
    categoryId: string
    firstName: string
    lastName: string
    gender: "male" | "female"
    birthDate: string
    nationality: string
    countryCode?: string
    identityNumber?: string
    bibName?: string
    emergencyContactName?: string
    emergencyContactPhone?: string
  }>
  contact: { email: string; phone: string }
  consents: {
    terms: true
    medical: true
    privacy: true
    updates: boolean
  }
}

type PublicOrderReceiptDTO = {
  orderNumber: string
  status: "pending" | "paid" | "expired" | "cancelled" | "refunded"
  currency: "IDR"
  totalAmount: number
  lines: Array<{
    index: number
    raceId: string
    raceName: string
    categoryId: string
    categoryName: string
    fee: number
  }>
  event: {
    slug: string
    name: string
    startDate: string
    endDate: string
    location: string
  }
  expiresAt: string
}

type PublicGalleryCollectionDTO = {
  id: string
  name: string
  slug: string
  description: string
  itemCount: number
}

type PublicGalleryItemDTO = {
  id: string
  /** Stable public WebP URL (signed only when no public base URL is configured). */
  previewUrl: string
  width: number
  height: number
  capturedAt: string
  collection: { name: string; slug: string }
  photographerName: string
}

type PublicCertificateCandidateDTO = {
  certificateNumber: string
  participantName: string
  raceName: string
  categoryName: string
  status: "issued" | "revoked"
}

type PublicCertificateSearchDTO = {
  candidates: PublicCertificateCandidateDTO[]
  hasMore: boolean
}

type PublicCertificateDTO = {
  certificateNumber: string
  status: "issued" | "revoked"
  participantName: string
  raceName: string
  categoryName: string
  finishStatus: string
  issuedAt: string | null
  event: {
    slug: string
    name: string
    startDate: string
    endDate: string
  }
  organizationName: string
}

type PublicRaceSummaryDTO = {
  id: string
  name: string
  slug: string
  distanceKm: number
  finisherCount: number
  publishedAt: string
}

type PublicRaceResultDTO = {
  rank: number
  bib: string | null
  participantName: string
  categoryName: string
  gender: "male" | "female" | null
  gunTimeMs: number
  chipTimeMs: number | null
  status: "finished" | "dns" | "dnf" | "dq"
  isOfficial: boolean
}

type FaceSearchDTO = {
  id: string
  eventSlug: string
  status: "pending" | "processing" | "completed" | "failed" | "expired"
  consentAt: string
  resultCount: number | null
  itemIds: string[]
  expiresAt: string
  error: { code: string; message: string } | null
}
```

`PublicOrderRequest` never contains a price. The server computes fees from the event/race
configuration. `PublicOrderReceiptDTO` deliberately omits participant names and contact details so
the receipt URL and cached response contain no PII.

---

## 6. Business rules

### Public event profile

- Only events with status `published`, `ongoing`, or `completed` are visible. `draft`, `cancelled`,
  and soft-deleted events return `404 event_not_found`.
- The event header is identical across registration, gallery, certificate search, and results.
- Organizer contact is returned only when the organization has opted into public contact; otherwise
  `contact: null`. This is a product/legal decision.
- Public URLs use the event slug, never the internal event ID.

### Registration config

- Only published races with at least one category are returned.
- `phase` is derived from the event status and registration window:
  - `upcoming`: now before `registrationStartAt`.
  - `open`: within the window and the event is published/ongoing with open races.
  - `closed`: after the window, event draft/cancelled, or no published races.
- `registrationOpen` is true only for `phase = open`.
- `fee` is the server-computed per-race price in IDR. The client displays it but never submits it.
- The config exposes only public fields. Internal registration editor metadata is not returned.
- Category eligibility is computed on the race start date, not the current date. The server enforces
  it at order creation.

### Anonymous order creation

`POST /public/events/{eventSlug}/orders` requires `Idempotency-Key`.

Server validation:

1. Event is published/ongoing and registration is open.
2. Every race is published and belongs to the event; every category belongs to its race.
3. Participant count is between 1 and `maxParticipantsPerOrder`.
4. `identityNumber` is present when required; emergency contacts are present when required.
5. Gender and birth date produce an eligible category on the race start date.
6. Race/category capacity is available.
7. Required consents are true; `updates` is optional.
8. Contact email and phone are valid.
9. Duplicate participants within the order are allowed only when the event config allows it; v1
   rejects an exact duplicate identity in the same race.
10. No email deliverability or identity checksum is performed.

Creation is one transaction:

- Insert `participants` (one per line, `user_id = null`).
- Insert `registrations` with generated registration numbers and status `pending`.
- Insert `orders` with status `pending`, `user_id = null`, buyer contact fields, and a server-computed
  total.
- Insert `order_items` for each registration.
- Return `201` with the receipt and set the order-access cookie.

Rules:

- The client never supplies prices, totals, order numbers, or registration numbers.
- The order number is server-generated and globally unique.
- The order expires after the configured payment window. In v1 with no payment, it remains `pending`
  and the confirmation is informational; a cleanup job may expire unpaid orders after 24 hours.
- The order-access cookie is `__Host-racetify_order_access` (`RACETIFY_ORDER_COOKIE_NAME`),
  `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. Its lifetime is derived from the order expiry
  (minimum 60 seconds; 30 minutes when the order has no expiry). It is the only way to read the
  receipt, or the caller may present the explicit `?token=` value returned by order creation.
- `GET /public/orders/{orderNumber}` without a valid cookie or token returns `404 order_not_found`,
  not a `403`, to avoid confirming that an order exists.
- The receipt never includes participant names, email, phone, identity number, or birth date.
- No participant PII is written to the URL, analytics, or browser storage.
- Rate limit: 3 orders per IP per 10 minutes and 10 per email per day; require a captcha or proof of
  work if abuse is detected.
- A future payment integration will add payment intents and webhooks; the order contract reserves
  the statuses and expiry.

### Public gallery

- Only `is_public = true` collections and `published` items are returned. Private collections,
  archived items, failed items, and storage keys never appear.
- The preview is a WebP object in the public bucket and `previewUrl` is its stable cacheable URL
  (signed only when `S3_PUBLIC_BASE_URL` is unset). The public API never returns original storage
  URLs.
- `GET .../gallery/items/{itemId}/download` streams the private original for a published item in a
  public collection. It returns `Content-Disposition: attachment`, `Content-Type` from the stored
  object, `Cache-Control: private, no-store`, and `X-Robots-Tag: noindex`; no storage key or signed
  URL is exposed. Rate limit: 30 requests per minute per IP.
- Tiles and the lightbox both use `previewUrl`; there is no separate thumbnail. The public item DTO
  intentionally omits bibs, faces, and dimensions beyond width/height.
- `collection` filter uses the collection slug, not its ID.
- `bib` search matches `bib_text` and normalized `bib_number`; results preserve the bib string format.
  The client sends `bib` only on explicit **Search**/Enter, not while typing.
- Pagination is 24 items with cursor and "Load more".
- The gallery list, item, and photo pages are `noindex`; the frontend sets metadata. The API does
  not control robots tags. `robots.txt` stays crawlable so the noindex tag can be read.

### Face search

- Requires an explicit consent checkbox. The `POST` body is `multipart/form-data` with `image`
  (JPEG, PNG, or WebP, up to 10 MB, sniffed from magic bytes) and `consent=true`; anything else is
  `422 face_search_consent_required`.
- The public client silently downscales the selfie to ≤1280 px on its longest edge and re-encodes
  it as JPEG under 2 MB before upload (also dropping EXIF/GPS); the 10 MB server limit is unchanged
  for other callers.
- The uploaded image is written to a private object, processed by the detector, and deleted on
  every deterministic outcome (success, no face, multiple faces, invalid embedding, expired search).
  A transient detector/Qdrant failure keeps it for the outbox retry. It is never logged, retained,
  or used for analytics.
- The search is asynchronous: `POST` returns `202` with a `FaceSearchDto`
  (`pending | processing | completed | failed`); the client polls
  `GET /gallery/face-searches/{id}` until `completed` or `failed`.
- `FaceSearchDto` fields: `id`, `eventSlug`, `status`, `consentAt`, `itemIds`, `resultCount`,
  `expiresAt`, and `error` (`{ code, message }`) when failed.
- Results contain only public gallery item IDs (`itemIds`) for `published` items in `is_public`
  collections of that event.
- Search results expire after 15 minutes; afterwards the status endpoint returns
  `410 face_search_expired`. Unknown IDs return `404 face_search_not_found`.
- Rate limit: 5 searches per IP per 10 minutes (`429 rate_limited`).
- No face embeddings, scores, face metadata, or Qdrant IDs are returned.
- The public UI resolves `itemIds` through the public item-detail endpoint and shows the matches in
  the normal gallery grid and lightbox; it never requests anything beyond public projections.
- Organizer search is separate and authenticated: `POST /v1/events/{eventId}/gallery/face-searches/enrolled`
  and `.../selfie` return `FaceSearchResultDto { items, matchCount }` synchronously. It has no
  frontend UI in this pass.

### Certificate search and display

Search:

- Query minimum 2 characters, debounced by the client 300 ms.
- Ranking: exact certificate number, exact participant name, name prefix, name substring, bib exact,
  bib prefix, certificate-number substring, compact name. This mirrors the demo selector.
- Returns at most 3 candidates and `hasMore = true` when more match. It never returns a count beyond
  the cap.
- Candidate fields: certificate number, participant name, race, category, status. No email, phone,
  identity number, registration details, preview, or download.
- Rate limit: 30 searches per IP per minute and 10 per IP per minute for single-character abuse
  prevention. The endpoint is safe to cache briefly but responses contain candidate names, so use
  `Cache-Control: private, no-store`.
- No recent-search persistence.

Display:

- `GET /public/certificates/{certificateNumber}` returns public fields only.
- Issued certificates show event, participant, race, category, finish status, issue date, number,
  and verification status.
- Revoked or unknown numbers return a safe response with no personal data:
  - Unknown → `404 certificate_not_found`.
  - Revoked → `410 certificate_revoked` with `{ status: "revoked" }` and no participant data.
- Certificate pages are `noindex`; the frontend sets metadata.
- Certificate numbers are globally unique. Enumeration is mitigated by rate limits, the search cap,
  and `noindex`; a production name/email verification step or opaque token can be added without
  changing the URL shape.
- No certificate is returned for draft events or unpublished results.

### Public results

- Only races with published, official results are returned.
- The results index returns race summaries only; it never returns a results table or filters.
- Race results return rank, bib, participant name, category, gender, gun time, chip time, status, and
  official flag.
- Only `is_official = true` and `published_at <= now` rows are public. Non-official results are not
  shown as final.
- No email, phone, identity number, or emergency contact is returned.
- Filters are URL-driven on the client; the API supports category, gender, status, and text search.
- Pagination: 50 rows per cursor page; the UI may virtualize within a page. 2,000+ rows must remain
  responsive.
- Results pages are indexable; the frontend handles canonical URLs and metadata.

### Caching

| Endpoint | Cache policy |
| --- | --- |
| Public event profile | `public, s-maxage=60, stale-while-revalidate=300` + `ETag` |
| Registration config | `public, s-maxage=30` + `ETag` |
| Public collections/items | `public, s-maxage=60` + `ETag` |
| Gallery item signed URLs | Short-lived; not cached beyond expiry |
| Certificate search | `private, no-store` |
| Certificate detail | `private, no-store` |
| Results | `public, s-maxage=60, stale-while-revalidate=300` |
| Order receipt | `private, no-store` |
| Face search | `private, no-store` |

---

## 7. Error codes

| HTTP | `code` | Condition |
| --- | --- | --- |
| 404 | `event_not_found` | Unknown/unpublished event slug |
| 404 | `gallery_item_not_found` | Unknown/unpublished/private gallery item |
| 404 | `order_not_found` | Unknown order or missing order-access cookie |
| 404 | `certificate_not_found` | Unknown certificate number |
| 410 | `certificate_revoked` | Revoked certificate, safe state |
| 404 | `face_search_not_found` | Unknown face-search ID for this event |
| 410 | `face_search_expired` | Results expired (15 minutes) |
| 409 | `capacity_exceeded` | Race/category is full |
| 409 | `duplicate_registration` | Exact duplicate participant in the same race |
| 409 | `idempotency_key_reuse` | Same key, different order payload |
| 422 | `registration_closed` | Phase is closed |
| 422 | `registration_not_open` | Phase is upcoming |
| 422 | `race_not_available` | Race/category not published or not in event |
| 422 | `category_not_eligible` | Gender/age does not match the category |
| 422 | `identity_number_required` | Event requires identity number |
| 422 | `emergency_contact_required` | Event requires emergency contact |
| 422 | `consent_required` | Required consent is false |
| 422 | `face_search_consent_required` | Face search consent is false |
| 422 | `unsupported_media_type` | Face-search image type not allowed |
| 429 | `rate_limited` | Too many requests |
| 503 | `face_search_unavailable` | Detector or Qdrant unavailable |
| 503 | `gallery_item_unavailable` | Gallery original storage unavailable |

---

## 8. Frontend mapping

| Screen / component | Query | Key |
| --- | --- | --- |
| Event header | `GET /public/events/{slug}` | `["public", "event", slug]` |
| Registration page | `GET /public/events/{slug}/registration-config` | `["public", "event", slug, "registration-config"]` |
| Registration submit | `POST /public/events/{slug}/orders` | Mutation; no cache |
| Confirmation | `GET /public/orders/{orderNumber}` with order cookie | `["public", "order", orderNumber]` |
| Gallery | `GET /public/events/{slug}/gallery/collections` + `/gallery/items` | `["public", "event", slug, "gallery", filters]` |
| Item | `GET /public/events/{slug}/gallery/items/{itemId}` | `["public", "event", slug, "gallery-item", itemId]` |
| Face search | `POST /public/events/{slug}/gallery/face-searches` + `GET .../gallery/face-searches/{id}` | `["public", "event", slug, "gallery", "face-search", searchId]`; matched items reuse `["public", "event", slug, "gallery", "item", itemId]` |
| Certificate search | `GET /public/events/{slug}/certificates/search?q=` | `["public", "event", slug, "certificates", q]` |
| Certificate | `GET /public/certificates/{number}` | `["public", "certificate", number]` |
| Results index | `GET /public/events/{slug}/results/races` | `["public", "event", slug, "results"]` |
| Race results | `GET /public/events/{slug}/results/races/{raceSlug}` with filters | `["public", "event", slug, "results", raceSlug, filters]` |

Invalidation:

- Order creation → no cache; navigate to the confirmation route. The success page reads the cookie.
- Public organizer changes (event profile, collections, items, results) are reflected through short
  TTLs and revalidation; no client-side invalidation across apps.
- Face search results poll until terminal, then stop.

UI rules:

- The registration wizard keeps all participant data in component state, never in storage. On submit,
  it sends only the contract fields and an idempotency key generated once per checkout.
- The success URL contains only the order number. The receipt response carries the order lines and
  no PII.
- Gallery filters live in the URL (`?collection=&bib=`); bib and collection filtering is executed by
  the API, which returns public projections only. The bib is written to the URL on submit, not on
  every keystroke.
- The photo dialog is the detail surface: collection, photographer, capture time, prev/next, and a
  **Download photo** action. It does not navigate to the photo page (that route remains for direct
  links). Downloads stream the **original** through the public download endpoint via a same-origin
  route so the browser saves it as an attachment. Displayed grid/dialog/photo-page images disable
  native drag, the context menu, and iOS long-press callouts as a casual-save deterrent — not an
  access control.
- Face search opens from **Find my photos** with consent, a selfie upload, and polling; matches
  replace the grid until **Show all photos** (or any bib/collection change). It is anonymous in
  this version; any future login requirement must not change the endpoint shapes.
- Certificate search debounces 300 ms, shows at most 3 candidates, and never requests pagination.
  The "Narrow your search" state uses `hasMore`.
- Results filters are URL-driven so shared links preserve the view.
- Analytics never receives names, emails, phones, selfies, certificate numbers, or order numbers.
- QR codes and share metadata are frontend concerns; see the public app plan.

---

## 9. Acceptance criteria

1. An anonymous visitor can open a shared registration link and complete an order without login.
2. Race/category presets work; category eligibility is enforced server-side using age on race day.
3. Registration fees and totals come from the server; the client cannot alter them.
4. Multiple participants per order respect `maxParticipantsPerOrder` and conditional requirements.
5. The confirmation page opens with the order-access cookie and shows no PII; the order number alone
   cannot open it.
6. Only public collections and published gallery items appear; JSON responses expose the public
   `previewUrl` only — no storage keys, original URLs, or private items. The download endpoint
   streams original bytes for a public item behind the same visibility rules and rate limit.
7. Bib search filters the public gallery and survives refresh via the URL.
8. Face search runs anonymously from the gallery: it requires consent, returns public gallery items
   only, shows matches in the normal grid, and retains neither the selfie nor derived vectors.
9. Certificate search returns at most 3 read-only candidates and never reveals more or a total count.
10. A certificate number opens the public certificate; unknown and revoked numbers expose no
    personal data.
11. The results index lists published races only; race results show published official rows with
    filters that survive sharing.
12. Public endpoints are rate-limited and cached according to the table.
13. All screens typecheck against the generated client and never import server-only data modules.

---

## 10. Open decisions

| # | Decision | Recommendation | Needed by |
| --- | --- | --- | --- |
| 1 | Public organizer contact | Show only with organization opt-in; store a `public_contact` flag | Public implementation |
| 2 | Payment provider and order expiry | Defer; keep the placeholder step until provider integration | Later |
| 3 | Certificate enumeration mitigation | Keep the 3-candidate cap + rate limit; add name/email verification before production | Before production |
| 4 | Face-search biometric policy | Consent, no retention, no analytics; the UI is anonymous for now — legal/DPIA review and the user-login decision remain open before production | Before production |
| 5 | Email confirmation for orders | Send in production; the demo does not. Adds a buyer email field; the contract already carries it | Later |
| 6 | Results virtualization vs. pagination | API paginates at 50; UI virtualizes within a page | Public implementation |
| 7 | Public gallery metadata | Keep bib/face metadata private; the public lightbox shows collection, photographer, captured time only | Public implementation |
