import Link from "next/link"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import { ProductPreview } from "./product-preview"

export function Hero() {
  return (
    <section className="border-b bg-muted/20">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="outline">For race organizers</Badge>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Race operations software for organizers.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            Racetify brings registration, participant data, orders, race-day
            media, and results into one workspace, so your team can run the
            event from a single place.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              size="lg"
              className="h-11 w-full px-5 sm:w-auto"
              nativeButton={false}
              render={<Link href="/contact" />}
            >
              Request a demo
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 w-full px-5 sm:w-auto"
              nativeButton={false}
              render={<a href="https://app.racetify.com/login" />}
            >
              Sign in
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for race directors, event teams, and media partners.
          </p>
        </div>

        <ProductPreview />
      </div>
    </section>
  )
}
