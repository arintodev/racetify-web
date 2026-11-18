"use client"

import { ApiError, queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import { notFound, useParams } from "next/navigation"

import { Skeleton } from "@workspace/ui/components/skeleton"

import { WorkspaceShell } from "@/components/app-shell/workspace-shell"
import { ForbiddenState } from "@/components/forbidden-state"
import { OrganizationUnavailableState } from "@/components/organization-unavailable-state"
import { getBrowserApi } from "@/lib/api/browser"
import { useOrgAccess } from "@/lib/auth/access"
import { AccessProvider } from "@/lib/auth/session-provider"
import { getOrganizationNav } from "@/lib/navigation"

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams<{ orgId: string }>()
  const access = useOrgAccess(params.orgId)

  const organization = useQuery({
    queryKey: queryKeys.org(params.orgId),
    queryFn: () =>
      getBrowserApi().request<Schemas["OrganizationDto"]>(
        `/v1/orgs/${params.orgId}`
      ),
    retry: false,
  })

  if (organization.isError) {
    if (organization.error instanceof ApiError) {
      switch (organization.error.code) {
        case "organization_not_active":
          return <OrganizationUnavailableState kind="pending" />
        case "organization_suspended":
          return <OrganizationUnavailableState kind="suspended" />
        case "organization_archived":
          return <OrganizationUnavailableState kind="archived" />
        case "forbidden":
          return <ForbiddenState />
      }

      if (organization.error.status === 404) {
        notFound()
      }
    }

    return (
      <div className="flex min-h-svh items-center justify-center p-6 text-sm text-muted-foreground">
        Could not load this organization. Try again shortly.
      </div>
    )
  }

  if (!organization.data) {
    return (
      <div className="flex min-h-svh flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const data = organization.data

  return (
    <AccessProvider permissions={access.data?.permissions}>
      <WorkspaceShell
        workspace={{
          kind: "organization",
          id: data.id,
          name: data.name,
          subtitle: data.description || "Organization",
        }}
        navGroups={getOrganizationNav(data.id)}
        breadcrumbs={[
          {
            label: data.name,
            href: `/orgs/${data.id}/overview`,
          },
        ]}
      >
        {children}
      </WorkspaceShell>
    </AccessProvider>
  )
}
