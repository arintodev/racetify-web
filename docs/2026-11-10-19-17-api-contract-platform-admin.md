# Frontend API Contract — Platform Admin

> **Status:** Implemented (2026-11-12), except storage screens and system-permission exposure.
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Applies to:** `/admin/**` screens in `apps/app`
> **Related:** [General Contract](./2026-11-10-19-17-frontend-api-contract-general.md) ·
> [Organizations & Access](./2026-11-10-19-17-api-contract-organizations.md) ·
> [Model Schema](./2026-11-10-06-52-model-schema-complete.md) ·
> [Route Map](./2026-11-10-07-26-frontend-route-map.md)

This feature covers the platform console: overview, tenant snapshots, organizations, users, system
roles, permission catalog, face enrollments, webhooks, jobs, and the global audit log.

**Implementation notes (2026-11-12):** all `/admin/**` screens read the live API. The storage
provider/object endpoints do not exist in the shipped API and their screens were removed. System
permissions are not exposed to the frontend, so admin access is gated by a one-time
`GET /v1/admin/overview` probe and per-page `403` → `ForbiddenState` handling instead of `/me/access`
filtering. Face enrollment previews use the API's signed image URL.

Platform administration is **metadata-first**. It does not grant access to tenant participant PII,
private gallery content, or order details by default.

---

## 1. Scope

| Screen | Route | Data |
| --- | --- | --- |
| Platform overview | `/admin/overviews` | Tenant, user, event, revenue stats, job health |
| Tenant snapshot | `/admin/overviews/[id]` | Organization profile, usage, members, events, activity |
| Organizations | `/admin/orgs` | Tenant list and status actions |
| Users | `/admin/users` | User list and detail |
| System roles | `/admin/roles` | Role cards and permission matrix |
| Permissions | `/admin/permissions` | Permission catalog |
| Face enrollments | `/admin/face-enrollments` | Read-only enrollment list and image preview |
| ~~Storage providers~~ | ~~`/admin/storages/providers`~~ | Removed — no API endpoint |
| ~~Storage objects~~ | ~~`/admin/storages/objects`~~ | Removed — no API endpoint |
| Webhooks | `/admin/webhooks` | Webhook list and deliveries |
| Jobs | `/admin/jobs` | Job list and retry |
| Audit log | `/admin/audit-logs` | Global audit log |

---

## 2. Permissions

| Action | Permission |
| --- | --- |
| View platform overview | `system:overview:view` |
| View organizations and tenant snapshots | `system:orgs:view` |
| Suspend/activate organizations | `system:orgs:manage` |
| View users | `system:users:view` |
| Suspend/activate users, revoke sessions | `system:users:manage` |
| View system roles | `system:roles:view` |
| Create/edit/delete system roles and permissions | `system:roles:manage` |
| View the permission catalog | `system:permissions:view` |
| View face enrollments | `system:face-enrollments:view` |
| View storage providers and objects | `system:storage:view` |
| View webhooks and deliveries | `system:webhooks:view` |
| View jobs | `system:jobs:view` |
| Retry jobs | `system:jobs:retry` |
| View the platform audit log | `system:audit:view` |

---

## 3. Endpoints

### Overview and tenants

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/admin/overview` | `system:overview:view` | Platform stats, growth, recent orgs, job health |
| `GET` | `/v1/admin/overviews/{orgId}` | `system:orgs:view` | Tenant snapshot |
| `GET` | `/v1/admin/orgs` | `system:orgs:view` | Organization table |
| `POST` | `/v1/admin/orgs` | `system:orgs:manage` | Create a pending organization and provision its owner |
| `GET` | `/v1/admin/orgs/{orgId}` | `system:orgs:view` | Organization detail |
| `POST` | `/v1/admin/orgs/{orgId}/suspend` | `system:orgs:manage` | Suspend a tenant |
| `POST` | `/v1/admin/orgs/{orgId}/activate` | `system:orgs:manage` | Activate a pending/suspended tenant |

### Users

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/admin/users` | `system:users:view` | User table |
| `GET` | `/v1/admin/users/{userId}` | `system:users:view` | User detail, memberships, sessions |
| `POST` | `/v1/admin/users/{userId}/suspend` | `system:users:manage` | Suspend a user |
| `POST` | `/v1/admin/users/{userId}/activate` | `system:users:manage` | Activate a user |
| `POST` | `/v1/admin/users/{userId}/sessions/revoke` | `system:users:manage` | Revoke all user sessions |

### Roles and permissions

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/admin/roles` | `system:roles:view` | System roles with permissions |
| `POST` | `/v1/admin/roles` | `system:roles:manage` | Create a system role |
| `PATCH` | `/v1/admin/roles/{roleId}` | `system:roles:manage` | Update role metadata |
| `PUT` | `/v1/admin/roles/{roleId}/permissions` | `system:roles:manage` | Replace permissions |
| `DELETE` | `/v1/admin/roles/{roleId}` | `system:roles:manage` | Delete an unused custom system role |
| `GET` | `/v1/admin/permissions` | `system:permissions:view` | Permission catalog grouped by module |

### Face enrollments

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/admin/face-enrollments` | `system:face-enrollments:view` | Enrollment table |
| `GET` | `/v1/admin/face-enrollments/{enrollmentId}` | `system:face-enrollments:view` | Enrollment detail |
| `GET` | `/v1/admin/face-enrollments/{enrollmentId}/images/{imageId}` | `system:face-enrollments:view` | Short-lived image preview URL |

### Storage

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/admin/storage/providers` | `system:storage:view` | Provider list |
| `GET` | `/v1/admin/storage/objects` | `system:storage:view` | Object metadata table |
| `GET` | `/v1/admin/storage/objects/{objectId}` | `system:storage:view` | Object detail and preview URL |

### Webhooks, jobs, audit

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/admin/webhooks` | `system:webhooks:view` | Webhook table |
| `GET` | `/v1/admin/webhooks/{webhookId}` | `system:webhooks:view` | Webhook detail |
| `GET` | `/v1/admin/webhooks/{webhookId}/deliveries` | `system:webhooks:view` | Delivery attempts |
| `GET` | `/v1/admin/webhooks/{webhookId}/deliveries/{deliveryId}` | `system:webhooks:view` | Redacted delivery payload |
| `GET` | `/v1/admin/jobs` | `system:jobs:view` | Job table |
| `GET` | `/v1/admin/jobs/{jobId}` | `system:jobs:view` | Job detail |
| `POST` | `/v1/admin/jobs/{jobId}/retry` | `system:jobs:retry` | Retry a failed job |
| `GET` | `/v1/admin/audit-logs` | `system:audit:view` | Global audit log |
| `GET` | `/v1/admin/audit-logs/{logId}` | `system:audit:view` | Audit detail |

Storage provider mutation, webhook mutation, and face-enrollment review are out of scope for v1.
The admin screens remain read-mostly, matching the demo route map.

---

## 4. Query parameters

### Organizations

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | Name, slug, or contact email |
| `status` | `active, suspended, archived` | Repeatable |
| `sort` | `name, createdAt, members, events` | Default `-createdAt` |
| `limit`, `cursor` | — | Cursor pagination |

### Users

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | Name or email |
| `status` | `active, suspended, deleted` | Repeatable |
| `orgId` | UUID | Membership filter |
| `sort` | `name, createdAt, lastLoginAt` | Default `-lastLoginAt` |

### Face enrollments

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | User name or email |
| `status` | `pending, active, rejected, deleted` | Repeatable |
| `scope` | `user, org` | Enrollment ownership |
| `orgId` | UUID | Organization-owned enrollments |

### Storage objects

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | Original filename |
| `orgId` | UUID | Tenant owner |
| `providerId` | UUID | Storage provider |
| `mimeType` | string | Exact MIME type |
| `from`, `to` | timestamp | Upload range |
| `sort` | `createdAt, size` | Default `-createdAt` |

### Webhooks and deliveries

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | URL or event type |
| `status` | `active, disabled` | Webhooks |
| `deliveryStatus` | `pending, delivered, failed` | Deliveries |
| `from`, `to` | timestamp | Delivery range |

### Jobs

| Parameter | Type | Notes |
| --- | --- | --- |
| `type` | string | Job type |
| `status` | `pending, processing, completed, failed` | Repeatable |
| `orgId`, `eventId` | UUID | Scope filters |
| `from`, `to` | timestamp | Creation range |
| `sort` | `createdAt, completedAt, attempts` | Default `-createdAt` |

### Audit logs

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | Action, resource, actor |
| `actorId` | UUID | Exact actor |
| `orgId`, `eventId` | UUID | Tenant filters |
| `action` | string | Exact action |
| `resourceType` | string | Exact resource type |
| `from`, `to` | timestamp | Range |

---

## 5. DTOs

```ts
type PlatformOverviewDTO = {
  stats: {
    organizations: number
    users: number
    events: number
    registrations: number
    revenue: number
  }
  growth: Array<{ date: string; organizations: number; users: number; revenue: number }>
  recentOrganizations: Array<{
    id: string
    name: string
    slug: string
    status: string
    createdAt: string
  }>
  jobHealth: {
    pending: number
    processing: number
    failed: number
    completedLast24h: number
  }
}

type TenantSnapshotDTO = {
  organization: {
    id: string
    name: string
    slug: string
    status: string
    createdAt: string
  }
  usage: {
    members: number
    events: number
    registrations: number
    storageBytes: number
    revenue: number
  }
  events: Array<{
    id: string
    name: string
    status: string
    startDate: string
    registrations: number
  }>
  recentActivity: AuditLogSummaryDTO[]
}

type AdminOrganizationRowDTO = {
  id: string
  name: string
  slug: string
  status: "active" | "suspended" | "archived"
  memberCount: number
  eventCount: number
  createdAt: string
}

type AdminUserRowDTO = {
  id: string
  name: string
  email: string
  status: "active" | "suspended" | "deleted"
  lastLoginAt: string | null
  createdAt: string
  memberships: Array<{
    orgId: string
    orgName: string
    roleName: string
    status: string
  }>
}

type AdminUserDetailDTO = AdminUserRowDTO & {
  phone: string | null
  emailVerified: boolean
  avatarUrl: string | null
  sessions: Array<{
    id: string
    userAgent: string
    ipAddress: string
    createdAt: string
    lastSeenAt: string
    expiresAt: string
    current: boolean
  }>
}

type SystemRoleDTO = {
  id: string
  name: string
  slug: string
  scope: "system"
  description: string
  isSystem: boolean
  userCount: number
  permissions: string[]
}

type AdminPermissionDTO = {
  name: string
  resource: string
  action: string
  module: string
  description: string
  scope: "system" | "org" | "event"
}

type FaceEnrollmentRowDTO = {
  id: string
  user: { id: string; name: string; email: string } | null
  organization: { id: string; name: string } | null
  scope: "user" | "org"
  status: "pending" | "active" | "rejected" | "deleted"
  consentedAt: string | null
  createdAt: string
}

type StorageProviderDTO = {
  id: string
  name: string
  type: "local" | "s3" | "gcs"
  bucket: string
  visibility: "public" | "private"
  isDefault: boolean
  isActive: boolean
}

type StorageObjectRowDTO = {
  id: string
  org: { id: string; name: string } | null
  uploadedBy: { id: string; name: string } | null
  provider: { id: string; name: string; type: string }
  originalName: string
  mimeType: string
  extension: string
  size: number
  width: number | null
  height: number | null
  createdAt: string
  previewUrl: string | null
}

type WebhookRowDTO = {
  id: string
  org: { id: string; name: string }
  url: string
  events: string[]
  status: "active" | "disabled"
  lastDelivery: {
    status: string
    deliveredAt: string | null
    responseStatus: number | null
  } | null
  createdAt: string
}

type WebhookDeliveryDTO = {
  id: string
  eventType: string
  responseStatus: number | null
  attempts: number
  nextRetryAt: string | null
  deliveredAt: string | null
  createdAt: string
  payloadSummary: Record<string, unknown> | null
}

type AdminJobRowDTO = {
  id: string
  type: string
  scope: { orgId: string | null; eventId: string | null }
  status: "pending" | "processing" | "completed" | "failed"
  attempts: number
  error: { code: string; message: string } | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}
```

Admin DTOs deliberately omit storage object keys, webhook secrets, provider configuration, raw
provider payloads, face embeddings, and Qdrant point IDs.

---

## 6. Business rules

### Tenant administration

- Suspending an organization sets status `suspended` and blocks all tenant API access. Existing
  sessions may remain, but tenant endpoints return `423 organization_suspended`.
- Activating restores access. Both actions are audited with the caller and reason.
- Platform admin organization views do not include participant PII, order details, private gallery
  items, or certificate files.

### Users

- Suspending a user revokes all sessions immediately and prevents login.
- Activating restores login. Deleted users are not reactivated through this endpoint.
- Revoking sessions requires a reason and is audited.
- User detail may show memberships and session metadata. It does not include participant PII from
  tenant events.

### System roles

- `system:superadmin` cannot be deleted or have its permission set reduced to an unusable state.
- Custom system roles can be created and deleted when unused.
- Permission values must exist in the catalog and have `scope = system` for system roles.
- The last user holding a required system role cannot be locked out; at minimum, the last
  superadmin cannot be suspended.
- Role changes bump permission cache versions for affected users.

### Face enrollments

- Read-only in v1. The admin can view status, scope, consent date, and a short-lived image preview.
- Image preview URLs expire in 5 minutes and are audited. There is no download action.
- No review, approve, or reject actions exist, matching the route map.
- Enrollment images and embeddings are never returned as raw data.

### Storage

- Providers are read-only in v1; configuration and credentials are never returned. `bucket` is
  shown as a label; `config` is omitted.
- Object metadata can be viewed, with a signed preview URL for images. Object keys are masked in
  responses; the full key is never exposed to the browser.
- Deletion is not part of v1 admin.

### Webhooks

- Webhook secrets and full payloads are never returned.
- Delivery payload summaries are redacted and limited to event type and non-sensitive metadata.
- Retrying deliveries is not in v1; use the jobs console for retryable jobs.

### Jobs and audit

- Retry is allowed only for `failed` jobs whose type is configured as retryable. Otherwise
  `409 job_not_retryable`.
- Retry is idempotent per job attempt and audited.
- Job payloads and errors are sanitized; they never contain tokens, passwords, raw provider
  responses, or participant PII.
- The platform audit log is read-only and searchable by actor, tenant, action, resource, and date.
- Audit metadata is redacted at write time.

---

## 7. Error codes

| HTTP | `code` | Condition |
| --- | --- | --- |
| 403 | `forbidden` | Missing system permission |
| 404 | `organization_not_found` | Unknown tenant |
| 404 | `user_not_found` | Unknown user |
| 404 | `enrollment_not_found` | Unknown face enrollment |
| 404 | `storage_object_not_found` | Unknown object |
| 404 | `webhook_not_found` | Unknown webhook |
| 404 | `job_not_found` | Unknown job |
| 409 | `last_superadmin` | Suspending/demoting the last superadmin |
| 409 | `role_in_use` | Deleting a role assigned to users |
| 409 | `job_not_retryable` | Retry for a non-retryable/completed job |
| 409 | `organization_already_suspended` | Redundant suspend |
| 409 | `organization_slug_taken` | Create with a slug that is already in use |
| 409 | `owner_inactive` | Create with an owner account that is not active |
| 409 | `user_already_suspended` | Redundant suspend |
| 423 | `organization_suspended` | Tenant is suspended |

---

## 8. Frontend mapping

| Screen / component | Query | Key |
| --- | --- | --- |
| Platform overview | `GET /admin/overview` | `["admin", "overview"]` |
| Tenant snapshot | `GET /admin/overviews/{orgId}` | `["admin", "overview", orgId]` |
| Organizations | `GET /admin/orgs` | `["admin", "orgs", filters]` |
| Users | `GET /admin/users` | `["admin", "users", filters]` |
| User detail | `GET /admin/users/{userId}` | `["admin", "user", userId]` |
| System roles | `GET /admin/roles` + `GET /admin/permissions` | `["admin", "roles"]`, `["admin", "permissions"]` |
| Face enrollments | `GET /admin/face-enrollments` | `["admin", "face-enrollments", filters]` |
| Storage providers | `GET /admin/storage/providers` | `["admin", "storage", "providers"]` |
| Storage objects | `GET /admin/storage/objects` | `["admin", "storage", "objects", filters]` |
| Webhooks | `GET /admin/webhooks` | `["admin", "webhooks", filters]` |
| Deliveries | `GET /admin/webhooks/{id}/deliveries` | `["admin", "webhook", id, "deliveries", filters]` |
| Jobs | `GET /admin/jobs` | `["admin", "jobs", filters]` |
| Audit log | `GET /admin/audit-logs` | `["admin", "audit", filters]` |

Invalidation:

- Organization suspend/activate → org lists, overview, tenant snapshot.
- User suspend/activate/session revoke → user list/detail; the affected user's access changes on the
  next request.
- Role changes → roles, permission matrix, and affected users' access server-side.
- Job retry → jobs list/detail, overview job health.

UI rules:

- Admin navigation is permission-filtered from the session's system roles.
- Direct URL access without the route permission renders `ForbiddenState`.
- All admin screens are read-mostly; destructive actions use confirmation dialogs and are audited.
- Face image previews are shown in a sheet with the privacy note and no download action.
- No storage key, webhook secret, provider config, or raw payload is rendered.

---

## 9. Acceptance criteria

1. Platform overview stats and job health match the admin dashboard.
2. Tenant snapshots show usage and events without participant PII.
3. Organization and user suspension/activation are audited and take effect immediately.
4. Session revocation invalidates the target user's sessions.
5. System role permission edits are validated against the catalog and audited.
6. Face enrollment previews use short-lived URLs and never expose embeddings.
7. Storage objects show metadata and previews but not keys or provider config.
8. Webhook deliveries show redacted summaries and no secrets.
9. Failed retryable jobs can be retried idempotently.
10. The global audit log is filterable and read-only.
11. All screens typecheck against the generated client and respect system permissions.

---

## 10. Open decisions

| # | Decision | Recommendation | Needed by |
| --- | --- | --- | --- |
| 1 | Storage provider management | Read-only in v1; add audited write endpoints later | Later |
| 2 | Webhook retry | Add with `system:webhooks:manage` later | Later |
| 3 | Face enrollment review | Out of scope; consent/retention policy first | Later |
| 4 | Tenant impersonation | **Not supported**; use audited support access if ever required | Never silently |
| 5 | Session metadata visibility | Show IP/agent to `system:users:view`, mask in exported reports | Admin implementation |
| 6 | Job payload visibility | Summary only; full payload requires a separate audited permission | Admin implementation |
