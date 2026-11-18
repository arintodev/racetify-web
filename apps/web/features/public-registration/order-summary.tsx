"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"

import { formatCurrency } from "@/lib/format"

import type { OrderLine } from "./types"

export function OrderSummaryLines({
  lines,
  onEdit,
}: {
  lines: OrderLine[]
  onEdit?: (index: number) => void
}) {
  return (
    <ul className="flex flex-col">
      {lines.map((line, index) => (
        <li
          key={line.participantNumber}
          className="flex items-start justify-between gap-3 border-b py-3 first:pt-0 last:border-b-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{line.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {line.raceName} · {line.categoryName}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-sm font-medium tabular-nums">
              {formatCurrency(line.fee)}
            </span>
            {onEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-11 sm:h-6"
                aria-label={`Edit ${line.name}`}
                onClick={() => onEdit(index)}
              >
                Edit
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

export function OrderTotal({ total }: { total: number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t pt-3 text-sm">
      <span className="text-muted-foreground">Order total</span>
      <span className="text-base font-semibold tabular-nums">
        {formatCurrency(total)}
      </span>
    </div>
  )
}

export function StickyOrderBar({
  participantCount,
  total,
  ctaLabel,
  ctaType,
  onCta,
  ctaDisabled,
  isSubmitting,
  showViewOrder,
  onViewOrder,
}: {
  participantCount: number
  total: number
  ctaLabel: string
  ctaType: "button" | "submit"
  onCta?: () => void
  ctaDisabled?: boolean
  isSubmitting?: boolean
  showViewOrder?: boolean
  onViewOrder?: () => void
}) {
  const disabled = Boolean(ctaDisabled) || Boolean(isSubmitting)

  const ctaClassName = "h-11 flex-1 text-sm sm:h-9 sm:flex-none sm:px-4"

  return (
    <div
      role="region"
      aria-label="Order summary"
      className="sticky bottom-0 z-30 -mx-4 mt-6 border-t bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:pb-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-end justify-between gap-2 sm:block">
          <div>
            <p className="text-xs text-muted-foreground">
              {participantCount}{" "}
              {participantCount === 1 ? "participant" : "participants"}
              {participantCount === 0 ? " · choose a race" : ""}
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {formatCurrency(total)}
            </p>
          </div>

          {showViewOrder ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 sm:hidden"
              onClick={onViewOrder}
            >
              View order
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {showViewOrder ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={onViewOrder}
            >
              View order
            </Button>
          ) : null}

          {ctaType === "submit" ? (
            <Button
              type="submit"
              className={cn(ctaClassName)}
              disabled={disabled}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Completing…
                </>
              ) : (
                ctaLabel
              )}
            </Button>
          ) : (
            <Button
              type="button"
              className={cn(ctaClassName)}
              onClick={onCta}
              disabled={disabled}
            >
              {ctaLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function OrderSummarySheet({
  open,
  onOpenChange,
  lines,
  total,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  lines: OrderLine[]
  total: number
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85svh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <SheetHeader>
          <SheetTitle>Your order</SheetTitle>
          <SheetDescription>
            {lines.length} {lines.length === 1 ? "participant" : "participants"}{" "}
            · {formatCurrency(total)}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <OrderSummaryLines lines={lines} />
        </div>

        <SheetFooter>
          <OrderTotal total={total} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
