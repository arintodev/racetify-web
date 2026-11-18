"use client"

import * as React from "react"

import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function swatchValue(value: string): string {
  return HEX_PATTERN.test(value) ? value : "#000000"
}

export function ColorField({
  label,
  value,
  onChange,
  allowTransparent = false,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  allowTransparent?: boolean
  className?: string
}) {
  const [draft, setDraft] = React.useState(value)

  React.useEffect(() => {
    setDraft(value)
  }, [value])

  function commit(): void {
    const next = draft.trim()
    if (next === "transparent" && allowTransparent) {
      onChange(next)
      return
    }
    if (HEX_PATTERN.test(next)) {
      onChange(next)
      return
    }
    setDraft(value)
  }

  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} colour`}
          value={swatchValue(value)}
          onChange={(event) => onChange(event.target.value)}
          className="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-background p-0.5"
        />
        <Input
          value={draft}
          className="h-8 font-mono text-xs"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") {
              setDraft(value)
              event.currentTarget.blur()
            }
          }}
        />
      </div>
    </label>
  )
}
