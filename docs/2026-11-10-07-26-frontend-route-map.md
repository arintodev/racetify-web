# Route Map and Screen Inventory — Racetify Web Demo

> **Status:** Draft for review
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Related:** [Implementation Plan](./2026-11-10-07-26-frontend-implementation-plan.md) ·
> [Frontend Architecture](./2026-11-10-07-26-frontend-architecture.md) ·
> [UI Guidelines](./2026-11-10-07-26-frontend-ui-guidelines.md) ·
> [Delivery Plan](./2026-11-10-07-26-frontend-delivery-plan.md)

This is the complete screen inventory for the demo. Every screen reads static example data; there
are no API calls and no persisted changes. Timing/results and gallery moderation are absent by
design.

---

## 1. Routing principles

- Organization and event are **sibling workspaces**: `/orgs/[orgId]/...` and
  `/events/[eventId]/...`.
- Every authenticated screen lives inside a `sidebar-07` shell owned by its workspace.
- IDs in the URL resolve against example data. Unknown IDs render `notFound()`.
- Route access is gated by the demo session and the preview role; missing permission renders
  `ForbiddenState`.
- Auth screens are outside the shell and centered.
- No route is public except auth and invitation.
- `/` redirects to `/workspaces` when signed in, otherwise `/login`.

---

## 2. Route tree

```
/                                   → redirect
/login                              auth
/register                           auth
/forgot-password                    auth
/reset-password                     auth
/verify-email                       auth
/invite/[token]                     auth (public summary, accept after sign-in)
/workspaces                         signed in

/settings/profile                   signed in
/settings/security                  signed in
/notifications                      signed in

/orgs/[orgId]                       → redirect to overview
/orgs/[orgId]/overview              org workspace
/orgs/[orgId]/events                org workspace
/orgs/[orgId]/members               org workspace
/orgs/[orgId]/roles                 org workspace
/orgs/[orgId]/settings              org workspace
/orgs/[orgId]/integrations          org workspace (owner)
/orgs/[orgId]/audit-logs            org workspace

/events/[eventId]                   → redirect to overview
/events/[eventId]/overview          event workspace
/events/[eventId]/settings          event workspace
/events/[eventId]/races             event workspace
/events/[eventId]/team              event workspace
/events/[eventId]/registration      event workspace
/events/[eventId]/participants      event workspace
/events/[eventId]/orders            event workspace
/events/[eventId]/payments          event workspace
/events/[eventId]/gallery           event workspace
/events/[eventId]/gallery/collections
/events/[eventId]/gallery/upload
/events/[eventId]/gallery/watermarks
/events/[eventId]/bib-generator     event workspace
/events/[eventId]/certificates      event workspace
/events/[eventId]/audit-logs        event workspace

/admin                              → redirect to overviews
/admin/overviews                    admin
/admin/overviews/[id]               admin
/admin/orgs                         admin
/admin/users                        admin
/admin/users/[id]                   admin
/admin/roles                        admin
/admin/permissions                  admin
/admin/face-enrollments             admin
/admin/storages/providers           admin
/admin/storages/objects             admin
/admin/webhooks                     admin
/admin/webhooks/[id]/deliveries     admin
/admin/audit-logs                   admin
/admin/jobs                         admin
```

---

## 3. Auth and account screens

| Route | Screen | Access | Content and interactions |
| --- | --- | --- | --- |
| `/login` | Sign in | Public | **Continue with Google** (simulated), divider, email/password fallback, "Demo mode" note, link to register. Redirects if already signed in. |
| `/register` | Create account | Public | Google button, name/email/password form, terms note. Submit shows a demo confirmation and signs in. |
| `/forgot-password` | Forgot password | Public | Email form, success state explaining the demo does not send email. |
| `/reset-password` | Reset password | Public | New password + confirmation, success state. |
| `/verify-email` | Verify email | Public | Verification illustration, "Verified" demo state, link to sign in. |
| `/invite/[token]` | Accept invitation | Public summary | Organization, invited role, inviter, expiry. Accept requires sign-in and then shows a confirmation; decline returns to login. |
| `/workspaces` | Workspace picker | Signed in | Cards for organizations and events the demo user can access, "Create organization" sheet, user menu, demo badge. |
| `/settings/profile` | Profile | Signed in | Avatar, name, email, phone, timezone form. Submit toast only. |
| `/settings/security` | Security | Signed in | Password form, connected Google account card, active sessions list (static), sign-out everywhere (toast). |
| `/notifications` | Notifications | Signed in | List with unread filter, mark-read actions (toast only), empty state. |

**Auth layout:** centered card, product mark, theme toggle, small print about demo mode. No
sidebar.

---

## 4. Organization workspace

Shell navigation groups:

- **Workspace:** Overview, Events, Members
- **Administration:** Roles, Settings, Audit log
- Footer: user menu with role preview, theme toggle, sign out.

| Route | Screen | Permission | Example data | Content and interactions |
| --- | --- | --- | --- | --- |
| `/orgs/[orgId]/overview` | Organization overview | `org:overview:view` | org, events, members, registrations, orders | Four stat cards (events, members, registrations, revenue), upcoming events list, recent activity, quick actions. |
| `/orgs/[orgId]/events` | Events | `org:events:view` | events, races | Card/table toggle, search and status filter, create event sheet, open event workspace. |
| `/orgs/[orgId]/members` | Members | `org:members:view` | members, users | Table with name, email, role, status, joined date. Invite dialog, role change menu, suspend/remove confirm. All changes toast only. |
| `/orgs/[orgId]/roles` | Roles | `org:roles:manage` | roles, permissions | Role cards with member counts; permission matrix for the selected role; create/edit role sheet. |
| `/orgs/[orgId]/settings` | Organization settings | `org:settings:view` | org | Profile form, logo upload simulation, contact fields, timezone and currency defaults. Save toast only. |
| `/orgs/[orgId]/integrations` | Integrations | `org:webhooks:manage` | OAuth clients, webhooks | OAuth client cards with one-time secrets (create/rotate/revoke); organization-wide webhook endpoints with create/edit/enable/disable/test/rotate/delete and delivery history. |
| `/orgs/[orgId]/audit-logs` | Organization audit log | `org:audit:view` | audit logs, users | Filterable table (actor, action, resource, date), detail sheet, export toast. |

**Owner vs admin:** both see the organization overview and events. Only the owner sees
organization settings. Roles is owner-only. Members is visible to owner and admin.

---

## 5. Event workspace

Shell navigation groups:

- **Event:** Overview, Settings, Races, Team, Registration
- **Operations:** Participants, Orders, Payments
- **Media:** Gallery, Collections, Upload, Watermarks
- **Documents:** Bib generator, Certificates
- **Administration:** Audit log

The event header shows the event name, dates, status badge, and organization name. The workspace
switcher lists events and organizations.

| Route | Screen | Permission | Example data | Content and interactions |
| --- | --- | --- | --- | --- |
| `/events/[eventId]/overview` | Event overview | `event:overview:view` | event, races, registrations, orders, gallery | Stat cards (registrations, revenue, photos, certificates), registration progress by race, recent orders, gallery preview strip, quick actions. |
| `/events/[eventId]/settings` | Event settings | `event:settings:update` | event | Long form in sections: profile, dates, registration window, timezone, location, status, cover/logo upload simulation. Save toast only. |
| `/events/[eventId]/races` | Races | `event:races:manage` | races, categories | Race table with distance, elevation, start time, capacity, status. Create/edit sheet; categories managed in a nested dialog. |
| `/events/[eventId]/team` | Event team | `event:team:manage` | team, users, roles | Table with role, status, joined date. Invite dialog, role change, suspend/remove confirm. |
| `/events/[eventId]/registration` | Registration setup | `event:registration:manage` | event, races, categories | Form configuration (fields, required, fees), category quotas, preview card of the participant form. Save toast only. |
| `/events/[eventId]/participants` | Participants | `event:participants:view` | participants, registrations, races | Table with search, race/category/status filters. Detail sheet, edit sheet, fixed-template CSV import wizard with validation (column mapping on hold; see [Participant Import Plan](./2026-11-10-12-01-participant-import-column-mapping.md)), export toast, bib assignment dialog. Manage actions require `event:participants:manage`. |
| `/events/[eventId]/orders` | Orders | `event:orders:view` | orders, participants | Table with order number, buyer, total, status, date. Detail sheet with items, payment link, refund confirm. Refund requires `event:orders:manage`. |
| `/events/[eventId]/payments` | Payments | `event:payments:view` | payments, orders | Table with provider, method, amount, status, paid date. Detail sheet with provider reference and raw summary; refund confirm. Refund requires `event:payments:manage`. |
| `/events/[eventId]/gallery` | Gallery | `event:gallery:view` | gallery items, collections | Collection tabs, search, bib/face filters, photo grid, lightbox with read-only metadata. Upload action requires `event:gallery:upload`. No moderation actions. |
| `/events/[eventId]/gallery/collections` | Collections | `event:gallery:manage` | collections, gallery items | Collection cards with cover, count, visibility. Create/edit dialog, reorder, delete confirm (toast only). |
| `/events/[eventId]/gallery/upload` | Upload | `event:gallery:upload` | — | Destination collection card selector (name, visibility, photo count; no thumbnails/covers), dropzone, file list with previews, simulated progress, retry/remove, completion toast. New and queued files follow the selected collection. Uploads do not modify the static gallery. |
| `/events/[eventId]/gallery/watermarks` | Watermarks | `event:watermarks:manage` | watermarks | List with scope, type, position, default badge. Create/edit sheet with position, opacity, scale, rotation, repeat; live preview. Watermarks are optional; if a default gallery watermark exists, the backend applies it during processing. |
| `/events/[eventId]/bib-generator` | Bib generator | `event:generators:manage` | templates, participants, races | Template cards, variable mapping panel, participant selector, preview grid, generate-batch dialog with progress and result table. Download placeholder. |
| `/events/[eventId]/certificates` | Certificates | `event:certificates:view` | certificates, participants | Table with participant, race, number, status, issued date. Generate sheet (template, recipient filter, preview) requires `event:certificates:generate`; revoke requires `event:certificates:revoke`; download placeholder. |
| `/events/[eventId]/audit-logs` | Event audit log | `event:audit:view` | audit logs, users | Filterable table and detail sheet. Read-only. |

**Excluded route:** `/events/[eventId]/timing` is removed. Results/timing screens, imports, and
statuses are not part of this demo.

---

## 6. Platform admin

Shell navigation groups:

- **Platform:** Overviews, Organizations, Users
- **Access:** Roles, Permissions
- **Infrastructure:** Face enrollments, Storage providers, Storage objects, Webhooks, Jobs,
  Audit log

All admin screens are display-first; destructive actions confirm and then toast.

| Route | Screen | Permission | Content |
| --- | --- | --- | --- |
| `/admin/overviews` | Platform overview | `system:overview:view` | Tenant, user, event, and revenue stats; growth chart; recent organizations; job health. |
| `/admin/overviews/[id]` | Tenant snapshot | `system:orgs:view` | Organization profile, usage stats, members, events, recent activity. |
| `/admin/orgs` | Organizations | `system:orgs:view` | Table with name, slug, members, events, status, created date; detail sheet; suspend/activate confirm. |
| `/admin/users` | Users | `system:users:view` | Table with name, email, status, last login, memberships; filters. |
| `/admin/users/[id]` | User detail | `system:users:view` | Profile, memberships, roles, sessions, status actions. |
| `/admin/roles` | System roles | `system:roles:view` | Role cards and permission matrix; edit sheet (toast only). |
| `/admin/permissions` | Permissions | `system:permissions:view` | Searchable catalog grouped by module. |
| `/admin/face-enrollments` | Face enrollments | `system:face-enrollments:view` | Read-only table with user, scope, status, consent date; image preview sheet with privacy note. No review actions. |
| `/admin/storages/providers` | Storage providers | `system:storage:view` | Provider cards/table with type, bucket, visibility, default/active. |
| `/admin/storages/objects` | Storage objects | `system:storage:view` | Table with owner, MIME type, size, dimensions, uploaded date; filters; preview sheet. |
| `/admin/webhooks` | Webhooks | `system:webhooks:view` | Table with URL, events, status, last delivery. |
| `/admin/webhooks/[id]/deliveries` | Deliveries | `system:webhooks:view` | Delivery attempts with status, attempts, next retry, delivered time; payload sheet. |
| `/admin/audit-logs` | Platform audit log | `system:audit:view` | Global filterable log with actor, tenant, action, resource, IP, date. |
| `/admin/jobs` | Jobs | `system:jobs:view` | Table with type, scope, status, attempts, duration; retry confirm. |

**Admin permissions naming:** the catalog must include `system:permissions:view`,
`system:face-enrollments:view`, `system:storage:view`, and `system:jobs:view` in addition to the
existing system entries.

---

## 7. Navigation and access summary

**Organization workspace**

| Item | Permission |
| --- | --- |
| Overview | `org:overview:view` |
| Events | `org:events:view` |
| Members | `org:members:view` |
| Roles | `org:roles:manage` |
| Settings | `org:settings:view` |
| Integrations | `org:webhooks:manage` |
| Audit log | `org:audit:view` |

**Event workspace**

| Item | Permission |
| --- | --- |
| Overview | `event:overview:view` |
| Settings | `event:settings:update` |
| Races | `event:races:manage` |
| Team | `event:team:manage` |
| Registration | `event:registration:manage` |
| Participants | `event:participants:view` |
| Orders | `event:orders:view` |
| Payments | `event:payments:view` |
| Gallery | `event:gallery:view` |
| Collections | `event:gallery:manage` |
| Upload | `event:gallery:upload` |
| Watermarks | `event:watermarks:manage` |
| Bib generator | `event:generators:manage` |
| Certificates | `event:certificates:view` |
| Audit log | `event:audit:view` |

**Role preview outcomes**

| Screen | Owner | Admin | Photographer | Volunteer |
| --- | --- | --- | --- | --- |
| Org overview | ✓ | ✓ | — | — |
| Org members | ✓ | ✓ | — | — |
| Org settings | ✓ | — | — | — |
| Event overview | ✓ | ✓ | ✓ | ✓ |
| Participants | ✓ | ✓ | — | view |
| Orders/payments | ✓ | ✓ | — | — |
| Gallery | ✓ | ✓ | view/upload | view |
| Bib/certificates | ✓ | ✓ | — | — |

---

## 8. Screen states

Every list and detail screen implements:

- **First-use empty:** icon, one sentence, primary action where applicable.
- **Filtered empty:** "No results for these filters" with reset.
- **Forbidden:** `ForbiddenState` with back action.
- **Missing entity:** `notFound()` with back link.
- **Simulated pending:** button spinner or progress for uploads and batch actions.
- **Demo confirmation:** toast "Demo only — changes are not saved".
- **Image fallback:** neutral placeholder with bib or collection label.

---

## 9. Gallery specifics

**Grid**

- 24 items per page, "Load more".
- Tile content: thumbnail, bib badges (up to two, then "+N"), face count badge.
- Hover/focus reveals photographer and captured date.
- Filters: collection, has bib, has face, photographer, bib text.

**Lightbox**

- Full-size image, previous/next, Escape/arrow keys.
- Metadata panel: filename, dimensions, captured time, photographer, collection.
- Bibs: text, normalized number (nullable), confidence. Read-only.
- Faces: count and per-face confidence. No controls.
- Download: toast explaining it is unavailable in the demo.

**No moderation**

There is no verify, reject, approve, archive, reprocess, or review action anywhere in the gallery.
Bib OCR and face detection are informational only.

---

## 10. Deferred and removed routes

| Route | Status |
| --- | --- |
| `/events/[eventId]/timing` | Removed from this demo. Timing/results are out of scope. |
| Gallery review/moderation routes | Not planned. |
| Public registration, gallery, certificates, results (`apps/web`) | Planned separately in [Public Web App Plan](./2026-11-10-12-20-public-web-app-plan.md). |
| Real auth callbacks (`/api/auth/*`, OAuth callback) | Deferred until real auth is in scope. |
| API route handlers | None in this phase. |

---

## 11. Scaffold migration

| Current scaffold | Target |
| --- | --- |
| `(organizer)/orgs/overview` | `/orgs/[orgId]/overview` plus shell layout |
| `(organizer)/orgs/events` | `/orgs/[orgId]/events` |
| `(organizer)/orgs/members` | `/orgs/[orgId]/members` |
| `(organizer)/orgs/settings` | `/orgs/[orgId]/settings` |
| `(organizer)/orgs/audit-logs` | `/orgs/[orgId]/audit-logs` |
| `(organizer)/events/*` | `/events/[eventId]/*` with the event shell |
| `(organizer)/events/timing` | Delete |
| `(organizer)/events/gallery/*` | Keep, add `collections`, remove moderation |
| `(auth)/login`, `register`, `workspaces` | Keep; add forgot/reset/verify/invite |
| `admin/*` | Keep; add `jobs` |
| Missing layouts/loading/error/not-found | Add at root and per workspace |
| Missing account routes | Add profile, security, notifications |

---

## 12. Data sources by screen

| Screen group | Example data modules |
| --- | --- |
| Workspace picker | `organizations`, `events`, `members` |
| Org overview | `organizations`, `events`, `members`, `registrations`, `orders` |
| Org events | `events`, `races` |
| Org members/roles | `members`, `users`, `roles`, `permissions` |
| Org settings/audit | `organizations`, `audit-logs` |
| Event overview | `events`, `races`, `registrations`, `orders`, `gallery` |
| Event settings | `events` |
| Races | `races`, `categories` |
| Team | `team`, `users`, `roles` |
| Registration | `events`, `races`, `categories` |
| Participants | `participants`, `registrations`, `races`, `categories` |
| Orders/payments | `orders`, `payments`, `participants` |
| Gallery | `gallery`, `collections`, `watermarks` |
| Bib generator | `templates`, `participants`, `races` |
| Certificates | `certificates`, `participants`, `races` |
| Admin | `organizations`, `users`, `roles`, `permissions`, `gallery`, `storage`, `webhooks`, `audit-logs`, `jobs` |
| Account | `users`, `notifications` |
