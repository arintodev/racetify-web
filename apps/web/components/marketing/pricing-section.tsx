import Link from "next/link"
import { Check } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

const included = [
  "Registration and category setup",
  "Participant and order management",
  "Event media, results, and certificates",
  "Team access and permissions",
]

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20 border-b">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-start lg:px-8">
        <div className="max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            Pricing depends on the size of your event and the features you need.
            Contact us for a quote.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            No public plan tiers are published yet. We will confirm the right
            setup for your event before anything is charged.
          </p>
        </div>

        <Card size="sm" className="gap-0 py-0">
          <CardContent className="flex flex-col gap-5 p-6">
            <div>
              <p className="text-sm font-medium">Contact us for pricing</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Tell us about your event and the tools you need. We will get
                back to you with a quote.
              </p>
            </div>

            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-foreground" />
                  {item}
                </li>
              ))}
            </ul>

            <Button
              className="h-10 w-full justify-center"
              nativeButton={false}
              render={<Link href="/contact" />}
            >
              Contact us
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
