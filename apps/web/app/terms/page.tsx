import type { Metadata } from "next"

import { LegalPage } from "@/components/legal/legal-page"
import { MarketingShell } from "@/components/marketing/marketing-shell"
import { termsSections } from "@/lib/legal-content"

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Racetify, a race operations platform for organizers.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <MarketingShell>
      <LegalPage
        title="Terms of Service"
        lastUpdated="10 November 2026"
        sections={termsSections}
      />
    </MarketingShell>
  )
}
