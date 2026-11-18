"use client"

import { ApiError, queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  History,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Send,
  Trash2,
  Webhook,
} from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { getBrowserApi } from "@/lib/api/browser"
import { formatDateTime } from "@/lib/format"
import { webhookStatuses } from "@/lib/status"

import {
  WEBHOOK_DELIVERY_STATUSES,
  statusConfig,
  webhookEventLabel,
} from "../constants"
import { DeliveryHistorySheet } from "./delivery-history-sheet"
import { SecretDialog } from "./secret-dialog"
import { WebhookForm } from "./webhook-form"

type WebhookConfig = Schemas["WebhookConfigDto"]

type SecretState = {
  secret: string
  url: string
}

export function WebhookPanel({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<WebhookConfig | null>(null)
  const [secret, setSecret] = React.useState<SecretState | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<WebhookConfig | null>(
    null
  )
  const [historyTarget, setHistoryTarget] =
    React.useState<WebhookConfig | null>(null)
  const [pendingAction, setPendingAction] = React.useState<string | null>(null)
  const [deletePending, setDeletePending] = React.useState(false)

  const webhooks = useQuery({
    queryKey: queryKeys.orgWebhooks(orgId),
    queryFn: () =>
      getBrowserApi().request<WebhookConfig[]>(`/v1/orgs/${orgId}/webhooks`),
    retry: false,
  })

  const rows = webhooks.data ?? []

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.orgWebhooks(orgId),
    })
  }

  async function testEndpoint(webhook: WebhookConfig) {
    const action = `test:${webhook.id}`
    setPendingAction(action)
    try {
      await getBrowserApi().request<Schemas["TestWebhookResponse"]>(
        `/v1/orgs/${orgId}/webhooks/${webhook.id}/test`,
        { method: "POST" }
      )
      toast.success("Test delivery queued", {
        description: "It appears in the delivery history in a few seconds.",
      })
      invalidate()
    } catch (error) {
      toast.error("Could not queue the test delivery", {
        description:
          error instanceof ApiError ? error.detail : "Try again shortly.",
      })
    } finally {
      setPendingAction(null)
    }
  }

  async function toggleStatus(webhook: WebhookConfig) {
    const next = webhook.status === "active" ? "disabled" : "active"
    const action = `status:${webhook.id}`
    setPendingAction(action)
    try {
      await getBrowserApi().request<WebhookConfig>(
        `/v1/orgs/${orgId}/webhooks/${webhook.id}`,
        {
          method: "PATCH",
          body: { status: next } satisfies Schemas["UpdateWebhookRequest"],
        }
      )
      toast.success(
        next === "active" ? "Endpoint enabled" : "Endpoint disabled"
      )
      invalidate()
    } catch (error) {
      toast.error("Could not update the endpoint", {
        description:
          error instanceof ApiError ? error.detail : "Try again shortly.",
      })
    } finally {
      setPendingAction(null)
    }
  }

  async function deleteConfirmed() {
    if (!deleteTarget) return
    setDeletePending(true)
    try {
      await getBrowserApi().request(
        `/v1/orgs/${orgId}/webhooks/${deleteTarget.id}`,
        { method: "DELETE" }
      )
      toast.success("Webhook endpoint deleted")
      setDeleteTarget(null)
      invalidate()
    } catch (error) {
      toast.error("Could not delete the endpoint", {
        description:
          error instanceof ApiError ? error.detail : "Try again shortly.",
      })
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Signed enrollment notifications for this organization. Every active
          endpoint receives each subscribed event, whichever OAuth client created
          the enrollment.
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Add endpoint
        </Button>
      </div>

      {webhooks.error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load webhooks</AlertTitle>
          <AlertDescription>
            {webhooks.error instanceof ApiError
              ? (webhooks.error.detail ?? webhooks.error.message)
              : "Check your access and connection."}
          </AlertDescription>
        </Alert>
      ) : null}

      {webhooks.isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : null}

      {!webhooks.isPending && !webhooks.error && rows.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="No webhook endpoints"
          description="Add an endpoint to notify your systems when a face enrollment completes or fails."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              Add endpoint
            </Button>
          }
        />
      ) : null}

      {!webhooks.isPending && !webhooks.error && rows.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-2">
            {rows.map((endpoint) => {
              const endpointStatus = statusConfig(webhookStatuses, endpoint.status)
              const last = endpoint.lastDelivery
              const lastStatus = last
                ? statusConfig(WEBHOOK_DELIVERY_STATUSES, last.status)
                : null

              return (
                <div key={endpoint.id} className="rounded-lg border px-3 py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1.5">
                      <p
                        className="truncate font-mono text-xs"
                        title={endpoint.url}
                      >
                        {endpoint.url}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {endpoint.events.map((event) => (
                          <Badge key={event} variant="outline">
                            {webhookEventLabel(event)}
                          </Badge>
                        ))}
                        <StatusBadge
                          label={endpointStatus.label}
                          tone={endpointStatus.tone}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Last delivery</span>
                        {last && lastStatus ? (
                          <StatusBadge
                            label={lastStatus.label}
                            tone={lastStatus.tone}
                          />
                        ) : (
                          <span>None yet</span>
                        )}
                        {last?.deliveredAt ? (
                          <span>{formatDateTime(last.deliveredAt)}</span>
                        ) : null}
                        {last?.responseStatus ? (
                          <span>HTTP {last.responseStatus}</span>
                        ) : null}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${endpoint.url}`}
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => setEditing(endpoint)}>
                          <Pencil />
                          Edit endpoint
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={pendingAction === `test:${endpoint.id}`}
                          onClick={() => void testEndpoint(endpoint)}
                        >
                          <Send />
                          Send test delivery
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setHistoryTarget(endpoint)}
                        >
                          <History />
                          Delivery history
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={pendingAction === `status:${endpoint.id}`}
                          onClick={() => void toggleStatus(endpoint)}
                        >
                          <Power />
                          {endpoint.status === "active"
                            ? "Disable endpoint"
                            : "Enable endpoint"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(endpoint)}
                        >
                          <Trash2 />
                          Delete endpoint
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      <WebhookForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        orgId={orgId}
        onCreated={(created) =>
          setSecret({ secret: created.secret, url: created.webhook.url })
        }
        onSaved={invalidate}
      />

      <WebhookForm
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        orgId={orgId}
        webhook={editing}
        onSaved={invalidate}
      />

      <SecretDialog
        open={Boolean(secret)}
        onOpenChange={(open) => {
          if (!open) setSecret(null)
        }}
        title="Webhook signing secret"
        description="Verify each delivery's HMAC with this secret. It is shown only once."
        secret={secret?.secret ?? ""}
        contextLabel="Endpoint URL"
        contextValue={secret?.url}
      />

      <DeliveryHistorySheet
        open={Boolean(historyTarget)}
        onOpenChange={(open) => {
          if (!open) setHistoryTarget(null)
        }}
        orgId={orgId}
        webhook={historyTarget}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this endpoint?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.url ?? "This endpoint"} stops receiving organization
              events and its delivery history is removed. OAuth clients are not
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={() => void deleteConfirmed()}
            >
              {deletePending ? "Deleting…" : "Delete endpoint"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
