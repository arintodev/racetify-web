"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Building2, CalendarDays, Users, Wallet } from "lucide-react"

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
import { RequirePermission } from "@/lib/auth/require-permission"
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/format"
import { eventStatuses } from "@/lib/status"

export default function OrganizationOverviewPage() {
  const params = useParams<{ orgId: string }>()
  const orgId = params.orgId

  const organization = useQuery({
    queryKey: queryKeys.org(orgId),
    queryFn: () =>
      getBrowserApi().request<Schemas["OrganizationDto"]>(
        `/v1/orgs/${orgId}`
      ),
  })

  const overview = useQuery({
    queryKey: queryKeys.orgOverview(orgId),
    queryFn: () =>
      getBrowserApi().request<Schemas["OrgOverviewDto"]>(
        `/v1/orgs/${orgId}/overview`
      ),
  })

  if (organization.isPending || overview.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (
    organization.isError ||
    overview.isError ||
    !organization.data ||
    !overview.data
  ) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the organization overview</AlertTitle>
        <AlertDescription>
          Check your access and connection, then try again.
        </AlertDescription>
      </Alert>
    )
  }

  const org = organization.data
  const stats = overview.data.stats

  return (
    <RequirePermission permission="org:overview:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Organization overview"
          description={org.description || org.name}
          actions={
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href={`/orgs/${orgId}/settings`} />}
            >
              <Building2 />
              Settings
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Members"
            value={formatNumber(stats.members)}
            hint="Active organization members"
            icon={Users}
          />
          <StatCard
            label="Events"
            value={formatNumber(stats.events)}
            hint="Non-deleted events"
            icon={CalendarDays}
          />
          <StatCard
            label="Registrations"
            value={formatNumber(stats.registrations)}
            hint="Across all events"
            icon={Users}
          />
          <StatCard
            label="Revenue"
            value={formatCurrency(stats.revenue)}
            hint="Paid orders"
            icon={Wallet}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming events</CardTitle>
              <CardDescription>Events managed by this organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {overview.data.upcomingEvents.map((event) => {
                const status =
                  eventStatuses[event.status as keyof typeof eventStatuses]
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}/overview`}
                    className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{event.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(event.startDate)} ·{" "}
                        {event.location || "Location not set"}
                      </p>
                    </div>
                    {status ? (
                      <StatusBadge label={status.label} tone={status.tone} />
                    ) : null}
                  </Link>
                )
              })}
              {overview.data.upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No events yet.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest organization audit events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {overview.data.recentActivity.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
                >
                  <span className="flex-1 font-mono text-xs">{row.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.actorName ?? "System"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(row.createdAt)}
                  </span>
                </div>
              ))}
              {overview.data.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recent activity.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </RequirePermission>
  )
}
