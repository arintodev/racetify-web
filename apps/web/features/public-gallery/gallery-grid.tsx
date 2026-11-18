"use client"

import type { Schemas } from "@workspace/api-client"

import { ProtectedImage } from "./protected-image"

export function GalleryGrid({
  photos,
  onSelect,
}: {
  photos: Schemas["PublicGalleryItemDto"][]
  onSelect: (photoId: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
      {photos.map((photo) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onSelect(photo.id)}
          className="group relative aspect-[3/2] overflow-hidden rounded-lg border bg-muted transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label="Open photo"
        >
          {/* Previews are public WebP objects; they bypass the Next image optimizer. */}
          <ProtectedImage
            src={photo.previewUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </button>
      ))}
    </div>
  )
}
