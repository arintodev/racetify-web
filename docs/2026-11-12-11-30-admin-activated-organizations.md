# Admin-Created, Admin-Activated Organizations

Status: implemented; backend and both apps build green. No Docker or migrations were run.

## Lifecycle

```
(platform admin) POST /v1/admin/orgs
        │
        ▼
    pending ──► active ──► suspended ──► active
        │          │
        │          └────────► archived
        └── no owner or a pending owner invitation
```

- Only platform administrators (`system:orgs:manage`) create organizations.
- New organizations start `pending`. A pending organization cannot be opened by organizers and its
  events are invisible to the public app.
- Activation uses the existing `POST /v1/admin/orgs/{orgId}/activate`; suspension and reactivation
  are unchanged.
- Owner provisioning: if the owner email belongs to an existing active user, they become an active
  `org:owner` member immediately. Otherwise a 30-day owner invitation is queued through the existing
  invitation/email flow (`ownerInvited: true`). An inactive owner account is rejected with
  `409 owner_inactive`.
- Invitation acceptance is allowed while the organization is pending; the invite page explains the
  state and sends the user to the workspace picker.

## Backend

- `migrations/0201_organizations__pending_status.sql`: allows `pending`, defaults new rows to
  `pending`; existing rows keep their status.
- `POST /v1/admin/orgs` (`CreateOrganizationRequest { name, slug?, timezone?, ownerEmail }`) returns
  `201 CreateOrganizationResponseDto { organization, ownerInvited }`. Slugs are derived from the
  name unless supplied; conflicts return `409 organization_slug_taken`.
- `POST /v1/admin/orgs/{orgId}/activate|suspend` unchanged (now also meaningful for pending orgs).
- Tenant authorization (`org`, `event`, OAuth principal) fails closed for any non-`active` status:
  - pending → `423 organization_not_active`
  - suspended → `423 organization_suspended`
  - archived → `423 organization_archived`
- `/v1/me/workspaces` exposes `status` on each organization and omits events belonging to
  non-active organizations.
- `InvitationSummaryDto.organization` exposes `status`.
- Public event profile, registration config, gallery, results, certificate search/detail, and
  anonymous order creation require an active organization and return `404` otherwise. Receipts
  remain reachable with the order-access token/cookie.

## Frontend

- Admin organizations (`/admin/orgs`): pending filter, "New organization" dialog (name, derived
  slug, owner email, timezone), inline validation for slug conflicts and owner issues, activation
  action for non-active rows.
- Workspace picker: status badge per organization; non-active cards show "Awaiting activation" or
  "Unavailable" instead of an open link, with explanatory copy. Empty state explains that a platform
  administrator provisions and activates organizations.
- Org and event layouts map the 423 codes to a dedicated unavailable state (pending / suspended /
  archived), `403` to `ForbiddenState`, and keep `404` as not-found.
- Workspace switcher disables non-active organizations.
- Invitation page shows the organization status and redirects pending-org invites to the workspace
  picker after acceptance.

## Verification

- Backend: `cargo fmt --all --check`, `cargo clippy --workspace --all-targets --locked -- -D
  warnings`, `cargo build --workspace --locked`, `cargo test --workspace --locked` (new unit tests
  cover slug derivation/validation and the status→error mapping), `cargo run --locked -p api --bin
  openapi`.
- Contract: `pnpm contract:sync && pnpm contract:generate` (generated files changed).
- Frontend: `pnpm typecheck`, `pnpm --filter app lint`, `pnpm --filter web lint`,
  `pnpm --filter app build`, `pnpm --filter web build`.
- Migration `0201` is applied in the local development database; a fresh environment applies it through
  the normal migration command.
- Manual smoke requires the API and a database: create an org, confirm it lists as pending, confirm
  its workspace card is disabled and the public event URL is 404, activate it, then confirm both
  surfaces work.
