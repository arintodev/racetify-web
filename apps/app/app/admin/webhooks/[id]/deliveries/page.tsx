"use client"

import { type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import { Webhook } from "lucide-react"
import { useParams } from "next/navigation"
import * as React from "react"

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { formatDateTime } from "@/lib/format"

type Delivery = Schemas["WebhookDeliveryDto"]

export default function WebhookDeliveriesPage() {
  const params = useParams<{ id: string }>()
  const webhookId = params.id
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const webhook = useQuery({
    queryKey: ["admin", "webhook", webhookId],
    queryFn: () =>
      getBrowserApi().request<Schemas["WebhookDetailDto"]>(
        `/v1/admin/webhooks/${webhookId}`
      ),
  })

  const deliveries = useQuery({
    queryKey: ["admin", "webhook", webhookId, "deliveries"],
    queryFn: () =>
      getBrowserApi().requestEnvelope<Delivery[]>(
        `/v1/admin/webhooks/${webhookId}/deliveries`,
        { query: { limit: 25, cursor } }
      ),
  })

  const deliveryDetail = useQuery({
    queryKey: ["admin", "webhook", webhookId, "delivery", selectedId],
    queryFn: () =>
      getBrowserApi().request<Delivery>(
        `/v1/admin/webhooks/${webhookId}/deliveries/${selectedId}`
      ),
    enabled: Boolean(selectedId),
    retry: false,
  })

  const rows = deliveries.data?.data ?? []
  const pagination = deliveries.data?.meta.pagination
  const selectedRow =
    rows.find((row) => row.id === selectedId) ??
    (selectedId ? deliveryDetail.data : undefined)

  if (webhook.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (webhook.isError || !webhook.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the webhook</AlertTitle>
        <AlertDescription>
          Check your administrator access and connection.
        </AlertDescription>
      </Alert>
    )
  }

  const data = webhook.data

  return (
    <RequirePermission permission="system:webhooks:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Webhook deliveries"
          description={data.url}
        />

        <Card>
          <CardHeader>
            <CardTitle>Endpoint</CardTitle>
            <CardDescription>{data.org.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{data.status}</Badge>
              {data.events.map((event) => (
                <Badge key={event} variant="outline">
                  {event}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Created {formatDateTime(data.createdAt)}
            </p>
          </CardContent>
        </Card>

        {deliveries.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load deliveries</AlertTitle>
            <AlertDescription>
              Check your connection and try again.
            </AlertDescription>
          </Alert>
        ) : null}

        {deliveries.isPending ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : null}

        {!deliveries.isPending && rows.length === 0 ? (
          <EmptyState
            icon={Webhook}
            title="No deliveries yet"
            description="Deliveries appear when the webhook fires."
          />
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {row.eventType}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {row.responseStatus && row.responseStatus < 400
                          ? "delivered"
                          : row.responseStatus
                            ? "failed"
                            : "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.attempts}
                    </TableCell>
                    <TableCell>
                      {row.responseStatus ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.deliveredAt
                        ? formatDateTime(row.deliveredAt)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedId(row.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <Sheet
          open={Boolean(selectedId)}
          onOpenChange={(open) => {
            if (!open) setSelectedId(null)
          }}
        >
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Delivery detail</SheetTitle>
              <SheetDescription>
                {selectedRow?.eventType ?? "Webhook delivery"}
              </SheetDescription>
            </SheetHeader>
            {deliveryDetail.isPending && selectedId ? (
              <div className="px-4">
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
            ) : null}
            {deliveryDetail.isError ? (
              <div className="px-4">
                <Alert variant="destructive">
                  <AlertTitle>Could not load this delivery</AlertTitle>
                  <AlertDescription>Check your connection.</AlertDescription>
                </Alert>
              </div>
            ) : null}
            {selectedRow ? (
              <div className="flex flex-col gap-4 px-4 pb-6 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="mt-1 font-medium">
                      {selectedRow.responseStatus ?? "pending"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Attempts</p>
                    <p className="mt-1 font-medium">{selectedRow.attempts}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="mt-1">
                      {formatDateTime(selectedRow.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Delivered</p>
                    <p className="mt-1">
                      {selectedRow.deliveredAt
                        ? formatDateTime(selectedRow.deliveredAt)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Next retry
                    </p>
                    <p className="mt-1">
                      {selectedRow.nextRetryAt
                        ? formatDateTime(selectedRow.nextRetryAt)
                        : "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Payload summary
                  </p>
                  <pre className="mt-1 max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">
                    {selectedRow.payloadSummary
                      ? JSON.stringify(selectedRow.payloadSummary, null, 2)
                      : "No payload summary."}
                  </pre>
                </div>
              </div>
            ) : null}
          </SheetContent>
        </Sheet>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(pagination?.nextCursor ?? undefined)}
            disabled={!pagination?.hasMore}
          >
            Next
          </Button>
        </div>
      </div>
    </RequirePermission>
  )
}
