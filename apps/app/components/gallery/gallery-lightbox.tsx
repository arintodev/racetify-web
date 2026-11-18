"use client"

import type { Schemas } from "@workspace/api-client"
import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FolderInput,
  ScanFace,
  Ticket,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Separator } from "@workspace/ui/components/separator"

import { formatDateTime } from "@/lib/format"

type GalleryItem = Schemas["GalleryItemSummaryDto"]

export function GalleryLightbox({
  item,
  items,
  onNavigate,
  onClose,
  onDownloadOriginal,
  canManage,
  onMove,
}: {
  item: GalleryItem | null
  items: GalleryItem[]
  onNavigate: (itemId: string) => void
  onClose: () => void
  onDownloadOriginal?: (item: GalleryItem) => Promise<void> | void
  canManage?: boolean
  onMove?: (item: GalleryItem) => void
}) {
  const index = item ? items.findIndex((entry) => entry.id === item.id) : -1
  const previous = index > 0 ? items[index - 1] : undefined
  const next =
    index >= 0 && index < items.length - 1 ? items[index + 1] : undefined

  React.useEffect(() => {
    if (!item) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" && previous) onNavigate(previous.id)
      if (event.key === "ArrowRight" && next) onNavigate(next.id)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [item, next, onNavigate, previous])

  if (!item) return null

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-w-6xl gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogTitle className="sr-only">Photo details</DialogTitle>
        <DialogDescription className="sr-only">
          Large photo with read-only bib and face metadata.
        </DialogDescription>
        <div className="grid lg:grid-cols-[1fr_340px]">
          <div className="relative flex aspect-[3/2] items-center justify-center bg-black">
            {/* Previews are public WebP objects; use a plain img, not the Next optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.previewUrl}
              alt={
                item.bibs[0]
                  ? `Race photo with bib ${item.bibs[0].bibText}`
                  : "Race photo"
              }
              className="max-h-full max-w-full object-contain"
            />
            <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-3">
              <Button
                variant="secondary"
                size="icon"
                aria-label="Previous photo"
                disabled={!previous}
                onClick={() => previous && onNavigate(previous.id)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Next photo"
                disabled={!next}
                onClick={() => next && onNavigate(next.id)}
              >
                <ChevronRight />
              </Button>
            </div>
            <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
              {index + 1} / {items.length}
            </div>
          </div>

          <div className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto p-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{item.status}</Badge>
                {item.collection ? (
                  <Badge variant="outline">{item.collection.name}</Badge>
                ) : null}
              </div>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {item.originalName ?? item.id}
              </p>
            </div>

            <div className="grid gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Photographer</p>
                <p className="mt-1 font-medium">
                  {item.photographer?.name ?? "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Captured</p>
                <p className="mt-1 font-medium">
                  {formatDateTime(item.capturedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dimensions</p>
                <p className="mt-1 font-medium">
                  {item.width ?? "—"} × {item.height ?? "—"}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Ticket className="size-4" />
                Bib numbers
              </p>
              {item.bibs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No bib detected in this photo.
                </p>
              ) : (
                item.bibs.map((bib) => (
                  <div
                    key={bib.id}
                    className="flex items-center justify-between rounded-lg border p-2 text-sm"
                  >
                    <span className="font-mono">{bib.bibText}</span>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <ScanFace className="size-4" />
                Detected faces
              </p>
              <p className="text-sm text-muted-foreground">
                {item.faceCount === 0
                  ? "No faces detected in this photo."
                  : `${item.faceCount} face${item.faceCount === 1 ? "" : "s"} detected.`}
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => void onDownloadOriginal?.(item)}
              disabled={!onDownloadOriginal}
            >
              <Download />
              Open original
            </Button>

            {canManage && onMove ? (
              <Button variant="outline" onClick={() => onMove(item)}>
                <FolderInput />
                Move to collection
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
