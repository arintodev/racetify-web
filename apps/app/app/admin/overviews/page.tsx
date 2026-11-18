"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import { Building2, CalendarDays, Users, Wallet } from "lucide-react"
import Link from "next/link"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
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
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format"
import { organizationStatuses } from "@/lib/status"

export default function AdminOverviewsPage() {
  const overview = useQuery({
    queryKey: queryKeys.adminOverview(),
    queryFn: () =>
      getBrowserApi().request<Schemas["PlatformOverviewDto"]>(
        "/v1/admin/overview"
      ),
  })

  if (overview.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (overview.isError || !overview.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the platform overview</AlertTitle>
        <AlertDescription>
          Check your administrator access and connection.
        </AlertDescription>
      </Alert>
    )
  }

  const data = overview.data
  const stats = data.stats
  const jobHealth = data.jobHealth

  return (
    <RequirePermission permission="system:overview:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Platform overview"
          description="A tenant-level snapshot of the Racetify environment."
          actions={
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/admin/orgs" />}
            >
              <Building2 />
              All organizations
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Organizations"
            value={formatNumber(stats.organizations)}
            hint="Active tenants"
            icon={Building2}
          />
          <StatCard
            label="Users"
            value={formatNumber(stats.users)}
            hint="Organizer and admin accounts"
            icon={Users}
          />
          <StatCard
            label="Events"
            value={formatNumber(stats.events)}
            hint={`${formatNumber(stats.registrations)} registrations`}
            icon={CalendarDays}
          />
          <StatCard
            label="Paid revenue"
            value={formatCurrency(stats.revenue)}
            hint="Across all tenants"
            icon={Wallet}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Job health</CardTitle>
              <CardDescription>
                Outbox work across the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatNumber(jobHealth.pending)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Processing</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatNumber(jobHealth.processing)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Completed (24h)</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatNumber(jobHealth.completedLast24h)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatNumber(jobHealth.failed)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent organizations</CardTitle>
              <CardDescription>Newest tenants on the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.recentOrganizations.map((organization) => {
                const status =
                  organizationStatuses[
                    organization.status as keyof typeof organizationStatuses
                  ]
                return (
                  <Link
                    key={organization.id}
                    href={`/admin/overviews/${organization.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {organization.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {organization.slug} ·{" "}
                        {formatDateTime(organization.createdAt)}
                      </p>
                    </div>
                    {status ? (
                      <StatusBadge label={status.label} tone={status.tone} />
                    ) : (
                      <Badge variant="outline">{organization.status}</Badge>
                    )}
                  </Link>
                )
              })}
              {data.recentOrganizations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No organizations yet.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </RequirePermission>
  )
}
