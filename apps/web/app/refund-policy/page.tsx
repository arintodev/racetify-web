import type { Metadata } from "next"

import { LegalPage } from "@/components/legal/legal-page"
import { MarketingShell } from "@/components/marketing/marketing-shell"
import { refundSections } from "@/lib/legal-content"

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Refund Policy for Racetify, a race operations platform for organizers.",
  alternates: { canonical: "/refund-policy" },
}

export default function RefundPolicyPage() {
  return (
    <MarketingShell>
      <LegalPage
        title="Refund Policy"
        lastUpdated="10 November 2026"
        sections={refundSections}
      />
    </MarketingShell>
  )
}
