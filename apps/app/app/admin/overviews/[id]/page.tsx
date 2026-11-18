"use client"

import { type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import { CalendarDays, Users, Wallet } from "lucide-react"
import { useParams } from "next/navigation"
import * as React from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
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
import { eventStatuses, organizationStatuses } from "@/lib/status"

export default function AdminTenantSnapshotPage() {
  const params = useParams<{ id: string }>()
  const orgId = params.id

  const snapshot = useQuery({
    queryKey: ["admin", "tenant", orgId],
    queryFn: () =>
      getBrowserApi().request<Schemas["TenantSnapshotDto"]>(
        `/v1/admin/overviews/${orgId}`
      ),
  })

  if (snapshot.isPending) {
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

  if (snapshot.isError || !snapshot.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the tenant snapshot</AlertTitle>
        <AlertDescription>
          Check your administrator access and connection.
        </AlertDescription>
      </Alert>
    )
  }

  const data = snapshot.data
  const organization = data.organization
  const status =
    organizationStatuses[
      organization.status as keyof typeof organizationStatuses
    ]

  return (
    <RequirePermission permission="system:orgs:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={organization.name}
          description={`${organization.slug} · created ${formatDate(organization.createdAt)}`}
          actions={
            status ? (
              <StatusBadge label={status.label} tone={status.tone} />
            ) : null
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Members"
            value={formatNumber(data.usage.members)}
            hint="Active organization members"
            icon={Users}
          />
          <StatCard
            label="Events"
            value={formatNumber(data.usage.events)}
            hint="Non-deleted events"
            icon={CalendarDays}
          />
          <StatCard
            label="Registrations"
            value={formatNumber(data.usage.registrations)}
            hint="Across all events"
            icon={Users}
          />
          <StatCard
            label="Revenue"
            value={formatCurrency(data.usage.revenue)}
            hint="Paid orders"
            icon={Wallet}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>Events in this tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.events.map((event) => {
              const eventStatus =
                eventStatuses[event.status as keyof typeof eventStatuses]
              return (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{event.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(event.startDate)} ·{" "}
                      {formatNumber(event.registrations)} registrations
                    </p>
                  </div>
                  {eventStatus ? (
                    <StatusBadge
                      label={eventStatus.label}
                      tone={eventStatus.tone}
                    />
                  ) : (
                    <Badge variant="outline">{event.status}</Badge>
                  )}
                </div>
              )
            })}
            {data.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No events in this tenant.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest audit events for this tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentActivity.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
              >
                <span className="flex-1 font-mono text-xs">{row.action}</span>
                <span className="text-xs text-muted-foreground">
                  {row.actor?.name ?? "System"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(row.createdAt)}
                </span>
              </div>
            ))}
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent activity.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </RequirePermission>
  )
}
