"use client"

import { ApiError, queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import { notFound, useParams } from "next/navigation"

import { Skeleton } from "@workspace/ui/components/skeleton"

import { WorkspaceShell } from "@/components/app-shell/workspace-shell"
import { ForbiddenState } from "@/components/forbidden-state"
import { OrganizationUnavailableState } from "@/components/organization-unavailable-state"
import { getBrowserApi } from "@/lib/api/browser"
import { useEventAccess } from "@/lib/auth/access"
import { AccessProvider } from "@/lib/auth/session-provider"
import { formatDateRange } from "@/lib/format"
import { LeaveGuardProvider } from "@/lib/navigation/leave-guard"
import { getEventNav } from "@/lib/navigation"

export default function EventLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams<{ eventId: string }>()
  const access = useEventAccess(params.eventId)

  const event = useQuery({
    queryKey: queryKeys.event(params.eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["EventDto"]>(
        `/v1/events/${params.eventId}`
      ),
    retry: false,
  })

  if (event.isError) {
    if (event.error instanceof ApiError) {
      switch (event.error.code) {
        case "organization_not_active":
          return <OrganizationUnavailableState kind="pending" />
        case "organization_suspended":
          return <OrganizationUnavailableState kind="suspended" />
        case "organization_archived":
          return <OrganizationUnavailableState kind="archived" />
        case "forbidden":
          return <ForbiddenState />
      }

      if (event.error.status === 404) {
        notFound()
      }
    }

    return (
      <div className="flex min-h-svh items-center justify-center p-6 text-sm text-muted-foreground">
        Could not load this event. Try again shortly.
      </div>
    )
  }

  if (!event.data) {
    return (
      <div className="flex min-h-svh flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const data = event.data

  return (
    <AccessProvider permissions={access.data?.permissions}>
      <LeaveGuardProvider>
        <WorkspaceShell
          workspace={{
            kind: "event",
            id: data.id,
            name: data.name,
            subtitle: `${data.organization.name} · ${formatDateRange(data.startDate, data.endDate)}`,
          }}
          navGroups={getEventNav(data.id)}
          breadcrumbs={[
            {
              label: data.organization.name,
              href: `/orgs/${data.orgId}/overview`,
            },
            {
              label: data.name,
              href: `/events/${data.id}/overview`,
            },
          ]}
        >
          {children}
        </WorkspaceShell>
      </LeaveGuardProvider>
    </AccessProvider>
  )
}
