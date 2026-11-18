# Frontend Architecture — Racetify Web Demo

> **Status:** Draft for review
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Related:** [Implementation Plan](./2026-11-10-07-26-frontend-implementation-plan.md) ·
> [Route Map](./2026-11-10-07-26-frontend-route-map.md) ·
> [UI Guidelines](./2026-11-10-07-26-frontend-ui-guidelines.md) ·
> [Delivery Plan](./2026-11-10-07-26-frontend-delivery-plan.md)

This document describes the complete demo architecture: workspace shells, routing, static example
data, demo sign-in, permissions, gallery behavior, and shared screen patterns. It is a whole-app
blueprint, not an incremental build guide.

---

## 1. Constraints

| Constraint | Consequence |
| --- | --- |
| Frontend-only demo in `apps/app` | No API calls, no server data, no backend work. |
| Static example data | Screens import typed fixtures directly; nothing is persisted. |
| Refresh behavior | The example data always returns to its original state. |
| Simulated Google login | An in-memory demo session; clearly labeled as demo mode. |
| shadcn/ui only | `sidebar-07` provides the shell; components are added with the CLI. |
| No timing/results | Event navigation stops at participation, commerce, gallery, and certificates. |
| No gallery moderation | Bib OCR and face detection are displayed read-only. |
| No tests in this phase | Quality is judged against the demo script and build health. |
| Next.js 16.4.4 | Root layout is server-rendered; workspace shells and screens are client components. |

---

## 2. App shape

The demo runs entirely in the browser with static data.

```
┌─────────────────────────────────────────────────────────────┐
│ Browser                                                     │
│                                                             │
│  Root layout (server: fonts, metadata)                      │
│   └─ Providers (client: theme, toaster, demo session)       │
│       └─ Workspace shells (client, sidebar-07)              │
│           └─ Screens (client)                               │
│                └─ selected example data from lib/demo-data  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- The **root layout** stays a Server Component for fonts, metadata, and global CSS.
- Workspace shells and screens are **Client Components** because the demo session, role preview,
  sidebar state, filters, and dialogs all live in the browser.
- Screens select data from static modules. There is no fetch, no cache, and no persistence.
- Simulated actions (upload, batch generation, form submit) use local state and timers to show
  pending and progress states, then a confirmation toast.
- The boundaries are designed so a real API and real auth can replace these modules later without
  rewriting screens.

---

## 3. Workspace and route structure

```
app/
├─ layout.tsx                     # server: fonts, metadata, globals
├─ providers.tsx                  # client: theme, toaster, DemoSessionProvider
├─ page.tsx                       # redirect: session ? /workspaces : /login
├─ not-found.tsx
├─ error.tsx
├─ (auth)/
│  ├─ layout.tsx                  # centered auth layout
│  ├─ login/page.tsx
│  ├─ register/page.tsx
│  ├─ forgot-password/page.tsx
│  ├─ reset-password/page.tsx
│  ├─ verify-email/page.tsx
│  └─ invite/[token]/page.tsx
├─ (account)/
│  ├─ layout.tsx                  # account shell
│  ├─ settings/profile/page.tsx
│  ├─ settings/security/page.tsx
│  └─ notifications/page.tsx
├─ (organizer)/
│  ├─ workspaces/page.tsx         # workspace picker (no sidebar)
│  ├─ orgs/[orgId]/
│  │  ├─ layout.tsx               # organization shell
│  │  ├─ page.tsx                 # redirect → overview
│  │  ├─ overview/page.tsx
│  │  ├─ events/page.tsx
│  │  ├─ members/page.tsx
│  │  ├─ roles/page.tsx
│  │  ├─ settings/page.tsx
│  │  └─ audit-logs/page.tsx
│  └─ events/[eventId]/
│     ├─ layout.tsx               # event shell
│     ├─ page.tsx                 # redirect → overview
│     ├─ overview/page.tsx
│     ├─ settings/page.tsx
│     ├─ races/page.tsx
│     ├─ team/page.tsx
│     ├─ registration/page.tsx
│     ├─ participants/page.tsx
│     ├─ orders/page.tsx
│     ├─ payments/page.tsx
│     ├─ gallery/
│     │  ├─ page.tsx
│     │  ├─ collections/page.tsx
│     │  ├─ upload/page.tsx
│     │  └─ watermarks/page.tsx
│     ├─ bib-generator/page.tsx
│     ├─ certificates/page.tsx
│     └─ audit-logs/page.tsx
└─ admin/
   ├─ layout.tsx                  # admin shell
   ├─ page.tsx                    # redirect → overviews
   ├─ overviews/page.tsx
   ├─ overviews/[id]/page.tsx
   ├─ orgs/page.tsx
   ├─ users/page.tsx
   ├─ users/[id]/page.tsx
   ├─ roles/page.tsx
   ├─ permissions/page.tsx
   ├─ face-enrollments/page.tsx
   ├─ storages/providers/page.tsx
   ├─ storages/objects/page.tsx
   ├─ webhooks/page.tsx
   ├─ webhooks/[id]/deliveries/page.tsx
   ├─ audit-logs/page.tsx
   └─ jobs/page.tsx
```

**Workspace rules**

- Organization and event are siblings. Event URLs never include the organization ID.
- The organization shell and event shell share one `WorkspaceShell` component fed by different
  navigation data and header content. Never fork the shell.
- Each `[orgId]` and `[eventId]` layout resolves the entity from the example data. Unknown IDs
  render `notFound()`.
- Pages use `useParams()` for IDs because they are client components.
- The admin and account areas reuse the same shell with different navigation.
- Auth screens use a separate centered layout.

---

## 4. Shared shell (`sidebar-07`)

The shadcn `sidebar-07` block is the base for all authenticated areas.

**Anatomy**

- Collapsible sidebar with icon mode.
- Header slot for the workspace switcher.
- Grouped navigation with labels and optional badges.
- Footer with the user menu.
- Content inset with a top bar for the sidebar trigger, breadcrumbs, and page actions.
- Mobile: the sidebar becomes a sheet.

**Adaptation**

- Add the block once:
  `pnpm dlx shadcn@latest add sidebar-07 -c apps/app`
- Move the generated layout into `components/app-shell/` and delete the example page the CLI adds.
- Replace hard-coded navigation with typed configs:
  `organizationNav`, `eventNav`, `adminNav`, `accountNav`.
- Replace the team switcher with `WorkspaceSwitcher`, listing organizations and events and
  navigating on select.
- Keep the block's structure and spacing. Change only labels, links, icons, and tokens.
- Every page starts with `PageHeader` inside `SidebarInset`.

**Navigation item shape**

```ts
type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  permission?: Permission
  badge?: string | number
}

type NavGroup = {
  label: string
  items: NavItem[]
}
```

Navigation is filtered by the current demo role. Hidden items are removed, not disabled.

---

## 5. Static example data

### 5.1 Layout

```
lib/demo-data/
├─ types.ts             # Organization, Event, Participant, GalleryItem, ...
├─ organizations.ts
├─ events.ts
├─ members.ts
├─ participants.ts
├─ registrations.ts
├─ orders.ts
├─ payments.ts
├─ gallery.ts
├─ watermarks.ts
├─ certificates.ts
├─ notifications.ts
├─ audit-logs.ts
├─ admin.ts
├─ selectors.ts         # getOrgById, getEventsByOrg, getParticipantsByEvent, ...
└─ index.ts
```

- Every module exports typed constant arrays.
- IDs are readable and stable (`org-nusantara`, `event-borobudur-run`, `part-0001`).
- Dates are ISO strings; screens format them with shared helpers.
- Amounts are integers in rupiah.
- Bib numbers are strings.
- Photos are local assets in `public/demo/`.
- Selectors centralize filtering by `orgId` / `eventId`; screens never duplicate that logic.

### 5.2 Data volume

| Entity | Count |
| --- | --- |
| Organizations | 3 |
| Events | 6 (4 under the primary org, 1 each under the others) |
| Races per event | 2–4, with categories |
| Org members | 8–14 per org |
| Event team | 5–9 per event |
| Participants | 200 total, Indonesian names, mixed genders, realistic birth dates |
| Registrations | One per participant per event, distributed statuses |
| Orders | 120 total, mixed statuses |
| Payments | One per paid order, mixed providers and methods |
| Gallery collections | 3–5 per event |
| Gallery items | 60 total, local sample photos |
| Certificates | 40 total, mostly issued, a few revoked |
| Notifications | 12 |
| Audit logs | 40 |
| Jobs | 8, mixed statuses |

Fixtures include variety for filters, empty states, and badges: multiple distances, long names,
mixed statuses, and timezones in `Asia/Jakarta`.

### 5.3 No mutation, no persistence

- Screens never write to the data modules.
- Filters, sorting, pagination, selected rows, and open dialogs are local component state.
- Create/edit forms validate and then show a confirmation toast: "Demo only — changes are not
  saved." The sheet closes.
- Revoke/refund/delete actions use a confirmation dialog and then a toast; the underlying row does
  not change.
- Upload and batch generation simulate progress with timers, then show a completion toast.
- Refreshing restores the original data.
- No `localStorage`, `sessionStorage`, IndexedDB, or cookies are used for domain data.

### 5.4 Relationships

Selectors join by IDs, not nested objects, to match the domain model:

```ts
const event = getEventById(eventId)
const races = getRacesByEvent(eventId)
const participants = getParticipantsByEvent(eventId)
const registrations = getRegistrationsByEvent(eventId)
```

Screens display joined view models built in `selectors.ts` or a feature-level `lib/view-model.ts`.
This keeps fixtures flat and easy to edit.

---

## 6. Demo session and Google sign-in

### 6.1 Session

```ts
type DemoRole = "owner" | "admin" | "photographer" | "volunteer"

type DemoSession = {
  user: DemoUser
  role: DemoRole
} | null
```

- Held in React context; **not** persisted.
- `SessionProvider` exposes `session`, `signInWithGoogle()`, `signInWithEmail()`, `signOut()`, and
  `setPreviewRole()`.
- A refresh signs the user out. The demo is presented as a guided walkthrough that starts at the
  login screen.
- A visible "Demo" badge appears in the shell header.

### 6.2 Login screen

- Primary action: **Continue with Google**, with the Google mark.
- Secondary: email/password form.
- Google path: show a pending state for ~800ms, then create the demo persona (`Ayu Pradita`,
  owner) and navigate to `next` if it is a safe relative path, otherwise `/workspaces`.
- Email path accepts any valid email and a non-empty password, then behaves the same.
- A note under the form: "Demo mode — no real authentication."
- If a session exists, redirect to `/workspaces`.

### 6.3 Guards

```tsx
<RequireSession>
  <RequirePermission permission="org:members:view">{children}</RequirePermission>
</RequireSession>
```

- `RequireSession` redirects to `/login?next=...` when there is no session.
- `RequirePermission` renders `ForbiddenState` when the preview role lacks the permission.
- Layouts resolve the organization or event from example data and call `notFound()` for unknown
  IDs.
- This is UI gating only; there is no server authority in the demo.

### 6.4 Role preview

The user menu includes **View as**: Owner, Admin, Photographer, Volunteer.

- Switching updates navigation, route access, and action visibility immediately.
- A toast confirms the switch ("Viewing as Photographer").
- The header shows the active preview role.
- Sign out clears the session and returns to `/login`.
- "Reset demo data" is not needed because data is static.

---

## 7. Permissions

A compact catalog lives in `lib/auth/permissions.ts`.

```ts
type Permission =
  | "org:overview:view"
  | "org:settings:view" | "org:settings:update"
  | "org:members:view" | "org:members:manage"
  | "org:roles:manage"
  | "org:events:view" | "org:events:create" | "org:events:update"
  | "org:audit:view"
  | "event:overview:view" | "event:settings:update"
  | "event:races:manage" | "event:team:manage"
  | "event:registration:manage"
  | "event:participants:view" | "event:participants:manage"
  | "event:orders:view" | "event:orders:manage"
  | "event:payments:view" | "event:payments:manage"
  | "event:gallery:view" | "event:gallery:upload" | "event:gallery:manage"
  | "event:watermarks:manage"
  | "event:generators:manage"
  | "event:certificates:view" | "event:certificates:generate"
  | "event:certificates:revoke"
  | "event:audit:view"
  | "system:overview:view"
  | "system:orgs:view" | "system:orgs:manage"
  | "system:users:view" | "system:users:manage"
  | "system:roles:view" | "system:roles:manage"
  | "system:permissions:view"
  | "system:face-enrollments:view"
  | "system:storage:view"
  | "system:webhooks:view" | "system:jobs:view" | "system:jobs:retry"
  | "system:audit:view"
```

**Demo role bundles**

| Role | Sees |
| --- | --- |
| Owner | All organization, event, and system screens |
| Admin | Organization overview, members, roles, events; all event screens; no admin console |
| Photographer | Event overview and gallery (view/upload) |
| Volunteer | Event overview, participant list (read-only), gallery (view) |

`useCan(permission)` and `<Can permission>` are the only ways screens check access. Permission
strings are never written inline in components.

**Behavior**

- Filter navigation items by permission; hide a group with no visible items.
- Direct URL access without permission renders `ForbiddenState` with a "Back to workspace" action.
- Action buttons use `<Can>`.
- The preview role switcher is the demo mechanism; no multiple accounts are needed.

---

## 8. Shared screen patterns

Every module follows:

```
PageHeader
├─ title, description
├─ breadcrumbs (from the shell)
└─ primary/secondary actions (permission-gated)

FilterBar / Toolbar (optional)
DataTable | CardGrid | Form
EmptyState | ErrorState | ForbiddenState (as needed)
```

Shared components in `apps/app/components/`:

| Component | Purpose |
| --- | --- |
| `WorkspaceShell` | `sidebar-07` shell with nav, switcher, user menu, content inset |
| `WorkspaceSwitcher` | Organizations and events dropdown |
| `PageHeader` | Title, description, breadcrumbs, actions |
| `StatCard` | Dashboard metric with icon, value, delta |
| `DataTable` | shadcn table wrapper with toolbar, pagination, empty/filtered states |
| `FilterBar` | Search, selects, date range, reset |
| `StatusBadge` | Central status label and tone per entity |
| `EmptyState` | First-use, filtered, and permission variants |
| `ErrorState` | Retry/back action and description |
| `ForbiddenState` | 403 messaging and back action |
| `ConfirmDialog` | Destructive confirmation |
| `FormSheet` | Side sheet for create/edit forms |
| `DetailSheet` | Read-only row detail |
| `MetricChart` | Recharts wrapper using chart tokens |
| `GalleryGrid` / `GalleryLightbox` | Photo grid and viewer |
| `UploadQueue` | Simulated upload list with progress |
| `ImportParticipantsSheet` | Fixed-template CSV upload, validation, and result wizard |
| `BibBadge` / `FaceBadge` | Read-only gallery metadata |

**Tables**

- Client-side sorting, filtering, and pagination; no data fetching.
- Filters live in component state.
- Row click opens a detail sheet; actions live in a row menu.
- Always render empty and filtered-empty states.
- Below 768px, dense tables keep horizontal scroll with a sticky first column, or switch to
  stacked cards.

**Forms**

- `react-hook-form` + `zodResolver`.
- Create/edit uses `FormSheet` or a dedicated page for long forms (event settings).
- Submit simulates 500–900ms, then closes and shows: "Demo only — changes are not saved."
- Validation is inline and specific.
- Destructive actions use `ConfirmDialog`.

**Dashboards**

- Four `StatCard`s, one chart, and two lists (recent/upcoming).
- Charts are dynamically imported.
- Every chart has a text summary and a "View details" link.

**Participant import**

- Three-step sheet: download/upload the fixed template → review validation → result.
- The CSV must match the fixed template. Column mapping is on hold; arbitrary headers are rejected
  with `invalid_template`.
- Validation covers required values, emails, phones, genders, dates, race/category references,
  duplicate emails, and bib conflicts.
- Imported rows are appended to the participant page's local state; nothing is persisted.
- Implemented in `apps/app/features/participants/import/`. The column-mapping plan is retained for a
  later version in the
  [Participant Import Plan](./2026-11-10-12-01-participant-import-column-mapping.md).

---

## 9. Gallery (no moderation)

### 9.1 Pages

| Route | Content |
| --- | --- |
| `/events/[eventId]/gallery` | Collection filter, search, photo grid, lightbox |
| `.../gallery/collections` | Collections list with create/edit dialogs |
| `.../gallery/upload` | Dropzone, queue, simulated progress |
| `.../gallery/watermarks` | Watermark list, editor form, live preview |

No review queue, verification action, or moderation state exists.

### 9.2 Grid

- Responsive uniform grid; 60 seeded photos; page size 24 with "Load more".
- Tile shows thumbnail, bib badges, and face count. Hover shows photographer and capture date.
- Filters: collection, bib presence, face presence, photographer, bib text search.
- Metadata is read-only. Clicking a badge opens the metadata panel; it never starts a workflow.

### 9.3 Lightbox

- Full-size image, previous/next, keyboard arrows, Escape to close.
- Metadata: filename, dimensions, captured time, photographer, collection.
- Bibs: original text, normalized number when present, confidence. Read-only.
- Faces: count and per-face index/confidence. No editor; optional read-only boxes if coordinates
  exist.
- Download shows: "Download is not available in the demo."

### 9.4 Upload simulation

- **Destination collection** is chosen with card selection, not a dropdown. The card grid includes
  a "No collection" option plus every event collection. Cards show the collection name,
  public/private status, and photo count. They intentionally show **no thumbnail or cover image**.
- New files inherit the selected collection. Changing the selection also updates files that are
  still queued; files already uploading keep their original collection.
- Dropzone accepts JPEG/PNG/WebP and shows previews via object URLs.
- Queue moves through `queued → uploading → completed` on timers; failures can be retried.
- Each queue item shows its assigned collection badge alongside size and status.
- On completion, show a toast. Uploads are not added to the static gallery.
- Leaving with active uploads shows a confirmation.
- Revoke object URLs on unmount.

### 9.5 Watermarks

- List with scope, type, position, opacity, and default flag.
- Create/edit form: image or text, position, opacity, scale, rotation, repeat mode.
- Live preview overlays on a sample photo.
- Watermarks are optional. If a default gallery watermark exists, the backend applies it during
  processing; there is no organizer "apply" action.

---

## 10. Bib generator and certificates

**Bib generator**

- Three templates with previews and dimensions.
- Variable mapping: bib number, participant name, race, category, event logo, sponsor.
- Preview for a selected participant and a grid of six sample bibs.
- "Generate batch" shows a progress dialog, then a result table. Download is a placeholder toast.
- No template editor in this phase.

**Certificates**

- Table: participant, race, certificate number, status, issued date.
- Generate dialog: template, recipient filter, preview.
- Revoke uses `ConfirmDialog`, then a toast. The row does not change.
- Download is a placeholder toast.

---

## 11. States

| State | Treatment |
| --- | --- |
| First-use empty | Icon, one-sentence explanation, primary action |
| Filtered empty | "No results", active filter summary, reset action |
| Permission empty | `ForbiddenState`; never render partial data |
| Missing entity | `notFound()` with a link back to the workspace |
| Simulated async | Pending button, progress bar, then toast |
| Form validation | Inline field errors |
| Demo limitation | Toast: "Demo only — changes are not saved" |
| Broken image | Neutral placeholder with bib or collection label |

Global `error.tsx` and `not-found.tsx` exist at the app root and under each workspace. Toasts are
announced through an `aria-live` region.

---

## 12. shadcn/ui usage

- Add components only with the CLI:
  `pnpm dlx shadcn@latest add <component> -c apps/app`
- Generated primitives live in `packages/ui/src/components`; app compositions live in
  `apps/app/components`.
- Do not edit generated primitives except for bug fixes; compose around them.
- Do not install a second component library.
- Icons are Lucide; decorative icons are `aria-hidden`.
- Use semantic tokens and the existing radius scale. No hex colors or per-screen palettes.
- See the [UI Guidelines](./2026-11-10-07-26-frontend-ui-guidelines.md) for the component list.

---

## 13. Formatting

- Currency: integer rupiah via `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })`.
- Dates: `dd MMM yyyy, HH:mm` in `Asia/Jakarta`, with timezone shown for deadlines.
- Distances: kilometers, up to two decimals, trimmed.
- Bibs: strings; never parse `00123` or `A-123` as numbers.
- Names: "First Last", fallback to email.
- Status labels and tones come from one config per entity (UI Guidelines).
- Counts use thousands separators.

---

## 14. Theming, responsiveness, accessibility

**Theming**

- Light and dark are both demo-ready. The toggle is in the user menu and on auth pages.
- Use existing CSS variables. Charts use `--chart-*` tokens.
- The demo badge and status colors must pass contrast in both themes.

**Responsive**

- Reference widths: 375px, 768px, 1024px, 1440px.
- `sidebar-07` collapses to icon mode, then to a mobile sheet.
- Filter bars collapse into a sheet on mobile.
- Forms are single-column on mobile, two-column from 768px.
- Dialog and sheet actions stay reachable with the on-screen keyboard.

**Accessibility**

- Every interactive element is keyboard reachable with a visible focus ring.
- Form fields have labels, descriptions, and error text tied with `aria-describedby`.
- Dialogs and sheets move focus in and return it on close.
- Tables use proper headers and `aria-sort` on sortable columns.
- Icon-only buttons have accessible names.
- Status is never conveyed by color alone.
- Toasts and upload progress use live regions.
- Respect `prefers-reduced-motion`.
- Gallery images have alt text derived from bib/collection; the lightbox has a description.

---

## 15. Performance

- The shell is the only always-loaded client tree; charts, the lightbox, and the upload queue are
  dynamically imported.
- Use pre-sized local thumbnails (400px) in the grid and larger images in the lightbox.
- Lazy-load images below the fold with `next/image` and correct `sizes`.
- Load gallery pages at 24 items; do not mount 200 image nodes at once.
- Debounce gallery search by 250ms.
- Memoize navigation and permission filtering; do not recompute on every render.
- Keep fixtures modest; selectors should filter once per screen, not per row.

---

## 16. Conventions

- TypeScript strict; no `any`; validate forms with Zod.
- Named exports; one component per file; kebab-case file names.
- Client components only where state, effects, or browser APIs are needed.
- Imports: `@/` for app code, `@workspace/ui/*` for primitives. No deep relative imports across
  features.
- Features expose a public surface through `index.ts`.
- Permission strings come from the catalog. Status labels come from status configs.
- Components accept and merge `className` through `cn`.
- No data literals in JSX; all content comes from `lib/demo-data`.
- No console statements in committed demo code.

---

## 17. Path to the real product

| Demo implementation | Future implementation |
| --- | --- |
| `DemoSessionProvider` in memory | Real OAuth/session provider |
| `lib/demo-data` modules | API client + TanStack Query |
| Simulated Google button | Google OAuth redirect/callback |
| Simulated uploads | Presigned storage uploads |
| Placeholder downloads | Signed file URLs |
| Client-side role preview | Server-resolved effective permissions |

Screens consume typed data and shared components, so replacements happen below the UI layer. No
screen imports the demo session or fixtures directly; both are accessed through hooks/selectors.
