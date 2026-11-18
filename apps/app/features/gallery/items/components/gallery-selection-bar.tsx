"use client"

import { FolderInput } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { formatNumber } from "@/lib/format"

type GallerySelectionBarProps = {
  selectedCount: number
  pageSelectedCount: number
  pageCount: number
  onMove: () => void
  onSelectPage: () => void
  onDeselectPage: () => void
  onClear: () => void
  onDone: () => void
}

export function GallerySelectionBar({
  selectedCount,
  pageSelectedCount,
  pageCount,
  onMove,
  onSelectPage,
  onDeselectPage,
  onClear,
  onDone,
}: GallerySelectionBarProps) {
  const allPageSelected = pageCount > 0 && pageSelectedCount === pageCount
  const includesOtherPages = selectedCount > pageSelectedCount

  return (
    <div
      role="region"
      aria-label="Photo selection"
      className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2"
    >
      <span className="text-sm font-medium" aria-live="polite">
        {formatNumber(selectedCount)} selected
      </span>
      {includesOtherPages ? (
        <span className="text-xs text-muted-foreground">
          Includes photos from other pages
        </span>
      ) : null}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={allPageSelected ? onDeselectPage : onSelectPage}
          disabled={pageCount === 0}
        >
          {allPageSelected ? "Deselect page" : "Select page"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onClear}
          disabled={selectedCount === 0}
        >
          Clear
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onMove}
          disabled={selectedCount === 0}
        >
          <FolderInput aria-hidden="true" />
          Move to collection…
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}
