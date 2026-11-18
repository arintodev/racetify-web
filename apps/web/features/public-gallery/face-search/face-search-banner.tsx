"use client"

import { ScanFace } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { formatCount } from "@/lib/format"

type FaceSearchBannerProps = {
  count: number
  pending: boolean
  failedCount: number
  onSearchAgain: () => void
  onShowAll: () => void
  onRetryFailed: () => void
}

export function FaceSearchBanner({
  count,
  pending,
  failedCount,
  onSearchAgain,
  onShowAll,
  onRetryFailed,
}: FaceSearchBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2"
    >
      <ScanFace className="size-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-sm font-medium">
        {pending
          ? "Loading your matches…"
          : count === 1
            ? "1 photo matches your selfie"
            : `${formatCount(count)} photos match your selfie`}
      </span>
      {failedCount > 0 ? (
        <span className="text-xs text-muted-foreground">
          Some matches could not be loaded.
        </span>
      ) : null}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {failedCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRetryFailed}
          >
            Retry
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onSearchAgain}
        >
          Search again
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onShowAll}>
          Show all photos
        </Button>
      </div>
    </div>
  )
}
