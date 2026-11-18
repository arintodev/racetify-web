# Delivery Plan — Racetify Web Demo

> **Status:** Draft for review
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Related:** [Implementation Plan](./2026-11-10-07-26-frontend-implementation-plan.md) ·
> [Frontend Architecture](./2026-11-10-07-26-frontend-architecture.md) ·
> [Route Map](./2026-11-10-07-26-frontend-route-map.md) ·
> [UI Guidelines](./2026-11-10-07-26-frontend-ui-guidelines.md)

This plan describes the demo as a set of complete workstreams and outcomes. It is not a
step-by-step build guide: each phase delivers whole screens inside the final shell, and the app is
never in a half-restructured state.

---

## 1. Assumptions

| Assumption | Detail |
| --- | --- |
| Team | 2–3 frontend engineers, product designer available for review |
| Scope | `apps/app` only: auth, organization workspace, event workspace, admin |
| Data | Static example modules; no persistence; no network |
| Layout | shadcn `sidebar-07` |
| Auth | Simulated Google sign-in plus email fallback |
| Exclusions | Tests, backend/API, timing/results, gallery moderation; public app is planned separately in `apps/web` |
| Definition of done | Screens match the route map and pass the demo script |

---

## 2. Workstreams

| Workstream | Owner | Delivers |
| --- | --- | --- |
| A. Foundation and identity | FE1 | D0 shell/routing/data, D1 auth, D2 organization workspace |
| B. Event operations | FE2 | D3 event setup, D4 participants and commerce |
| C. Media and documents | FE3 | D5 gallery, D6 bib generator and certificates |
| D. Admin and polish | Shared | D7 admin console, responsive/dark-mode pass, demo script |

With two engineers, C and D follow B sequentially. With three, C runs in parallel with B and D runs
as capacity allows.

---

## 3. Phases and estimates

| Phase | Estimate | Outcome | Done when |
| --- | --- | --- | --- |
| **D0 Foundation** | 3 days | `sidebar-07` shell, route trees, providers, static example data, demo session, login, workspace picker | Both workspaces render inside the shell with example data; navigation, guards, and 404s work |
| **D1 Auth and account** | 2 days | Google demo login, email fallback, register, verify, reset, invitations, profile, security, notifications | The full auth story is clickable; workspace picker and account screens are complete |
| **D2 Organization workspace** | 3 days | Overview, events list, members, roles, settings, audit log | An owner can review and demonstrate the complete organization workspace |
| **D3 Event setup** | 3 days | Event overview, settings, races and categories, team, registration configuration | Event context, configuration, and team screens are complete |
| **D4 Participants and commerce** | 3 days | Participants, registrations, orders, payments, refunds, import/export dialogs | Tables, filters, detail sheets, and confirmations are complete |
| **D5 Gallery** | 4 days | Collections, upload simulation, grid, lightbox, read-only bib/face metadata, watermarks | Gallery is smooth at 60 photos; no moderation controls exist |
| **D6 Generators and certificates** | 3 days | Bib templates, mapping, preview, batch simulation, certificate generate/revoke | Batch flows and placeholder downloads are complete |
| **D7 Admin and polish** | 3 days | Admin console, responsive pass, dark mode, empty/forbidden states, demo script | Full demo script passes; build is green |

**Total:** 24 person-days of implementation. With two engineers plus review cycles, expect
**4–5 weeks**. With three engineers and design available early, expect **3–4 weeks**.

---

## 4. Phase detail

### D0 — Foundation

Deliver the final app skeleton whole:

- shadcn `sidebar-07` shell adapted into `WorkspaceShell`, with organization, event, admin, and
  account navigation configs.
- `/orgs/[orgId]` and `/events/[eventId]` layouts resolving example data, with redirect pages.
- Providers: theme, toaster, demo session.
- Static example data modules and selectors (organizations, events, members, roles, permissions).
- Simulated Google login, email fallback, workspace picker, root redirects.
- Shared `PageHeader`, `StatCard`, `StatusBadge`, `EmptyState`, `ForbiddenState`, root
  `error.tsx` and `not-found.tsx`.
- A complete seed skeleton for every entity so later screens never invent data shapes.

Done when both workspaces and the admin shell render, navigation is permission-filtered, unknown
IDs show not-found, and the login-to-workspace flow works.

### D1 — Auth and account

- Login (Google + email), register, verify email, forgot/reset password.
- Invitation summary and accept/decline.
- Profile, security, notifications.
- Demo-mode messaging across auth screens.
- Role preview entry in the user menu.

Done when a reviewer can start at login, reach a workspace, open account screens, and sign out
without dead ends.

### D2 — Organization workspace

- Overview metrics, upcoming events, recent activity.
- Events list with filters and create-event sheet.
- Members table, invitation dialog, role change, suspend/remove confirmations.
- Roles list and permission matrix.
- Organization settings and branding form.
- Audit log table and detail sheet.

Done when owner and admin preview roles show the intended navigation and forbidden states.

### D3 — Event setup

- Event overview with registration progress and gallery preview.
- Event settings in sections (details, dates, registration window, timezone, location, status,
  media).
- Races table and create/edit sheet; categories nested dialog.
- Event team table and invitation dialog.
- Registration configuration form and participant-form preview.

Done when the event workspace header, navigation, and setup screens are complete and consistent.

### D4 — Participants and commerce

- Participant table with search, race/category/status filters, detail and edit sheets.
- Fixed-template CSV import wizard with validation, preview, and simulated result; export toast.
  Column mapping is on hold; see the
  [Participant Import Plan](./2026-11-10-12-01-participant-import-column-mapping.md) for the future
  mapping flow.
- Bib assignment dialog.
- Orders table and detail sheet with items and refund confirmation.
- Payments table and detail sheet with provider reference and refund confirmation.
- Revenue summary on the event overview.

Done when filters, empty states, detail sheets, and destructive confirmations behave consistently.

### D5 — Gallery

- Collection tabs and filters.
- Grid with 24-item pages and "Load more".
- Lightbox with keyboard navigation and read-only bib/face metadata.
- Collections management.
- Upload simulation with a card-based destination collection selector (no thumbnails/covers),
  previews, progress, retry, remove, and completion confirmation.
- Watermarks list, editor, and live preview.

Done when the gallery feels like a media library, metadata is clearly read-only, and no moderation
controls exist.

### D6 — Generators and certificates

- Bib template gallery, variable mapping, participant preview, batch progress, result table.
- Certificate table, generate dialog, revoke confirmation, download placeholders.
- Demo toasts for all actions that cannot produce files.

Done when batch and certificate screens complete the event story.

### D7 — Admin and polish

- Platform overview, tenant snapshot, organizations, users, user detail.
- System roles, permission catalog.
- Face enrollments (read-only), storage providers and objects.
- Webhooks and deliveries, audit log, jobs.
- Responsive sweep: 375px, 768px, 1024px, 1440px.
- Light/dark review of every route.
- Empty, filtered, forbidden, and not-found states audited.
- Demo script rehearsal and fixes.

Done when the demo script passes end to end and the build gates are green.

---

## 5. Capacity scenarios

| Scenario | Timeline | Notes |
| --- | --- | --- |
| 1 engineer | 6–7 weeks | Sequential phases; risk of context switching |
| 2 engineers | 4–5 weeks | A/B split after D1; admin and polish shared |
| 3 engineers | 3–4 weeks | A/B/C parallel after D0; D7 shared |

Design review is the main external dependency. Brand tokens, logo, and sample media are needed by
D0/D1; screen mockups are needed one phase ahead.

---

## 6. Demo script

The demo is considered ready when this walkthrough runs without dead ends.

1. **Sign in.** Open `/login`, choose **Continue with Google**, see the pending state, land on
   `/workspaces`.
2. **Choose a workspace.** Open the Nusantara Run organization, review the overview, then the
   events list.
3. **Enter an event.** Open Borobudur Run; check the event workspace header, overview metrics, and
   navigation groups.
4. **Configure.** Review event settings, races and categories, team, and registration setup.
5. **Operate.** Filter participants, open a participant detail, run the import dialog, assign a
   bib. Open an order, review items, attempt a refund and see the confirmation and demo toast.
6. **Gallery.** Filter by collection, search a bib, open the lightbox, and show read-only bib and
   face metadata. Simulate an upload and show progress. Open watermarks and preview a change.
7. **Documents.** Preview a bib template, run a simulated batch, review results. Generate and
   revoke a certificate.
8. **Permissions.** Switch to **View as Photographer**. Show the reduced navigation, the visible
   event overview and gallery, and a forbidden URL result. Switch back to Owner.
9. **Admin.** Open the admin console, review organizations, users, face enrollments, storage,
   webhooks, jobs, and audit logs.
10. **Account.** Open notifications and profile; show the demo note. Sign out and return to login.

---

## 7. Build gates

No test suite in this phase. Every PR must still pass:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

Manual review checklist:

- No browser console errors.
- No dead links or placeholder routes.
- Every action either works in memory or shows a demo toast.
- Light and dark modes reviewed.
- 375px and 1440px reviewed.
- Keyboard-only pass on the shell, a table, a form, and the lightbox.
- No moderation or timing controls anywhere.

---

## 8. Definition of done

A screen is done when:

- It matches its entry in the [Route Map](./2026-11-10-07-26-frontend-route-map.md).
- It renders inside the correct `sidebar-07` workspace shell.
- It uses static example data through selectors; no data literals in components.
- It respects the preview role: hidden navigation, visible-but-gated actions, and `ForbiddenState`
  on direct access.
- It has first-use empty, filtered empty, and missing-entity states where applicable.
- Forms validate inline and show the "changes are not saved" confirmation.
- It is accessible by keyboard and has labeled controls.
- It works in light and dark mode and at mobile and desktop widths.
- It uses shadcn primitives added via the CLI and semantic tokens only.

The demo is done when the script in section 6 passes and the build gates are green.

---

## 9. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Scope creep into timing, moderation, or public screens | The exclusion list is contractual; new screens require removing one of equal size. |
| Example data feels thin | Seed realistic names, races, bibs, amounts, statuses, and long values; review data with product before D2. |
| Shell drifts from `sidebar-07` | Treat the block as the base; changes limited to navigation data, labels, and tokens; design review at D0. |
| Gallery performance | Local pre-sized thumbnails, 24-item pages, lazy loading, dynamic lightbox import. |
| In-memory session is lost on refresh | Demo is guided and starts at login; the login path takes seconds. Mention it in the script. |
| Reviewers expect saves | Persistent inline note and toast on every form; the UI never claims data was saved. |
| Image licensing | Use royalty-free local assets with recorded licenses in `public/demo/README.md`. |
| Brand assets arrive late | Build with neutral tokens; swap brand values in one place. |

---

## 10. Change control

- The demo scope is fixed by the five documents. Changes are recorded here with a date and owner.
- Anything that requires persistence, network calls, timing, moderation, or public routes is
  deferred to a later plan.
- The route map is the source of truth for screens; adding a route requires updating it and the
  navigation config in the same change.
- The UI Guidelines are the review standard for visual consistency.
