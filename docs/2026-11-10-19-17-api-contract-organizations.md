# Frontend API Contract — Organizations & Access

> **Status:** Proposed for review
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Applies to:** Organization workspace screens in `apps/app`
> **Related:** [General Contract](./2026-11-10-19-17-frontend-api-contract-general.md) ·
> [Model Schema](./2026-11-10-06-52-model-schema-complete.md) ·
> [Route Map](./2026-11-10-07-26-frontend-route-map.md) ·
> [Frontend Architecture](./2026-11-10-07-26-frontend-architecture.md)

This feature covers the organization profile, organization overview, members, invitations, roles,
and audit log. Authentication, sessions, permission resolution, and invitation acceptance are
defined in the [General Contract](./2026-11-10-19-17-frontend-api-contract-general.md).

---

## 1. Scope

| Screen | Route | Data |
| --- | --- | --- |
| Organization layout | `/orgs/[orgId]/*` | Organization header + access |
| Organization overview | `/orgs/[orgId]/overview` | Stats, upcoming events, recent activity |
| Organization events | `/orgs/[orgId]/events` | Event list (read); creation links to Event Setup |
| Members | `/orgs/[orgId]/members` | Member rows, invitations, role changes |
| Roles | `/orgs/[orgId]/roles` | Organization roles and permission matrix |
| Settings | `/orgs/[orgId]/settings` | Profile, contact, branding |
| Audit log | `/orgs/[orgId]/audit-logs` | Filterable audit rows |

Out of scope:

- Event CRUD and event settings — [Event Setup](./2026-11-10-19-17-api-contract-events.md).
- Invitation acceptance — [General Contract](./2026-11-10-19-17-frontend-api-contract-general.md).
- Platform-wide organization administration — [Platform Admin](./2026-11-10-19-17-api-contract-platform-admin.md).

---

## 2. Permissions

| Action | Permission |
| --- | --- |
| View the organization overview | `org:overview:view` |
| View organization settings and contact data | `org:settings:view` |
| Update organization settings and branding | `org:settings:update` |
| View members | `org:members:view` |
| Invite, change roles, suspend, remove members | `org:members:manage` |
| View and edit organization roles | `org:roles:manage` |
| View events in the organization | `org:events:view` |
| Create events | `org:events:create` |
| View the organization audit log | `org:audit:view` |

Read endpoints enforce the `view` permission; mutations enforce the matching `manage`/`update`
permission. Access is resolved through `GET /v1/me/access?orgId={orgId}`.

---

## 3. Endpoints

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/orgs/{orgId}` | `org:overview:view` | Organization header and profile |
| `PATCH` | `/v1/orgs/{orgId}` | `org:settings:update` | Update profile, contact, branding |
| `GET` | `/v1/orgs/{orgId}/overview` | `org:overview:view` | Stats, upcoming events, recent activity |
| `GET` | `/v1/orgs/{orgId}/events` | `org:events:view` | Paginated event list |
| `POST` | `/v1/orgs/{orgId}/logo-upload` | `org:settings:update` | Presigned logo upload |
| `GET` | `/v1/orgs/{orgId}/members` | `org:members:view` | Paginated member rows |
| `POST` | `/v1/orgs/{orgId}/invitations` | `org:members:manage` | Invite a member |
| `PATCH` | `/v1/orgs/{orgId}/members/{memberId}` | `org:members:manage` | Change role or status |
| `DELETE` | `/v1/orgs/{orgId}/members/{memberId}` | `org:members:manage` | Remove a member |
| `GET` | `/v1/orgs/{orgId}/roles` | `org:roles:manage` | Roles with permission sets |
| `POST` | `/v1/orgs/{orgId}/roles` | `org:roles:manage` | Create a custom role |
| `PATCH` | `/v1/orgs/{orgId}/roles/{roleId}` | `org:roles:manage` | Rename or describe a role |
| `PUT` | `/v1/orgs/{orgId}/roles/{roleId}/permissions` | `org:roles:manage` | Replace the permission set |
| `DELETE` | `/v1/orgs/{orgId}/roles/{roleId}` | `org:roles:manage` | Delete a custom role |
| `GET` | `/v1/permissions?scope=org,event` | `org:roles:manage` | Permission catalog for the matrix |
| `GET` | `/v1/orgs/{orgId}/audit-logs` | `org:audit:view` | Paginated audit log |
| `GET` | `/v1/orgs/{orgId}/audit-logs/{logId}` | `org:audit:view` | Audit detail |

Event creation is `POST /v1/orgs/{orgId}/events` with `org:events:create`; its request and response
are defined in [Event Setup](./2026-11-10-19-17-api-contract-events.md).

---

## 4. Query parameters

### Members

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | Matches name or email |
| `status` | `invited, active, suspended` | Repeatable |
| `roleId` | UUID | Filter by role |
| `sort` | `name, joinedAt, status` | `-` prefix for descending |
| `limit`, `cursor` | — | Cursor pagination |

### Events

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | Matches event name or slug |
| `status` | `draft, published, ongoing, completed, cancelled` | Repeatable |
| `from`, `to` | date | Event start-date range |
| `sort` | `startDate, name, status` | Default `startDate` |

### Audit logs

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | Matches action, resource type, or actor name |
| `actorId` | UUID | Exact actor |
| `action` | string | Exact action key |
| `resourceType` | string | Exact resource type |
| `from`, `to` | timestamp | Inclusive range |
| `sort` | `createdAt` | Default `-createdAt` |

Roles and the permission catalog are not paginated; they are small, bounded lists.

---

## 5. DTOs

```ts
type OrganizationDTO = {
  id: string
  name: string
  slug: string
  description: string
  email: string
  phone: string
  website: string
  logoUrl: string | null
  status: "pending" | "active" | "suspended" | "archived"
  timezone: string
  currency: "IDR"
  createdAt: string
  updatedAt: string
}

type OrganizationOverviewDTO = {
  stats: {
    events: number
    members: number
    registrations: number
    revenue: number
  }
  upcomingEvents: EventSummaryDTO[]
  recentActivity: AuditLogSummaryDTO[]
}

type EventSummaryDTO = {
  id: string
  name: string
  slug: string
  startDate: string
  endDate: string
  location: string
  status: "draft" | "published" | "ongoing" | "completed" | "cancelled"
  registrations: number
}

type MemberRowDTO = {
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

type OrganizationRoleDTO = {
  id: string
  name: string
  slug: string
  description: string
  isSystem: boolean
  memberCount: number
  permissions: string[]
}

type PermissionDTO = {
  name: string
  resource: string
  action: string
  description: string
  scope: "org" | "event"
}

type AuditLogRowDTO = {
  id: string
  actor: { id: string; name: string } | null
  action: string
  resourceType: string
  resourceId: string
  ipAddress: string
  createdAt: string
}

type AuditLogDetailDTO = AuditLogRowDTO & {
  userAgent: string
  metadata: Record<string, unknown> | null
}
```

The API returns resolved display names for rows (`user.name`, `role.name`) so the frontend does not
join fixture data. It never returns password hashes, session tokens, or invitation token hashes.

---

## 6. Business rules

### Organization profile

- `slug` is set at creation and is immutable through `PATCH`.
- `timezone` is an IANA identifier; `currency` is `IDR` in v1.
- Organizations are created by platform administration only (`POST /v1/admin/orgs`) and start
  `pending`. A pending organization cannot be opened by organizers and its events are hidden from
  the public app until an admin activates it.
- The workspace DTO exposes `organization.status`, and invitation summaries expose the
  organization's status so the UI can explain a pending invitation.
- `status` is changed by platform administration, not by the organization itself.
- Logo upload returns a presigned `PUT` URL and an opaque `uploadId`. Allowed logo types are **SVG or
  PNG**; SVG is sanitized server-side. The client uploads, then `PATCH /v1/orgs/{orgId}` with
  `logoUploadId`; the API validates ownership and returns the signed `logoUrl`.

### Members

- A member row is created by invitation acceptance or by platform administration.
- A user appears once per organization (`UNIQUE(org_id, user_id)`).
- The last active `org:owner` cannot be removed, suspended, or demoted → `409 last_owner`.
- Removing a member immediately removes the organization's permissions from that user. Their
  sessions are not revoked; the next request re-resolves access.
- Suspending a member sets status `suspended` and blocks organization access. Event team roles in the
  organization remain independent unless separately removed.
- An invitee who already has an active membership → `409 member_already_exists`.
- Invitation email matching, expiry, and acceptance rules are in the general contract.
- Role changes and removals are audited.

### Invitations

`POST /v1/orgs/{orgId}/invitations`:

```json
{
  "email": "new.member@example.com",
  "roleId": "018f...role-admin"
}
```

- `roleId` must be an organization role for this organization, or an applicable system role.
  A role from another organization → `422 role_scope_invalid`.
- The API creates an `invitations` row with `event_id = null`, a hashed single-use token, and a
  7-day expiry, and sends the invitation email.
- Response: `202` with the invitation summary. The response never includes the raw token.
- Re-inviting the same email revokes the previous pending invitation.
- The inviter needs `org:members:manage`; the role being granted cannot exceed the inviter's own
  ability to grant it. Granting `org:owner` requires being an owner → `403 cannot_grant_role`.

### Roles

- System roles (`isSystem = true`) are visible in the matrix but cannot be deleted. Editing their
  permission set requires `org:roles:manage` and is audited; seeded roles should be treated as
  templates.
- Custom roles belong to the organization and cannot be shared across organizations.
- `slug` is unique within the organization.
- A role with members cannot be deleted → `409 role_in_use`.
- The permission set is replaced atomically. Unknown permissions → `422 unknown_permission`.
- Permissions outside the organization/event scope cannot be assigned → `422 permission_scope_invalid`.
- `org:owner` must retain the owner bundle; removing it would leave the organization unmanageable →
  `422 owner_permissions_required`.

### Audit log

- Audit rows are immutable and only visible with `org:audit:view`.
- The list is scoped by `org_id`; event audit entries are visible in both the organization and event
  logs when they carry both IDs.
- `metadata` is redacted at write time. It never contains passwords, tokens, raw request bodies, or
  participant PII.
- Export is deferred; if added, it returns a signed download URL from an async job.

---

## 7. Error codes

| HTTP | `code` | Condition |
| --- | --- | --- |
| 404 | `organization_not_found` | Unknown or inaccessible organization |
| 403 | `forbidden` | Missing permission |
| 409 | `last_owner` | Removing/demoting the last owner |
| 409 | `member_already_exists` | User already an active member |
| 409 | `role_in_use` | Deleting a role with members |
| 409 | `invitation_already_pending` | Re-invite collides with a live invitation |
| 422 | `role_scope_invalid` | Role belongs to another scope or organization |
| 422 | `permission_scope_invalid` | Permission cannot be assigned in this scope |
| 422 | `unknown_permission` | Permission is not in the catalog |
| 422 | `owner_permissions_required` | Owner role would lose a required permission |
| 423 | `organization_suspended` | Organization is suspended |

---

## 8. Frontend mapping

| Screen / component | Query | Key |
| --- | --- | --- |
| Organization layout | `GET /orgs/{orgId}` + `GET /me/access?orgId=` | `["org", orgId]`, `["access", "org", orgId]` |
| Overview | `GET /orgs/{orgId}/overview` | `["org", orgId, "overview"]` |
| Events list | `GET /orgs/{orgId}/events` with filters | `["org", orgId, "events", filters]` |
| Members | `GET /orgs/{orgId}/members` with filters | `["org", orgId, "members", filters]` |
| Roles | `GET /orgs/{orgId}/roles` + `GET /permissions?scope=org,event` | `["org", orgId, "roles"]`, `["permissions", "org"]` |
| Settings | `GET /orgs/{orgId}` | `["org", orgId]` |
| Audit log | `GET /orgs/{orgId}/audit-logs` with filters | `["org", orgId, "audit", filters]` |

Invalidation:

- Member invite/change/remove → `["org", orgId, "members"]`, `["org", orgId, "overview"]`,
  `["access", "org", orgId]`, `["workspaces"]`.
- Role create/update/delete → `["org", orgId, "roles"]`, `["members"]` (member counts),
  and the access key for every affected user is invalidated server-side through the version bump.
- Organization settings update → `["org", orgId]`, `["workspaces"]`.
- Logo upload → `["org", orgId]`.

UI rules:

- Navigation items and action buttons use `AccessDTO.permissions` from the general contract.
- Direct URL access without the route permission renders `ForbiddenState`.
- Unknown or inaccessible organizations render `notFound()`.
- Member row actions (change role, suspend, remove) are hidden without `org:members:manage`.
- Role editing is hidden without `org:roles:manage`.
- The settings form is read-only without `org:settings:update`.

---

## 9. Acceptance criteria

1. An owner and an admin both see the organization overview; only the owner sees settings and roles
   as editable.
2. A member invited with an organization role appears as `invited` until acceptance, then becomes
   `active` with the assigned role after acceptance.
3. The last owner cannot be removed or demoted.
4. A role from another organization cannot be assigned.
5. Removing a member immediately removes their organization access on the next request.
6. The permission matrix is driven by `GET /v1/permissions` and saves atomically.
7. Audit rows are read-only and filtered by the documented parameters.
8. A cross-tenant `orgId` returns `404`, not another tenant's data.
9. All screens typecheck against the generated client and render `ForbiddenState` on direct access
   without permission.

---

## 10. Open decisions

| # | Decision | Recommendation | Needed by |
| --- | --- | --- | --- |
| 1 | Can organizations edit system role permissions? | **No for seeded system roles**; clone into a custom role instead | Organizations implementation |
| 2 | Organization logo storage | Reuse the shared storage provider/R2 flow; record a `storage_objects` row | Organizations implementation |
| 3 | Audit log export | Defer; if required, async job + signed CSV | Later |
| 4 | Multiple roles per org member | Keep one role per organization for v1, as the schema does | Organizations implementation |
| 5 | Can an org admin manage roles? | The route map says roles are owner-only, but the demo role bundle grants `org:roles:manage` to admins. **Follow the demo bundle for now** and confirm with product | Organizations implementation |
