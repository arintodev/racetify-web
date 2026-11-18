"use client"

import { useVirtualizer } from "@tanstack/react-virtual"
import * as React from "react"

import { Button } from "@workspace/ui/components/button"

import type { RunnerState, UploadItem } from "../lib/types"
import { UploadQueueRow } from "./upload-queue-row"

type UploadQueueProps = {
  items: UploadItem[]
  activeBatchId: string | null
  runner: RunnerState
  search: string
  searchActive: boolean
  onClearSearch: () => void
  onRemove: (clientId: string) => void
  onRetry: (clientId: string) => void
}

const ROW_HEIGHT = 88
const VIRTUALIZE_AFTER = 40

export function UploadQueue({
  items,
  activeBatchId,
  runner,
  search,
  searchActive,
  onClearSearch,
  onRemove,
  onRetry,
}: UploadQueueProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const virtualize = items.length > VIRTUALIZE_AFTER
  const previousSearch = React.useRef(search)

  React.useEffect(() => {
    if (previousSearch.current === search) return
    previousSearch.current = search
    scrollRef.current?.scrollTo({ top: 0 })
  }, [search])

  const virtualizer = useVirtualizer({
    count: virtualize ? items.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => items[index]?.clientId ?? index,
  })

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          {searchActive
            ? `No photos match “${search.trim()}”.`
            : "No photos yet. Add photos or a folder above to start."}
        </p>
        {searchActive ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClearSearch}
          >
            Clear search
          </Button>
        ) : null}
      </div>
    )
  }

  const row = (item: UploadItem, index: number) => {
    const inActiveBatch =
      runner !== "idle" &&
      runner !== "paused-error" &&
      item.batchId === activeBatchId

    return (
      <UploadQueueRow
        key={item.clientId}
        item={item}
        position={index + 1}
        total={items.length}
        canRemove={
          !inActiveBatch &&
          item.status !== "uploading" &&
          item.status !== "uploaded"
        }
        canRetry={!inActiveBatch}
        onRemove={onRemove}
        onRetry={onRetry}
      />
    )
  }

  if (!virtualize) {
    return (
      <div role="list" aria-label="Upload queue">
        {items.map(row)}
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      role="list"
      aria-label="Upload queue"
      className="max-h-[min(60dvh,640px)] overflow-auto"
    >
      <div
        role="presentation"
        style={{ height: virtualizer.getTotalSize(), position: "relative" }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]
          if (!item) return null
          return (
            <div
              key={virtualRow.key}
              role="presentation"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: ROW_HEIGHT,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row(item, virtualRow.index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
