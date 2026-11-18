"use client"

import {
  CircleCheck,
  CircleX,
  Clock,
  ImageIcon,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react"
import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import { Progress } from "@workspace/ui/components/progress"
import { cn } from "cn"

import { formatFileSize } from "@/lib/format"

import { uploadStatusLabel } from "../lib/queue-view"
import type { UploadItem } from "../lib/types"

type UploadQueueRowProps = {
  item: UploadItem
  canRemove: boolean
  canRetry: boolean
  onRemove: (clientId: string) => void
  onRetry: (clientId: string) => void
  position: number
  total: number
}

export const UploadQueueRow = React.memo(function UploadQueueRow({
  item,
  canRemove,
  canRetry,
  onRemove,
  onRetry,
  position,
  total,
}: UploadQueueRowProps) {
  const uploading = item.status === "uploading"
  const failed = item.status === "failed"
  const completed = item.status === "completed"

  return (
    <div
      role="listitem"
      aria-posinset={position}
      aria-setsize={total}
      className="flex h-[72px] items-center gap-3 border-b px-3 last:border-b-0 sm:px-4"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <ImageIcon className="size-4" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={item.displayName}>
          {item.displayName}
        </p>
        <p
          className={cn(
            "truncate text-xs",
            failed ? "text-destructive" : "text-muted-foreground"
          )}
          title={item.error?.message ?? item.warning ?? undefined}
        >
          {buildMeta(item)}
        </p>
        {uploading ? (
          <div className="mt-1 flex items-center gap-2">
            <Progress
              value={item.progress}
              aria-label={`Uploading ${item.displayName}: ${item.progress}%`}
              className="flex-1 gap-1"
            />
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {item.progress}%
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <StatusIcon item={item} />
        {completed ? null : (
          <>
            {failed && item.error?.retryable && canRetry ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Retry ${item.displayName}`}
                onClick={() => onRetry(item.clientId)}
              >
                <RotateCcw />
              </Button>
            ) : null}
            {canRemove ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove ${item.displayName} from the queue`}
                onClick={() => onRemove(item.clientId)}
              >
                <Trash2 />
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
})

function StatusIcon({ item }: { item: UploadItem }) {
  const label = uploadStatusLabel(item)

  let icon: React.ReactNode
  let tone = "text-muted-foreground"

  switch (item.status) {
    case "completed":
      icon = <CircleCheck className="size-4" aria-hidden="true" />
      tone = "text-emerald-600"
      break
    case "failed":
      icon = <CircleX className="size-4" aria-hidden="true" />
      tone = "text-destructive"
      break
    case "preparing":
    case "uploading":
    case "uploaded":
      icon = (
        <Loader2
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      )
      tone =
        item.status === "preparing" ? "text-muted-foreground" : "text-primary"
      break
    default:
      icon = <Clock className="size-4" aria-hidden="true" />
  }

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("flex size-8 items-center justify-center", tone)}
    >
      {icon}
    </span>
  )
}

function buildMeta(item: UploadItem): string {
  if (item.error) return item.error.message

  const parts: string[] = []
  if (item.relativePath) parts.push(item.relativePath)

  if (item.resized) {
    parts.push(
      `${formatFileSize(item.originalSize)} → ${formatFileSize(item.declaredSize)}`
    )
    parts.push("2100 px")
    if (item.converted) {
      parts.push("converted to JPEG")
    } else if (item.exifPreserved === true) {
      parts.push("EXIF kept")
    } else if (item.exifPreserved === false && !item.warning) {
      parts.push("No EXIF")
    }
  } else {
    parts.push(formatFileSize(item.declaredSize))
  }

  if (item.warning) parts.push(item.warning)
  return parts.join(" · ")
}
