"use client"

import { ApiError, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Building2, CalendarDays, Mail, UserRound } from "lucide-react"
import { toast } from "sonner"

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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { StatusBadge } from "@/components/status-badge"
import { getBrowserApi } from "@/lib/api/browser"
import { useSession } from "@/lib/auth/session-provider"
import { formatDate } from "@/lib/format"
import { organizationStatuses, type StatusTone } from "@/lib/status"

const statusTone: Record<string, StatusTone> = {
  pending: "warning",
  accepted: "success",
  declined: "neutral",
  expired: "neutral",
  revoked: "destructive",
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function InvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const { session } = useSession()
  const queryClient = useQueryClient()
  const [pendingAction, setPendingAction] = React.useState<
    "accept" | "decline" | null
  >(null)
  const [error, setError] = React.useState<string | null>(null)

  const invitation = useQuery({
    queryKey: ["invitation", params.token],
    queryFn: () =>
      getBrowserApi().request<Schemas["InvitationSummaryDto"]>(
        `/v1/invitations/${params.token}`
      ),
  })

  async function handleAccept() {
    if (!session) {
      router.push(`/login?next=/invite/${params.token}`)
      return
    }
    setError(null)
    setPendingAction("accept")
    try {
      await getBrowserApi().request(`/v1/invitations/${params.token}/accept`, {
        method: "POST",
      })
      const data = invitation.data
      const organizationInactive =
        data?.organization !== undefined && data.organization.status !== "active"

      toast.success("Invitation accepted", {
        description: organizationInactive
          ? "The organization is awaiting activation."
          : undefined,
      })

      if (data?.event) {
        router.push(`/events/${data.event.id}/overview`)
      } else if (data?.organization && !organizationInactive) {
        router.push(`/orgs/${data.organization.id}/overview`)
      } else {
        void queryClient.invalidateQueries({ queryKey: ["workspaces"] })
        router.push("/workspaces")
      }
      router.refresh()
    } catch (acceptError) {
      if (
        acceptError instanceof ApiError &&
        acceptError.code === "invitation_email_mismatch"
      ) {
        setError(
          "This invitation was sent to a different email address. Sign in with that address to accept it."
        )
      } else if (acceptError instanceof ApiError && acceptError.detail) {
        setError(acceptError.detail)
      } else {
        setError("Could not accept the invitation. Try again.")
      }
    } finally {
      setPendingAction(null)
    }
  }

  async function handleDecline() {
    setError(null)
    setPendingAction("decline")
    try {
      await getBrowserApi().request(`/v1/invitations/${params.token}/decline`, {
        method: "POST",
      })
      toast.info("Invitation declined")
      router.push(session ? "/workspaces" : "/login")
    } catch {
      setError("Could not decline the invitation. Try again.")
    } finally {
      setPendingAction(null)
    }
  }

  if (invitation.isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (invitation.isError || !invitation.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitation not found</CardTitle>
          <CardDescription>
            This invitation link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            nativeButton={false}
            render={<a href="/login" />}
            className="w-full"
          >
            Go to sign in
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const data = invitation.data
  const canAccept = data.status === "pending"

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Mail className="size-5" />
        </div>
        <CardTitle>You are invited to join a workspace</CardTitle>
        <CardDescription>{data.invitedBy.name} invited you</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{data.organization.name}</p>
            <p className="text-sm text-muted-foreground">
              Invited as {data.role.name}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {organizationStatuses[data.organization.status] ? (
              <StatusBadge
                label={
                  organizationStatuses[data.organization.status]!.label
                }
                tone={organizationStatuses[data.organization.status]!.tone}
              />
            ) : null}
            <StatusBadge
              label={statusLabel(data.status)}
              tone={statusTone[data.status] ?? "neutral"}
            />
          </div>
        </div>

        {data.event ? (
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <CalendarDays className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{data.event.name}</p>
              <p className="text-sm text-muted-foreground">
                Event team invitation
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Expires</p>
            <p className="mt-1 font-medium">{formatDate(data.expiresAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Role scope</p>
            <p className="mt-1 font-medium">
              {data.role.scope === "event" ? "Event team" : "Organization"}
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserRound className="size-4" />
          Invited by {data.invitedBy.name}
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not update the invitation</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter className="flex-col gap-2 sm:flex-row">
        <Button
          className="w-full"
          onClick={() => void handleAccept()}
          disabled={!canAccept || pendingAction !== null}
        >
          {pendingAction === "accept" ? "Accepting…" : "Accept invitation"}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => void handleDecline()}
          disabled={pendingAction !== null}
        >
          {pendingAction === "decline" ? "Declining…" : "Decline"}
        </Button>
      </CardFooter>
    </Card>
  )
}
