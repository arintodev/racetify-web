import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarClock, CalendarX2, CircleSlash } from "lucide-react"

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

import { ShareButton } from "@/components/share-button"
import { ShareMenu } from "@/components/share-menu"
import { toRegistrationConfig } from "@/features/public-registration/api"
import { RegistrationWizard } from "@/features/public-registration/registration-wizard"
import type { RegistrationEvent } from "@/features/public-registration/types"
import { getServerApi } from "@/lib/api/server"
import {
  formatDate,
  formatDateTime,
  formatDateRange,
  timeZoneLabel,
} from "@/lib/format"

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "")
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

async function fetchRegistrationConfig(eventSlug: string) {
  try {
    const api = await getServerApi()
    const config = await api.request<Schemas["PublicRegistrationConfigDto"]>(
      `/v1/public/events/${eventSlug}/registration-config`
    )
    return toRegistrationConfig(config)
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
  const config = await fetchRegistrationConfig(eventSlug)

  if (!config) {
    return { title: "Register" }
  }

  return {
    title: `Register for ${config.event.name}`,
    description: `Register for ${config.event.name}.`,
    alternates: {
      canonical: `/e/${eventSlug}/register`,
    },
    openGraph: {
      title: `Register for ${config.event.name}`,
      description: `Register for ${config.event.name}.`,
      type: "website",
      images: config.event.coverUrl
        ? [{ url: config.event.coverUrl, alt: config.event.name }]
        : undefined,
    },
  }
}

function RegistrationPhaseCard({
  event,
  noRaces,
}: {
  event: RegistrationEvent
  noRaces: boolean
}) {
  const opensAt = `${formatDateTime(
    event.registrationStartAt,
    event.timezone
  )} ${timeZoneLabel(event.timezone)}`
  const closesAt = `${formatDateTime(
    event.registrationEndAt,
    event.timezone
  )} ${timeZoneLabel(event.timezone)}`

  const title = noRaces
    ? "Registration isn't available right now"
    : event.phase === "upcoming"
      ? `Registration opens ${formatDate(event.registrationStartAt)}`
      : "Registration is closed"

  const description = noRaces
    ? `No races are open for registration for ${event.name}. Check back later or contact the organizer.`
    : event.phase === "upcoming"
      ? `Registration for ${event.name} opens on ${opensAt}. Browse the gallery or results in the meantime.`
      : `Registration for ${event.name} closed on ${closesAt}.`

  const Icon = noRaces
    ? CircleSlash
    : event.phase === "upcoming"
      ? CalendarClock
      : CalendarX2

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-16">
      <Card className="gap-4 [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-5" />
            </div>
            <div className="space-y-1">
              <Badge variant="outline">
                {noRaces
                  ? "No races available"
                  : event.phase === "upcoming"
                    ? "Registration opens soon"
                    : "Registration closed"}
              </Badge>
              <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                {title}
              </CardTitle>
            </div>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
            <p>
              {event.name} · {formatDateRange(event.startDate, event.endDate)}
            </p>
            <p className="mt-1">
              Registration window: {opensAt} – {closesAt}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/e/${event.slug}/gallery`} />}
            >
              View gallery
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/e/${event.slug}/results`} />}
            >
              View results
            </Button>
            <ShareButton
              title={event.name}
              text={`Register for ${event.name}`}
              url={`https://racetify.com/e/${event.slug}/register`}
              label="Share event"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function PublicRegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>
  searchParams: Promise<{
    race?: string | string[]
    category?: string | string[]
  }>
}) {
  const { eventSlug } = await params
  const query = await searchParams
  const config = await fetchRegistrationConfig(eventSlug)

  if (!config) {
    notFound()
  }

  const noRaces = config.races.length === 0

  if (!config.registrationOpen || noRaces) {
    return <RegistrationPhaseCard event={config.event} noRaces={noRaces} />
  }

  const raceParam = firstValue(query.race)
  const categoryParam = firstValue(query.category)
  const initialRace = config.races.find(
    (entry) => entry.race.id === raceParam || entry.race.slug === raceParam
  )
  const initialCategory = initialRace?.categories.find(
    (category) =>
      category.id === categoryParam ||
      category.code.toLowerCase() === categoryParam.toLowerCase() ||
      slugify(category.name) === categoryParam.toLowerCase()
  )

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-16">
      <Card className="gap-4 overflow-visible [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                Register
              </CardTitle>
              <CardDescription>
                Add a race for each participant, fill in their details, and
                check out once. Registration closes{" "}
                {formatDateTime(
                  config.event.registrationEndAt,
                  config.event.timezone
                )}{" "}
                {timeZoneLabel(config.event.timezone)}.
              </CardDescription>
            </div>
            <ShareMenu
              title={`Register for ${config.event.name}`}
              text={`Register for ${config.event.name}`}
              url={`https://racetify.com/e/${eventSlug}/register`}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="secondary">
              {config.maxParticipantsPerOrder === 1
                ? "1 participant per order"
                : `Up to ${config.maxParticipantsPerOrder} participants per order`}
            </Badge>
            <Badge variant="outline">No account needed</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <RegistrationWizard
            config={config}
            eventSlug={eventSlug}
            initialRaceId={initialRace?.race.id}
            initialCategoryId={initialCategory?.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
