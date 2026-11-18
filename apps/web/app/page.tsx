import type { Metadata } from "next"

import { Faq } from "@/components/marketing/faq"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { FinalCta } from "@/components/marketing/final-cta"
import { Hero } from "@/components/marketing/hero"
import { HowItWorks } from "@/components/marketing/how-it-works"
import { MarketingShell } from "@/components/marketing/marketing-shell"
import { PricingSection } from "@/components/marketing/pricing-section"

const description =
  "Registration, participant management, orders, race-day media, and results in one workspace for race organizers."

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Racetify",
  url: "https://racetify.com",
  logo: "https://racetify.com/icon.svg",
  description,
  email: "hello@racetify.com",
  contactPoint: {
    "@type": "ContactPoint",
    email: "hello@racetify.com",
    contactType: "customer support",
  },
}

export const metadata: Metadata = {
  title: {
    absolute: "Racetify — Race operations software for organizers",
  },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Racetify — Race operations software for organizers",
    description,
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Racetify — Race operations software for organizers",
    description,
  },
}

export default function HomePage() {
  return (
    <MarketingShell>
      <Hero />
      <FeatureGrid />
      <HowItWorks />
      <PricingSection />
      <Faq />
      <FinalCta />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />
    </MarketingShell>
  )
}
