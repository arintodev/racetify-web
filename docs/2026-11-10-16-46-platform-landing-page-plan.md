# Racetify Platform Landing Page — Plan

> **Status:** Implemented (2026-11-10)
> **Owner:** Frontend Tech Lead
> **Date:** 2026-11-10
> **Related:** [Public Web App Plan](./2026-11-10-12-20-public-web-app-plan.md) ·
> [Public Registration UX Plan](./2026-11-10-15-11-public-registration-ux-plan.md) ·
> [Frontend UI Guidelines](./2026-11-10-07-26-frontend-ui-guidelines.md)

This plan replaces the current demo link index at `/` with a simple, informative marketing page for
race organizers. The page introduces the platform, its audience, and its main capabilities. It does
not show any event, race, participant, or demo fixture data.

The page must also be usable as the public-facing website for **Google OAuth branding review** and
**payment gateway registration**. That means clear product copy, contact details, and public terms
and privacy pages.

---

## 1. Current state

- `apps/web/app/page.tsx` is a **demo link index**: it lists registration, gallery, results, and
  certificate links for one demo event.
- The root layout renders the public `SiteHeader` and `SiteFooter` for every page. The header shows
  a **Public demo** badge.
- The shareable surfaces (`/e/[eventSlug]/...` and `/cert/...`) use the event layout with an event
  cover header and a narrow `max-w-3xl` card layout.
- There are no marketing pages, no favicon/app icon, no OG image, no `sitemap.ts`, and no
  `robots.ts`.
- `components/brand.tsx` already provides the Racetify wordmark and flag mark.
- The organizer app runs separately at **app.racetify.com** and has a `/login` route.

The demo index is not suitable for OAuth branding or payment review. It reads as a test page, not a
product website.

---

## 2. Goals and non-goals

### Goals

- Explain what Racetify is, who it is for, and what it does in one page.
- Present a credible, simple marketing surface for organizers.
- Provide a distinct layout and header/footer from the shareable event pages.
- Link to public Terms, Privacy, and Contact pages.
- Satisfy the structural requirements for Google OAuth branding and payment gateway review.
- Stay fast, responsive, accessible, and honest. No inflated claims, fake metrics, or invented
  testimonials.

### Non-goals

- No event/race listing, discovery, or demo event links on the landing page.
- No race photography or event-specific data.
- No real sign-up, billing, or payment flow on the marketing site.
- No customer logos, testimonials, or usage statistics unless real data exists.
- No new backend, CMS, or analytics integration in v1.
- No replacement for the organizer app at app.racetify.com.

---

## 3. Audience and positioning

**Primary audience:** race organizers, race directors, event operations teams, and media/photo
partners working with organizers.

**Positioning sentence:**

> Racetify is a race operations platform for organizers. It brings registration, participant data,
> registration orders, race-day media, results, and certificates into one workspace.

**Tone:** factual and calm. Describe capabilities, not superlatives. Avoid “world-class”,
“revolutionary”, “10x”, “trusted by thousands”, and similar claims.

**Primary action:** Request a demo / contact. **Secondary action:** Sign in to the organizer app.

---

## 4. Layout direction — different from the shareable pages

| | Shareable event pages | Marketing landing page |
| --- | --- | --- |
| Shell | Public `SiteHeader` with “Public demo” badge + `SiteFooter` | Dedicated marketing header + footer |
| Width | `max-w-3xl` | `max-w-6xl` / `max-w-7xl` with section rhythm |
| Structure | Event cover header, then one Card | Hero, feature sections, how-it-works, pricing, FAQ, CTA |
| Data | Demo event, race, participant, gallery data | No event or race data |
| Background | Muted event canvas | Neutral page with generous whitespace and hairline dividers |
| Tone | Transactional (register, view, share) | Informative (what it is, who it is for, what it covers) |

The marketing page should feel like a product website, not an event microsite and not a dashboard.
It should not reuse the event cover header or the demo badge.

---

## 5. Information architecture

```
/                       Platform landing page
/terms                  Terms of Service (lorem ipsum placeholder)
/privacy                Privacy Policy (lorem ipsum placeholder)
/refund-policy          Refund Policy (lorem ipsum placeholder, recommended for payment review)
/contact                Contact and support details
/demo                   Optional: preserve the current demo link index for internal review
```

The landing page links:
- **Header:** Product (#features), How it works (#how-it-works), Pricing (#pricing), Contact
- **Header actions:** Sign in → `https://app.racetify.com/login`; Request a demo → `/contact`
- **Footer:** Product links, Contact, Terms, Privacy, Refund Policy
- **Body CTAs:** Request a demo / Sign in

The shareable event URLs stay unchanged.

---

## 6. Page structure and wireframes

### 6.1 Desktop

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Flag] Racetify        Product   How it works   Pricing   Contact       │
│                                            [Sign in]  [Request a demo]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FOR RACE ORGANIZERS                                                    │
│  Race operations software                                               │
│  for organizers.                                                        │
│                                                                         │
│  Registration, participants, orders, race-day media, and results         │
│  in one workspace.                                                      │
│                                                                         │
│  [Request a demo]   [Sign in]                                           │
│                                            ┌─────────────────────────┐  │
│                                            │ Registration            │  │
│                                            │ Participants            │  │
│                                            │ Orders & payments       │  │
│                                            │ Media & results         │  │
│                                            └─────────────────────────┘  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  What Racetify covers                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                     │
│  │ Registration │ │ Participants │ │ Orders       │                     │
│  └──────────────┘ └──────────────┘ └──────────────┘                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                     │
│  │ Race-day     │ │ Results &    │ │ Team access  │                     │
│  │ media        │ │ certificates │ │              │                     │
│  └──────────────┘ └──────────────┘ └──────────────┘                     │
├─────────────────────────────────────────────────────────────────────────┤
│  How it works                                                           │
│  1. Set up the event   2. Open registration   3. Run the race           │
├─────────────────────────────────────────────────────────────────────────┤
│  Pricing                                                                │
│  Plans scale with the size and needs of your event.                     │
│  [Contact us for pricing]                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  FAQ                                                                    │
│  Who is it for? · Does it handle payments? · Multiple events?          │
├─────────────────────────────────────────────────────────────────────────┤
│  See how Racetify fits your next event.                                 │
│  [Request a demo]                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Racetify          Product / Contact / Legal / hello@racetify.com       │
│  © 2026 Racetify                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Mobile

- Sticky marketing header: logo + menu button. The menu opens a `Sheet` with the nav links and
  Sign in / Request demo actions.
- Hero stacks: eyebrow, headline, description, two full-width buttons, then the product preview.
- Feature cards stack in one column; two columns at `sm`.
- How-it-works steps stack.
- Pricing and FAQ stack.
- Footer stacks into groups.

### 6.3 Section specs

**Header**
- Logo (existing `Brand`), nav links, theme toggle, Sign in, Request a demo.
- Sticky, hairline border, backdrop blur. No “Public demo” badge.
- Mobile: accessible `Sheet` menu; focus trap; Escape closes; focus returns to the trigger.

**Hero**
- Eyebrow: “For race organizers”
- H1: “Race operations software for organizers.” (or a close variant)
- Supporting paragraph: one or two sentences about the workspace.
- Primary CTA: Request a demo. Secondary: Sign in.
- Product preview: an HTML/CSS composition of generic organizer modules. No event, race, date,
  participant, or payment fixture data.
- No stock race photography, no gradients-heavy “AI” visuals.

**Features**
- Six compact cards with Lucide icons and one short sentence each:
  - Registration & categories
  - Participant management
  - Orders & payment status
  - Race-day media
  - Results & certificates
  - Team access & roles
- Each description should describe a capability that exists in the organizer app.

**How it works**
- Three steps, each one sentence:
  1. Set up the event — add races, categories, fees, and registration details.
  2. Open registration — share one link and manage participants as they sign up.
  3. Run the race — publish results, share galleries, and issue certificates.

**Pricing**
- No invented prices, plans, or discounts.
- Copy: “Pricing depends on the size of your event and the features you need. Contact us for a
  quote.”
- CTA: Contact us.
- Include a short list of what is included at a high level (registration, participants, media,
  results, team access). Do not imply a self-serve free tier that does not exist.

**FAQ**
- Four to five questions, answered plainly. Suggested:
  - Who is Racetify for?
  - Does Racetify handle registration payments?
  - Can I manage more than one event?
  - Can my team access the workspace?
  - How do I get started?
- Use native `<details>`/`<summary>` or a simple stacked list. No accordion dependency is required.

**Final CTA**
- One sentence and one primary action: Request a demo.
- Optional secondary: Sign in.

**Footer**
- Product: Features, How it works, Pricing
- Company: Contact
- Legal: Terms, Privacy, Refund Policy
- Contact email: `hello@racetify.com` (placeholder; replace with the real support address)
- Copyright: © 2026 Racetify
- No demo links, no “Public demo” badge, no event data.

---

## 7. Copy outline

Use sentence case and plain language. Keep paragraphs short.

| Location | Draft copy |
| --- | --- |
| Meta title | Racetify — Race operations software for organizers |
| Meta description | Registration, participant management, orders, race-day media, and results in one workspace for race organizers. |
| Hero eyebrow | For race organizers |
| Hero title | Race operations software for organizers. |
| Hero body | Racetify brings registration, participant data, orders, race-day media, and results into one workspace, so your team can run the event from a single place. |
| Primary CTA | Request a demo |
| Secondary CTA | Sign in |
| Features heading | What Racetify covers |
| Features intro | The core tools an organizer needs before, during, and after race day. |
| How it works heading | How it works |
| Pricing heading | Pricing |
| Pricing body | Pricing depends on the size of your event and the features you need. Contact us for a quote. |
| FAQ heading | Frequently asked questions |
| Final CTA | See how Racetify fits your next event. |
| Footer note | Race operations for organizers. |

Avoid:
- “The #1 platform”
- “Trusted by thousands of organizers”
- Invented customer logos, testimonials, or review scores
- Claims about features that do not exist in the organizer app
- Event names, race distances, dates, locations, or participant names

---

## 8. Legal pages (lorem ipsum)

### 8.1 Routes and layout

- `/terms` — Terms of Service
- `/privacy` — Privacy Policy
- `/refund-policy` — Refund Policy (recommended for payment review)
- `/contact` — Contact page with support email, a short note, and a mailto action

All legal pages:
- Use the marketing shell (marketing header/footer), not the event shell.
- Use a narrow reading column (`max-w-3xl`) inside the wide marketing layout.
- Show the title, “Last updated: 10 November 2026”, and lorem ipsum body copy.
- Include a visible placeholder note: “Placeholder legal copy for the demo. Replace with reviewed
  legal text before production.”
- Link back to `/` and to the other legal pages.

### 8.2 Terms section headings

1. Introduction
2. Use of the service
3. Accounts and access
4. Event and participant data
5. Orders, fees, and payments
6. Intellectual property
7. Termination
8. Limitation of liability
9. Changes to these terms
10. Contact

Each section gets 1–3 short lorem ipsum paragraphs.

### 8.3 Privacy section headings

1. Introduction
2. Information we collect
3. How we use information
4. Sharing and processors
5. Data retention
6. Security
7. Your rights
8. Cookies and analytics
9. International transfers
10. Contact

Each section gets 1–3 short lorem ipsum paragraphs.

### 8.4 Refund policy headings

1. Scope
2. Organizer fees
3. Participant refunds
4. Cancellations and event changes
5. How to request a refund
6. Contact

Use lorem ipsum for the demo. This page materially improves payment-gateway review because the
reviewer can see a refund policy route.

### 8.5 Important caveat

Lorem ipsum is acceptable as a **structural placeholder for the demo**. It is not acceptable for a
real Google OAuth verification or payment gateway application. Before submitting either, replace
all three legal pages with reviewed copy that reflects the actual business, data practices, fees,
and refund rules. The page structure and links can be reviewed now; the text cannot be treated as
legal policy.

---

## 9. Eligibility checklists

### 9.1 Google OAuth branding consent screen

| Requirement | How this plan satisfies it |
| --- | --- |
| Publicly accessible homepage | `/` is a public marketing page, not a demo index or login wall |
| App name | “Racetify” appears in the header, hero, footer, and metadata |
| App purpose | Hero and features describe a race operations platform for organizers |
| App logo | Upload a 120×120 PNG/JPG brand mark; add an app icon/favicon to the site |
| Privacy policy URL | `https://racetify.com/privacy` |
| Terms of service URL | `https://racetify.com/terms` |
| Authorized domain | `racetify.com`; verify ownership in Google Search Console |
| Support email | A real support address in the footer/contact page (replace the placeholder) |
| Sign-in destination | `https://app.racetify.com/login` |
| Scopes | Keep to basic sign-in scopes (`openid`, `email`, `profile`); do not request sensitive scopes for branding |
| Indexable homepage | Marketing pages are indexable and canonical; no `noindex` |

The existing “Public demo” badge must not appear on the marketing pages. The shareable event pages
can keep it because they are demo surfaces, but `/`, `/terms`, `/privacy`, `/refund-policy`, and
`/contact` must read as the product website.

### 9.2 Payment gateway registration

| Requirement | How this plan satisfies it |
| --- | --- |
| Clear product/service description | Hero, features, and how-it-works sections |
| Target audience | “For race organizers” throughout the hero and copy |
| Pricing or contact-for-pricing | Pricing section with “Contact us for a quote” |
| Terms of service | `/terms` |
| Privacy policy | `/privacy` |
| Refund policy | `/refund-policy` |
| Support contact | `/contact` and footer email; add phone/address when available |
| Honest marketing | No fake metrics, testimonials, logos, or claims |
| Business identity | Must be added before submission (legal name, address, support email/phone) |
| HTTPS and domain | racetify.com with HTTPS |
| Site must not look like a demo | Remove the demo badge and demo link index from `/` |

Payment gateway KYC documents, bank account details, and merchant agreements are outside the scope
of this page. The page provides the public-facing parts reviewers look for.

---

## 10. Architecture and routing

### 10.1 Implemented routing

The public routes stay where they are, and each surface owns its shell through a layout. This
avoids moving the existing `app/e` and `app/cert` directories while still giving marketing pages a
different shell:

```
apps/web/app/
├─ layout.tsx                    # html, body, Providers only
├─ page.tsx                      # landing page (route: /) + MarketingShell
├─ terms/page.tsx                # MarketingShell + LegalPage
├─ privacy/page.tsx
├─ refund-policy/page.tsx
├─ contact/page.tsx
├─ demo/
│  ├─ layout.tsx                 # public SiteHeader/SiteFooter
│  └─ page.tsx                   # noindex demo link index
├─ e/[eventSlug]/layout.tsx     # public SiteHeader/SiteFooter + EventHeader
├─ cert/layout.tsx              # public SiteHeader/SiteFooter
├─ icon.svg                      # placeholder app icon (replace manually)
├─ opengraph-image.tsx           # brand-only OG image
├─ not-found.tsx                 # Brand + Back to home
├─ error.tsx                     # Back to home
├─ robots.ts
└─ sitemap.ts
```

### 10.2 Root layout changes

- Remove `SiteHeader`/`SiteFooter` from the root layout; keep `<html>`, `<body>`, fonts, and
  `Providers`.
- The public layouts and `MarketingShell` own their `<main>` and footer.
- Update the root metadata default from the public-event description to the platform description.
- The `not-found.tsx` and `error.tsx` render without a shell. They include a `Brand` and a
  “Back to home” action.

### 10.3 Public route layouts

- `app/e/[eventSlug]/layout.tsx` wraps event pages with `SiteHeader`, the event header, and
  `SiteFooter`.
- `app/cert/layout.tsx` and `app/demo/layout.tsx` wrap their pages with the public shell.
- The “Public demo” badge remains on shareable surfaces.

### 10.4 Marketing shell

- `MarketingShell` composes `MarketingHeader`, `<main>`, and `MarketingFooter`.
- Used directly by `/`, `/terms`, `/privacy`, `/refund-policy`, and `/contact`.
- Wide container: `mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8`.
- Section rhythm: generous vertical padding, hairline dividers, no event-card chrome.

### 10.5 Demo index

The old demo link index now lives at `/demo` with `noindex`. It keeps the shareable surfaces easy
to review without appearing on the marketing home page.

---

## 11. Components and files

```
apps/web/components/marketing/
├─ marketing-header.tsx          # server header; nav + actions
├─ marketing-nav.tsx             # client mobile menu (Sheet)
├─ marketing-footer.tsx          # server footer
├─ hero.tsx                      # hero + product preview slot
├─ product-preview.tsx           # CSS-only generic workspace preview
├─ feature-grid.tsx              # six capability cards
├─ how-it-works.tsx              # three steps
├─ pricing-section.tsx           # contact-for-pricing section
├─ faq.tsx                       # native details/summary list
└─ final-cta.tsx                 # closing CTA

apps/web/components/legal/
└─ legal-page.tsx                # shared legal article layout

apps/web/lib/
└─ marketing-content.ts          # nav, features, steps, FAQs, legal headings
```

- Reuse `Brand`, `ThemeToggle`, `Button`, `Card`, `Badge`, `Separator`, and `Sheet` from the
  existing UI package.
- No new primitive library is required. The mobile menu can use the installed `Sheet`.
- The landing page is a server component. Only the mobile menu and theme toggle are client
  components.
- Do not import `@workspace/demo-data` on any marketing route.

---

## 12. Design direction

- **Editorial, not promotional.** Neutral surfaces, strong typography, hairline borders, and clear
  spacing. One accent (primary) for CTAs and small labels.
- **No race photography.** The marketing page should not reuse event covers or gallery photos.
- **Product preview is generic.** Use a restrained CSS composition of module names and neutral
  placeholder bars; no real event, race, date, participant, or payment data.
- **Typography.** Use the existing Geist and Geist Mono fonts. No new font dependency. Use a large
  but controlled headline scale, mono labels for eyebrows, and readable body copy.
- **Color.** Semantic tokens from `packages/ui`; light and dark both work. Avoid decorative
  gradients, glowing orbs, and generic SaaS illustration packs.
- **Motion.** Subtle hover/focus transitions only. Respect `prefers-reduced-motion`.
- **Density.** The landing page should feel informative, not empty. Six features, three steps, a
  short pricing section, and four FAQs are enough.

---

## 13. Metadata, SEO, and assets

**Metadata**
- Root default: “Racetify — Race operations software for organizers.”
- Root description: “Registration, participant management, orders, race-day media, and results in
  one workspace for race organizers.”
- Landing canonical: `/`.
- Legal pages: their own titles/descriptions; indexable; canonical.
- OpenGraph/Twitter: title, description, and a brand-only OG image.

**OG image**
- `app/(marketing)/opengraph-image.tsx` with `next/og`.
- Brand mark, “Racetify”, and the positioning line. No event or race data.
- Fallback: a static brand image if build-time OG generation is not desired.

**Assets**
- Add `app/icon.svg` (or `app/icon.png`) using the existing flag mark so the site has a real
  favicon and app icon.
- Export a 120×120 PNG/JPG brand mark for the Google OAuth consent screen upload.
- Do not use race photos on marketing pages.

**Structured data**
- Add conservative `Organization`/`WebSite` JSON-LD: name, url, logo, contact email.
- Do not add fake ratings, reviews, offers, or event data.

**Crawlability**
- `robots.ts` allows the marketing and legal pages.
- `sitemap.ts` includes `/`, `/terms`, `/privacy`, `/refund-policy`, and `/contact`. Public event
  surfaces can be added separately when the public sitemap work lands.
- Marketing pages must not be `noindex`.

---

## 14. Accessibility, responsive, and performance

- One `h1` on the landing page; section headings in order.
- Skip link to main content.
- Header nav is a list of links with `aria-current` on the active section if anchored.
- Mobile menu: focus trap, Escape closes, focus returns to the trigger.
- Buttons and links have visible focus rings; touch targets at least 44px on mobile.
- Contrast meets WCAG 2.2 AA in both themes.
- The product preview is decorative; hide it from assistive technology or give it a short label.
- Responsive:
  - 375px: single column, stacked hero, one feature column, full-width CTAs.
  - 640px: two feature columns.
  - 1024px: two-column hero with the preview; three feature columns.
  - 1280px+: centered `max-w-6xl`/`max-w-7xl`; no content stretching beyond the container.
- Performance:
  - Static/ISR marketing pages; no demo-data imports.
  - CSS product preview, no large hero image.
  - No client JavaScript beyond the mobile menu and theme toggle.
  - LCP < 2.5s, CLS < 0.1 on mobile.
  - Respect reduced motion.

---

## 15. Analytics and privacy

- No analytics in v1 unless the project’s consent wrapper is ready.
- If analytics are added, use the same consent gate as the public app and never send participant or
  event data. Track only page views and CTA clicks.
- No contact form backend in v1; the Contact page uses a mailto action and a support address.
- The legal pages are placeholders; do not claim regulatory certification.

---

## 16. Delivery plan

| Phase | Estimate | Outcome |
| --- | --- | --- |
| **M0 — Shell and routing** | 0.5–1 day | Route groups, root layout cleanup, marketing header/footer, app icon, `/demo` decision |
| **M1 — Landing content** | 1–1.5 days | Hero, features, how it works, pricing, FAQ, final CTA, copy, responsive layout |
| **M2 — Legal and contact** | 0.5 day | Terms, Privacy, Refund Policy, Contact with lorem ipsum and placeholder note |
| **M3 — Metadata and QA** | 0.5–1 day | OG image, sitemap/robots, JSON-LD, accessibility, keyboard, light/dark, checks |

**Total:** ~3–4 days.

---

## 17. Acceptance criteria

1. `/` is a marketing page: it explains the platform, audience, features, how it works, and pricing
   contact. It contains no event, race, participant, or demo fixture data.
2. The marketing pages use a distinct header/footer from the shareable event pages; no “Public
   demo” badge appears on `/`, `/terms`, `/privacy`, `/refund-policy`, or `/contact`.
3. Shareable event pages still render with the public shell and demo badge, and their URLs are
   unchanged after the route-group move.
4. Header/footer links work: Product anchors, Contact, Terms, Privacy, Refund Policy, Sign in, and
   Request a demo.
5. `/terms`, `/privacy`, and `/refund-policy` render lorem ipsum sections with a clear placeholder
   note; `/contact` provides a support email and mailto action.
6. The page is publicly accessible without login and is indexable.
7. Google OAuth checklist: homepage, app name, app purpose, logo/icon, privacy link, terms link, and
   authorized-domain note are all present.
8. Payment gateway checklist: product description, pricing/contact, terms, privacy, refund policy,
   and support contact are all present; no misleading claims.
9. Responsive at 375px, 768px, and 1440px with no horizontal scroll; keyboard navigation works;
   light/dark modes pass contrast.
10. Metadata, canonical, OG image, `robots.ts`, and `sitemap.ts` are in place.
11. Marketing routes do not import `@workspace/demo-data`.
12. `pnpm --filter web lint`, `pnpm --filter web typecheck`, and `pnpm --filter web build` are
    clean.

---

## 18. Open questions

1. **Demo index.** Move the existing link index to `/demo` (noindex) for internal review, or remove
   it? Recommended: move it so the shareable surfaces remain easy to review.
2. **Business identity.** What legal name, support email, phone, and address should appear in the
   footer/contact page? These are required for real OAuth/payment submissions. Use
   `hello@racetify.com` as a placeholder for now.
3. **Pricing.** Show “Contact us for pricing,” or publish plan tiers? Recommended: contact us,
   because the demo has no real billing model.
4. **Sign-in CTA.** Should the marketing header link to the organizer app’s existing demo login
   (`https://app.racetify.com/login`), or to a waitlist/contact form? Recommended: sign-in link for
   review purposes, with Request a demo as the primary action.
5. **Legal copy.** Lorem ipsum satisfies the page structure but not Google/payment review. Confirm
   that real legal review is planned before submission.
6. **Logo asset.** Is the existing flag mark the final brand mark? If so, export the 120×120 OAuth
   asset and `app/icon.svg`.
7. **Analytics.** Is a consent banner needed on the marketing site in v1, or can analytics be
   deferred entirely?
8. **Public surfaces in the sitemap.** Should the sitemap include the shareable event pages, or only
   the platform and legal pages for now?

---

## 19. Follow-ups (not in this plan)

- Real legal review for Terms, Privacy, and Refund Policy.
- Real business identity and support contacts for OAuth/payment review.
- Analytics with consent.
- A contact form with backend delivery (email or CRM).
- Customer logos, testimonials, or case studies once real material exists.
- Pricing calculator or self-serve plan selection.
- A dedicated `/pricing` page if the pricing section grows.

---

## 20. Implementation notes (2026-11-10)

- `/` now renders the marketing landing page with `MarketingShell`; the old demo index moved to
  `/demo` with `noindex`.
- Public shells are provided by `app/e/[eventSlug]/layout.tsx`, `app/cert/layout.tsx`, and
  `app/demo/layout.tsx`; the root layout is minimal.
- Added `app/terms`, `app/privacy`, `app/refund-policy`, and `app/contact` with lorem ipsum/legal
  placeholder copy and the marketing shell.
- Added `app/icon.svg` and `app/opengraph-image.tsx` as placeholders. The icon/logo and the OAuth
  120×120 asset are intentionally left for manual replacement.
- Added `app/robots.ts` and `app/sitemap.ts` for the marketing and legal pages.
- The landing page does not import `@workspace/demo-data` and contains no event or race data.
- `pnpm --filter web typecheck`, `pnpm --filter web lint`, and `pnpm --filter web build` pass.
