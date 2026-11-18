"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Award,
  CalendarDays,
  CreditCard,
  Flag,
  Images,
  ReceiptText,
  Route,
  UserRound,
  Users,
} from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { StatusBadge } from "@/components/status-badge"
import { getBrowserApi } from "@/lib/api/browser"
import { Can } from "@/lib/auth/session-provider"
import {
  formatCurrency,
  formatDateRange,
  formatDateTime,
  formatDistance,
  formatNumber,
} from "@/lib/format"
import { eventStatuses } from "@/lib/status"

export default function EventOverviewPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId

  const event = useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["EventDto"]>(`/v1/events/${eventId}`),
  })

  const overview = useQuery({
    queryKey: queryKeys.eventOverview(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["EventOverviewDto"]>(
        `/v1/events/${eventId}/overview`
      ),
  })

  const races = useQuery({
    queryKey: queryKeys.eventRaces(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["RaceDto"][]>(
        `/v1/events/${eventId}/races`
      ),
  })

  if (event.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (event.isError || !event.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load this event</AlertTitle>
        <AlertDescription>
          Check your connection and try again.
        </AlertDescription>
      </Alert>
    )
  }

  const data = event.data
  const status = eventStatuses[data.status as keyof typeof eventStatuses]
  const stats = overview.data?.stats
  const raceRows = races.data ?? []
  const recentOrders = overview.data?.recentOrders ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Event overview"
        description={data.shortDescription}
        actions={
          <>
            {status ? (
              <StatusBadge label={status.label} tone={status.tone} />
            ) : null}
            <Can permission="event:gallery:view">
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`/events/${data.id}/gallery`} />}
              >
                <Images />
                Open gallery
              </Button>
            </Can>
          </>
        }
      />

      {overview.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load event statistics</AlertTitle>
          <AlertDescription>
            The event is available; refresh to retry the overview.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Participants"
          value={formatNumber(stats?.participants ?? 0)}
          hint={`${formatNumber(stats?.confirmedRegistrations ?? 0)} confirmed`}
          icon={UserRound}
        />
        <StatCard
          label="Registrations"
          value={formatNumber(stats?.registrations ?? 0)}
          hint="All statuses"
          icon={CalendarDays}
        />
        <Can
          permission="event:orders:view"
          fallback={
            <StatCard
              label="Team"
              value={formatNumber(stats?.team ?? 0)}
              hint="People with event access"
              icon={Users}
            />
          }
        >
          <StatCard
            label="Paid revenue"
            value={formatCurrency(stats?.revenue ?? 0)}
            hint="From paid orders"
            icon={ReceiptText}
          />
        </Can>
        <StatCard
          label="Photos"
          value={formatNumber(stats?.photos ?? 0)}
          hint={`${formatNumber(stats?.certificates ?? 0)} certificates`}
          icon={Images}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Races</CardTitle>
            <CardDescription>
              {raceRows.length} race categories configured for this event.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {raceRows.map((race) => (
              <div
                key={race.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Route className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{race.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistance(race.distanceKm)} · {race.categories.length}{" "}
                    categories · starts{" "}
                    {formatDateTime(race.startTime, data.timezone)}
                  </p>
                </div>
              </div>
            ))}
            {raceRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No races have been added yet.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>
              The latest registrations and payments for this event.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.slice(0, 6).map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <CreditCard className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs">
                    {order.orderNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(order.totalAmount)} ·{" "}
                    {formatDateTime(order.createdAt, data.timezone)}
                  </p>
                </div>
                <StatusBadge
                  label={order.status}
                  tone={order.status === "paid" ? "success" : "warning"}
                />
              </div>
            ))}
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event details</CardTitle>
          <CardDescription>
            Key dates and ownership for this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Organization</p>
            <p className="mt-1 font-medium">{data.organization.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dates</p>
            <p className="mt-1 font-medium">
              {formatDateRange(data.startDate, data.endDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="mt-1 font-medium">{data.location || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Timezone</p>
            <p className="mt-1 font-medium">{data.timezone}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Can permission="event:participants:view">
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/events/${data.id}/participants`} />}
          >
            <Users />
            Participants
          </Button>
        </Can>
        <Can permission="event:orders:view">
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/events/${data.id}/orders`} />}
          >
            <CreditCard />
            Orders
          </Button>
        </Can>
        <Can permission="event:certificates:view">
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/events/${data.id}/certificates`} />}
          >
            <Award />
            Certificates
          </Button>
        </Can>
        <Can permission="event:races:manage">
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/events/${data.id}/races`} />}
          >
            <Flag />
            Races
          </Button>
        </Can>
      </div>
    </div>
  )
}
