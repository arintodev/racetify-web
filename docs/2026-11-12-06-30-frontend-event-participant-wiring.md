# Frontend Event and Participant Wiring (F2)

Status: implemented and build-green. Organization events, event overview/settings/races, and the
participant list/import/export now use the real API.

## What changed

### Organization events
- `GET /v1/orgs/{orgId}/events` with server-side `q`, `status`, cursor pagination, and a
  next/previous cursor stack.
- `POST /v1/orgs/{orgId}/events` now collects the backend-required slug, timezone, and
  registration window; the slug is derived from the name until edited.

### Event workspace
- Event layout and overview resolve `GET /v1/events/{eventId}` and
  `GET /v1/events/{eventId}/overview`; stats, recent orders, and races come from the API.
- Event settings use `PATCH /v1/events/{eventId}`.
- Logo/cover uploads use `POST /v1/events/{eventId}/assets` → presigned `PUT` with the returned
  headers → attach with `logoUploadId`/`coverUploadId` on the PATCH.
- Races: list/create/update/delete and reorder via `/v1/events/{eventId}/races`; categories are
  listed and created/deleted per race.

### Participants
- `GET /v1/events/{eventId}/participants` with server-side search, race, category, and status
  filters plus cursor pagination.
- `PATCH /v1/events/{eventId}/participants/{participantId}` for profile edits.
- Bib assignment uses `POST /v1/events/{eventId}/registrations/{registrationId}/bib`.
- Cancellation uses `POST /v1/events/{eventId}/registrations/{registrationId}/cancel`; confirmed
  registrations return `409 refund_required`, which the UI surfaces.
- Import uses the fixed v1 template:
  - template download: `GET /participant-imports/template?download=true`
  - upload raw `text/csv` with `X-File-Name`
  - review server summary/issues
  - commit/cancel and download the error report
  - the old column-mapping wizard is no longer used on this screen.
- Export uses `POST /participant-exports` and downloads the returned token URL through `/api`.

## API client addition

`requestEnvelope<T>()` was added to the shared client so list screens can read
`meta.pagination.nextCursor`/`hasMore`; `request<T>()` still returns only `data`.

## Transitional gaps

- Registration configuration, event team, gallery, documents, orders, payments, certificates, and
  admin screens still use demo data until F3.
- The participant detail sheet uses the list summary; identity number/emergency contact are not in
  the participant list DTO.
- Presigned branding uploads require bucket CORS for the app origins; without it the API upload
  intent succeeds but the browser `PUT` fails.
- Import column mapping is intentionally unsupported; use the downloaded template headers.

## Verification

- `pnpm typecheck` — pass
- `pnpm --filter app lint` / `web lint` — pass
- `pnpm --filter app build` / `web build` — pass
- No backend changes; no Docker or migrations run.
