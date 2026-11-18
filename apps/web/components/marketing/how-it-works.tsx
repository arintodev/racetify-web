import { howItWorks } from "@/lib/marketing-content"

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Set up the event, open registration, and run race day from one
            workspace.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {howItWorks.map((step, index) => (
            <li key={step.title} className="rounded-xl border bg-card p-6">
              <span className="font-mono text-sm text-muted-foreground">
                0{index + 1}
              </span>
              <h3 className="mt-3 font-medium">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
