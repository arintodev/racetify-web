# Participant Import with Column Mapping — Implementation Plan

> **Status:** On hold (2026-11-10) — column mapping is paused; fixed-template import is the active
> flow. This document is retained for a future mapping version.
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Related:** [Implementation Plan](./2026-11-10-07-26-frontend-implementation-plan.md) ·
> [Architecture](./2026-11-10-07-26-frontend-architecture.md) ·
> [Route Map](./2026-11-10-07-26-frontend-route-map.md) ·
> [UI Guidelines](./2026-11-10-07-26-frontend-ui-guidelines.md) ·
> [Delivery Plan](./2026-11-10-07-26-frontend-delivery-plan.md)

> **Current decision (2026-11-10):** column mapping is on hold. The active import flow is:
> download the fixed CSV template → upload a matching file → validate/review → import → result.
> There is no mapping step, no alias detection, and no default race/category mapping in v1. See the
> [Participants & Commerce API Contract](./2026-11-10-19-17-api-contract-participants-commerce.md).
> The sections below describe the deferred mapping design and should not be implemented until the
> decision changes.

---

This plan replaces the current static import preview with a complete participant import flow:
upload CSV → map source columns to participant/registration fields → validate → review → import
into the page's in-memory data → result summary. It remains a frontend-only demo: no upload to a
server, no persistence, and no backend API.

---

## 1. Goals and non-goals

### Goals

- Let an organizer import many participants from a CSV without matching a fixed file template.
- Auto-detect common headers, including Indonesian aliases, while allowing every column to be
  remapped or ignored.
- Validate required fields, data formats, race/category references, duplicate emails, and bib
  conflicts before import.
- Show a clear per-row error report and a result summary.
- Add imported participants to the event's local participant list so the demo feels complete.
- Keep the flow keyboard accessible and usable on a laptop at a registration desk.

### Non-goals

- Backend import jobs, file storage, or API integration.
- XLSX/ODS/PDF parsing.
- Cross-event deduplication.
- Updating existing participants (v1 skips duplicates; update mode is a later decision).
- Sending invitation or confirmation emails.

---

## 2. User flow

```
Participants page
  └─ Import button
      └─ Step 1: Upload
           select or drop CSV
           show file name, size, row count, header count
           download sample template
      └─ Step 2: Map columns
           source column → target field
           auto-detected mappings
           default race/category/status for unmapped rows
      └─ Step 3: Review
           mapped preview (first 10 rows)
           valid / invalid / duplicate counts
           per-row issues
      └─ Step 4: Result
           imported, skipped, failed counts
           error summary and download placeholder
           "View participants" closes the sheet
```

The import sheet is a four-step wizard inside the existing `Sheet`. State is lost when the sheet
closes; that is acceptable for the demo.

---

## 3. Target field catalog

Fields are grouped by the entity they populate. Required targets must be mapped or covered by a
default value before the user can continue.

### Participant fields

| Target | Required | Type | Aliases (auto-detect) |
| --- | --- | --- | --- |
| `firstName` | Yes | text | first name, firstname, given name, nama depan |
| `lastName` | Yes | text | last name, lastname, surname, family name, nama belakang |
| `email` | Yes | email | email, e-mail, alamat email |
| `phone` | Yes | phone | phone, phone number, mobile, whatsapp, no hp, nomor hp, telepon |
| `gender` | Yes | enum | gender, sex, jenis kelamin, jk |
| `birthDate` | Yes | date | birth date, date of birth, dob, tanggal lahir, tgl lahir |
| `nationality` | No | text | nationality, country, kewarganegaraan, negara |
| `countryCode` | No | text | country code, kode negara |
| `identityNumber` | No | text | identity number, id number, nik, ktp |
| `emergencyContactName` | No | text | emergency contact, emergency name, kontak darurat |
| `emergencyContactPhone` | No | phone | emergency phone, emergency contact phone, telepon darurat |

`identityNumber`, `emergencyContactName`, and `emergencyContactPhone` must be added as optional
fields on the demo `Participant` type and fixture rows before this flow ships.

### Registration fields

| Target | Required | Type | Aliases (auto-detect) |
| --- | --- | --- | --- |
| `race` | Yes* | race lookup | race, race name, distance, kategori lomba, lomba |
| `category` | No | category lookup | category, category name, division, kategori, kelas |
| `bibNumber` | No | string | bib, bib number, bib no, nomor bib, no bib |
| `bibName` | No | string | bib name, printed name, nama bib |
| `status` | No | enum | status, registration status, status registrasi |

\* `race` may be supplied by a default in Step 2 instead of a mapped column. If neither a mapping
nor a default exists, the flow blocks.

### Derived, never mapped

- `registrationNumber`: generated on import.
- `participant.id`, `registration.id`: generated.
- `eventId`: current event.
- `registeredAt` / `confirmedAt`: current time.

---

## 4. CSV rules

- Encoding: UTF-8.
- Delimiter: comma; support semicolon if the first line contains more semicolons than commas.
- First non-empty row is the header.
- Maximum 500 data rows and 2 MB per file.
- Completely empty rows are ignored.
- Values are trimmed; quoted values may contain commas and escaped quotes.
- Headers are normalized for detection: lowercase, trim, collapse spaces, remove punctuation.
- Duplicate headers are disallowed; show a parsing error.
- The sample template includes all participant and registration columns.

Example:

```csv
first_name,last_name,email,phone,gender,birth_date,race,category,bib_number
Rina,Hartono,rina@example.com,+62 812 0000 0001,female,1994-04-12,10K Heritage,Female Open,1042
Yoga,Pratama,yoga@example.com,+62 812 0000 0002,male,1988-09-03,Half Marathon,Male Master,
```

---

## 5. Step 2 — Column mapping

### Layout

- Header summary: file name, rows, columns, detected delimiter.
- Mapping table:
  - Source column and up to three sample values.
  - Target field selector. Options are grouped: Participant, Registration, Ignore.
  - Auto-detected badge when the header matched an alias.
  - Conflict/validation message.
- Required-target checklist: mapped / defaulted / missing.
- Defaults card:
  - Default race (required if no race column).
  - Default category (filtered by selected race).
  - Default registration status (`pending` or `confirmed`).
- Footer: Cancel, Back, Continue. Continue is disabled while required targets are missing.

### Auto-detection

- Normalize the header and compare against aliases plus a small typo tolerance (optional, later).
- Detect common Indonesian and English names.
- If two source columns map to the same target, keep the first and mark the second as a conflict;
  the user must choose Ignore or remap.
- Unrecognized headers default to Ignore.
- Never guess ambiguous fields such as `name`; require the user to choose first/last or map a
  combined name field that is split on the first space (optional enhancement).

### Interaction rules

- One target field can be mapped from at most one source column.
- Choosing a target already used by another column shows an inline conflict; the user can swap.
- Changing the default race resets the default category if the category no longer belongs to it.
- Mapping changes update the Step 3 preview immediately; no separate save action.
- All controls are labeled, and the mapping table has a caption for screen readers.

---

## 6. Step 3 — Validation and review

### File-level validation

- Header row exists.
- No duplicate headers.
- At least one data row.
- Required targets are mapped or defaulted.
- Row count and file size within limits.

### Row-level validation

| Code | Condition | Behavior |
| --- | --- | --- |
| `missing_required` | Required target value empty | Error |
| `invalid_email` | Email fails format check | Error |
| `invalid_phone` | Fewer than 7 digits after normalization | Error |
| `invalid_gender` | Not male/female after alias normalization | Error |
| `invalid_date` | Unparseable or future date | Error |
| `unknown_race` | Race name does not match an event race | Error |
| `unknown_category` | Category does not belong to the resolved race | Error |
| `duplicate_email_in_file` | Same email appears more than once | Error on later rows |
| `duplicate_email_in_event` | Email already exists in the event | Skip (warning) |
| `bib_conflict_in_file` | Same bib within the same race | Error on later rows |
| `bib_conflict_in_event` | Bib already assigned in the race | Error |
| `invalid_bib` | Bib contains unsupported characters | Error |

### Normalization

- Gender aliases: `m`, `male`, `pria`, `laki-laki` → `male`; `f`, `female`, `wanita`,
  `perempuan` → `female`.
- Dates: `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY`; display the parsed date in the review table.
- Phone: keep the entered string for display; validate digits after removing spaces, dashes, and
  parentheses.
- Race/category: case-insensitive match; trim whitespace.
- Bib: string; preserve leading zeros and alphanumeric bibs; never coerce to a number.

### Review UI

- Summary chips: total rows, valid, invalid, duplicates.
- Preview table: first 10 mapped rows with row number, name, email, race/category, bib, and status.
- Invalid rows are highlighted with an error icon and a readable message; keyboard users can focus
  the row to read the issue.
- A collapsible "All issues" list groups errors by row or by field. Include a download-error-report
  placeholder explaining it is unavailable in the demo.
- Import button is disabled when there are zero valid rows.
- Import proceeds with valid rows only; invalid rows are reported and skipped.

---

## 7. Step 4 — Result

- Summary cards: imported, skipped duplicates, failed.
- Imported rows appear in the participant table immediately (local state).
- Result table lists failed rows with error messages.
- "Download error report" shows a demo toast.
- Primary action: "View participants" closes the sheet and scrolls/focuses the table.
- Secondary action: "Import another file" resets the wizard.

---

## 8. Demo data behavior

Because the demo has no API or persistence:

- Parse the selected CSV in the browser and hold rows in component state.
- Build `Participant` and `Registration` objects with generated IDs.
- Append them to the participant page's local `rows` state.
- Refresh restores the original seed data.
- The imported rows participate in existing filters, pagination, detail sheets, and edit actions.
- No localStorage or sessionStorage is used.

If CSV parsing is deferred for the first demo pass, keep the mapping UI fully interactive and use
the file's header row plus a fixed sample body, but the goal is to parse the actual file.

---

## 9. Code structure

Extract the current inline import sheet into a feature:

```
apps/app/features/participants/import/
├─ import-participants-sheet.tsx   # wizard shell + step state
├─ upload-step.tsx
├─ mapping-step.tsx
├─ review-step.tsx
├─ result-step.tsx
├─ field-catalog.ts                # targets, requirements, aliases, groups
├─ parse-csv.ts                    # delimiter/header/row parsing
├─ auto-map.ts                     # alias detection + conflict handling
├─ validate-import.ts              # row-level validation + summary
├─ build-import-rows.ts            # map row values to demo entities
├─ types.ts
└─ index.ts
```

Keep parsing, mapping, and validation pure so they can be unit-tested later. The page passes:
`event`, `races`, `categories`, `existingParticipants`, and an `onImport(rows)` callback.

### Core types

```ts
type ImportTarget =
  | "firstName" | "lastName" | "email" | "phone" | "gender" | "birthDate"
  | "nationality" | "countryCode" | "identityNumber"
  | "emergencyContactName" | "emergencyContactPhone"
  | "race" | "category" | "bibNumber" | "bibName" | "status"

type ColumnMapping = Record<string, ImportTarget | "ignore">

type ParsedCsv = {
  headers: string[]
  rows: Array<Record<string, string>>
  delimiter: "," | ";"
}

type ImportIssue = {
  rowNumber: number
  field?: ImportTarget
  code: string
  message: string
  severity: "error" | "warning"
}

type ImportSummary = {
  total: number
  valid: number
  imported: number
  skipped: number
  failed: number
  issues: ImportIssue[]
  rows: ParticipantRow[]
}
```

### Wizard state

```
idle → uploading → mapping → reviewing → importing → done
                     ↑          │
                     └──────────┘ (map edits revalidate)
parsing_error / empty_file are terminal error states with retry.
```

---

## 10. UX and accessibility

- Stepper shows the four steps and the current step; completed steps are clickable backward.
- The sheet is wide on desktop (`sm:max-w-2xl` or larger) and full-width on mobile.
- Mapping and review tables use shadcn `Table` with a caption and proper headers.
- Error summaries use `aria-live="polite"` and link to the affected row.
- Selects have visible labels; no placeholder-only labeling.
- The primary action is disabled with an explanation when the step is incomplete.
- Destructive "discard import" confirmation when closing after mapping begins.
- Respect `prefers-reduced-motion`.
- Empty states for no file, no mapped columns, no valid rows, and no issues.

---

## 11. Acceptance criteria

- An organizer can upload a CSV, see headers auto-mapped, remap any column, and ignore columns.
- Required targets are clearly blocked when unmapped and no default exists.
- Invalid emails, dates, genders, races, categories, duplicate emails, and bib conflicts are
  detected with row-level messages.
- Valid rows are imported into the participant table's local state; invalid rows are not.
- The result summary reports imported, skipped, and failed counts.
- The flow works with mouse, keyboard, and screen readers.
- Build, lint, and typecheck remain clean.
- Refresh restores the original example data.

---

## 12. Estimate

| Work | Estimate |
| --- | --- |
| CSV parsing + types + auto-map | 0.5 day |
| Mapping step UI + defaults | 1 day |
| Validation + review + issue list | 0.5–1 day |
| Import into local participant rows + result | 0.5 day |
| Polish, responsive, a11y, sample CSV | 0.5 day |
| **Total** | **3–3.5 days** |

---

## 13. Open questions

1. Should email and phone be required for imported participants, or optional when the event does
   not need them?
2. Should duplicate emails skip, update the existing participant, or block the file?
3. Is XLSX required by real organizers, or is CSV enough for the pilot?
4. Should a single file be able to create multiple registrations for the same participant across
   races?
5. What is the default registration status for imported rows: `pending` or `confirmed`?
6. Are Indonesian identity and emergency-contact fields mandatory for the pilot events?
