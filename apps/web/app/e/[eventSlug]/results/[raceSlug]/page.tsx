import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Search, Trophy } from "lucide-react"

import { ApiError, type Envelope, type Schemas } from "@workspace/api-client"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { getServerApi } from "@/lib/api/server"
import { formatDistance, formatDuration } from "@/lib/format"

type RaceSummary = Schemas["PublicRaceSummaryDto"]
type RaceResult = Schemas["PublicRaceResultDto"]

const statusLabel: Record<string, string> = {
  finished: "Finished",
  dnf: "DNF",
  dns: "DNS",
  dsq: "DSQ",
}

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "")
}

type ResultSearchParams = {
  q?: string | string[]
  category?: string | string[]
  gender?: string | string[]
  status?: string | string[]
  cursor?: string | string[]
}

function pickFilters(query: ResultSearchParams) {
  return {
    q: firstValue(query.q).trim(),
    category: firstValue(query.category).trim(),
    gender: firstValue(query.gender).trim(),
    status: firstValue(query.status).trim(),
    cursor: firstValue(query.cursor).trim(),
  }
}

async function fetchRace(eventSlug: string, raceSlug: string) {
  const api = await getServerApi()
  const races = await api.request<RaceSummary[]>(
    `/v1/public/events/${eventSlug}/results/races`
  )
  return races.find((race) => race.slug === raceSlug) ?? null
}

function buildResultsHref(
  eventSlug: string,
  raceSlug: string,
  filters: ReturnType<typeof pickFilters>,
  cursor?: string
) {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.category) params.set("category", filters.category)
  if (filters.gender) params.set("gender", filters.gender)
  if (filters.status) params.set("status", filters.status)
  if (cursor) params.set("cursor", cursor)

  const search = params.toString()
  return `/e/${eventSlug}/results/${raceSlug}${search ? `?${search}` : ""}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventSlug: string; raceSlug: string }>
}): Promise<Metadata> {
  const { eventSlug, raceSlug } = await params

  try {
    const race = await fetchRace(eventSlug, raceSlug)
    if (!race) return { title: "Results not found" }

    return {
      title: `${race.name} results`,
      description: `Official ${race.name} results.`,
      alternates: { canonical: `/e/${eventSlug}/results/${raceSlug}` },
    }
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      return { title: "Results not found" }
    }
    throw error
  }
}

export default async function PublicRaceResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string; raceSlug: string }>
  searchParams: Promise<ResultSearchParams>
}) {
  const { eventSlug, raceSlug } = await params
  const query = await searchParams
  const filters = pickFilters(query)

  let race: RaceSummary | null
  let page: Envelope<RaceResult[]>

  try {
    const api = await getServerApi()
    const [raceSummary, resultsPage] = await Promise.all([
      fetchRace(eventSlug, raceSlug),
      api.requestEnvelope<RaceResult[]>(
        `/v1/public/events/${eventSlug}/results/races/${raceSlug}`,
        {
          query: {
            q: filters.q || undefined,
            category: filters.category || undefined,
            gender: filters.gender || undefined,
            status: filters.status || undefined,
            cursor: filters.cursor || undefined,
            limit: 50,
          },
        }
      ),
    ])
    race = raceSummary
    page = resultsPage
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      notFound()
    }
    throw error
  }

  if (!race) {
    notFound()
  }

  const rows = page.data
  const pagination = page.meta.pagination
  const hasFilters = Boolean(
    filters.q || filters.category || filters.gender || filters.status
  )

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 pb-16">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        nativeButton={false}
        render={<Link href={`/e/${eventSlug}/results`} />}
      >
        <ArrowLeft />
        All results
      </Button>

      <Card className="gap-4 [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader>
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
              {race.name}
            </CardTitle>
            <CardDescription>
              {formatDistance(race.distanceKm)} · Official results
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="relative min-w-40 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={filters.q}
                placeholder="Bib or name"
                className="pl-8"
                aria-label="Search results by bib or name"
              />
            </div>
            <Input
              name="category"
              defaultValue={filters.category}
              placeholder="Category"
              aria-label="Filter by category"
              className="w-32"
            />
            <select
              name="gender"
              defaultValue={filters.gender}
              aria-label="Filter by gender"
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
            >
              <option value="">Any gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <select
              name="status"
              defaultValue={filters.status}
              aria-label="Filter by status"
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
            >
              <option value="">Any status</option>
              <option value="finished">Finished</option>
              <option value="dnf">DNF</option>
              <option value="dns">DNS</option>
              <option value="dsq">DSQ</option>
            </select>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center">
              <Trophy className="size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No results match</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {hasFilters
                  ? "Try a different name, bib number, or filter."
                  : "The organizer has not published results for this race yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Rank</TableHead>
                    <TableHead className="w-16">Bib</TableHead>
                    <TableHead>Participant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Gun</TableHead>
                    <TableHead className="text-right">Chip</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow
                      key={`${row.bib ?? "unknown"}-${row.participantName}-${index}`}
                    >
                      <TableCell className="tabular-nums">
                        {row.rank ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.bib ?? "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.participantName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.categoryName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatDuration(row.gunTimeMs)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.chipTimeMs
                          ? formatDuration(row.chipTimeMs)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="outline">
                            {statusLabel[row.status] ?? row.status}
                          </Badge>
                          {row.isOfficial ? (
                            <Badge variant="secondary">Official</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {rows.length} {rows.length === 1 ? "result" : "results"} on this
              page
            </p>
            {pagination?.hasMore && pagination.nextCursor ? (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <Link
                    href={buildResultsHref(
                      eventSlug,
                      raceSlug,
                      filters,
                      pagination.nextCursor
                    )}
                  />
                }
              >
                Next page
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next page
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
