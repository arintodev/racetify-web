import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, Trophy } from "lucide-react"

import { ApiError, type Schemas } from "@workspace/api-client"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { ShareMenu } from "@/components/share-menu"
import { getServerApi } from "@/lib/api/server"
import { formatCount, formatDate, formatDistance } from "@/lib/format"

type PublicEvent = Schemas["PublicEventDto"]
type RaceSummary = Schemas["PublicRaceSummaryDto"]

async function fetchResultsIndex(eventSlug: string) {
  try {
    const api = await getServerApi()
    const [event, races] = await Promise.all([
      api.request<PublicEvent>(`/v1/public/events/${eventSlug}`),
      api.request<RaceSummary[]>(
        `/v1/public/events/${eventSlug}/results/races`
      ),
    ])
    return { event, races }
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
  const data = await fetchResultsIndex(eventSlug)

  if (!data) {
    return { title: "Results not found" }
  }

  return {
    title: `${data.event.name} results`,
    description: `Official race results for ${data.event.name}.`,
    alternates: { canonical: `/e/${eventSlug}/results` },
    openGraph: {
      title: `${data.event.name} results`,
      description: `Official race results for ${data.event.name}.`,
      type: "website",
      images: data.event.coverUrl ? [{ url: data.event.coverUrl }] : undefined,
    },
  }
}

export default async function PublicResultsIndexPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const data = await fetchResultsIndex(eventSlug)

  if (!data) {
    notFound()
  }

  const { event, races } = data

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-16">
      <Card className="gap-4 [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                Results
              </CardTitle>
              <CardDescription>
                Choose a published race to view its official results.
              </CardDescription>
            </div>
            <ShareMenu
              title={`${event.name} results`}
              text={`Official results for ${event.name}`}
              url={`https://racetify.com/e/${eventSlug}/results`}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="outline">
              {races.length} {races.length === 1 ? "race" : "races"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {races.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center">
              <Trophy className="size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Results are not published yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The organizer will publish official results after the race.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {races.map((race) => (
                <li
                  key={race.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{race.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistance(race.distanceKm)} ·{" "}
                      {formatCount(race.finisherCount)}{" "}
                      {race.finisherCount === 1 ? "finisher" : "finishers"}
                    </p>
                    {race.publishedAt ? (
                      <p className="text-xs text-muted-foreground">
                        Published {formatDate(race.publishedAt)}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={
                      <Link href={`/e/${eventSlug}/results/${race.slug}`} />
                    }
                  >
                    View results
                    <ArrowRight />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
