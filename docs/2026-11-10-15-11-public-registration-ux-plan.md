# Public Registration Page — UX & Implementation Plan

> **Status:** Implemented (2026-11-10)
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Related:** [Public Web App Plan](./2026-11-10-12-20-public-web-app-plan.md) ·
> [Frontend UI Guidelines](./2026-11-10-07-26-frontend-ui-guidelines.md) ·
> [Frontend Route Map](./2026-11-10-07-26-frontend-route-map.md)

This plan redesigns `/e/[eventSlug]/register` around a **race-first registration model**. The buyer
adds one race per participant, fills each participant's details one card at a time, and checks out once.
The page must stay short on a phone, keep the total visible, and never ask for information the
organizer has not made required.

Section 6 of the [Public Web App Plan](./2026-11-10-12-20-public-web-app-plan.md) describes the
original five-step registration flow. This document supersedes that section for the registration
surface and should be merged into it once approved.

---

## 1. Current state

- `apps/web/app/e/[eventSlug]/register/page.tsx` already resolves the event, the registration
  window, and `?race=` / `?category=` presets.
- The page imports `RegistrationWizard` from `@/features/public-registration`, but that feature
  directory does not exist yet.
- The page's default export currently returns an empty JSX expression after computing presets, so
  the route renders nothing and the build fails on the missing module.
- `getPublicRegistrationConfig(eventSlug)` already returns the event, max participants per order,
  conditional field requirements, and every race with its categories and fee.
- The success page already accepts repeated `entry=raceId~categoryId` query parameters and renders
  a demo receipt without storing data.
- `EventHeader` and the site header are `max-w-3xl`; the registration page should stay within that
  width so the header and form line up.

**Conclusion:** the data and routing foundations are in place. The work is the feature module, the
page wiring, and the success page polish.

---

## 2. Problem

The original five-step flow (Races → Participants → Contact → Review → Confirmation) is correct
but reads like an application form:

- Step 1 asks the buyer to choose a **race and a category** before the participant's gender and birth
  date are known. That is backwards: categories are derived from those details.
- Step 2 asks for **every participant's details on one screen** when the order has multiple participants.
  With four participants the page becomes a long form, which is exactly what we want to avoid.
- The **review** step repeats information the buyer just entered and adds a fifth tap for no new
  decision.
- The race price and order total are not consistently anchored while the buyer works.

The race-first model fixes this by separating **what** is being bought (races) from **who** is
going (participant details) and **how** the buyer pays/confirms (checkout).

---

## 3. Design principles

1. **Choose races first, fill in names second.** A buyer can see all races, add quantities, and
   understand the total before typing a single name.
2. **One decision per screen.** The wizard has four steps. Each step has one job.
3. **One participant at a time.** The participant step shows compact cards; only the card being edited is
   expanded.
4. **Show only required fields.** Identity number and per-participant emergency contact appear only
   when the event config requires them. Optional fields stay visually secondary.
5. **The total is always visible.** A sticky order bar shows participant count and total on every step.
6. **No fake urgency or fake payments.** Capacity is informational. Payment is explicitly
   simulated. The confirmation does not claim an email was sent.
7. **Mobile first, but not mobile only.** Single column at 375px; comfortable form width on
   desktop. No horizontal scrolling, no modal-only flows.
8. **Privacy by construction.** No participant names, contact details, identity numbers, or
   birth dates in the URL, analytics, localStorage, or sessionStorage.

### The race-selection model, mapped

| Race-selection pattern | Registration equivalent |
| --- | --- |
| Browse race options | Race cards with distance, date, start time, price, capacity |
| Choose quantity | Per-race stepper, capped by `maxParticipantsPerOrder` |
| Cart summary | Sticky participant count + total, expandable line items |
| Attendee details | One collapsed card per participant, one expanded at a time |
| Checkout | Contact and consents; payment is a separate placeholder step |
| Receipt | Order number, race/category lines, total, share/register again |

---

## 4. Recommended flow

```
[ Registration page ]
        │
        ├── Registration closed / upcoming ──► phase-specific card
        │
        ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ 1. Races         │ ──► │ 2. Participants  │ ──► │ 3. Checkout      │ ──► │ 4. Payment       │
│ race + quantity  │     │ one card each    │     │ contact + review │     │ placeholder      │
└──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
                                                                                  │
                                                                                  ▼
                                                                        ┌──────────────────┐
                                                                        │ 5. Confirmation  │
                                                                        │ receipt + share  │
                                                                        └──────────────────┘
```

### Why four steps instead of five

| Original step | New home | Reason |
| --- | --- | --- |
| Races | Step 1 Races | Keep. This is the race picker. |
| Participants | Step 2 Participants | Keep, but one card at a time. Category and per-participant emergency contact move here. |
| Contact | Step 3 Checkout | Combine related checkout decisions. |
| Review | Inside Step 3 | The order review is the top of checkout, not a separate screen. |
| Payment | Step 4 Payment | New placeholder step for the future payment provider. |
| Confirmation | Confirmation page | Unchanged route; clearer receipt. |

**Net effect:** the standalone review screen is gone, and payment has its own clearly labeled demo
step.

### Why the first step is race-only, not race + category

This is the most important design decision.

- **Categories are derived, not shopped.** A participant's category is determined by gender and age on
  race day. Asking for it before asking for those details forces the buyer to guess, then creates
  eligibility errors later.
- **Price is race-based.** In the demo data, `publicRaceFee(race)` does not vary by category, so
  splitting races by category adds density without changing the price.
- **The race picker stays legible.** Three races become three cards, not twelve race × category
  rows.
- **Shared links still work.** `?category=female-open` is carried into the first participant card as a
  preset. If it is ineligible, the card explains why and offers the eligible categories instead of
  silently dropping it.

If a future event prices categories differently, the race card can gain a category selector and
the model can move `categoryId` onto the race entry. The state shape below is ready for that change.

### Fast paths

| Situation | Behavior |
| --- | --- |
| `?race=` valid | Seed one participant and open **Step 2** directly. Show a "1 race · 10K Heritage · Change" chip. |
| `?race=&category=` valid | Same, and prefill the category if it is eligible for that participant. |
| `maxParticipantsPerOrder === 1` | Race cards become single-select. Choosing a race seeds the participant and opens Step 2 immediately. |
| No valid preset | Open **Step 1** with zero races. |
| Registration closed or upcoming | Show the phase card; no wizard. |

The preset is only read on first load. Steps are internal state, not URL state, so the URL does not
change while the buyer works. This keeps the flow fast and avoids half-filled state on refresh
(the demo intentionally has no draft persistence).

---

## 5. Screen specifications

### 5.1 Shared page chrome

- The event header from `app/e/[eventSlug]/layout.tsx` stays at the top.
- The page renders the registration content in a shadcn `Card`, matching the gallery and certificate
  pages: `CardHeader` with "Register", the deadline, a share menu, and summary badges; `CardContent`
  holds the wizard. The card uses `overflow-visible` so the sticky order bar can stick to the
  viewport while the card scrolls.
- The card header above the stepper:
  - **Title:** "Register".
  - **Description:** one sentence plus the registration deadline in the event timezone.
  - **Actions:** share menu with link and QR.
  - **Badges:** participant cap, "No account needed", "Demo checkout".
- Step indicator:
  - Mobile: "Step 1 of 4 · Races" + a thin `Progress`.
  - ≥640px: four labeled steps with numbered circles and connectors.
  - Completed steps are buttons; the current step has `aria-current="step"`; upcoming steps are
    disabled text. No skipping forward.
- Sticky order bar (bottom):
  - Left: participant count and total, e.g. **2 participants · Rp420.000**.
  - Right: primary CTA for the step.
  - Secondary "View order" text button opens a `Sheet` with line items (hidden on Checkout, where
    the review is inline).
  - On mobile it is full-width with safe-area padding. It scrolls with the content but sticks to
    the bottom of the viewport while the wizard is in view.
  - The CTA is disabled only when there are zero races. Otherwise it stays enabled and surfaces
    validation, so the buyer never faces a dead button.
- Demo note in the checkout step and on the receipt: "Demo checkout — no payment is taken and
  nothing is saved."

### 5.2 Step 1 — Races

```
┌──────────────────────────────────────────────────────────────┐
│  Races                                                       │
│  One race per participant. Choose the race, then add details.     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 10K Heritage                              Rp210.000    │  │
│  │ 10 km · 14 Mar 2027 · 06:00 WIB                        │  │
│  │ 4 categories · Capacity 5,000                          │  │
│  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  │
│  │ Participants in this race        [ − ]   2   [ + ]          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Full Marathon                            Rp403.000    │  │
│  │ 42.195 km · 14 Mar 2027 · 04:30 WIB                    │  │
│  │ 4 categories · Capacity 3,000                          │  │
│  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  │
│  │ Participants in this race        [ − ]   0   [ + ]          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       2 participants · Rp420.000                    [ Continue ]
```

**Content per race card**

- Race name, distance, start date and time in the **event's** timezone, category count, capacity.
- Fee, right-aligned with tabular numerals.
- A subtle dashed divider before the quantity row.
- Stepper buttons are at least 44×44px on mobile. `−` is disabled at zero; `+` is disabled when
  the order is at `maxParticipantsPerOrder` or the race is not published.
- The count is an `<output aria-live="polite">`.
- The card header badge shows the participant cap. When the cap is reached, the step shows a
  max-reached alert.
- If a race has no categories, do not show it (data problem; log in development).

**Behaviors**

- Adding a race appends a participant draft with default values (`nationality: "Indonesian"`, empty
  name/gender/birth date/category).
- Removing a race removes the last participant for that race. If that participant has entered data, show an
  `AlertDialog` first: "Remove this participant? Their details will be lost."
- Preset valid race: skip this step and open Step 2 with one participant and a chip reading
  "1 race · 10K Heritage · Change".
- `maxParticipantsPerOrder === 1`: replace the stepper with a single "Choose" button per card;
  choosing advances to Step 2.
- No published races: empty state "No races are open for registration right now" + organizer
  contact.

**What this step deliberately does not ask**

- No category, no names, no contact details. The buyer can see the price and commit to a race
  before doing any data entry.

### 5.3 Step 2 — Participants

```
┌──────────────────────────────────────────────────────────────┐
│  Participant details                                         │
│  Add each participant's details. You can edit them before    │
│  checkout.                                                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [1]  Sari Dewi                 10K Heritage   Complete │  │
│  │      Female Open · Rp210.000                     Edit  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [2]  Participant 2                 5K Sunrise    Needs info │  │
│  │                                                         │  │
│  │  First name              Last name                      │  │
│  │  [________________]      [________________]             │  │
│  │                                                         │  │
│  │  Gender                                                │  │
│  │  ( ) Male    (•) Female                                 │  │
│  │                                                         │  │
│  │  Date of birth                                          │  │
│  │  [ 12 / 05 / 1994 ]   Age on race day: 32               │  │
│  │                                                         │  │
│  │  Nationality                                            │  │
│  │  [ Indonesian                                        ▾ ]│  │
│  │                                                         │  │
│  │  Category                                               │  │
│  │  [ Female Open — 18–39 on race day                   ▾ ]│  │
│  │  Set from gender and age.                               │  │
│  │                                                         │  │
│  │  Bib name (optional)                                    │  │
│  │  [ SARI                                       ] 4/16   │  │
│  │                                                         │  │
│  │  [ Save participant ]                         [ Remove ]     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│    + Add another participant (2 of 4 used)                       │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
└──────────────────────────────────────────────────────────────┘
     2 participants · Rp420.000              [ Continue to checkout ]
```

**Card anatomy**

- **Collapsed (complete):** index badge, participant name, race · category, fee, "Complete" badge, and
  an Edit action. This is the default state for a saved participant.
- **Collapsed (incomplete):** index badge, "Participant N", race, "Needs info" badge in the warning
  tone. Clicking anywhere on the header expands it.
- **Expanded:** the form fields above, plus Save and Remove actions.
- Only one card is expanded at a time. Saving a valid card collapses it and expands the next
  incomplete card. The last card can stay expanded.
- The header is a button with `aria-expanded` / `aria-controls`; the chevron rotates. Focus stays
  on the header after collapsing.
- The "Add another participant" dashed card:
  - Disabled at the cap, with "4 of 4 participants used" text.
  - When clicked, opens a compact race picker sheet (or adds directly when the event has only one
    race), appends a participant, and expands its card. This keeps the buyer in context while preserving
    one source of truth for race quantities.

**Fields (in order)**

| Field | Required | Notes |
| --- | --- | --- |
| First name | Yes | Trim; 1–80 chars. Do not restrict scripts. `autoComplete="given-name"`. |
| Last name | Yes | Trim; 1–80 chars. `autoComplete="family-name"`. |
| Gender | Yes | Male / Female radio cards. Used for category eligibility. |
| Date of birth | Yes | Native `input[type=date]`; max today, min 1900-01-01. Show "Age on race day: N". |
| Nationality | Yes | `Select`, default Indonesian, with common nationalities + "Other" → text input. |
| Category | Yes | Auto-selected from gender + age; changeable only when more than one category is eligible. |
| Identity number | Config | Only shown when `identityNumberRequired`. Label "Identity number", help "KTP or passport." |
| Bib name | No | Max 16 chars, uppercase display, "Use first name" shortcut, live counter. |
| Emergency contact name | Config | Per participant; shown when `emergencyContactRequired`. |
| Emergency contact phone | Config | Per participant; validated with the same phone rule. |

Per-participant email and phone are intentionally **not** collected. One order contact covers the
order; the organizer's participant model can derive the participant's contact from the order in a
real backend. Emergency contact is the exception: it is collected per participant because each
participant may have a different person to call on race day.

**Smart behavior**

- **Age on race day**, not today. Compute from the race start date (`race.startTime` date part),
  using UTC date arithmetic to avoid timezone drift.
- **Category suggestion.** When gender and birth date are both valid, find categories where the
  gender matches (or is `mixed`/`open`) and the age falls within `minAge`–`maxAge` on race day.
  - Exactly one eligible → set it and show the rule as helper text.
  - More than one eligible → keep the current value if eligible; otherwise set the first and
    announce the change with `aria-live`.
  - None eligible → clear the category, show "No category matches this age and gender. Check the
    date of birth or contact the organizer.", and block saving.
  - Preset category ineligible → keep it visible with an inline error until the participant's details
    make it eligible or the buyer changes it. Never silently discard a shared link's choice.
- **Name → bib name shortcut.** "Use first name" fills the bib name with the participant's first name,
  uppercased, truncated to 16 characters.
- **Validation on blur**, clear on change. The Save button validates the whole card and focuses the
  first invalid field.
- **No copy-from-previous in v1.** Family members often share a last name, but auto-copying
  demographic data risks errors. Revisit after usability testing.

**Step-level validation**

- All participant cards must be valid before Checkout.
- The "Continue to checkout" button validates every card. On failure:
  - Expand the first invalid card and focus the first invalid field.
  - Show an error summary above the list: "2 things to fix before checkout" with links such as
    "Participant 2 · Date of birth".
  - Mark collapsed invalid cards with "Needs info".
  - Announce the summary through `aria-live`.

### 5.4 Step 3 — Checkout

```
┌──────────────────────────────────────────────────────────────┐
│  Checkout                                                    │
│                                                              │
│  YOUR ORDER                                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 1  Sari Dewi   10K Heritage · Female Open  Rp210.000   │  │
│  │ 2  Budi Santoso 5K Sunrise · Male Open     Rp180.000   │  │
│  │ ────────────────────────────────────────────────────── │  │
│  │ 2 participants                                  Rp390.000   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  CONTACT DETAILS                                             │
│  Email              [__________________________________]      │
│  Phone              [__________________________________]      │
│  We'll send the confirmation and race updates here.          │
│                                                              │
│  CONSENT                                                     │
│  [ ] I agree to the race rules and terms.                    │
│  [ ] I confirm every participant is medically fit to take part.   │
│  [ ] I agree to the privacy policy and data processing.      │
│  [ ] Send me event updates and photos (optional).            │
│                                                              │
│  NEXT                                                        │
│  You'll confirm the demo payment on the next step.          │
│                                                              │
│  [ Continue to payment ]                                     │
└──────────────────────────────────────────────────────────────┘
     2 participants · Rp390.000        [ Continue to payment ]
```

**Order review first.** The buyer sees exactly what they are buying before entering contact
details. Each line has an Edit action that returns to Step 2 and expands that participant. The review is
inline, not a separate step.

**Contact details**

- One email and one phone for the whole order.
- `type="email"`, `autoComplete="email"`; `type="tel"`, `inputMode="tel"`, `autoComplete="tel"`,
  help "Include your country code."
- Validate format, not deliverability. No email is sent in the demo.

**Consents**

- Three required checkboxes: race rules/terms, medical fitness, privacy/data processing.
- One optional checkbox for event updates/photos, unchecked by default.
- The red-flag pattern is a checkbox in the destructive state with `aria-invalid` and an inline
  error, not a toast.
- There are no legal pages in the demo. Use short plain-language labels and a note that the consent
  copy is a demo placeholder. Before production, replace with reviewed legal text and links.

**Continue to payment**

- The checkout CTA validates the contact details and consents, then moves to Step 4.
- It does not submit the order. The final `Complete registration` action lives on the payment step.
- Payment is a placeholder for the future provider integration; see 5.5.

### 5.5 Step 4 — Payment (placeholder)

```
┌──────────────────────────────────────────────────────────────┐
│  Payment                                                     │
│  This is a demo payment step. No payment will be taken.     │
│                                                              │
│  YOUR ORDER                                                  │
│  Participant 1  10K Heritage · Female Open     Rp210.000     │
│  Participant 2  5K Sunrise · Male Open         Rp180.000     │
│  ────────────────────────────────────────────────────────── │
│  Total                                         Rp390.000     │
│                                                              │
│  PAYMENT                                                     │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│    Payment provider placeholder                              │
│    QRIS, virtual account, and card payments will be          │
│    connected here. This demo does not take payment.         │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│  Demo checkout — no payment is taken and nothing is saved.  │
│                                                              │
│  [ Complete registration ]                                   │
└──────────────────────────────────────────────────────────────┘
     2 participants · Rp390.000        [ Complete registration ]
```

- The step shows the order lines and total again, then a bordered placeholder panel. There are no
  card fields, QRIS selection, or "Pay" wording, so the demo never implies a real charge.
- The placeholder is intentionally a visual/structured stub for a future provider integration.
- `Complete registration` is `type="submit"`.
- Validate the whole form. On success: disable inputs, show a spinner on the CTA, wait ~800ms to
  mimic a checkout, then navigate to the confirmation route.
- Generate a demo order number client-side, e.g. `ORD-7K3Q2A` (no PII, no persistence).
- Build `entry` query parameters from each participant: `entry=${raceId}~${categoryId}` (repeatable).
- Wrap navigation in `try/catch`; on failure, show an inline `Alert` with a retry action. No toast
  as the only error surface.
- Focus and announce the error summary if validation fails. If a participant or checkout field is
  invalid, move back to the relevant step and show its summary.

### 5.6 Confirmation

The existing route stays: `/e/[eventSlug]/register/success/[orderNumber]`.

```
┌──────────────────────────────────────────────────────────────┐
│                     ✓  Registration received                 │
│                  Demo confirmation                           │
│                  Borobudur Heritage Run 2027 · 13–14 Mar     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  ORDER  ORD-7K3Q2A                            [ Copy ]  │  │
│  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  │
│  │  Participant 1   10K Heritage · Female Open     Rp210.000   │  │
│  │  Participant 2   5K Sunrise · Male Open         Rp180.000   │  │
│  │ ────────────────────────────────────────────────────── │  │
│  │  Total                                     Rp390.000   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  What happens next                                           │
│  Nothing is emailed, charged, or stored in this demo.       │
│  Refreshing returns to the demo data.                        │
│                                                              │
│  [ Share event ]  [ Register another order ]  [ Gallery ]    │
└──────────────────────────────────────────────────────────────┘
```

- Keep one line per participant with "Participant N" numbering so the buyer can match the receipt to the
  wizard. Do not collapse identical entries.
- If `entry` parameters are missing or invalid (direct visit), show a safe empty state: "This demo
  receipt has no order lines" + "Register" and "View event gallery" actions. Do not show a Rp0
  total as if it were a real order.
- Add a "Copy" action for the order number using `navigator.clipboard` with a toast fallback.
- Keep `noindex, nofollow`.
- Keep "Share event", "Register another order", "View gallery". Add "View results" only if the
  event has published results.
- No participant names or contact details in the URL. This is the accepted trade-off from the
  public app plan: the receipt is package-level, not a personal profile.

### 5.7 Closed and upcoming states

Replace the current single "closed" card with three phases (`getRegistrationPhase`):

| Phase | Condition | Content |
| --- | --- | --- |
| Upcoming | now < `registrationStartAt` | "Registration opens {date}" + "Opens in N days" (no live countdown) + gallery/results links + share. |
| Open | within window and event published/ongoing | Wizard. |
| Closed | now > `registrationEndAt`, or event draft/cancelled, or no published races | "Registration closed {date}" + organizer contact + gallery/results links + share. |

- Show the registration window in the event timezone.
- Offer the organizer's public email/phone when available (`getOrganizationById`). Do not invent a
  contact link.
- Keep the card centered, with an icon in a muted circle, a clear title, one explanation sentence,
  and at most two actions.

---

## 6. State model

One typed draft lives in a single client component. No persistence.

```ts
type RegistrationStep = "races" | "participants" | "checkout" | "payment"

type ParticipantDraft = {
  /** Stable key for React and field arrays. */
  id: string
  raceId: string
  firstName: string
  lastName: string
  gender: "male" | "female" | ""
  birthDate: string // YYYY-MM-DD
  nationality: string
  categoryId: string
  identityNumber: string
  bibName: string
  emergencyContactName: string
  emergencyContactPhone: string
}

type RegistrationDraft = {
  step: RegistrationStep
  participants: ParticipantDraft[]
  contact: { email: string; phone: string }
  consents: {
    terms: boolean
    medical: boolean
    privacy: boolean
    updates: boolean
  }
}
```

Derived values (never stored):

- `participantsByRace`: count of participants per `raceId`.
- `total`: sum of `config.races.find(r => r.race.id === participant.raceId).fee`.
- `completedParticipants`: participants that pass `participantSchema`.
- `maxReached`: `participants.length >= config.maxParticipantsPerOrder`.

**Libraries**

- `react-hook-form` + `zodResolver` for the form. Use a single `useForm<RegistrationDraft>` at the
  wizard level, `FormProvider`, and `useFieldArray` for `participants`.
- `trigger` validates the current step's field paths; the final `handleSubmit` validates the whole
  schema.
- If `useFieldArray` + auto-category logic becomes harder to read than plain state, fall back to a
  `useReducer` with the same draft shape. Readability wins. Do not mix both.

**Preset initialization**

```ts
const initialParticipants =
  initialRaceId && raceExists(initialRaceId)
    ? [createEmptyParticipant(initialRaceId, initialCategoryId)]
    : []

const initialStep: RegistrationStep = initialParticipants.length ? "participants" : "races"
```

`initialCategoryId` is applied only if it belongs to `initialRaceId`; otherwise the card starts
with no category and the eligibility logic fills it.

---

## 7. Validation rules

Create schemas in `features/public-registration/schema.ts` with a factory that closes over
`PublicRegistrationConfig`:

```ts
createRegistrationSchema(config)

participantSchema // per participant, including emergency contact
contactSchema // email, phone
consentSchema // required consents
```

| Field | Rule |
| --- | --- |
| `raceId` | Must exist in `config.races` and the race must be `published`. |
| `firstName`, `lastName` | Trimmed, non-empty, max 80. Allow any script. |
| `gender` | `male` or `female`. Required. |
| `birthDate` | Valid date, not in the future, not before 1900-01-01. Must produce an eligible age on race day. |
| `nationality` | Non-empty, max 56. |
| `categoryId` | Must belong to the participant's race and match gender and age on race day. |
| `identityNumber` | Required only when `config.identityNumberRequired`; 6–24 chars, letters/digits/hyphen. |
| `bibName` | Optional, max 16 after trim. |
| `emergencyContactName` | Required per participant when `config.emergencyContactRequired`, max 80. |
| `emergencyContactPhone` | Required per participant when configured; same phone rule. |
| `email` | Valid email, max 254, trimmed. |
| `phone` | 8–20 digits after removing spaces/hyphens/parentheses; optional leading `+`. |
| `consents.terms` | Must be true. |
| `consents.medical` | Must be true. |
| `consents.privacy` | Must be true. |
| `consents.updates` | Optional boolean. |

Cross-field checks:

- Participant count ≥ 1 and ≤ `maxParticipantsPerOrder`.
- All participants have a valid race and category.
- Emergency contact is validated per participant when the event requires it.
- No duplicate participant identity is blocked; twins and same-name family members are legitimate.
- Do not validate email deliverability, phone carrier, or identity number checksums in the demo.

**Error ordering:** field order in the card, then participant order, then checkout sections. The error
summary lists at most five items and summarizes the rest ("and 2 more").

---

## 8. Category eligibility

Put the logic in pure helpers so it can be reasoned about and reused in the participant card, review,
and receipt:

```ts
getAgeOnDate(birthDate: string, date: string): number
getEligibleCategories(
  participant: Pick<ParticipantDraft, "gender" | "birthDate">,
  race: Race,
  categories: RaceCategory[]
): RaceCategory[]
isCategoryEligible(participant, category, race): boolean
```

Rules:

- Age is calculated on the race start date, not today. A participant who turns 18 before race day is
  eligible for an 18+ category.
- Gender matches exactly, or the category is `mixed` / `open`.
- Age is inclusive of `minAge` and `maxAge`.
- If the category list is empty, the race is not offered.
- If no category is eligible, the participant cannot be saved and the message suggests checking the
  birth date or contacting the organizer.
- The category is shown as a normal select when more than one option is eligible, and as a
  read-only value with the rule when only one is eligible. This avoids a pointless dropdown.
- Changing gender or birth date re-evaluates the current category:
  - Still eligible → keep it.
  - Now ineligible → keep the buyer's selection visible, show an inline warning, and offer a
    "Use {suggested category}" action. Never silently overwrite a preset or a manual choice.
  - None eligible → show the no-category error and block the participant.

**Model note:** the demo data only has `male` and `female` categories. If the product wants a
self-described gender or a non-binary category, the data model and category rules need a separate
decision. Do not fake it in the UI.

---

## 9. Component and file plan

```
apps/web/features/public-registration/
├─ index.ts
├─ registration-wizard.tsx        # "use client"; form + step state + submit
├─ step-indicator.tsx             # mobile progress + desktop stepper
├─ race-step.tsx                  # race cards + quantities
├─ race-option-card.tsx           # one race card + stepper
├─ participant-step.tsx           # accordion list + add another
├─ participant-card.tsx           # collapsed/expanded participant form + category + emergency contact
├─ checkout-step.tsx              # review, contact, consents, continue to payment
├─ payment-step.tsx               # placeholder payment step + final submit
├─ order-summary.tsx              # line items, total, sticky bar, mobile "View order" sheet
├─ schema.ts                      # Zod factory, eligibility helpers
├─ types.ts                       # RegistrationDraft, ParticipantDraft, step
└─ constants.ts                   # steps, nationalities, consent labels
```

Keep components small and purposeful. The wizard owns state and navigation; child components
receive values and callbacks. Shared UI primitives come from `@workspace/ui`. Add missing shadcn
components with the CLI:

- No new primitive is required for gender: two native radio inputs styled as cards inside
  `FieldSet` / `FieldLegend` are keyboard accessible and avoid another dependency.
- `sheet` is already installed (order summary and the add-participant picker).
- `collapsible` is already installed (participant cards).
- `alert-dialog` is already installed (remove participant confirmation).
- `progress` is already installed (mobile step progress).

Do not hand-write primitives.

### Page wiring

`apps/web/app/e/[eventSlug]/register/page.tsx`:

- Keep the existing preset parsing and metadata.
- Compute `initialRaceId` / `initialCategoryId` server-side only when valid.
- Pass `config`, `eventSlug`, and the initial IDs to `<RegistrationWizard />`.
- Keep the closed/upcoming branch, but use `getRegistrationPhase`.
- Ensure the client receives only serializable data.

### Data-layer changes

- **Filter published races** in `getPublicRegistrationConfig` (`race.status === "published"`).
  Closed/draft races must never be offered. Treat zero published races as closed.
- Add `getPublicRegistrationPhase(event, now?)` returning `upcoming | open | closed`, or compute
  the phase in the page from the event dates. Prefer the shared helper for consistency with
  `isPublicRegistrationOpen`.
- Keep `registrationOpen` for existing callers; derive it from the phase.
- **Timezone formatting:** `formatDateTime` in `apps/web/lib/format.ts` hardcodes
  `Asia/Jakarta`. Add an optional `timeZone` argument and a `timeZoneLabel` helper
  (`Asia/Jakarta → WIB`, `Asia/Makassar → WITA`, `Asia/Jayapura → WIT`). Race cards and checkout
  must use the event's timezone. Existing callers keep the Jakarta default.
- The client must use **type-only imports** from `@workspace/demo-data` so fixtures are not pulled
  into the browser bundle. Fees and categories come from the serialized `config`.

### Success page

Update `apps/web/app/e/[eventSlug]/register/success/[orderNumber]/page.tsx`:

- Group repeated entries by `raceId~categoryId` for readable lines, with Participant N labels.
- Add the copy-order-number action.
- Add the empty/missing-entry safe state.
- Keep the existing demo note and actions; add results only when published.
- Keep the race-card visual language used in step 1.

---

## 10. Accessibility

- **Step changes:** move focus to the step heading (`tabIndex={-1}`) and scroll the wizard into
  view. The step indicator uses `aria-current="step"` and a list, not tabs.
- **Accordion:** each participant header is a button with `aria-expanded` and `aria-controls`; the panel
  has a labelled region. Only one panel open at a time. "Needs info" is text plus an icon, never
  color alone.
- **Stepper:** each button has an accessible name ("Add a participant to 10K Heritage", "Remove a
  participant from 10K Heritage"). The count is an `<output aria-live="polite">`. Buttons are at least
  44×44px on mobile.
- **Forms:** visible labels for every field; `aria-invalid` and `aria-describedby` for errors and
  help text; errors are inline and also summarized in a linked `Alert` at the top of the step.
- **Radio group:** `<fieldset>` + `<legend>` via `FieldSet` / `FieldLegend`, keyboard arrow
  navigation.
- **Consents:** checkbox plus a real label; required checks use `aria-invalid` and an inline error,
  not a toast.
- **Sticky bar:** it must not cover the focused field. Add `scroll-margin-bottom` to fields and
  enough bottom padding to the page. The bar is a labelled region; the total is announced when it
  changes (polite).
- **Sheet:** focus trap, Escape to close, focus returns to "View order" (handled by the primitive).
- **Motion:** respect `prefers-reduced-motion` for accordion and progress transitions.
- **Contrast:** use semantic tokens; status tones have text labels.
- **Keyboard:** complete the entire flow without a pointer at 375px.

---

## 11. Responsive behavior

| Breakpoint | Behavior |
| --- | --- |
| < 640px | Single column; race price under the race name or top-right; full stepper row; sticky bar full-width; order sheet; 44px targets. |
| 640–1023px | Single column at `max-w-3xl`; two-column name fields; full step indicator; sticky bar with inline CTA. |
| ≥ 1024px | Same `max-w-3xl` column for alignment with the event header; comfortable spacing; sticky bar centered within the column. No right rail, to keep the shared header and footer aligned. |

- Do not introduce horizontal scrolling.
- Use `env(safe-area-inset-bottom)` on the sticky bar.
- Participant cards, race cards, and the review stack naturally; no card grid for races (a grid would
  make quantities harder to scan).

---

## 12. Content and microcopy

Use **participant** consistently in the public UI and in code/types. It matches the organizer
domain model and the event's `maxParticipantsPerOrder` configuration.

Suggested copy:

| Context | Copy |
| --- | --- |
| Intro | "One race per participant. Up to 4 participants per order. No account needed." |
| Races heading | "Choose your races" |
| Races helper | "You'll add each participant's details next." |
| Max reached | "You've reached the maximum of 4 participants. Complete this order or start a new one." |
| Participants heading | "Participant details" |
| Add another | "Add another participant (2 of 4 used)" |
| Participant incomplete | "Needs info" |
| Save | "Save participant" / "Save and next participant" |
| Checkout heading | "Checkout" |
| Review heading | "Your order" |
| Contact help | "We'll use this for the confirmation and race-day updates." |
| Emergency help | "Per participant. Used by race medical staff only." |
| Demo note | "Demo checkout — no payment is taken and nothing is saved." |
| Checkout submit | "Continue to payment" |
| Payment heading | "Payment" |
| Payment placeholder | "Demo placeholder — no real payment is processed." |
| Payment submit | "Complete registration" |
| Confirmation title | "Registration received" |
| Confirmation note | "Nothing is emailed, charged, or stored in this demo." |
| Upcoming | "Registration opens 1 December 2026." |
| Closed | "Registration closed on 20 February 2027." |

Avoid: "Submit", "Proceed", "Transaction", "Pay now", "Only X spots left!" (unless
inventory is real). Use sentence case and plain language.

---

## 13. Analytics and privacy

Reuse the public app's analytics wrapper and consent gate when it lands. The registration page does
not call an analytics vendor yet; this section is the event contract for that integration. Do not
send PII.

| Event | Properties |
| --- | --- |
| `registration_step` | `step`, `participantCount` |
| `registration_race_added` | `raceId`, `raceCount` |
| `registration_participant_saved` | `participantIndex`, `hasIdentity`, `categoryCode` |
| `registration_validation_error` | `step`, `fieldNames` (names only, not values) |
| `registration_submitted` | `participantCount`, `raceIds`, `total` |
| `payment_step_viewed` | `participantCount`, `total` |

Privacy requirements:

- No names, birth dates, identity numbers, email, phone, or category-gender combinations tied to a
  person in analytics.
- No PII in the confirmation URL. Only `raceId~categoryId` entries.
- No localStorage/sessionStorage for participant data.
- No form values in console logs or error reports.
- Use proper `autoComplete` values so browser autofill works without the app storing anything.
- Do not send the order number to analytics.
- The payment step is a placeholder; no payment data, provider reference, or payment status exists
  to send.

---

## 14. Edge cases and states

| Case | Behavior |
| --- | --- |
| Unknown event slug | `notFound()`. |
| Registration upcoming | Phase card, exact opening date, no form. |
| Registration closed | Phase card, exact closing date, organizer contact, gallery/results/share. |
| Event draft/cancelled | Closed phase; no form. |
| No published races | Closed/empty state: "Registration isn't available right now." |
| One participant maximum | No steppers; single-select race cards; no "Add another participant". |
| Max reached | `+` and "Add another participant" disabled with explanatory text. |
| Zero races at step 1 | CTA disabled; helper "Choose at least one race to continue." |
| Removing a participant with data | `AlertDialog` confirmation; explain the data loss. |
| Removing a participant without data | Immediate removal. |
| Preset race invalid | Ignore; open Step 1. |
| Preset category invalid/ineligible | Keep visible in the card with an inline error; offer eligible options. |
| Category has no eligible option | Block the participant; suggest checking birth date or contacting the organizer. |
| Participant under minimum age | Same as above; show the age on race day. |
| Identity number required | Field appears; validation enforces it. |
| Emergency contact not required | Fields hidden in each participant card (not shown as optional). |
| Payment step | Placeholder only; no payment fields; `Complete registration` finishes the demo. |
| Multiple participants, one incomplete | "Continue" expands the incomplete card and shows the error summary. |
| Direct visit to success URL with no entries | Safe empty receipt state. |
| Refresh mid-wizard | Data is lost by design; show no crash or partial state. Add a small note on the payment step: "This demo doesn't save drafts." |
| Browser back from success | Returns to a fresh registration page; the success page remains reachable via history. Acceptable for the demo. |
| Submission | Simulated delay; disabled inputs; spinner; inline error with retry on failure. |
| Reduced motion | No transitions; step changes still focus and scroll. |

---

## 15. Delivery plan

| Phase | Estimate | Outcome |
| --- | --- | --- |
| **R0 — Foundations** | 0.5 day | Feature folder, types, Zod schema factory, category/age helpers, step shell, sticky bar, page wiring, published-race filter, timezone formatter. |
| **R1 — Races** | 0.75 day | Race cards, steppers, caps, presets, single-participant mode, empty/closed states. |
| **R2 — Participants** | 1.5 days | Accordion cards, conditional fields, category auto-selection, validation, error summary, add/remove. |
| **R3 — Checkout, payment & confirmation** | 1.25 days | Review, contact, per-participant emergency contact, consents, placeholder payment step, simulated submit, receipt grouping, copy order number, empty receipt. |
| **R4 — Polish & QA** | 1 day | Accessibility, responsive, light/dark, analytics hooks, copy, build/lint/typecheck, demo walkthrough. |

**Total:** ~5 days, including the placeholder payment step.

Suggested order of review:

1. Review the race/category decision and the four-step flow (this document).
2. Review the participant fields and conditional requirements.
3. Review the wireframes at 375px.
4. Then implement R0–R4.

---

## 16. Acceptance criteria

1. A shared `/register?race=10k-heritage&category=female-open` link opens Step 2 with one race
   preselected and the category prefilled when eligible.
2. A buyer can add up to the event's limit, see the total update immediately, and complete the
   order with one contact and a per-participant emergency contact.
3. On Borobudur (limit 4), adding four participants works; a fifth is blocked with a clear message.
4. On Rinjani (limit 1), no "Add another participant" or stepper is shown, and identity number is
   required.
5. Only one participant card is expanded at a time; a saved participant collapses to a one-line summary.
6. Going back preserves every value; going forward validates only the current step.
7. Category options are limited by gender and age on race day; an ineligible preset is explained,
   not silently dropped.
8. No eligible category blocks the participant with a clear, actionable message.
9. Identity number and per-participant emergency contact appear only when their config flags are
   true.
10. Validation errors are summarized, linked, announced, and focus the first invalid field.
11. The total is visible on every step; the payment step is a placeholder and no payment is
    requested; the demo note is visible.
12. The confirmation shows the order number, grouped race/category lines, participant numbering, total,
    and actions; the URL contains no PII.
13. Upcoming, closed, draft, and no-published-race states show the correct phase and dates.
14. The flow is keyboard-completable at 375px, with visible focus, 44px targets, and no horizontal
    scroll.
15. Light and dark mode both pass contrast and status-legibility checks.
16. `pnpm --filter web lint`, `pnpm --filter web typecheck`, and `pnpm --filter web build` are
    clean.
17. No demo-data fixture module is imported into the client bundle except types.
18. Emergency contact is collected inside each participant card, not at checkout.
19. The payment step shows the order total, a provider placeholder, and a working `Complete
    registration` action, with no real payment fields.

---

## 17. Open decisions

1. **Category placement.** Recommended: a race-only first step with per-participant category (this plan).
   Alternative: race × category entries, which adds a category selector to step 1 and more rows.
2. **Gender options.** The demo model only supports male/female. Do we need a self-described
   option or a non-binary category before launch? This needs a product/legal decision, not a UI
   workaround.
3. **Nationality input.** Recommended: curated `Select` + "Other" text input. Alternative: free-text
   input with a datalist.
4. **Confirmation personalization.** The privacy rule forbids names in the URL, so the receipt
   cannot show participant names after a refresh. Keep the current package-level receipt, or add a
   future backend-backed order lookup? Recommended: keep package-level for the demo.
5. **Payment presentation.** Recommended: the placeholder provider panel implemented here, with no
   fake method selector. Confirm this is acceptable for the walkthrough.
6. **Closed-state contact.** Should the public page show the organizer's email/phone? The demo data
   has it, but a public-contact policy should be agreed first.
7. **Analytics vendor and consent banner.** Still open from the public app plan; the wizard should
   call the wrapper, not a vendor directly.

---

## 18. Follow-ups (not in this plan)

- Real payment, order persistence, and email/SMS delivery.
- Participant accounts, saved participants, and registration history.
- Waitlists and real inventory/remaining-spot counts.
- Legal review of consent and privacy copy.
- A backend-backed confirmation that can show participant names without putting PII in the URL.
- Reusable `EventHeader` width variants if the registration page ever needs a wider layout.
- Timezone-aware formatting across the rest of the public app (`formatDateTime` currently defaults
  to Jakarta for every event).

---

## 19. Implementation notes (2026-11-10)

- Implemented in `apps/web/features/public-registration` and wired into
  `app/e/[eventSlug]/register/page.tsx`.
- The open-registration page wraps the wizard in a `Card` with a `CardHeader` (title, deadline,
  share menu, badges) and `CardContent`, matching the gallery and certificate pages. The card is
  `overflow-visible` so the sticky order bar keeps working.
- Added `getPublicRegistrationPhase` and filtered published races in
  `getPublicRegistrationConfig`.
- Added timezone-aware `formatDateTime`, `formatRaceStart`, `timeZoneLabel`, and `formatCount`.
- The success page now has a copy-order-number action, per-participant receipt lines, and a safe empty
  state.
- Payment is a separate placeholder step (`payment-step.tsx`) with the order lines, total, a
  provider placeholder, and the final `Complete registration` action. No payment fields or provider
  integration exist yet.
- Emergency contact is collected per participant inside `participant-card.tsx`; the shared
  checkout field was removed. Validation and the participant completion badge include both fields
  when `emergencyContactRequired` is true.
- Verified end-to-end at a 375px viewport with headless Chrome: two races → two participant cards
  (with per-participant emergency contacts) → checkout → payment → confirmation, with no console
  errors. Also verified the ineligible-preset fallback ("Use Male Open") and the upcoming
  registration state.
- Deferred: analytics wrapper/consent banner (no infrastructure yet), reviewed legal consent copy,
  and results links on the receipt.
