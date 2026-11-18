# Frontend API Contract — Event Setup

> **Status:** Proposed for review
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Applies to:** Event workspace setup screens in `apps/app`
> **Related:** [General Contract](./2026-11-10-19-17-frontend-api-contract-general.md) ·
> [Organizations & Access](./2026-11-10-19-17-api-contract-organizations.md) ·
> [Model Schema](./2026-11-10-06-52-model-schema-complete.md) ·
> [Route Map](./2026-11-10-07-26-frontend-route-map.md)

This feature covers event creation, event settings, races, race categories, event team, and the
registration configuration. Event operations (participants, orders, payments), media, generators,
and certificates are separate feature contracts.

---

## 1. Scope

| Screen | Route | Data |
| --- | --- | --- |
| Event layout/header | `/events/[eventId]/*` | Event, organization, access |
| Event overview | `/events/[eventId]/overview` | Stats, registration progress, recent activity |
| Event settings | `/events/[eventId]/settings` | Profile, dates, registration window, location, timezone, status, media |
| Races | `/events/[eventId]/races` | Races and categories |
| Team | `/events/[eventId]/team` | Event team members and invitations |
| Registration setup | `/events/[eventId]/registration` | Form config, quotas, preview |

Out of scope:

- Event list in the organization workspace — [Organizations & Access](./2026-11-10-19-17-api-contract-organizations.md).
- Participants, imports, orders, payments — [Participants & Commerce](./2026-11-10-19-17-api-contract-participants-commerce.md).
- Gallery, watermarks — [Gallery & Media](./2026-11-10-19-17-api-contract-gallery-media.md).

---

## 2. Permissions

| Action | Permission |
| --- | --- |
| View the event and overview | `event:overview:view` |
| Update event settings and status | `event:settings:update` |
| Manage races and categories | `event:races:manage` |
| Manage the event team | `event:team:manage` |
| Manage registration configuration | `event:registration:manage` |
| Create an event in an organization | `org:events:create` |
| Update an event from the organization workspace | `org:events:update` |

The event header and navigation use `GET /v1/me/access?eventId={eventId}`. Organization owners and
admins receive implicit event permissions as described in the general contract.

---

## 3. Endpoints

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `POST` | `/v1/orgs/{orgId}/events` | `org:events:create` | Create an event |
| `GET` | `/v1/events/{eventId}` | `event:overview:view` | Event header/profile |
| `PATCH` | `/v1/events/{eventId}` | `event:settings:update` | Update settings/status |
| `DELETE` | `/v1/events/{eventId}` | `event:settings:update` | Soft-delete an empty draft event |
| `GET` | `/v1/events/{eventId}/overview` | `event:overview:view` | Event dashboard |
| `POST` | `/v1/events/{eventId}/assets` | `event:settings:update` | Presigned logo/cover upload |
| `GET` | `/v1/events/{eventId}/races` | `event:races:manage` | List races |
| `POST` | `/v1/events/{eventId}/races` | `event:races:manage` | Create a race |
| `PATCH` | `/v1/events/{eventId}/races/{raceId}` | `event:races:manage` | Update a race |
| `DELETE` | `/v1/events/{eventId}/races/{raceId}` | `event:races:manage` | Delete an empty race |
| `PUT` | `/v1/events/{eventId}/races/order` | `event:races:manage` | Reorder races |
| `GET` | `/v1/events/{eventId}/races/{raceId}/categories` | `event:races:manage` | List categories |
| `POST` | `/v1/events/{eventId}/races/{raceId}/categories` | `event:races:manage` | Create a category |
| `PATCH` | `/v1/events/{eventId}/races/{raceId}/categories/{categoryId}` | `event:races:manage` | Update a category |
| `DELETE` | `/v1/events/{eventId}/races/{raceId}/categories/{categoryId}` | `event:races:manage` | Delete an empty category |
| `PUT` | `/v1/events/{eventId}/races/{raceId}/categories/order` | `event:races:manage` | Reorder categories |
| `GET` | `/v1/events/{eventId}/team` | `event:team:manage` | Team rows |
| `POST` | `/v1/events/{eventId}/invitations` | `event:team:manage` | Invite a team member |
| `PATCH` | `/v1/events/{eventId}/team/{memberId}` | `event:team:manage` | Change role or status |
| `DELETE` | `/v1/events/{eventId}/team/{memberId}` | `event:team:manage` | Remove a team member |
| `GET` | `/v1/events/{eventId}/team/roles` | `event:team:manage` | Assignable event roles |
| `GET` | `/v1/events/{eventId}/registration-config` | `event:registration:manage` | Registration form config |
| `PUT` | `/v1/events/{eventId}/registration-config` | `event:registration:manage` | Replace registration config |

Event routes never include `orgId`; the API resolves the organization from the event.

---

## 4. Query parameters

### Event list (organization workspace)

Defined in [Organizations & Access](./2026-11-10-19-17-api-contract-organizations.md).

### Races and categories

Small bounded lists; returned in `sortOrder` order. No pagination. If an event exceeds 100 races,
the endpoint returns `422 too_many_races` and the product must revisit the model.

### Team

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | Name or email |
| `status` | `invited, active, suspended` | Repeatable |
| `roleId` | UUID | Exact role |
| `sort` | `name, joinedAt, status` | Default `name` |
| `limit`, `cursor` | — | Cursor pagination |

---

## 5. DTOs

```ts
type EventDTO = {
  id: string
  orgId: string
  organization: { id: string; name: string; slug: string }
  name: string
  slug: string
  description: string
  shortDescription: string
  logoUrl: string | null
  coverUrl: string | null
  startDate: string        // YYYY-MM-DD
  endDate: string          // YYYY-MM-DD
  registrationStartAt: string
  registrationEndAt: string
  timezone: string
  location: string
  status: "draft" | "published" | "ongoing" | "completed" | "cancelled"
  registrationConfig: EventRegistrationConfigDTO
  createdAt: string
  updatedAt: string
}

type EventRegistrationConfigDTO = {
  allowMultipleParticipants: boolean
  maxParticipantsPerOrder: number
  identityNumberRequired: boolean
  emergencyContactRequired: boolean
  fields: Array<{
    key: string
    label: string
    required: boolean
    visible: boolean
    type: "text" | "select" | "date" | "phone" | "email"
    options?: string[]
  }>
  preview: {
    headline: string
    description: string
  }
}

type EventOverviewDTO = {
  stats: {
    participants: number
    registrations: number
    confirmedRegistrations: number
    revenue: number
    photos: number
    certificates: number
    races: number
    team: number
  }
  registrationProgress: Array<{
    race: { id: string; name: string; distanceKm: number; capacity: number }
    registered: number
    confirmed: number
    percentage: number
  }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    status: string
    totalAmount: number
    createdAt: string
  }>
  galleryPreview: Array<{
    id: string
    /** Stable public WebP preview URL (signed only when no public base URL is configured). */
    previewUrl: string
    width: number
    height: number
  }>
}

type RaceDTO = {
  id: string
  eventId: string
  name: string
  slug: string
  description: string
  distanceKm: number
  elevationGain: number
  startTime: string
  cutOffDurationMinutes: number
  maxParticipants: number
  status: "draft" | "published" | "closed"
  sortOrder: number
  categories: RaceCategoryDTO[]
}

type RaceCategoryDTO = {
  id: string
  raceId: string
  name: string
  code: string
  gender: "male" | "female" | "mixed" | "open"
  minAge: number
  maxAge: number
  quota: number
  sortOrder: number
}

type EventTeamRowDTO = {
  id: string
  user: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
    status: "active" | "suspended" | "deleted"
  }
  role: { id: string; name: string; slug: string }
  status: "invited" | "active" | "suspended"
  joinedAt: string | null
  invitedAt: string
}
```

`EventRegistrationConfigDTO.fields` is the server-owned form definition. The public registration
page receives a public projection of it, not internal editor metadata.

---

## 6. Business rules

### Event lifecycle

- An event belongs to exactly one organization (`org_id`).
- `slug` is unique per organization and immutable after publication.
- `startDate <= endDate`.
- `registrationStartAt < registrationEndAt`.
- The registration window should fall before the event start for a normal event; the API returns
  `422 registration_window_invalid` if it does not, unless the event explicitly allows late
  registration (not in v1).
- `timezone` is a valid IANA zone; start times are stored in UTC and displayed in that zone. The
  cutoff is a duration in minutes and is displayed relative to the start time.
- Status transitions:
  - `draft → published` requires at least one published race with at least one category.
  - `published → ongoing` and `ongoing → completed` are allowed.
  - `cancelled` is allowed from any non-completed state and requires `event:settings:update`.
  - A completed or cancelled event cannot be republished in v1.
- Deleting an event is allowed only for a `draft` with no registrations, orders, payments, gallery
  items, or certificates → otherwise `409 event_not_deletable`. Use `cancelled` instead.
- Every status change is audited.

### Event assets

- `POST /v1/events/{eventId}/assets` takes `{ purpose: "logo" | "cover", fileName, mimeType, size }`
  and returns a presigned `PUT`, an opaque `uploadId`, and an expiry.
- Logo types: **SVG or PNG**. SVG is sanitized server-side; PNG is rasterized as provided. Cover
  types: JPEG, PNG, WebP. Enforce max dimensions and file size.
- The client uploads, then `PATCH /v1/events/{eventId}` with `logoUploadId` or
  `coverUploadId`. The API validates ownership and returns signed `logoUrl`/`coverUrl` values.

### Races

- A race belongs to the event in the path.
- `distanceKm > 0`, `elevationGain >= 0`, `maxParticipants >= 1`.
- `cutOffDurationMinutes > 0`. The effective cutoff is `startTime + cutOffDurationMinutes` and must
  fall within the event's date span. The API returns the duration, not an absolute cutoff timestamp.
- `slug` is unique per event.
- `sortOrder` is managed by the reorder endpoint; the server rewrites a dense sequence.
- A race with registrations cannot be deleted → `409 race_in_use`. Set status `closed` instead.
- Publishing a race requires at least one category.
- Race quota is informational in v1; the public registration server enforces capacity at order
  creation.

### Race categories

- A category belongs to the race in the path.
- `gender` is `male`, `female`, `mixed`, or `open`.
- `0 <= minAge < maxAge <= 120`; missing bounds are represented as `0`/`120` for v1.
- `quota >= 0`.
- Category age/gender ranges must not overlap in a way that makes eligibility ambiguous for the same
  race → `422 category_overlap`. `mixed`/`open` may coexist with gendered categories only when the
  product explicitly wants that; v1 rejects it.
- A category with registrations cannot be deleted → `409 category_in_use`.
- Deleting the last category of a published race is blocked until the race is closed or another
  category exists.

### Event team

- `event_team` membership is independent of `org_members`, as the schema requires.
- A team member can hold an event role owned by the event's organization. A role from another
  organization → `422 role_scope_invalid`.
- The last `event:admin` cannot be removed → `409 last_event_admin`.
- Team membership does not grant organization membership.
- Invitations use the same token/expiry rules as organization invitations; `event_id` is set.
- Removing a team member immediately removes event permissions on the next request.
- Event team and organization membership changes are audited.

### Registration configuration

- `maxParticipantsPerOrder >= 1`; when `allowMultipleParticipants = false`, the effective max is 1.
- `identityNumberRequired` and `emergencyContactRequired` are booleans that the public registration
  page reads directly.
- `fields` is validated against a server-side allowlist of participant and registration fields; it
  cannot disable required identity fields when the event requires them.
- Replacing the config is atomic and audited.
- The public registration config is a projection; internal editor keys are not exposed publicly.

---

## 7. Error codes

| HTTP | `code` | Condition |
| --- | --- | --- |
| 404 | `event_not_found` | Unknown or inaccessible event |
| 409 | `event_not_deletable` | Event has dependent data |
| 409 | `race_in_use` | Race has registrations |
| 409 | `category_in_use` | Category has registrations |
| 409 | `last_event_admin` | Removing the last event admin |
| 409 | `event_not_publishable` | No published race/category |
| 422 | `invalid_date_range` | End before start |
| 422 | `registration_window_invalid` | Window is invalid |
| 422 | `invalid_timezone` | Unknown IANA zone |
| 422 | `race_capacity_exceeded` | Capacity below current registrations |
| 422 | `category_overlap` | Ambiguous age/gender eligibility |
| 422 | `role_scope_invalid` | Event role from another scope/organization |
| 422 | `unknown_field` | Registration config field not allowlisted |

---

## 8. Frontend mapping

| Screen / component | Query | Key |
| --- | --- | --- |
| Event layout/header | `GET /events/{eventId}` + `GET /me/access?eventId=` | `["event", eventId]`, `["access", "event", eventId]` |
| Overview | `GET /events/{eventId}/overview` | `["event", eventId, "overview"]` |
| Settings | `GET /events/{eventId}` | `["event", eventId]` |
| Races | `GET /events/{eventId}/races` | `["event", eventId, "races"]` |
| Team | `GET /events/{eventId}/team` + `GET /events/{eventId}/team/roles` | `["event", eventId, "team"]`, `["event", eventId, "team", "roles"]` |
| Registration setup | `GET /events/{eventId}/registration-config` | `["event", eventId, "registration-config"]` |

Invalidation:

- Event update/status change → `["event", eventId]`, `["event", eventId, "overview"]`,
  `["org", orgId, "events"]`, `["workspaces"]`.
- Race/category changes → `["event", eventId, "races"]`, `["event", eventId, "overview"]`.
- Team changes → `["event", eventId, "team"]`, `["access", "event", eventId]`.
- Registration config → `["event", eventId, "registration-config"]`; public config is cached
  separately with a short TTL and revalidated by the public app.

UI rules:

- Event settings are read-only without `event:settings:update`.
- Races and categories are hidden/read-only without `event:races:manage`.
- Team management is hidden without `event:team:manage`.
- Registration setup is hidden without `event:registration:manage`.
- Direct URL access without the route permission renders `ForbiddenState`.
- Unknown event IDs render `notFound()`.

---

## 9. Acceptance criteria

1. An event can be created under an organization and appears in the organization event list.
2. Invalid date ranges, registration windows, and time zones are rejected with field errors.
3. A draft event cannot be published without a published race and category.
4. Races and categories reorder atomically and persist `sortOrder`.
5. A race with registrations cannot be deleted.
6. Event team invitations use the shared invitation flow and grant event-only access.
7. Organization owners/admins see event setup screens through implicit event access; event team
   members see only their permitted screens.
8. The registration config drives the public registration page through its public projection.
9. Cross-tenant event access returns `404`.
10. All screens typecheck against the generated client.

---

## 10. Open decisions

| # | Decision | Recommendation | Needed by |
| --- | --- | --- | --- |
| 1 | Race capacity enforcement | Enforce at order creation; expose remaining capacity as informational | Event implementation |
| 2 | Logo formats | **Resolved:** logos accept SVG or PNG; SVG is sanitized server-side | Event implementation |
| 3 | Late registration | Not in v1; reject windows after event start | Event implementation |
| 4 | Event deletion policy | Soft-delete drafts only; cancel published events | Event implementation |
| 5 | Event role management | Reuse organization custom roles with `scope = event` | Event implementation |
