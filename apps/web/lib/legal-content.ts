const LOREM_PRIMARY =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."

const LOREM_SECONDARY =
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."

export type LegalSection = {
  title: string
  paragraphs: string[]
}

function section(title: string): LegalSection {
  return { title, paragraphs: [LOREM_PRIMARY, LOREM_SECONDARY] }
}

export const termsSections: LegalSection[] = [
  section("1. Introduction"),
  section("2. Use of the service"),
  section("3. Accounts and access"),
  section("4. Event and participant data"),
  section("5. Orders, fees, and payments"),
  section("6. Intellectual property"),
  section("7. Termination"),
  section("8. Limitation of liability"),
  section("9. Changes to these terms"),
  section("10. Contact"),
]

export const privacySections: LegalSection[] = [
  section("1. Introduction"),
  section("2. Information we collect"),
  section("3. How we use information"),
  section("4. Sharing and processors"),
  section("5. Data retention"),
  section("6. Security"),
  section("7. Your rights"),
  section("8. Cookies and analytics"),
  section("9. International transfers"),
  section("10. Contact"),
]

export const refundSections: LegalSection[] = [
  section("1. Scope"),
  section("2. Organizer fees"),
  section("3. Participant refunds"),
  section("4. Cancellations and event changes"),
  section("5. How to request a refund"),
  section("6. Contact"),
]
