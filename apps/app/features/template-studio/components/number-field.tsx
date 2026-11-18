"use client"

import * as React from "react"

import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  return String(Math.round(value * 100) / 100)
}

export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step = 1,
  suffix,
  disabled,
  className,
}: {
  label: string
  value: number
  onCommit: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  disabled?: boolean
  className?: string
}) {
  const [draft, setDraft] = React.useState(() => formatNumber(value))

  React.useEffect(() => {
    setDraft(formatNumber(value))
  }, [value])

  function commit(): void {
    const parsed = Number(draft)
    if (!Number.isFinite(parsed)) {
      setDraft(formatNumber(value))
      return
    }
    const clamped = Math.min(
      Math.max(parsed, min ?? Number.NEGATIVE_INFINITY),
      max ?? Number.POSITIVE_INFINITY
    )
    if (clamped !== value) onCommit(clamped)
    setDraft(formatNumber(clamped))
  }

  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          value={draft}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn("h-8 tabular-nums", suffix ? "pr-9" : undefined)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur()
            }
            if (event.key === "Escape") {
              setDraft(formatNumber(value))
              event.currentTarget.blur()
            }
          }}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  )
}
