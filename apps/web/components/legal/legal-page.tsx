import Link from "next/link"

import { Badge } from "@workspace/ui/components/badge"

import type { LegalSection } from "@/lib/legal-content"

export function LegalPage({
  title,
  lastUpdated,
  sections,
}: {
  title: string
  lastUpdated: string
  sections: LegalSection[]
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
      <Badge variant="outline">Placeholder legal copy</Badge>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {lastUpdated}
      </p>

      <div className="mt-6 rounded-xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
        This is placeholder copy for the demo. Replace it with reviewed legal
        text before production or before submitting the site for Google OAuth or
        payment gateway review.
      </div>

      <div className="mt-10 flex flex-col gap-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold tracking-tight">
              {section.title}
            </h2>
            <div className="mt-2 flex flex-col gap-3">
              {section.paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-sm leading-7 text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t pt-6 text-sm text-muted-foreground">
        <span>Questions about this page?</span>
        <Link
          href="/contact"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Contact us
        </Link>
        <Link
          href="/"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Back to home
        </Link>
      </div>
    </article>
  )
}
