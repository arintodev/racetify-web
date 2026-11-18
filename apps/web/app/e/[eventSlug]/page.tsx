import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarClock, MapPin } from "lucide-react"

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

import { getServerApi } from "@/lib/api/server"
import {
  formatCount,
  formatCurrency,
  formatDateRange,
  formatRaceStart,
} from "@/lib/format"

export default async function PublicEventProfilePage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const api = await getServerApi()

  let event: Schemas["PublicEventDto"]
  try {
    event = await api.request<Schemas["PublicEventDto"]>(
      `/v1/public/events/${eventSlug}`
    )
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      notFound()
    }
    throw error
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 pb-16">
      <Card className="[--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                About this event
              </CardTitle>
              <CardDescription>
                {formatDateRange(event.startDate, event.endDate)}
              </CardDescription>
            </div>
            {event.registration.enabled ? (
              <Button
                nativeButton={false}
                render={<Link href={`/e/${event.slug}/register`} />}
              >
                Register
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {event.location ? (
              <Badge variant="outline" className="gap-1">
                <MapPin className="size-3" />
                {event.location}
              </Badge>
            ) : null}
            <Badge variant="outline" className="gap-1">
              <CalendarClock className="size-3" />
              {event.timezone}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {event.description ?? event.shortDescription ?? "Details for this event will be published soon."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/e/${event.slug}/gallery`} />}
            >
              Gallery
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/e/${event.slug}/results`} />}
            >
              Results
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/e/${event.slug}/certificates`} />}
            >
              Certificates
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="[--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader>
          <CardTitle>Races</CardTitle>
          <CardDescription>
            {event.races.length === 0
              ? "No races have been published yet."
              : `${event.races.length} ${event.races.length === 1 ? "race" : "races"} available.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {event.races.length === 0 ? null : (
            <ul className="flex flex-col gap-2">
              {event.races.map((race) => (
                <li
                  key={race.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{race.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {race.distanceKm} km ·{" "}
                      {formatRaceStart(race.startTime, event.timezone)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCount(race.spotsTaken)} of{" "}
                      {formatCount(race.maxParticipants)} spots taken
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">
                      {formatCurrency(race.fee)}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1"
                      nativeButton={false}
                      render={
                        <Link
                          href={`/e/${event.slug}/register?race=${race.slug}`}
                        />
                      }
                    >
                      Register
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
