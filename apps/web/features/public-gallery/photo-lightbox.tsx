"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Download } from "lucide-react"

import type { Schemas } from "@workspace/api-client"
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

import { ProtectedImage } from "./protected-image"

type GalleryItem = Schemas["PublicGalleryItemDto"]

export function PhotoLightbox({
  eventSlug,
  photo,
  photos,
  onNavigate,
  onClose,
}: {
  eventSlug: string
  photo: GalleryItem | null
  photos: GalleryItem[]
  onNavigate: (photoId: string) => void
  onClose: () => void
}) {
  const index = photo ? photos.findIndex((entry) => entry.id === photo.id) : -1
  const previous = index > 0 ? photos[index - 1] : undefined
  const next =
    index >= 0 && index < photos.length - 1 ? photos[index + 1] : undefined

  React.useEffect(() => {
    if (!photo) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" && previous) onNavigate(previous.id)
      if (event.key === "ArrowRight" && next) onNavigate(next.id)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [next, onNavigate, photo, previous])

  if (!photo) return null

  return (
    <Dialog
      open={Boolean(photo)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-0.5rem)] w-[calc(100vw-0.5rem)] max-w-[calc(100vw-0.5rem)] gap-0 overflow-y-auto rounded-lg p-0 sm:max-w-4xl sm:rounded-xl md:overflow-hidden">
        <DialogTitle className="sr-only">Photo details</DialogTitle>
        <DialogDescription className="sr-only">
          Large photo with collection, photographer, capture time, and a
          download action.
        </DialogDescription>

        <div className="grid md:grid-cols-[1fr_260px]">
          <div
            className="relative h-[60dvh] min-h-56 bg-black md:aspect-[3/2] md:h-auto"
            onContextMenu={(event) => event.preventDefault()}
          >
            <ProtectedImage
              src={photo.previewUrl}
              alt="Race photo"
              className="size-full object-contain"
            />
            <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-2">
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
            <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">
              {index + 1} / {photos.length}
            </div>
          </div>

          <div className="flex flex-col gap-4 p-4 md:max-h-[70vh] md:overflow-y-auto">
            <div className="flex flex-col gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Collection</p>
                <Badge variant="outline">{photo.collection.name}</Badge>
              </div>
              {photo.photographerName ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Photographer</p>
                  <p className="text-sm font-medium">
                    {photo.photographerName}
                  </p>
                </div>
              ) : null}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Captured</p>
                <p className="text-sm">{formatDateTime(photo.capturedAt)}</p>
              </div>
            </div>

            <Separator />

            <Button
              nativeButton={false}
              className="w-full"
              render={
                <a
                  href={`/e/${eventSlug}/gallery/${photo.id}/download`}
                  download
                />
              }
            >
              <Download aria-hidden="true" />
              Download photo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
