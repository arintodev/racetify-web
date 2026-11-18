import { Card, CardContent } from "@workspace/ui/components/card"

import { features } from "@/lib/marketing-content"

export function FeatureGrid() {
  return (
    <section id="features" className="scroll-mt-20 border-b">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            What Racetify covers
          </h2>
          <p className="mt-3 text-muted-foreground">
            The core tools an organizer needs before, during, and after race
            day.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon

            return (
              <Card key={feature.title} size="sm" className="h-full gap-0 py-0">
                <CardContent className="flex flex-col gap-3 p-5">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
