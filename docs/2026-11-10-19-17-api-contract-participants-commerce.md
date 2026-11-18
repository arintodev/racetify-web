# Frontend API Contract — Participants & Commerce

> **Status:** Implemented (2026-11-12); idempotency coverage is narrower than this contract.
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Applies to:** Participant, import, order, and payment screens in `apps/app`
> **Related:** [General Contract](./2026-11-10-19-17-frontend-api-contract-general.md) ·
> [Event Setup](./2026-11-10-19-17-api-contract-events.md) ·
> [Participant Import Plan](./2026-11-10-12-01-participant-import-column-mapping.md) ·
> [Model Schema](./2026-11-10-06-52-model-schema-complete.md)

This feature covers the participant list and detail, CSV participation import, bib assignment,
orders, payments, and refunds. Public registration creates the same underlying rows and is covered
by [Public Content](./2026-11-10-19-17-api-contract-public.md).

**Implementation notes (2026-11-12):** every screen uses the live API. The participant import is the
fixed-template flow (download template, upload raw CSV with `X-File-Name`, review issues, commit or
cancel, error report); the old column-mapping wizard was removed. Order cancellation/refund and
public order creation accept `Idempotency-Key`; participant imports do not enforce an idempotency
key today, so retrying a commit after an uncertain response depends on the import state machine.
Payments remain a backend stub.

---

## 1. Scope

| Screen | Route | Data |
| --- | --- | --- |
| Participants | `/events/[eventId]/participants` | Joined participant + registration rows |
| Participant detail | Participant sheet | Participant, registration, race, category |
| Import participants | Import sheet | Fixed template download, upload, validation, commit, result |
| Bib assignment | Dialog | Registration bib assignment |
| Orders | `/events/[eventId]/orders` | Orders with buyer, items, payment |
| Order detail | Detail sheet | Items, registrations, participants, payment |
| Payments | `/events/[eventId]/payments` | Payment rows with order context |
| Payment detail | Detail sheet | Provider reference, safe provider summary |

Out of scope:

- Public order creation and payment provider integration — public contract and a later payments
  implementation.
- Event revenue statistics — [Event Setup](./2026-11-10-19-17-api-contract-events.md).
- Certificates and bib generation — [Generators & Certificates](./2026-11-10-19-17-api-contract-generators-certificates.md).

---

## 2. Permissions

| Action | Permission |
| --- | --- |
| View participants and registrations | `event:participants:view` |
| Edit participants, assign bibs, cancel registrations, import/export | `event:participants:manage` |
| View orders | `event:orders:view` |
| Refund or cancel orders | `event:orders:manage` |
| View payments | `event:payments:view` |
| Refund payments | `event:payments:manage` |

`event:participants:view` exposes participant contact data (email, phone, identity number,
emergency contact). It is a PII-bearing permission and is never granted by platform admin metadata
permissions.

---

## 3. Endpoints

### Participants and registrations

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/events/{eventId}/participants` | `event:participants:view` | Joined participant rows |
| `GET` | `/v1/events/{eventId}/participants/{participantId}` | `event:participants:view` | Participant detail with registrations |
| `PATCH` | `/v1/events/{eventId}/participants/{participantId}` | `event:participants:manage` | Update participant fields |
| `POST` | `/v1/events/{eventId}/registrations/{registrationId}/cancel` | `event:participants:manage` | Cancel a registration |
| `POST` | `/v1/events/{eventId}/registrations/{registrationId}/bib` | `event:participants:manage` | Assign or clear a bib |
| `POST` | `/v1/events/{eventId}/registrations/bib-assignments` | `event:participants:manage` | Bulk bib assignment |
| `POST` | `/v1/events/{eventId}/participant-exports` | `event:participants:manage` | Async CSV export |

### Participant import

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/events/{eventId}/participant-imports/template` | `event:participants:manage` | Fixed CSV template and column reference |
| `POST` | `/v1/events/{eventId}/participant-imports` | `event:participants:manage` | Upload a template CSV and validate |
| `GET` | `/v1/events/{eventId}/participant-imports/{importId}` | `event:participants:manage` | Validation/import status, summary, issues |
| `POST` | `/v1/events/{eventId}/participant-imports/{importId}/commit` | `event:participants:manage` | Import valid rows |
| `POST` | `/v1/events/{eventId}/participant-imports/{importId}/cancel` | `event:participants:manage` | Cancel a pending import |
| `GET` | `/v1/events/{eventId}/participant-imports/{importId}/error-report` | `event:participants:manage` | Signed error-report URL |

Column mapping is **on hold**. The import accepts only the fixed template; there is no mapping
endpoint and no default race/category/status selected in the API request.

### Orders and payments

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/events/{eventId}/orders` | `event:orders:view` | Order rows |
| `GET` | `/v1/events/{eventId}/orders/{orderId}` | `event:orders:view` | Order detail with items and payment |
| `POST` | `/v1/events/{eventId}/orders/{orderId}/refund` | `event:orders:manage` | Full refund request |
| `POST` | `/v1/events/{eventId}/orders/{orderId}/cancel` | `event:orders:manage` | Cancel an unpaid order |
| `GET` | `/v1/events/{eventId}/payments` | `event:payments:view` | Payment rows |
| `GET` | `/v1/events/{eventId}/payments/{paymentId}` | `event:payments:view` | Payment detail |
| `POST` | `/v1/events/{eventId}/payments/{paymentId}/refund` | `event:payments:manage` | Provider-level refund |

Order refund is the primary organizer action. Payment refund exists for cases where the provider
must be refunded directly; both require an idempotency key and are audited.

---

## 4. Query parameters

### Participants

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | Name, email, phone, or bib |
| `raceId` | UUID | Repeatable |
| `categoryId` | UUID | Repeatable |
| `status` | `pending, confirmed, cancelled, refunded` | Repeatable |
| `gender` | `male, female` | Repeatable |
| `bib` | string | Exact or prefix match; bibs are strings |
| `hasBib` | boolean | Filter assigned/unassigned |
| `sort` | `name, registeredAt, bibNumber, status` | Default `name` |
| `limit`, `cursor` | — | Cursor pagination |

### Orders

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | Order number, buyer email, or participant name |
| `status` | `pending, paid, expired, cancelled, refunded` | Repeatable |
| `from`, `to` | timestamp | Order creation range |
| `sort` | `createdAt, totalAmount, status` | Default `-createdAt` |

### Payments

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | Provider reference or order number |
| `provider` | `midtrans, doku` | Lowercase in the contract |
| `method` | `qris, va, transfer` | Lowercase in the contract |
| `status` | `pending, success, failed, expired, refunded` | Repeatable |
| `from`, `to` | timestamp | Payment creation range |
| `sort` | `createdAt, amount, status` | Default `-createdAt` |

Money filters accept integers in IDR.

---

## 5. DTOs

```ts
type ParticipantRowDTO = {
  participant: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    gender: "male" | "female"
    birthDate: string
    nationality: string
    countryCode: string
    identityNumber: string | null
    emergencyContactName: string | null
    emergencyContactPhone: string | null
  }
  registration: {
    id: string
    registrationNumber: string
    bibNumber: string | null
    bibName: string | null
    status: "pending" | "confirmed" | "cancelled" | "refunded"
    registeredAt: string
    confirmedAt: string | null
  }
  race: { id: string; name: string; distanceKm: number } | null
  category: { id: string; name: string; code: string } | null
}

type ParticipantDetailDTO = {
  participant: ParticipantRowDTO["participant"] & { userId: string | null; createdAt: string }
  registrations: Array<ParticipantRowDTO["registration"] & {
    race: ParticipantRowDTO["race"]
    category: ParticipantRowDTO["category"]
  }>
}

type ParticipantImportTemplateDTO = {
  version: string
  fileName: string
  downloadUrl: string
  expiresAt: string
  columns: Array<{
    key: string
    header: string
    required: boolean
    type: "text" | "email" | "phone" | "enum" | "date" | "race" | "category" | "bib"
    example: string
  }>
  limits: {
    maxRows: number
    maxFileSizeBytes: number
  }
}

type ParticipantImportDTO = {
  id: string
  eventId: string
  templateVersion: string
  status: "validating" | "ready" | "importing" | "completed" | "failed" | "cancelled"
  file: {
    name: string
    size: number
    rowCount: number
    headerCount: number
    delimiter: "," | ";"
    encoding: "utf-8"
  }
  columns: string[]
  summary: ImportSummaryDTO | null
  issues: ImportIssueDTO[]
  result: ImportResultDTO | null
  createdAt: string
  completedAt: string | null
}

type ImportSummaryDTO = {
  total: number
  valid: number
  invalid: number
  duplicates: number
}

type ImportIssueDTO = {
  rowNumber: number
  field: string | null
  code: string
  message: string
  severity: "error" | "warning"
}

type ImportResultDTO = {
  imported: number
  skipped: number
  failed: number
  errorReportUrl: string | null
}

type OrderRowDTO = {
  order: {
    id: string
    orderNumber: string
    status: "pending" | "paid" | "expired" | "cancelled" | "refunded"
    totalAmount: number
    currency: "IDR"
    createdAt: string
    paidAt: string | null
    expiresAt: string | null
  }
  buyer: { id: string | null; name: string | null; email: string | null } | null
  items: Array<{
    id: string
    registrationId: string
    unitPrice: number
    quantity: number
    subtotal: number
  }>
  participants: Array<{
    participantId: string
    firstName: string
    lastName: string
    raceName: string | null
    categoryName: string | null
  }>
  payment: {
    id: string
    provider: string
    paymentMethod: string
    status: string
    paidAt: string | null
  } | null
}

type PaymentRowDTO = {
  payment: {
    id: string
    provider: "midtrans" | "doku"
    providerReference: string
    paymentMethod: "qris" | "va" | "transfer"
    amount: number
    status: "pending" | "success" | "failed" | "expired" | "refunded"
    paidAt: string | null
    createdAt: string
  }
  order: {
    id: string
    orderNumber: string
    status: string
    totalAmount: number
  } | null
  participants: Array<{
    participantId: string
    firstName: string
    lastName: string
    raceName: string | null
  }>
}
```

Provider enum values are lowercased in the contract even though the display labels are `Midtrans`
and `DOKU`.

---

## 6. Business rules

### Participants and registrations

- A participant row belongs to one event. One participant can have multiple registrations in the
  same event only if the event config allows it; v1 defaults to one registration per participant per
  event.
- Updating a participant validates email, phone, gender, and birth date. The server does not enforce
  email deliverability.
- Identity number and emergency contact are required only when the event config requires them.
- Cancelling a registration sets status `cancelled` and releases the bib. It does not delete the
  participant row. If the registration is paid, cancellation must go through a refund flow →
  `409 refund_required`.
- Refunded registrations are terminal.
- Bibs are strings, preserve leading zeros, and are unique per race (`UNIQUE(race_id, bib_number)`).
  Assigning a taken bib → `409 bib_conflict`. Clearing a bib is allowed.
- Bulk assignment is atomic: if any bib conflicts, none are applied.
- Participants and registrations created by public orders link to the order item; imported
  participants do not create orders in v1.

### Participant import

Flow:

1. **Template** — `GET /participant-imports/template` returns the fixed template version, column
   definitions, limits, and a signed CSV download URL. The organizer fills that template; arbitrary
   column layouts are not accepted.
2. **Upload and validate** — `POST /participant-imports` with `multipart/form-data` (`file`) and an
   `Idempotency-Key`. The server limits the file to 2 MB and 500 data rows, parses UTF-8 CSV,
   detects `,` or `;`, checks headers against the template version, and validates every row. It
   returns the import ID with status `validating`; raw file data is stored in a temporary private
   object and deleted after 24 hours.
3. **Review** — `GET /participant-imports/{importId}` returns status `ready`, the summary, and
   per-row issues. There is no column mapping and no remapping step.
4. **Commit** — `POST /participant-imports/{importId}/commit` returns `202` with the import job. The
   job creates valid rows in a transaction per batch and records failures.
5. **Result** — `GET /participant-imports/{importId}` returns imported/skipped/failed counts and
   issues; `GET .../error-report` returns a signed CSV URL.

Validation codes:

`invalid_template`, `missing_column`, `unknown_column`, `missing_required`, `invalid_email`,
`invalid_phone`, `invalid_gender`, `invalid_date`, `unknown_race`, `unknown_category`,
`duplicate_email_in_file`, `duplicate_email_in_event` (skip), `bib_conflict_in_file`,
`bib_conflict_in_event`, `invalid_bib`, `row_limit_exceeded`, `duplicate_header`.

Rules:

- Only the fixed template is accepted. Missing required columns or unknown columns →
  `invalid_template`; the import cannot be committed.
- There is no server-side mapping, no default race/category/status, and no column remapping.
- Race and category values in the CSV must match the event's races/categories (case-insensitive,
  trimmed). They cannot be supplied as API defaults.
- Duplicate emails within the file error on later rows; duplicates already in the event are skipped
  with a warning.
- Imported rows are visible to the participant list immediately after the job completes.
- The import never sends email or creates orders.
- Import files and logs never expose participant PII in application logs; the temporary object is
  private and expires.
- The column-mapping plan is on hold. The
  [Participant Import Plan](./2026-11-10-12-01-participant-import-column-mapping.md) is retained for
  the future mapping flow and is not the active contract.

### Orders

- An order belongs to one event and has one or more order items.
- Status transitions: `pending → paid | expired | cancelled`; `paid → refunded`; refunded is terminal.
- `totalAmount = subtotal - discountAmount + platformFee`; the server computes and returns the total.
  The client never supplies prices.
- An order with a successful payment cannot be cancelled; use refund.
- Order refunds are full refunds in v1. The request includes a reason:
  ```json
  { "reason": "Participant requested cancellation" }
  ```
  It requires `event:orders:manage` and an `Idempotency-Key`, returns `202` with a refund job, and
  updates the order/registrations when the provider confirms. A failed provider refund leaves the
  order unchanged and reports the failure on the job.
- Cancelling an unpaid order sets `cancelled` and cancels its registrations.
- Order rows never expose raw provider payloads or payment credentials.

### Payments

- A payment belongs to one order. Multiple attempts per order are allowed; only one can be
  successful.
- Status transitions: `pending → success | failed | expired`; `success → refunded`.
- `providerReference` is returned as a display string. Raw provider responses are not returned;
  a redacted `providerSummary` may include method, channel, and status timestamps.
- Payment refund requires `event:payments:manage`, is idempotent per payment, and records the
  provider response in the job.
- Payment details never include card data, tokens, or credentials.

### Exports

- `POST /participant-exports` accepts the same filters as the participant list plus
  `format: "csv"`, returns `202` with a job, and produces a signed download URL.
- Exports contain PII and are audited. The URL expires after 15 minutes.
- The demo's export toast becomes a real async job; the UI shows progress and a download action.

---

## 7. Error codes

| HTTP | `code` | Condition |
| --- | --- | --- |
| 404 | `participant_not_found` | Unknown or cross-tenant participant |
| 404 | `registration_not_found` | Unknown registration |
| 404 | `order_not_found` | Unknown order |
| 404 | `payment_not_found` | Unknown payment |
| 409 | `bib_conflict` | Bib already assigned in the race |
| 409 | `registration_not_cancellable` | Paid registration without refund |
| 409 | `refund_required` | Cancellation requires a refund |
| 409 | `order_not_refundable` | Order is not paid/refundable |
| 409 | `payment_not_refundable` | Payment is not successful |
| 409 | `import_not_ready` | Commit before validation is ready |
| 409 | `import_already_committed` | Commit called twice without a new idempotency key |
| 422 | `import_file_too_large` | Over 2 MB |
| 422 | `import_row_limit_exceeded` | Over 500 data rows |
| 422 | `duplicate_header` | Duplicate CSV headers |
| 422 | `invalid_template` | Headers do not match the fixed template |
| 422 | `missing_column` | A required template column is absent |
| 422 | `unknown_column` | A column is not part of the template |
| 422 | `category_not_in_race` | Category does not belong to the selected race |
| 422 | `invalid_bib` | Bib contains unsupported characters |
| 422 | `export_filters_invalid` | Unsupported export filter |

---

## 8. Frontend mapping

| Screen / component | Query | Key |
| --- | --- | --- |
| Participant table | `GET /events/{eventId}/participants` with filters | `["event", eventId, "participants", filters]` |
| Participant detail | `GET /events/{eventId}/participants/{participantId}` | `["event", eventId, "participant", participantId]` |
| Import wizard | `GET template`, `POST upload`, `GET status`, `POST commit` | `["event", eventId, "import", importId]`, `["event", eventId, "import-template"]` |
| Orders table | `GET /events/{eventId}/orders` with filters | `["event", eventId, "orders", filters]` |
| Order detail | `GET /events/{eventId}/orders/{orderId}` | `["event", eventId, "order", orderId]` |
| Payments table | `GET /events/{eventId}/payments` with filters | `["event", eventId, "payments", filters]` |
| Payment detail | `GET /events/{eventId}/payments/{paymentId}` | `["event", eventId, "payment", paymentId]` |

Invalidation:

- Participant/registration edits, cancel, bib assignment → participants list, participant detail,
  event overview, orders (participant names), payments.
- Import commit completion → participants list, event overview.
- Order refund/cancel → orders, order detail, payments, event overview.
- Payment refund → payments, payment detail, orders, event overview.
- Export completion → export query key; no cache invalidation needed.

UI rules:

- The import wizard uses the fixed template: download template → upload filled CSV → review
  validation → import. There is no column-mapping step. Client-side parsing may be used for instant
  feedback, but commit always uses the server result.
- Refund/cancel actions use the existing confirmation dialogs and show job progress.
- Without `event:participants:manage`, rows are read-only and import/export/bib actions are hidden.
- Without `event:orders:manage` or `event:payments:manage`, refund actions are hidden.
- Direct URL access without the route permission renders `ForbiddenState`.

---

## 9. Acceptance criteria

1. Participant rows are joined server-side and match the columns and filters in the route map.
2. Bibs remain strings; leading zeros and alphanumeric bibs survive round-trips.
3. A bib conflict is rejected atomically, including in bulk assignment.
4. The import flow downloads the fixed template, uploads a matching CSV, validates it, commits, and
   returns imported/skipped/failed counts with an error report. It never offers column mapping.
5. Imported participants appear in the participant list after the job completes.
6. Import limits (2 MB, 500 rows) are enforced server-side.
7. Order and payment rows include the related participants and provider summary without raw payloads
   or credentials.
8. Refund actions are idempotent and audited; failed refunds leave the source record unchanged.
9. Cross-tenant participant/order/payment IDs return `404`.
10. All screens typecheck against the generated client and respect the permission matrix.

---

## 10. Open decisions

| # | Decision | Recommendation | Needed by |
| --- | --- | --- | --- |
| 1 | Import duplicate-email behavior | Skip existing event emails with a warning, as this contract does | Participants implementation |
| 2 | Import updates existing participants | Not in v1; skip duplicates | Participants implementation |
| 3 | Order-level vs. payment-level refund ownership | Order refund is the primary organizer action; payment refund is provider-level | Commerce implementation |
| 4 | Partial refunds | Not in v1 | Later |
| 5 | Participant export size | Cap at 50,000 rows per job; stream to storage | Participants implementation |
| 6 | Multiple registrations per participant per event | One in v1 unless the event config explicitly allows more | Participants implementation |
| 7 | Column mapping | **On hold.** v1 accepts only the fixed import template; mapping is a later enhancement | Later |
