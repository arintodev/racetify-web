"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Loader2, RefreshCw, ScrollText } from "lucide-react"
import * as React from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { StatusBadge } from "@/components/status-badge"
import { getBrowserApi } from "@/lib/api/browser"
import { formatDateTime } from "@/lib/format"

import {
  WEBHOOK_DELIVERY_STATUSES,
  statusConfig,
  webhookEventLabel,
} from "../constants"

export function DeliveryHistorySheet({
  open,
  onOpenChange,
  orgId,
  webhook,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  webhook: Schemas["WebhookConfigDto"] | null
}) {
  const history = useInfiniteQuery({
    queryKey: queryKeys.orgWebhookDeliveries(orgId, webhook?.id ?? ""),
    queryFn: ({ pageParam }) => {
      if (!webhook) throw new Error("No webhook selected.")
      return getBrowserApi().request<Schemas["WebhookDeliveryPageDto"]>(
        `/v1/orgs/${orgId}/webhooks/${webhook.id}/deliveries`,
        { query: { limit: 20, cursor: pageParam || undefined } }
      )
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: open && Boolean(webhook),
  })

  const items = history.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Delivery history</SheetTitle>
          <SheetDescription className="break-all">
            {webhook?.url ?? "Webhook"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={history.isFetching}
              onClick={() => void history.refetch()}
            >
              {history.isFetching ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              Refresh
            </Button>
          </div>

          {history.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not load delivery history</AlertTitle>
              <AlertDescription>
                Check your access and connection, then refresh.
              </AlertDescription>
            </Alert>
          ) : null}

          {history.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          ) : null}

          {!history.isPending && !history.isError && items.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
              <ScrollText className="size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No deliveries yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Send a test delivery or wait for the next enrollment event.
              </p>
            </div>
          ) : null}

          {items.map((delivery) => {
            const status = statusConfig(
              WEBHOOK_DELIVERY_STATUSES,
              delivery.status
            )
            return (
              <div
                key={delivery.id}
                className="rounded-lg border bg-card px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {webhookEventLabel(delivery.eventType)}
                  </p>
                  <StatusBadge label={status.label} tone={status.tone} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attempt {delivery.attempts}
                  {delivery.responseStatus
                    ? ` · HTTP ${delivery.responseStatus}`
                    : ""}
                  {" · "}
                  {delivery.deliveredAt
                    ? `Delivered ${formatDateTime(delivery.deliveredAt)}`
                    : `Created ${formatDateTime(delivery.createdAt)}`}
                </p>
                {delivery.status === "pending" && delivery.nextRetryAt ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Retry at {formatDateTime(delivery.nextRetryAt)}
                  </p>
                ) : null}
              </div>
            )
          })}

          {history.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              disabled={history.isFetchingNextPage}
              onClick={() => void history.fetchNextPage()}
            >
              {history.isFetchingNextPage ? (
                <>
                  <Loader2 className="animate-spin" />
                  Loading…
                </>
              ) : (
                "Load more"
              )}
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
