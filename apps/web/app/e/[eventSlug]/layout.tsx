import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ApiError, type Schemas } from "@workspace/api-client"

import { EventHeader } from "@/components/public-shell/event-header"
import { EventNav } from "@/components/public-shell/event-nav"
import { SiteFooter } from "@/components/public-shell/site-footer"
import { SiteHeader } from "@/components/public-shell/site-header"
import { getServerApi } from "@/lib/api/server"

async function fetchPublicEvent(
  eventSlug: string
): Promise<Schemas["PublicEventDto"] | null> {
  try {
    const api = await getServerApi()
    return await api.request<Schemas["PublicEventDto"]>(
      `/v1/public/events/${eventSlug}`
    )
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null
    throw error
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}): Promise<Metadata> {
  const { eventSlug } = await params
  const event = await fetchPublicEvent(eventSlug)

  if (!event) {
    return { title: "Event not found" }
  }

  const description =
    event.shortDescription ?? event.description ?? `Race event: ${event.name}`

  return {
    title: event.name,
    description,
    alternates: { canonical: `/e/${event.slug}` },
    openGraph: {
      title: event.name,
      description,
      type: "website",
      images: event.coverUrl ? [{ url: event.coverUrl }] : undefined,
    },
  }
}

export default async function PublicEventLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const event = await fetchPublicEvent(eventSlug)

  if (!event) {
    notFound()
  }

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate,
    url: `https://racetify.com/e/${event.slug}`,
    description: event.shortDescription ?? event.description ?? undefined,
    image: event.coverUrl ?? undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: event.location
      ? {
          "@type": "Place",
          name: event.location,
          address: event.location,
        }
      : undefined,
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="flex min-h-full flex-col bg-muted/30">
          <EventHeader event={event} />
          <div className="flex-1">{children}</div>
        </div>
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
    </div>
  )
}
