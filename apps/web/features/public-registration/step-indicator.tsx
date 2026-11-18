"use client"

import { Check } from "lucide-react"

import { Progress, ProgressLabel } from "@workspace/ui/components/progress"
import { cn } from "@workspace/ui/lib/utils"

import { STEP_LABELS, STEP_ORDER } from "./constants"
import type { RegistrationStep } from "./types"

export function StepIndicator({
  step,
  onStepClick,
}: {
  step: RegistrationStep
  onStepClick: (step: RegistrationStep) => void
}) {
  const currentIndex = STEP_ORDER.indexOf(step)

  return (
    <div className="flex flex-col gap-3">
      <div className="sm:hidden">
        <Progress
          value={((currentIndex + 1) / STEP_ORDER.length) * 100}
          aria-label={`Step ${currentIndex + 1} of ${STEP_ORDER.length}`}
        >
          <ProgressLabel>
            Step {currentIndex + 1} of {STEP_ORDER.length} · {STEP_LABELS[step]}
          </ProgressLabel>
        </Progress>
      </div>

      <nav aria-label="Registration progress" className="hidden sm:block">
        <ol className="flex items-center gap-2">
          {STEP_ORDER.map((entry, index) => {
            const isComplete = index < currentIndex
            const isCurrent = index === currentIndex
            const label = STEP_LABELS[entry]

            return (
              <li key={entry} className="flex flex-1 items-center gap-2">
                {isComplete ? (
                  <button
                    type="button"
                    onClick={() => onStepClick(entry)}
                    className="flex items-center gap-2 rounded-md text-sm font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3.5" />
                    </span>
                    {label}
                  </button>
                ) : isCurrent ? (
                  <span
                    aria-current="step"
                    className="flex items-center gap-2 text-sm font-medium text-foreground"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full border-2 border-primary text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    {label}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span className="flex size-7 items-center justify-center rounded-full border text-xs font-semibold">
                      {index + 1}
                    </span>
                    {label}
                  </span>
                )}

                {index < STEP_ORDER.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-px flex-1",
                      index < currentIndex ? "bg-primary" : "bg-border"
                    )}
                  />
                ) : null}
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
