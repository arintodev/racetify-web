"use client"

import { ApiError, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"

import { Skeleton } from "@workspace/ui/components/skeleton"

import { WorkspaceShell } from "@/components/app-shell/workspace-shell"
import { ForbiddenState } from "@/components/forbidden-state"
import { getBrowserApi } from "@/lib/api/browser"
import { useSystemAccess } from "@/lib/auth/access"
import { RequireSession } from "@/lib/auth/require-session"
import { AccessProvider } from "@/lib/auth/session-provider"
import { getAdminNav } from "@/lib/navigation"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Probe one admin endpoint and hide the section on 403; the system-access query then filters
  // navigation and actions. Individual pages still handle their own 403 responses.
  const access = useSystemAccess()
  const probe = useQuery({
    queryKey: ["admin", "access-probe"],
    queryFn: () =>
      getBrowserApi().request<Schemas["PlatformOverviewDto"]>(
        "/v1/admin/overview"
      ),
    retry: false,
    staleTime: 60_000,
  })

  return (
    <RequireSession>
      {probe.isPending || access.isPending ? (
        <div className="flex min-h-svh flex-col gap-4 p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : probe.isError ? (
        <div className="p-6">
          <ForbiddenState
            description={
              probe.error instanceof ApiError && probe.error.status === 403
                ? "Your account does not have platform administrator access."
                : "Could not verify administrator access. Try again shortly."
            }
          />
        </div>
      ) : (
        <AccessProvider permissions={access.data?.permissions}>
          <WorkspaceShell
            workspace={{
              kind: "admin",
              name: "Platform admin",
              subtitle: "Racetify operations",
            }}
            navGroups={getAdminNav()}
            breadcrumbs={[{ label: "Platform admin" }]}
          >
            {children}
          </WorkspaceShell>
        </AccessProvider>
      )}
    </RequireSession>
  )
}
