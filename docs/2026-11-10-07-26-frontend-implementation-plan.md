# Frontend Implementation Plan — Racetify Web Demo

> **Status:** Draft for review
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Planning baseline:** 2026-11-16 (Monday)
> **Domain model:** [2026-11-10-06-52-model-schema-complete.md](./2026-11-10-06-52-model-schema-complete.md)

This plan covers a **frontend-only demo** of `apps/app`. Screens are built with shadcn/ui and
**static example data**. There is no API integration, no persistence, no backend work, and no
public application in this phase. The goal is a complete, reviewable product walkthrough.

---

## 1. Document set

| Document | Answers |
| --- | --- |
| **This plan** | What is the demo, what is included, and how is it organized? |
| [Frontend Architecture](./2026-11-10-07-26-frontend-architecture.md) | How is the demo app structured? Layouts, example data, demo auth, permissions, gallery. |
| [Route Map & Screen Inventory](./2026-11-10-07-26-frontend-route-map.md) | What screens exist, at which URL, with which content and states? |
| [UI Guidelines](./2026-11-10-07-26-frontend-ui-guidelines.md) | How do screens look and behave? `sidebar-07`, tables, forms, gallery, a11y. |
| [Delivery Plan](./2026-11-10-07-26-frontend-delivery-plan.md) | Demo milestones, workstreams, estimates, and the demo script. |
| [Participant Import Plan](./2026-11-10-12-01-participant-import-column-mapping.md) | How fixed-template CSV upload, validation, review, and import results work. Column mapping is on hold. |
| [Public Web App Plan](./2026-11-10-12-20-public-web-app-plan.md) | How the share-first public app in `apps/web` handles registration, gallery, certificates, and results. |
| [Frontend API Contract — General](./2026-11-10-19-17-frontend-api-contract-general.md) | Contract conventions, Rust/PostgreSQL/Redis/Qdrant backend, authentication, authorization, and the integration plan; domain contracts are per feature. |

**Not in this plan set:** backend implementation, persistence, tests, timing/results, and public
app implementation. The API contract is planned separately, starting with the
[General Contract](./2026-11-10-19-17-frontend-api-contract-general.md), with one document per
feature. The public app is planned separately in `apps/web` — see the
[Public Web App Plan](./2026-11-10-12-20-public-web-app-plan.md).

---

## 1a. Implementation status (2026-11-10)

D0–D6 are delivered and D7's admin console is delivered in `apps/app`. The final polish pass
(responsive/dark-mode audit and demo rehearsal) remains. Code and this plan set are synced for:

- **Gallery upload destination:** collections are chosen with a **card selector**, not a dropdown.
  The grid includes "No collection" plus every event collection, shows name, visibility, and photo
  count, and intentionally uses **no thumbnails or cover images**. New files inherit the selected
  collection; changing it updates files that are still queued.
- **Permissions:** the implemented catalog adds order/payment management, certificate revocation,
  and system management permissions. See the architecture document's permission list.
- **Admin console:** tenants, users, system roles, permissions, face enrollments, storage,
  webhooks, audit logs, and jobs are implemented as read-mostly demo screens.
- **Participant import:** the fixed-template CSV upload, validation, review, and local import flow
  is implemented in `apps/app/features/participants/import/`. Column mapping is on hold; see the
  [Participant Import Plan](./2026-11-10-12-01-participant-import-column-mapping.md).
- **Public app:** planned separately in `apps/web` (racetify.com, while `apps/app` is
  app.racetify.com). See the
  [Public Web App Plan](./2026-11-10-12-20-public-web-app-plan.md).

---

## 2. Executive summary

`apps/app` is a greenfield Next.js 16 application with an empty route skeleton. The demo builds
the complete organizer experience against static example data:

1. **Authentication** — a login screen with **Continue with Google** (simulated) and an email
   fallback, then a workspace picker.
2. **Organization workspace** — overview, events list, members, roles, settings, audit log.
3. **Event workspace** — overview, settings, races, team, registration, participants, orders,
   payments, gallery, bib generator, certificates, audit log.
4. **Platform admin** — a lighter display pass over organizations, users, roles, permissions, face
   enrollments, storage, webhooks, audit logs, and jobs.

The organization and event workspaces use the shadcn **`sidebar-07`** block. The gallery displays
photos with read-only bib OCR and face detection metadata; there is no moderation workflow. Timing
and results are excluded.

The demo is display-first: every screen is populated from example data, filters and dialogs work
in memory, and form submissions show a confirmation without persisting anything. Refreshing the
page restores the original example data.

Target: a polished, clickable demo in **3–5 weeks**, depending on parallel capacity.

---

## 3. What exists today

| Area | Current state | Consequence |
| --- | --- | --- |
| Framework | Next.js `16.4.4`, App Router, React `19.3.1` | Root layout for fonts/metadata; client workspace shells. |
| Monorepo | pnpm `11.25.0`, Turborepo, `apps/app` + `packages/ui` | One app; shadcn primitives live in `packages/ui`. |
| UI | shadcn/ui `base-nova`, only `Button`; Tailwind v4 tokens; Lucide | Add `sidebar-07` and the component set via the shadcn CLI. |
| Routes | 35 empty page files; no layouts or state files | Structure exists; shells, example data, and screens do not. |
| Workspaces | Flat `(organizer)/orgs/*` and `(organizer)/events/*` | Correct idea: two sibling workspaces. Add `[orgId]` / `[eventId]`. |
| Data | None | Create static example data modules under `lib/demo-data/`. |
| Auth | None | Simulated Google login and an in-memory demo session. |
| Tests | None | Not planned for this phase. |
| Public app | None | Planned later; nothing public in `apps/app`. |
| Repo | `apps/web` deleted but still in git status; branch `master` | Clean up before feature work. |

---

## 4. Scope

### In scope

**Auth and account**

- `/login` with **Continue with Google** and email/password fallback.
- Registration, email verification, forgot/reset password as demo screens.
- `/workspaces` picker.
- Profile and security settings, notifications.
- Simulated invitation acceptance.

**Organization workspace** (`/orgs/[orgId]/...`)

- Overview with event and membership summaries.
- Events list, create event.
- Members and invitations.
- Organization roles.
- Organization settings and branding.
- Organization audit log.

**Event workspace** (`/events/[eventId]/...`)

- Overview.
- Settings: profile, dates, registration window, timezone, location, status, media.
- Races and race categories.
- Event team and invitations.
- Registration configuration and preview.
- Participants, registrations, bib assignment (display and filters).
- Orders, payments, refunds (display).
- Gallery: collections, simulated upload with card-based destination collection selection (no
  thumbnails/covers), photo grid and lightbox, read-only bib and face metadata, watermarks.
- Bib generator: templates, data mapping, preview, simulated batch.
- Certificates: generation, issuance, revocation, download placeholder.
- Event audit log.

**Platform admin** (`/admin/...`)

- Overview, organizations, users, roles, permissions.
- Face enrollments (read-only list).
- Storage providers and objects.
- Webhooks and delivery history.
- Audit logs and jobs.

**Cross-cutting**

- shadcn `sidebar-07` layout for every authenticated workspace.
- Responsive down to 375px; keyboard accessible; WCAG 2.2 AA where practical.
- Empty, filtered, error, and permission-denied states for every data surface; pending and
  progress states for simulated async actions (uploads, batch generation).
- Demo persona and **View as** role switcher for permission-aware navigation.
- A visible demo indicator.

### Out of scope

- Backend, API integration, real auth, real OAuth, persistence.
- Tests (unit, integration, E2E) and test infrastructure.
- Timing and results.
- Gallery moderation, bib/face review, verification workflows.
- Public app: event pages, public registration, photo finder, public certificates.
- Payment gateway integration; payment screens use example statuses.
- Email/SMS/WhatsApp delivery.
- Native mobile apps.
- Production security hardening.

---

## 5. Workspace model

```
                          ┌────────────────────────┐
                          │       racetify-web     │
                          │      apps/app demo     │
                          └────────────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
   Organization workspace      Event workspace            Platform admin
   /orgs/[orgId]/...           /events/[eventId]/...      /admin/...
           │                          │                          │
   overview                    overview                   overviews
   events                      settings                   orgs
   members                     races                      users
   roles                       team                       roles
   settings                    registration               permissions
   audit-logs                  participants               face-enrollments
                               orders                     storages
                               payments                   webhooks
                               gallery                    audit-logs
                               bib-generator              jobs
                               certificates
                               audit-logs
```

Rules:

- Organization and event are **sibling workspaces**. Event URLs never include the organization ID.
- Each workspace uses `sidebar-07` with its own header, navigation groups, and footer.
- The organization workspace owns the events list; opening an event enters the event workspace.
- `/workspaces` is the picker after login and the fallback for `/`.
- The workspace switcher in the sidebar header navigates between organizations and events.
- Example data is scoped by `orgId` / `eventId`, so a pasted URL always resolves to a populated
  screen.

---

## 6. Demo success criteria

| Goal | Measure | Target |
| --- | --- | --- |
| Complete clickable story | Demo script in the [Delivery Plan](./2026-11-10-07-26-frontend-delivery-plan.md) | Runs start to finish without dead ends |
| Realistic content | Static example data volume | 3 organizations, 6 events, 200+ participants, 60+ photos |
| Workspace clarity | Organization and event feel like separate products | Distinct sidebars, headers, and navigation |
| Gallery experience | Browse, filter, open, upload simulation | Smooth with 60+ photos; read-only bib/face tags |
| Permission demo | Switch persona and see navigation/actions change | Owner, admin, photographer, volunteer |
| Visual quality | `sidebar-07` layouts, light and dark | Review-ready on desktop and mobile |
| Build health | Typecheck, lint, production build | Green on every PR |

---

## 7. Key decisions

| ID | Decision | Alternative | Status |
| --- | --- | --- | --- |
| ADR-001 | Organization and event are sibling workspaces with IDs in the URL | One nested workspace; global "current workspace" cookie | Proposed |
| ADR-002 | Screens render static example data from typed modules; no persistence | Mock store with `localStorage`; real API | Proposed |
| ADR-003 | Demo auth is an in-memory session; Google sign-in is simulated | Real OAuth/NextAuth | Proposed |
| ADR-004 | shadcn `sidebar-07` is the shell for every authenticated workspace | Custom shell; a different block | Proposed |
| ADR-005 | shadcn/ui is the only component source; CLI additions only | Hand-written primitives, extra libraries | Proposed |
| ADR-006 | Root layout is server-rendered; shells and screens are client components | Server-rendered shells | Proposed |
| ADR-007 | Gallery shows bib/face data read-only; no moderation | Review queues and verification | Proposed |
| ADR-008 | Timing and results are excluded | Include a mock timing screen | Proposed |
| ADR-009 | Forms validate and show a confirmation but do not mutate data | Persist demo edits | Proposed |
| ADR-010 | No test suite in this phase | Build test coverage now | Proposed |

---

## 8. Delivery at a glance

| Phase | Days (2 FE) | Outcome |
| --- | --- | --- |
| **D0 Foundation** | 3 | `sidebar-07` shell, routing, providers, example data, demo session |
| **D1 Auth & workspaces** | 2 | Google demo login, email fallback, workspace picker, profile |
| **D2 Organization workspace** | 3 | Overview, events list, members, roles, settings, audit log |
| **D3 Event setup** | 3 | Event overview, settings, races, team, registration config |
| **D4 Participants & commerce** | 3 | Participants, registrations, orders, payments |
| **D5 Gallery** | 4 | Collections, upload simulation with collection cards, grid, lightbox, bib/face tags, watermarks |
| **D6 Generators & certificates** | 3 | Bib templates and simulated batch, certificates |
| **D7 Admin & polish** | 3 | Admin screens, responsive pass, dark mode, demo script |

With 2 engineers working in the order above, the demo is ready in **~5 weeks**. With 3 engineers
(organization, event, media/admin parallel), it is ready in **~3 weeks**.

---

## 9. Team and ways of working

**Assumed team:** 2–3 frontend engineers and a product designer for visual review.

- Short-lived branches with PR previews. Confirm the integration branch before D0.
- Every PR passes typecheck, lint, and a production build.
- One shell implementation, reused with different navigation data.
- All shadcn components are added with the CLI and committed.
- Review screens in light and dark mode at 375px, 768px, and 1440px.
- Example data lives in one folder and is imported by screens; no data literals in components.
- Forms and actions that cannot persist say so through a toast ("Demo only — changes are not
  saved").

---

## 10. Top risks

| Risk | Mitigation |
| --- | --- |
| Demo scope grows into a full product | Fixed phase list; timing, public app, moderation, persistence, and tests are explicitly out. |
| Example data feels shallow during the demo | Seed realistic Indonesian names, races, bibs, amounts, and statuses. |
| `sidebar-07` is patched until it no longer looks like shadcn | Add the block once; change only navigation data, labels, and branding. |
| Gallery is slow with many images | Use fixed local sample assets, `next/image`, and pagination. |
| Workspace URLs get inconsistent | One route pattern per workspace, established in D0 and enforced in review. |
| Simulated Google login is mistaken for real auth | Label demo mode in the UI; isolate the session provider. |
| Reviewers expect edits to persist | Show a clear "demo only" toast on every submit; static data restores on refresh. |
| Over-customization of shadcn tokens | Extend semantic tokens only; no per-screen palettes. |

---

## 11. Decisions needed before D0 exits

| # | Decision | Recommendation | Needed by |
| --- | --- | --- | --- |
| 1 | Workspace URL scheme | `/orgs/[orgId]` and `/events/[eventId]` | 2026-11-18 |
| 2 | Demo identity | One Google demo persona plus 4 preview roles | 2026-11-18 |
| 3 | Sample media | Local royalty-free race photos in `public/demo/` | 2026-11-20 |
| 4 | Brand direction | Logo, accent color, typography from design | 2026-11-20 |
| 5 | Copy language | English for the demo; `id-ID` later | 2026-11-24 |
| 6 | Admin depth | Display-only lists and detail views | 2026-11-24 |
| 7 | Interaction feedback | Toasts on submit; no persisted edits | 2026-11-20 |

---

## 12. D0 foundation scope

D0 delivers the complete skeleton in one pass: the shadcn `sidebar-07` shell, the organization and
event route trees, providers, the static example data modules, the in-memory demo session, the
Google login screen, the workspace picker, root redirects, and the shared loading/error/not-found
states. Every module page renders inside this skeleton from the start, so later work fills screens
rather than restructuring the app.

---

## 13. What "plan approved" means

- The five documents are reviewed.
- The two-workspace URL scheme and `sidebar-07` layout are approved.
- The exclusion list (timing, tests, API, persistence, public app, moderation) is accepted.
- Phase ownership is assigned.
