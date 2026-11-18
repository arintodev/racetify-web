# Public Web App (`apps/web`) — Implementation Plan

> **Status:** Proposed
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Related:** [Implementation Plan](./2026-11-10-07-26-frontend-implementation-plan.md) ·
> [Architecture](./2026-11-10-07-26-frontend-architecture.md) ·
> [Route Map](./2026-11-10-07-26-frontend-route-map.md) ·
> [UI Guidelines](./2026-11-10-07-26-frontend-ui-guidelines.md) ·
> [Delivery Plan](./2026-11-10-07-26-frontend-delivery-plan.md)

This plan covers a new public web app for visitors and participants. It is **share-first and
login-free**, like a Google Form: an organizer shares one URL and anyone can open it on a phone to
register, browse the event gallery, check race results, or view a shared certificate.

The public app lives in `apps/web` and shares design tokens and example data with the organizer app.
It remains a frontend demo: static data, no API calls, no persistence, and no real payment.

**Scope note:** there is no event landing/marketing page. Each shared URL opens the specific
surface it is for. A compact event cover header on each page shows the event thumbnail, name, date,
and location. There is no navigation bar; each page is shared directly.

---

## 1. Decisions

| # | Decision |
| --- | --- |
| 1 | `apps/web` runs at **racetify.com**; `apps/app` runs at **app.racetify.com**. |
| 2 | Certificates use the **certificate number** in the URL; there is no share token. |
| 3 | Individual photo pages are **not indexable**. |
| 4 | Gallery search supports **both bib search and face/selfie search**. |
| 5 | Registration is **login-free** and has **no real payment**; checkout is simulated. |
| 6 | **No participant accounts** in this phase. |
| 7 | Results are **published and displayed per race**. |
| 8 | QR codes are offered **only for event-level links**, not for individual photos, race results, or certificate pages. |
| 9 | Analytics is required, with a consent banner. |
| 10 | The public app uses the **shared demo data** for now. |
| 11 | One order can cover **multiple participants** (family registration), gated by the event's `registrationConfig`. |

---

## 2. Goals and non-goals

### Goals

- Every public surface has a stable, shareable URL with a useful link preview.
- Visitors can register, browse photos, search by bib or face, and view race results without an
  account.
- Participants can open and share a certificate by its certificate number.
- Every page is fast and usable on a mid-range phone.
- Organizer links and QR codes drive traffic to registration, gallery, certificate search, and
  results.

### Non-goals

- Event landing or marketing page.
- Public event discovery/search across all events.
- Participant accounts, login, or registration history.
- Real payments, backend APIs, persistence, or email/SMS delivery.
- Organizer/admin screens; those stay in `apps/app`.
- Multi-language routing in v1.
- Real biometric processing; face search is simulated in the demo.

---

## 3. Surfaces

| Surface | Audience | Entry |
| --- | --- | --- |
| Registration | Participant | Shared registration link |
| Gallery | Visitor / participant | Shared gallery link |
| Certificate search | Participant | `/e/[eventSlug]/certificates` searchable event link, max 3 candidates |
| Certificate | Participant | `/cert/[certificateNumber]` link |
| Results index | Visitor | Shared results link |
| Race results | Visitor | Race selected from the results index |

Each page has:

- A cover header at the form width: event thumbnail, name, dates, and location. No navigation.
- A Share action for the current page; QR is available on event-level links.
- Mobile-first layout with no sidebar.

`/` is a minimal demo link index for review purposes. It is not an event landing page.

---

## 4. App architecture

```
apps/web/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx                      # demo link index only
│  ├─ e/[eventSlug]/
│  │  ├─ layout.tsx                 # event header + metadata
│  │  ├─ register/
│  │  │  ├─ page.tsx
│  │  │  └─ success/[orderNumber]/page.tsx
│  │  ├─ gallery/
│  │  │  ├─ page.tsx
│  │  │  └─ [photoId]/page.tsx
│  │  ├─ certificates/page.tsx       # event certificate search
│  │  └─ results/
│  │     ├─ page.tsx                # race selection only
│  │     └─ [raceSlug]/page.tsx     # results table and filters
│  ├─ cert/[certificateNumber]/page.tsx
│  ├─ sitemap.ts
│  ├─ robots.ts
│  ├─ not-found.tsx
│  └─ error.tsx
├─ components/
│  ├─ public-shell/                 # header, footer, event header
│  ├─ share-button.tsx
│  ├─ gallery-grid.tsx
│  ├─ photo-lightbox.tsx
│  ├─ face-search.tsx
│  ├─ certificate-card.tsx
│  ├─ results-table.tsx
│  └─ registration/
├─ features/
│  ├─ public-gallery/
│  ├─ public-certificates/
│  ├─ public-results/
│  └─ public-registration/
└─ lib/
   ├─ metadata.ts
   ├─ share.ts
   ├─ analytics.ts
   └─ public-selectors.ts
```

**Stack**

- Next.js 16 App Router, React 19, TypeScript strict.
- `@workspace/ui` primitives, tokens, Lucide icons, shadcn only.
- Static generation/ISR; client-side filtering for demo-sized data.
- `next/image` for local gallery assets; `next/og` for share cards.
- Dev ports: `apps/web` 3001, `apps/app` 3000.
- Production: `racetify.com` and `app.racetify.com`.

**Shared demo data**

Extract fixtures, types, and selectors from `apps/app` into `packages/demo-data` so both apps read
one source of truth. Public selectors return public projections only:

- `getPublicEventBySlug(slug)`
- `getPublicRaces(eventSlug)`
- `getPublicGallery(eventSlug)` — published items in public collections only
- `getPublicPhoto(eventSlug, photoId)`
- `getPublicCertificateByNumber(certificateNumber)`
- `searchPublicCertificates(eventSlug, query)` — returns at most 3 candidates with a minimal
  public projection
- `getPublicPublishedRaces(eventSlug)`
- `getPublicResults(eventSlug, raceSlug)`
- `getPublicRegistrationConfig(eventSlug)`
- `getDemoFaceSearchMatches(eventSlug)` — simulated face-search result set

Add the demo fields public pages need:

- `Event.coverUrl`, `Event.logoUrl`.
- `RaceResult` fixtures: event, race, registration, gun/chip time, ranks, status, official flag,
  `publishedAt`.
- Public registration config: enabled races, categories, fees, required fields, registration
  window.
- A demo face-search mapping from a sample selfie to seeded gallery items with faces.

No certificate token is added.

---

## 5. Route map

| Route | Purpose | Shareable | Indexable | QR |
| --- | --- | --- | --- | --- |
| `/` | Demo link index | No | No | No |
| `/e/[eventSlug]/register` | Public registration form | Yes | Yes | Yes |
| `/e/[eventSlug]/register/success/[orderNumber]` | Demo confirmation | Copyable | No | No |
| `/e/[eventSlug]/gallery` | Event gallery + search | Yes | Yes | Yes |
| `/e/[eventSlug]/gallery/[photoId]` | Single photo | Yes | No | No |
| `/e/[eventSlug]/certificates` | Event certificate search, max 3 candidates | Yes | Yes | Yes |
| `/e/[eventSlug]/results` | Race selection only | Yes | Yes | Yes |
| `/e/[eventSlug]/results/[raceSlug]` | Results for one race | Yes | Yes | No |
| `/cert/[certificateNumber]` | Shared certificate | Yes | No | No |

**URL rules**

- Event slug: `/e/borobudur-heritage-run-2027/gallery`.
- Gallery filters: `?collection=race-day&bib=1042&mode=bib`.
- Results filters on the race page: `/results/full-marathon?category=male-open&q=1042`.
- Photo IDs are opaque, never storage keys.
- Certificate numbers are visible and used in the URL: `/cert/CERT-BOR-0001`.
- Registration presets: `/register?race=10k-heritage&category=female-open`.
- Unknown event slugs, races, photo IDs, or certificate numbers render a branded not-found state.

**QR policy**

- QR is offered only on event-level share surfaces: registration, gallery, certificate search, and
  the results index.
- Never show QR on a photo, a race results page, or a certificate page.

---

## 6. Registration (login-free)

**Entry**

- One shared URL; no account required.
- Optional race/category presets from query params.
- Closed registration shows a clear closed state with an event contact placeholder.

**Multi-participant orders**

- Each event's `registrationConfig` controls group registration:
  - `allowMultipleParticipants` and `maxParticipantsPerOrder`.
  - `identityNumberRequired` and `emergencyContactRequired`.
- One buyer can register family members in a single order, e.g. a spouse or parent.
- Every participant has their own race, category, personal details, and bib name.
- The order shares one contact email/phone and one emergency contact.
- Demo limits: Borobudur 4, Bromo 2, Jakarta 5, Bali 6, Rinjani 1, Kuta 3 participants per order.

**Steps**

1. **Races** — choose race and category per participant; add or remove participants up to the
   event limit; show the running order total.
2. **Participants** — first name, last name, gender, birth date, nationality, identity number
   when required by the event config, and bib name for each participant.
3. **Contact** — one order contact (email, phone) and one shared emergency contact.
4. **Review** — participant list with race/category and fee, order total, and required consents.
5. **Confirmation** — demo order number, per-participant race/category and fee, order total, and
   share-event action.

**Behavior**

- Mobile-first, single column, visible progress.
- Validate per step and per participant; keep values when moving backward.
- Submit is simulated; no data is persisted and no payment is taken.
- Fee is displayed per participant and summed for the order.
- The confirmation URL carries race/category entries only — never participant names, contact
  details, or emails.
- Confirmation offers "Share this event" and "Register another order".
- No localStorage or sessionStorage for participant data.

---

## 7. Shareable gallery with bib and face search

**Gallery page**

- Public collections and published photos only.
- Search modes: **bib** and **face**.
- Collection tabs only; no photographer or face-presence filters.
- Responsive image-only grid with 24-item pages or "Load more".
- Tiles show the thumbnail only. Bib, face, photographer, and collection data appear in the
  lightbox.
- Share action and QR code live in a three-dot menu.
- Empty state when no public photos exist.

**Bib search**

- Input a bib number; match against `galleryItem.bibs` text and normalized number.
- Keep the search term in the URL so the filtered gallery is shareable.
- Show a clear no-results state.

**Face search**

- A "Find my photos" panel offers a selfie upload/camera capture.
- Require an explicit consent checkbox before searching.
- Demo behavior: return the preset demo match set for the event; label results as "Simulated
  match" and never claim biometric accuracy.
- No face data is uploaded, stored, or logged. Revoke object URLs after use.
- Results show matched photos in the same grid and lightbox.
- Use `aria-live` for search progress and the result count.
- Privacy copy explains that real face search will require a production consent and retention
  policy.

**Photo lightbox / photo page**

- Full-size photo with labeled collection, photographer, and captured time.
- Previous/next within the filtered results.
- Download is a placeholder and is the only action.
- No bib or face metadata is shown.
- Photo pages are `noindex` by default.

**Privacy**

- Never expose private collections, unpublished items, storage keys, or original URLs.
- Face search returns only public collection items.

---

## 8. Certificates

### 8.1 Event certificate search (`/e/[eventSlug]/certificates`)

- Event-scoped search page reached from the public event header and the organizer's event link.
- Search input supports:
  - **Certificate number** (exact match first).
  - **Participant name** (minimum 2 characters, first/last name).
  - **Bib number** (optional convenience match).
- Debounce search by 300ms. Search as the participant types; no submit button is required.
- **Return at most 3 top candidates.** Rank exact certificate number, then exact name, then
  prefix/fuzzy name matches. If more than 3 match, show "Narrow your search" and never reveal more.
- Candidates are **strictly read-only data display**:
  - Participant name.
  - Race and category.
  - Certificate number.
  - Status: issued or revoked.
  - A single "View certificate" action that opens `/cert/[certificateNumber]`.
- Do not show email, phone, identity number, full registration details, certificate preview,
  download, or share actions on candidate results.
- No pagination, no full listing, no bulk actions, and no recent-search persistence.
- No results: show a helpful empty state ("No certificates match", how to find the number).
- Too many results: show the cap message; do not disclose how many exist.
- The page itself contains no personal data before searching and is indexable; the certificate
  detail page remains `noindex`.
- Share action with QR (event-level link).

### 8.2 Shared certificate (`/cert/[certificateNumber]`)

- Shows event, participant name, race, category, finish status, issue date, certificate number, and
  a verification badge.
- Certificate preview card, download placeholder, and share button.
- Revoked or unknown certificates show a safe state with no personal data.
- `noindex, nofollow`; no certificates in the sitemap.
- OG image is generated from the certificate preview.
- No QR.

**Privacy tradeoff:** certificate numbers are sequential and can be enumerated. The plan accepts
this for the demo. Before production, add rate limiting, a name/email verification step, or an
opaque token without changing the URL shape.

---

## 9. Public results

### 9.1 Results index — race selection only

Route: `/e/[eventSlug]/results`

- Shows only races whose results are published.
- Each race appears as a selectable card/link with name, distance, finisher count, and publication
  date.
- No results table, no filters, and no search on this index. Its only job is race selection.
- If only one race is published, it still appears as a card; do not auto-redirect.
- Empty state when no races are published.
- QR code for the results index (event-level link).

### 9.2 Race results — per race

Route: `/e/[eventSlug]/results/[raceSlug]`

- Columns: rank, bib, participant, category, gun time, chip time, status.
- Filters: category, gender, status; search by bib or name.
- URL-driven filters so shared links preserve the view.
- Sort by official rank; times right-aligned with tabular numerals.
- Pagination or virtualization; 2,000+ rows remain responsive.
- Statuses: finished, DNS, DNF, DQ. Non-official results are not presented as final.
- Share button with race name and URL; no QR.
- Not-found state for unpublished or unknown races.
- Only published, official results are public; no email, phone, or identity fields.

---

## 10. Sharing, metadata, SEO, analytics

**Share component**

- Native `navigator.share` with copy-link fallback and confirmation toast.
- QR only for registration, gallery, certificate search, and the results index.
- Share text per surface, e.g. "Find your photos from {event}" or "Register for {event}".

**Metadata**

| Page | Title | OG image | Robots | QR |
| --- | --- | --- | --- | --- |
| Registration | Register for {event} | Event cover | index | Yes |
| Gallery | {Event} gallery | Event cover / collage | index | Yes |
| Photo | Bib/collection + event | Photo | noindex | No |
| Certificate search | Find your certificate · {event} | Event cover | index | Yes |
| Results index | {Event} results | Event cover | index | Yes |
| Race results | {Race} results at {event} | Event cover + race | index | No |
| Certificate | Certificate for {name} | Certificate preview | noindex | No |
| Confirmation | Registration received | Event cover | noindex | No |
| Demo index | Public demo links | Brand image | noindex | No |

- Canonical URLs on indexable pages.
- `sitemap.ts` includes registration, gallery, certificate search, results index, and published
  race results.
- JSON-LD `SportsEvent` and `BreadcrumbList`; no personal structured data.
- OG images with `next/og`.

**Analytics and consent**

- A consent banner is required. Analytics must not run before consent.
- Store the consent choice in a first-party cookie.
- Track: `share_click`, `gallery_view`, `photo_open`, `bib_search`, `face_search_started`,
  `face_search_completed`, `registration_step`, `registration_submitted`, `race_selected`,
  `results_filter`, `certificate_view`.
- Never send participant names, emails, phone numbers, selfies, or certificate numbers to analytics.
- Use one analytics wrapper so the vendor can change without touching screens.

---

## 11. Design direction

- Photography-first; gallery and event cover carry the identity.
- One primary action per page: Register, Share, Open race, or View certificate.
- Mobile-first: 16px gutters, 44px targets, sticky actions, no horizontal page scroll.
- Same tokens/shadcn primitives as the organizer app; public shell instead of `sidebar-07`.
- Keyboard-accessible lightbox, labeled filters, `aria-sort` on sortable headers.
- Status always has text + icon, never color alone.
- Light and dark mode both work.

---

## 12. Performance budget

| Metric | Target |
| --- | --- |
| LCP (p75, mobile 4G) | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |
| Public route JS | ≤ 150 KB gzipped initial |
| Gallery initial render | ≤ 24 thumbnails |
| Thumbnail size | ≤ 80 KB at grid size |
| Results filter/sort | < 100ms for 2,000 rows |

- Pre-size thumbnails; correct `sizes`; priority only for the hero image.
- Lazy-load below the fold; dynamically import lightbox, QR, face-search panel, and results
  virtualization.
- Static generation/ISR for public pages.
- Prefetch neighboring photos in the lightbox.

---

## 13. Delivery phases

| Phase | Estimate | Outcome |
| --- | --- | --- |
| **W0 Public foundation** | 2 days | `apps/web` scaffold, port 3001, shared demo-data package, public shell, event header, routing, error/not-found, metadata helpers |
| **W1 Registration** | 4 days | Multi-step login-free form, presets, validation, review, confirmation, mobile action bar |
| **W2 Gallery + search** | 4 days | Public collections, bib search, simulated face search, grid, lightbox, photo share, OG metadata |
| **W3 Certificates** | 2.5 days | Event search at `/e/[eventSlug]/certificates` (max 3 read-only candidates), `/cert/[certificateNumber]`, verification/revoked states, share, noindex |
| **W4 Results** | 3 days | Race selection index, per-race results, filters, search, publication states, shareable URLs |
| **W5 Share, SEO, analytics, polish** | 3 days | OG images, sitemap/robots, consent + analytics, QR policy, performance, accessibility, demo script |

**Total:** ~18 person-days. With two engineers after W0, expect ~2.5 calendar weeks including
review.

Suggested split:

- FE1: W0, W1, W2.
- FE2: W3, W4 (starting after W0).
- Shared: W5.

---

## 14. Acceptance criteria

- A registration link opens on a phone without login and completes to a confirmation page.
- Race/category presets select the right options.
- A gallery link preserves collection/bib filters; a photo share link opens the right photo.
- Bib search and simulated face search both return public photos and are clearly labeled.
- Only public collections and published photos appear.
- The event certificate search accepts a number, name, or bib and returns at most 3 read-only
  candidates with only name, race/category, certificate number, and status.
- More than 3 matches show the cap message and never disclose additional candidates.
- Selecting a candidate opens the correct certificate page.
- A certificate number opens the correct certificate; revoked/unknown numbers expose no personal
  data.
- The results index lists published races only and contains no results table.
- A race results link opens the correct race; filters/search survive refresh and sharing.
- Every shareable page has title, description, and OG image.
- QR appears only on registration, gallery, and results index.
- Analytics waits for consent and never receives personal data.
- Lightbox, form, filters, and tables work by keyboard at 375px.
- Build, lint, and typecheck are clean for `apps/web` and shared packages.

## 15. Demo walkthrough

1. Open a shared registration link with a race preset on a phone viewport.
2. Complete the form and reach confirmation.
3. Open the gallery, filter by bib, then run the simulated face search.
4. Open a photo and share it; confirm the URL filters survive.
5. Open the results index, choose a race, filter and search inside that race.
6. Open the event certificate search, search by name and by certificate number, and show that only
   up to 3 read-only candidates appear.
7. Select a candidate and land on the certificate page; then show a revoked certificate.
8. Show the consent banner, share menu, and QR on an event-level page.
9. Show the OG preview for registration, photo, and race results links.

---

## 16. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Certificate number enumeration | Search caps at 3 candidates; minimal fields; `noindex` on certificate pages; safe not-found; plan rate limiting/name check before production. |
| Face search privacy | Consent required; simulated results; no upload/storage; production policy before real matching. |
| Sensitive photo metadata indexed | Photo pages `noindex`; public collections only; no storage keys. |
| Results data does not exist yet | Add `RaceResult` fixtures to the shared demo-data package before W4. |
| Shared package refactor breaks the organizer app | Extract types/selectors first; re-export from the app; keep one boundary. |
| Image-heavy pages are slow | Pre-sized thumbnails, static assets, pagination, lazy loading, budgets. |
| OG generation slows builds | Generate on demand; fall back to event cover. |
| Registration scope grows into payments | v1 stops at simulated confirmation; payment is explicitly out. |
| Analytics/privacy compliance | Consent first; wrapper; no PII; vendor review. |

---

## 17. Remaining open questions

1. Which analytics vendor should the consent wrapper target?
2. Should the event certificate search require additional verification before showing candidates,
   or is the 3-candidate cap sufficient for launch?
3. What exact production face-search consent and retention policy is required?
4. Is the demo link index at `/` acceptable for review, or should it be hidden in production?
5. Should the results index and registration page be indexable from launch?
