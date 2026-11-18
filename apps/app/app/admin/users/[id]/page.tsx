"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
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
import { StatusBadge } from "@/components/status-badge"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { formatDateTime, initials } from "@/lib/format"
import { userStatuses } from "@/lib/status"

type UserDetail = Schemas["AdminUserDetailDto"]

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
  const userId = params.id
  const queryClient = useQueryClient()

  const user = useQuery({
    queryKey: queryKeys.adminUser(userId),
    queryFn: () =>
      getBrowserApi().request<UserDetail>(`/v1/admin/users/${userId}`),
  })

  async function act(action: "suspend" | "activate" | "sessions/revoke") {
    try {
      await getBrowserApi().request(`/v1/admin/users/${userId}/${action}`, {
        method: "POST",
      })
      toast.success(
        action === "suspend"
          ? "User suspended"
          : action === "activate"
            ? "User activated"
            : "Sessions revoked"
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminUser(userId),
      })
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    } catch {
      toast.error("Could not complete the action")
    }
  }

  if (user.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (user.isError || !user.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the user</AlertTitle>
        <AlertDescription>
          Check your administrator access and connection.
        </AlertDescription>
      </Alert>
    )
  }

  const data = user.data
  const status = userStatuses[data.status as keyof typeof userStatuses]

  return (
    <RequirePermission permission="system:users:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={data.name}
          description={data.email}
          actions={
            <>
              {status ? (
                <StatusBadge label={status.label} tone={status.tone} />
              ) : null}
              <Button
                variant="outline"
                onClick={() =>
                  void act(
                    data.status === "active" ? "suspend" : "activate"
                  )
                }
              >
                {data.status === "active" ? "Suspend" : "Activate"}
              </Button>
              <Button
                variant="outline"
                onClick={() => void act("sessions/revoke")}
              >
                Revoke sessions
              </Button>
            </>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Account and verification details.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-start gap-4">
            <Avatar className="size-16">
              <AvatarImage src={data.avatarUrl ?? ""} alt={data.name} />
              <AvatarFallback>{initials(data.name)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">User ID</p>
                <p className="mt-1 font-mono text-xs">{data.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email verified</p>
                <p className="mt-1 font-medium">
                  {data.emailVerified ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="mt-1 font-medium">{data.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last login</p>
                <p className="mt-1 font-medium">
                  {data.lastLoginAt
                    ? formatDateTime(data.lastLoginAt)
                    : "Never"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="mt-1 font-medium">
                  {formatDateTime(data.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Memberships</CardTitle>
            <CardDescription>Organization roles for this user.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.memberships.map((membership) => (
              <div
                key={`${membership.orgId}-${membership.roleName}`}
                className="flex items-center gap-3 rounded-lg border p-3 text-sm"
              >
                <span className="flex-1">{membership.orgName}</span>
                <Badge variant="outline">{membership.roleName}</Badge>
                <span className="text-xs text-muted-foreground">
                  {membership.status}
                </span>
              </div>
            ))}
            {data.memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No organization memberships.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active sessions</CardTitle>
            <CardDescription>Devices currently signed in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
              >
                <span className="flex-1">
                  {session.userAgent || "Unknown device"}
                </span>
                {session.current ? (
                  <Badge variant="secondary">Current</Badge>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {session.ipAddress ?? "Unknown IP"} ·{" "}
                  {formatDateTime(session.lastSeenAt)}
                </span>
              </div>
            ))}
            {data.sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active sessions.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </RequirePermission>
  )
}
