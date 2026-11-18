# UI Guidelines — Racetify Web Demo

> **Status:** Draft for review
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Related:** [Implementation Plan](./2026-11-10-07-26-frontend-implementation-plan.md) ·
> [Frontend Architecture](./2026-11-10-07-26-frontend-architecture.md) ·
> [Route Map](./2026-11-10-07-26-frontend-route-map.md) ·
> [Delivery Plan](./2026-11-10-07-26-frontend-delivery-plan.md)

These guidelines define how the demo looks and behaves. They are specific to the static-data demo:
no loading-from-network patterns, no moderation UI, and no timing screens.

---

## 1. Design principles

1. **Operational clarity over decoration.** Race organizers scan tables, statuses, and amounts.
   Hierarchy, alignment, and density matter more than flourish.
2. **One shell, two workspaces.** Organization and event should feel like distinct products without
   forking the layout.
3. **Photography is the product.** The gallery should feel like a professional media library, not
   a file browser.
4. **Status is always legible.** Text + tone, never color alone.
5. **Demo honesty.** Anything that is not real (Google sign-in, saves, downloads) says so plainly.

**Visual direction:** neutral, editorial, high-contrast. The color accent is reserved for primary
actions, active navigation, and key metrics. Race photography supplies most of the color. Avoid
generic gradient dashboards and decorative icon soup.

---

## 2. shadcn/ui setup

- Use only shadcn/ui components. Add them with the CLI:
  `pnpm dlx shadcn@latest add <component> -c apps/app`
- The `sidebar-07` block is the required shell base.
- Generated primitives live in `packages/ui/src/components`; app compositions live in
  `apps/app/components`.
- Do not hand-write primitives or copy source from the docs.
- Add components in coherent batches and review the generated files.

**Component set to add**

| Area | Components |
| --- | --- |
| Shell | `sidebar-07` (includes sidebar, breadcrumb, dropdown, avatar, collapsible, tooltip) |
| Layout | card, separator, scroll-area, resizable (optional), aspect-ratio |
| Navigation | tabs, pagination, navigation-menu (optional), command |
| Data | table, badge, skeleton, progress, empty |
| Forms | input, textarea, select, checkbox, radio-group, switch, label, field/form, calendar, popover, input-group |
| Overlays | dialog, alert-dialog, sheet, drawer, hover-card, tooltip |
| Feedback | sonner, alert, spinner |
| Media | carousel (optional), chart |
| Misc | avatar, toggle-group, kbd |

If a component name differs in the installed style, prefer the CLI's output and adapt the
composition, not the primitive.

---

## 3. `sidebar-07` shell

### 3.1 Anatomy

```
┌───────────────────────┬──────────────────────────────────────────────┐
│ Sidebar               │ SidebarInset                                 │
│ ┌───────────────────┐ │ ┌──────────────────────────────────────────┐ │
│ │ WorkspaceSwitcher │ │ │ SidebarTrigger · Breadcrumbs · Actions   │ │
│ └───────────────────┘ │ ├──────────────────────────────────────────┤ │
│                       │ │ PageHeader                               │ │
│ NAV GROUP             │ │ Title · description · actions            │ │
│  Item                 │ ├──────────────────────────────────────────┤ │
│  Item                 │ │ Page content                             │ │
│                       │ │                                          │ │
│ NAV GROUP             │ │                                          │ │
│  Item                 │ │                                          │ │
│                       │ │                                          │ │
│ ┌───────────────────┐ │ │                                          │ │
│ │ UserMenu          │ │ │                                          │ │
│ └───────────────────┘ │ └──────────────────────────────────────────┘ │
└───────────────────────┴──────────────────────────────────────────────┘
```

### 3.2 Workspace shells

**Organization shell**

- Header: organization logo/initials, name, plan or member count.
- Switcher: organizations and events.
- Groups: Workspace (Overview, Events, Members), Administration (Roles, Settings, Audit log).
- Footer: user menu.

**Event shell**

- Header: event cover thumbnail, event name, dates, status badge; organization name as
  secondary text.
- Switcher: events and organizations.
- Groups: Event (Overview, Settings, Races, Team, Registration), Operations (Participants, Orders,
  Payments), Media (Gallery, Collections, Upload, Watermarks), Documents (Bib generator,
  Certificates), Administration (Audit log).
- Footer: user menu.

**Admin shell**

- Header: product mark, "Platform admin".
- Groups: Platform (Overviews, Organizations, Users), Access (Roles, Permissions), Infrastructure
  (Face enrollments, Storage providers, Storage objects, Webhooks, Jobs, Audit log).
- Footer: user menu.

**Account shell**

- Groups: Account (Profile, Security, Notifications).
- Footer: user menu.

### 3.3 Behavior

- `SidebarTrigger` is always visible in the content header.
- Sidebar collapses to icon mode; tooltips show labels.
- Mobile: sidebar becomes a sheet, closed by default.
- Active item uses the sidebar accent token and a font weight change, not a colored bar per item.
- Navigation is filtered by permission; empty groups disappear.
- The switcher is searchable when it lists more than eight entries.
- Breadcrumbs: `Organization / Events` or `Event / Participants`, with the current page
  unlinked.

---

## 4. Workspace switcher

- Trigger in the sidebar header: current workspace name + chevron.
- Content: two sections, Organizations and Events, with the current item marked.
- Each row: avatar/initials, name, secondary line (member count or event dates).
- Search at the top; keyboard navigable.
- Selecting navigates to the workspace overview, preserving nothing from the previous workspace.
- A footer link opens `/workspaces`.
- On mobile, the switcher opens inside the sidebar sheet.

---

## 5. Authentication screens

**Layout:** centered card on a quiet background, product mark at top, theme toggle in the corner.

**Sign in**

- Primary button: **Continue with Google**, full width, Google mark on the left, normal button
  height. Pending state shows a spinner and "Connecting…".
- Divider labeled "or".
- Email and password fields with labels and a show-password toggle.
- Submit button full width.
- Note: "Demo mode — no real authentication. Changes are not saved."
- Link to create an account.

**Register**

- Same Google button.
- Name, email, password, confirm password.
- Terms note.
- Submit shows a demo confirmation and signs in.

**Password reset / verify**

- Single-purpose forms with a clear success state. The success copy explains that no email is sent
  in the demo.

**Invitation**

- Card with organization, invited role, inviter, and expiry.
- Primary: Accept invitation. Secondary: Decline.
- If not signed in, the primary prompts sign-in and returns to the invitation.

---

## 6. Page patterns

### 6.1 Overview

```
PageHeader (title, date range or event status, primary action)
StatCard × 4
┌──────────────────────────────┬───────────────────────┐
│ Chart (registrations/revenue)│ Upcoming / recent list│
└──────────────────────────────┴───────────────────────┘
Gallery preview strip (event overview only)
```

- Stat cards: label, large value, secondary delta or caption, icon in a muted square.
- One chart per dashboard; do not stack charts.
- Lists show five items with a "View all" link.
- Charts are dynamically imported and include a text summary.

### 6.2 List screen

- `PageHeader` with a primary action.
- `FilterBar`: search (left), filters (middle), view toggle/export (right).
- `DataTable` or card grid.
- Pagination below the table, right-aligned.
- Selection bar appears above the table when rows are selected.

### 6.3 Detail

- Use a `DetailSheet` for table rows.
- Header: entity name, status badge, key metadata.
- Sections in `Tabs` when there are more than three groups.
- Row actions in the sheet footer; destructive actions separated.
- Full pages only for order detail, user detail, and long forms.

### 6.4 Settings

- Two-column layout on desktop: section nav (left, sticky) and form (right).
- Single column on mobile with headings.
- Save bar sticks to the bottom of the content area when the form is dirty.
- Every form has a clear save action and a "Demo only" note.

### 6.5 Create/edit

- Short forms: `FormSheet` from the right.
- Long forms (event settings, registration setup): dedicated page or full-width sheet.
- Footer: Cancel and primary action; primary is disabled while submitting.
- Unsaved changes prompt on close.

### 6.6 Gallery

- Toolbar: collection tabs, search, filter popover, upload button.
- Uniform grid with 2/3/4/5 columns across breakpoints.
- Tiles use a fixed aspect ratio (4:3 or 3:2) and consistent gaps.
- Hover/focus shows a subtle scrim with bib/face badges.
- "Load more" below the grid.

### 6.7 Upload

- **Destination collection card grid** above the dropzone: "No collection" plus every event
  collection. Cards show name, public/private status, and photo count. Do not use thumbnails or
  cover images in this selector.
- Selected collection cards use the primary border/background and a check icon.
- New files inherit the selected collection; changing it updates files that are still queued.
- Large dropzone with dashed border, icon, and accepted formats.
- Selected files appear as a list with thumbnail, name, size, assigned collection badge, progress,
  status, and actions.
- Aggregate header: "Uploading 3 of 8".
- Completed items remain visible with a check.
- Demo note: uploads and collection assignment are simulated.

### 6.8 Import wizard

- Use a three-step sheet: Upload template → Review → Result.
- Show a stepper; completed steps can be revisited, and the primary action is disabled until the
  current step is valid.
- Upload step includes a fixed template download, column reference, and file limits. The file must
  match the template; show `invalid_template`, `missing_column`, and `unknown_column` issues inline.
- Column mapping is on hold; do not show mapping controls.
- Review step shows valid/invalid/duplicate counts and the first 10 rows, with row-level messages.
- Result step shows imported, skipped, and failed counts plus an error-report placeholder.
- Keep error tables keyboard accessible; announce validation summaries with live regions.
- See the [Participant Import Plan](./2026-11-10-12-01-participant-import-column-mapping.md) for the
  future mapping flow and validation rules.

---

## 7. Tables

- Use shadcn `Table` with a `DataTable` wrapper.
- Client-side sorting and filtering.
- Header row: 12px uppercase muted labels; body 14px.
- Row height: 48–56px; dense variant 40px for participants and storage objects.
- Numeric columns right-aligned with tabular numerals (amounts, counts, distances).
- First column is the primary identifier and links to the detail sheet.
- Status uses `StatusBadge`, never plain colored text.
- Actions: row overflow menu with labeled items; destructive item in destructive color.
- Selection: checkbox column; selection bar shows count and bulk actions.
- Empty state replaces the body, not the whole page.
- Mobile: horizontal scroll with a sticky first column for dense tables; card layout for simpler
  lists.
- Pagination: 10/25/50 page sizes, page numbers with ellipsis, total count.

---

## 8. Forms

- `react-hook-form` + Zod.
- Labels above inputs, required marker, help text below when needed.
- Errors below the field in destructive color with an icon; `aria-invalid` and
  `aria-describedby` set.
- Two-column layout from 768px for related fields; single column on mobile.
- Group fields into sections with a heading and short description.
- Currency fields show `Rp` prefix and thousands separators; store integers.
- Date fields use the calendar popover; timezone shown next to time inputs.
- Upload fields show a preview, file name, remove action, and simulated progress.
- Submit: pending label, disabled inputs, then a success toast and sheet close.
- Demo-only forms include an inline note: "Changes are not saved in this demo."
- Never use placeholder text as the only label.
- Destructive actions use `AlertDialog` with a specific consequence sentence and a destructive
  confirm label.

---

## 9. Feedback and states

| State | Pattern |
| --- | --- |
| Success | Sonner toast, 4s, bottom-right desktop / bottom-center mobile |
| Error | Toast with description and optional retry; destructive icon |
| Validation | Inline field errors, focus moves to the first invalid field |
| Empty (first use) | Icon in a muted circle, title, one sentence, primary action |
| Empty (filtered) | "No results", filter summary chips, Reset filters |
| Forbidden | Lock icon, title, explanation, Back to workspace |
| Not found | Route-level not-found page with a back link |
| Pending | Button spinner + label; progress bar for batch/upload |
| Demo limitation | Info toast or inline note, never a modal |

- Toasts must not be the only place an error appears for form submissions.
- Do not stack more than three toasts.
- Progress indicators remain visible during the simulated operation and settle to a clear
  completed or failed state.

---

## 10. Status map

Use one config per entity. Tones: `neutral`, `info`, `success`, `warning`, `destructive`.

| Entity | Values and tones |
| --- | --- |
| Organization | active (success), suspended (warning), archived (neutral) |
| Member / team | invited (info), active (success), suspended (warning) |
| Event | draft (neutral), published (info), ongoing (success), completed (neutral), cancelled (destructive) |
| Race | draft (neutral), published (info), closed (neutral) |
| Registration | pending (warning), confirmed (success), cancelled (neutral), refunded (info) |
| Order | pending (warning), paid (success), expired (neutral), cancelled (neutral), refunded (info) |
| Payment | pending (warning), success (success), failed (destructive), expired (neutral), refunded (info) |
| Certificate | pending (warning), issued (success), revoked (destructive) |
| Invitation | pending (warning), accepted (success), expired (neutral), revoked (destructive) |
| Webhook | active (success), disabled (neutral) |
| Job | pending (warning), processing (info), completed (success), failed (destructive) |
| Face enrollment | pending (warning), active (success), rejected (destructive), deleted (neutral) |
| User | active (success), suspended (warning), deleted (neutral) |

Rules:

- The badge shows a dot or icon plus the label.
- Tones map to semantic tokens, not raw colors.
- The same label is used everywhere; do not mix "Paid" and "Completed" for orders.
- Filter options use the same labels and order as the status map.

---

## 11. Formatting

| Data | Format |
| --- | --- |
| Currency | `Rp1.250.000` (no decimals) |
| Dates | `12 Nov 2026` |
| Date + time | `12 Nov 2026, 06:30 WIB` |
| Short date range | `12–14 Nov 2026` |
| Distance | `42.195 km`, `7 km` |
| Bib | as entered, string; `00123`, `A-123` |
| Phone | as entered; grouped for readability |
| Counts | `1.250` |
| Percent | `68%`; one decimal only when needed |
| File size | `4.2 MB` |
| Race start | `06:30 WIB` |

- Use tabular numerals in tables and metrics.
- Do not abbreviate month names in dense tables beyond three letters.
- Deadlines show the timezone explicitly.

---

## 12. Responsive behavior

| Breakpoint | Behavior |
| --- | --- |
| < 640px | Sidebar as sheet; single-column forms; stacked stat cards (2 columns); tables as cards or horizontal scroll; filter sheet; gallery 2 columns |
| 640–767px | Gallery 3 columns; stat cards 2 columns |
| 768–1023px | Sidebar icon mode; two-column forms; gallery 4 columns |
| ≥ 1024px | Sidebar expanded by default; content max width 1440px; gallery 5 columns |
| ≥ 1440px | Content centered with generous margins; no stretching beyond 1440px |

- Page content uses 16px gutters on mobile, 24px on tablet, 32px on desktop.
- Bottom padding of 96px on mobile when a sticky action bar is present.
- Dialogs become bottom sheets on mobile when they contain long forms.

---

## 13. Accessibility

- Target WCAG 2.2 AA.
- Visible focus ring on every interactive element; never remove outlines.
- All inputs have programmatic labels; errors are tied with `aria-describedby`.
- Tables have a caption or accessible name, `<th scope="col">`, and `aria-sort` on sortable
  headers.
- Icon-only buttons have `aria-label`; decorative icons are `aria-hidden="true"`.
- Dialogs and sheets trap focus, close on Escape, and return focus to the trigger.
- Sidebar navigation is a list of links; the active item uses `aria-current="page"`.
- Gallery tiles are buttons/links with accessible names that include the bib/collection.
- The lightbox is a dialog with a description; arrows and Escape work; focus stays inside.
- Toasts and upload progress are announced via live regions.
- Statuses include text; color is supplementary.
- Minimum contrast 4.5:1 for text, 3:1 for large text and UI boundaries.
- Respect `prefers-reduced-motion`; disable sidebar and gallery transitions.
- Touch targets are at least 44×44px on mobile.

---

## 14. Theming

- Use the existing semantic tokens in `packages/ui/src/styles/globals.css`.
- Light and dark are both required. Toggle in the user menu and auth corner.
- Do not introduce per-page palettes. A new semantic token requires a design review.
- Charts use `--chart-1` through `--chart-5`; series order is stable across the app.
- The demo badge uses the info tone; it must remain legible in both themes.
- Race photos are the visual accent; keep surrounding surfaces quiet.

---

## 15. Demo affordances

These elements make the demo honest and easy to run:

- **Demo badge** in the authenticated shell header, and a note on auth screens.
- **View as** role switcher in the user menu, with a toast on change and the active role shown in
  the user menu.
- **"Changes are not saved"** note in every create/edit form and a toast on submit.
- **Download placeholders** explain why files are unavailable.
- **Simulated uploads** are labeled and do not change the gallery.
- **No "Reset demo data"** action: refreshing restores the static example data.
- Demo mode does not claim real authentication or real payments.

---

## 16. Do and don't

**Do**

- Use `sidebar-07` structure, semantic tokens, and shadcn components.
- Put actions in the `PageHeader` or row menu, not floating buttons.
- Use one status badge config per entity.
- Keep numbers right-aligned and tabular.
- Use sheets for row detail and short forms.
- Show a clear empty state with one action.
- Test every screen in light, dark, mobile, and keyboard-only.

**Don't**

- Fork the shell for each workspace or page.
- Add a second component library or hand-write primitives.
- Hard-code colors, currency strings, date formats, or permission strings.
- Render full-size gallery originals in the grid.
- Add review, verify, or moderation controls to the gallery.
- Add timing or results navigation.
- Imply that changes persist or that Google sign-in is real.
- Use placeholder text as a label or color alone as status.
