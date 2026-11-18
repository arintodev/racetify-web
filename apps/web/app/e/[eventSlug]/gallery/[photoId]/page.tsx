import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Download } from "lucide-react"

import { ApiError, type Schemas } from "@workspace/api-client"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import { getServerApi } from "@/lib/api/server"
import { formatDateTime } from "@/lib/format"
import { ProtectedImage } from "@/features/public-gallery/protected-image"

async function fetchPhoto(eventSlug: string, photoId: string) {
  try {
    const api = await getServerApi()
    return await api.request<Schemas["PublicGalleryItemDto"]>(
      `/v1/public/events/${eventSlug}/gallery/items/${photoId}`
    )
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null
    throw error
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventSlug: string; photoId: string }>
}): Promise<Metadata> {
  const { eventSlug, photoId } = await params
  const photo = await fetchPhoto(eventSlug, photoId)

  if (!photo) {
    return {
      title: "Photo not found",
      robots: { index: false, follow: true },
    }
  }

  return {
    title: `${photo.collection.name} · Race photo`,
    description: `Public race photo from ${photo.collection.name}.`,
    robots: { index: false, follow: true },
  }
}

export default async function PublicPhotoPage({
  params,
}: {
  params: Promise<{ eventSlug: string; photoId: string }>
}) {
  const { eventSlug, photoId } = await params
  const photo = await fetchPhoto(eventSlug, photoId)

  if (!photo) {
    notFound()
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 pb-16">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        nativeButton={false}
        render={<Link href={`/e/${eventSlug}/gallery`} />}
      >
        <ArrowLeft />
        Back to gallery
      </Button>

      <div className="overflow-hidden rounded-xl border bg-black">
        {/* Previews are public WebP objects; they bypass the Next image optimizer. */}
        <ProtectedImage
          src={photo.previewUrl}
          alt="Race photo"
          className="max-h-[75vh] w-full object-contain"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 text-sm">
        <Badge variant="outline">{photo.collection.name}</Badge>
        {photo.photographerName ? (
          <span className="text-muted-foreground">
            Photo by {photo.photographerName}
          </span>
        ) : null}
        <span className="text-muted-foreground">
          {formatDateTime(photo.capturedAt)}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          nativeButton={false}
          render={
            <a href={`/e/${eventSlug}/gallery/${photoId}/download`} download />
          }
        >
          <Download aria-hidden="true" />
          Download
        </Button>
      </div>
    </div>
  )
}
