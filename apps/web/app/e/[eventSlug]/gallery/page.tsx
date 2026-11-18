import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ApiError, type Envelope, type Schemas } from "@workspace/api-client"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { ShareMenu } from "@/components/share-menu"
import { PublicGallery } from "@/features/public-gallery"
import { getServerApi } from "@/lib/api/server"

const PAGE_SIZE = 24

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "")
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}): Promise<Metadata> {
  const { eventSlug } = await params

  try {
    const api = await getServerApi()
    const event = await api.request<Schemas["PublicEventDto"]>(
      `/v1/public/events/${eventSlug}`
    )

    return {
      title: `${event.name} gallery`,
      description: `Browse public race photos from ${event.name}. Search by bib number to find your photos.`,
      alternates: { canonical: `/e/${eventSlug}/gallery` },
      robots: { index: false, follow: true },
      openGraph: {
        title: `${event.name} gallery`,
        description: `Browse public race photos from ${event.name}.`,
        type: "website",
        images: event.coverUrl ? [{ url: event.coverUrl }] : undefined,
      },
    }
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      return {
        title: "Gallery not found",
        robots: { index: false, follow: true },
      }
    }
    throw error
  }
}

export default async function PublicGalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>
  searchParams: Promise<{
    collection?: string | string[]
    bib?: string | string[]
  }>
}) {
  const { eventSlug } = await params
  const query = await searchParams
  const collection = firstValue(query.collection).trim()
  const bib = firstValue(query.bib).trim()

  const api = await getServerApi()

  let event: Schemas["PublicEventDto"]
  let collections: Schemas["PublicGalleryCollectionDto"][]
  let initialPage: Envelope<Schemas["PublicGalleryItemDto"][]>

  try {
    const [eventData, collectionData, itemData] = await Promise.all([
      api.request<Schemas["PublicEventDto"]>(`/v1/public/events/${eventSlug}`),
      api.request<Schemas["PublicGalleryCollectionDto"][]>(
        `/v1/public/events/${eventSlug}/gallery/collections`
      ),
      api.requestEnvelope<Schemas["PublicGalleryItemDto"][]>(
        `/v1/public/events/${eventSlug}/gallery/items`,
        {
          query: {
            limit: PAGE_SIZE,
            collection: collection || undefined,
            bib: bib || undefined,
          },
        }
      ),
    ])

    event = eventData
    collections = collectionData
    initialPage = itemData
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      notFound()
    }
    throw error
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-16">
      <Card className="gap-4 [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                Gallery
              </CardTitle>
              <CardDescription>
                Public race photos. Search by bib number to find your photos.
              </CardDescription>
            </div>
            <ShareMenu
              title={`${event.name} gallery`}
              text={`Find your photos from ${event.name}`}
              url={`https://racetify.com/e/${eventSlug}/gallery`}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="secondary">{collections.length} collections</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <PublicGallery
            eventSlug={eventSlug}
            collections={collections}
            initialPage={initialPage}
            initialBib={bib}
            initialCollection={
              collections.some((entry) => entry.slug === collection)
                ? collection
                : ""
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
