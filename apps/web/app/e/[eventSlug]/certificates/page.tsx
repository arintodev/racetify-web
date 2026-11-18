import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ApiError, type Schemas } from "@workspace/api-client"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { ShareMenu } from "@/components/share-menu"
import { CertificateSearch } from "@/features/public-certificates"
import { getServerApi } from "@/lib/api/server"

async function fetchEvent(eventSlug: string) {
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
  const event = await fetchEvent(eventSlug)

  if (!event) {
    return { title: "Certificates not found" }
  }

  return {
    title: `Find your certificate · ${event.name}`,
    description: `Find your ${event.name} certificate by certificate number, participant name, or bib number.`,
    alternates: { canonical: `/e/${eventSlug}/certificates` },
    openGraph: {
      title: `Find your certificate · ${event.name}`,
      description: `Find your ${event.name} certificate.`,
      type: "website",
      images: event.coverUrl ? [{ url: event.coverUrl }] : undefined,
    },
  }
}

export default async function PublicCertificateSearchPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const event = await fetchEvent(eventSlug)

  if (!event) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-16">
      <Card className="gap-4 [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                Find your certificate
              </CardTitle>
              <CardDescription>
                Search by certificate number, participant name, or bib number.
                Results are limited to the top 3 matches.
              </CardDescription>
            </div>
            <ShareMenu
              title={`Certificates · ${event.name}`}
              text={`Find your certificate from ${event.name}`}
              url={`https://racetify.com/e/${eventSlug}/certificates`}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="outline">Top 3 matches</Badge>
            <Badge variant="outline">Read-only results</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <CertificateSearch eventSlug={eventSlug} />
        </CardContent>
      </Card>
    </div>
  )
}
