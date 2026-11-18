"use client"

import * as React from "react"

import { Input } from "@workspace/ui/components/input"
import { Slider } from "@workspace/ui/components/slider"
import { cn } from "@workspace/ui/lib/utils"

function formatValue(value: number): string {
  if (!Number.isFinite(value)) return "0"
  return String(Math.round(value * 100) / 100)
}

export function SliderField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  description,
  error,
  disabled,
  className,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  suffix?: string
  description?: React.ReactNode
  error?: string
  disabled?: boolean
  className?: string
}) {
  const [draft, setDraft] = React.useState(() => formatValue(value))
  const [hint, setHint] = React.useState<string | null>(null)

  React.useEffect(() => {
    setDraft(formatValue(value))
  }, [value])

  function commit(): void {
    const parsed = Number(draft)
    if (!Number.isFinite(parsed)) {
      setDraft(formatValue(value))
      setHint("Enter a number.")
      return
    }
    const clamped = Math.min(Math.max(parsed, min), max)
    setHint(
      clamped === parsed
        ? null
        : `Use a value between ${formatValue(min)} and ${formatValue(max)}${suffix ?? ""}.`
    )
    setDraft(formatValue(clamped))
    if (clamped !== value) onChange(clamped)
  }

  const sliderValue = Math.min(Math.max(value, min), max)

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} id={`${id}-label`} className="text-sm font-medium">
          {label}
        </label>
        <div className="relative w-28">
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            value={draft}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            className={cn(
              "h-8 text-right tabular-nums",
              suffix ? "pr-7" : undefined
            )}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur()
              if (event.key === "Escape") {
                setDraft(formatValue(value))
                setHint(null)
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
      </div>
      <Slider
        aria-labelledby={`${id}-label`}
        value={sliderValue}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(next) => {
          const numeric = Array.isArray(next) ? (next[0] ?? value) : next
          setHint(null)
          onChange(Math.round(numeric * 100) / 100)
        }}
      />
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      {error || hint ? (
        <p className="text-xs text-destructive">{error ?? hint}</p>
      ) : null}
    </div>
  )
}
