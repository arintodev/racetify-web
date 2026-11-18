import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

export function FinalCta() {
  return (
    <section className="bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            See how Racetify fits your next event.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Tell us what you are organizing. We will walk through the workflow
            and answer your questions.
          </p>
        </div>
        <Button
          size="lg"
          className="h-11 px-5"
          nativeButton={false}
          render={<Link href="/contact" />}
        >
          Request a demo
        </Button>
      </div>
    </section>
  )
}
