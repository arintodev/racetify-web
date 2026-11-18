"use client"

import {
  FileDown,
  MoreHorizontal,
  Play,
  RotateCcw,
  Search,
  Square,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"

import { formatNumber } from "@/lib/format"

import type { UploadTotals } from "../hooks/use-upload-workspace"
import type { RunnerState } from "../lib/types"

type UploadQueueToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
  onClearSearch: () => void
  filteredCount: number
  totals: UploadTotals
  runner: RunnerState
  isPaused: boolean
  onStop: () => void
  onResume: () => void
  onRetryFailed: () => void
  onExportFailed: () => void
  onClearCompleted: () => void
  onViewSkipped: () => void
  rejectedTotal: number
}

/** Queue search and bulk actions. Add controls live above the queue and never disappear. */
export function UploadQueueToolbar({
  search,
  onSearchChange,
  onClearSearch,
  filteredCount,
  totals,
  runner,
  isPaused,
  onStop,
  onResume,
  onRetryFailed,
  onExportFailed,
  onClearCompleted,
  onViewSkipped,
  rejectedTotal,
}: UploadQueueToolbarProps) {
  const running = runner === "running" || runner === "stopping"
  const searchActive = search.trim().length > 0

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by file name or folder"
            aria-label="Search the upload queue by file name or folder"
            className="pr-8 pl-8"
          />
          {searchActive ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Clear search"
              className="absolute top-1/2 right-1 -translate-y-1/2"
              onClick={onClearSearch}
            >
              <X />
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {running ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onStop}
              disabled={runner === "stopping"}
            >
              <Square aria-hidden="true" />
              {runner === "stopping" ? "Stopping…" : "Stop"}
            </Button>
          ) : isPaused || runner === "paused-error" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onResume}
            >
              <Play aria-hidden="true" />
              Resume
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label="Queue actions"
                />
              }
            >
              <MoreHorizontal aria-hidden="true" />
              More
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem
                disabled={totals.retryableFailed === 0 || runner === "stopping"}
                onClick={onRetryFailed}
              >
                <RotateCcw aria-hidden="true" />
                Retry all failed ({formatNumber(totals.retryableFailed)})
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={totals.failed === 0}
                onClick={onExportFailed}
              >
                <FileDown aria-hidden="true" />
                Export failed (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={totals.completed === 0 || running}
                onClick={onClearCompleted}
              >
                <Trash2 aria-hidden="true" />
                Clear uploaded ({formatNumber(totals.completed)})
              </DropdownMenuItem>
              {rejectedTotal > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onViewSkipped}>
                    <TriangleAlert aria-hidden="true" />
                    View skipped files ({formatNumber(rejectedTotal)})
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {searchActive ? (
        <p className="text-xs text-muted-foreground" role="status">
          Showing {formatNumber(filteredCount)} of {formatNumber(totals.total)}{" "}
          photos
        </p>
      ) : null}
    </div>
  )
}
