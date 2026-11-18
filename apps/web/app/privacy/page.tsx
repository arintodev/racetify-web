import type { Metadata } from "next"

import { LegalPage } from "@/components/legal/legal-page"
import { MarketingShell } from "@/components/marketing/marketing-shell"
import { privacySections } from "@/lib/legal-content"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Racetify, a race operations platform for organizers.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <LegalPage
        title="Privacy Policy"
        lastUpdated="10 November 2026"
        sections={privacySections}
      />
    </MarketingShell>
  )
}
