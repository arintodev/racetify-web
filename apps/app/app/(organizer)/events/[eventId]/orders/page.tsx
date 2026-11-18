"use client"

import { ApiError, queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Eye,
  MoreHorizontal,
  ReceiptText,
  RotateCcw,
  Search,
  X,
} from "lucide-react"
import { useParams } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import {
  AlertDialog,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
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
import { StatusBadge } from "@/components/status-badge"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { useCan } from "@/lib/auth/session-provider"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { orderStatuses, paymentStatuses } from "@/lib/status"

const PAGE_SIZE = 25

type OrderRow = Schemas["OrderRowDto"]

const statusFilterItems = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
]

function orderStatus(status: string) {
  return orderStatuses[status as keyof typeof orderStatuses]
}

function paymentStatus(status: string) {
  return paymentStatuses[status as keyof typeof paymentStatuses]
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.detail ?? error.issues[0]?.message ?? fallback
  }
  return fallback
}

function OrderDetailSheet({
  row,
  open,
  onOpenChange,
  canManage,
  onRefund,
  onCancel,
}: {
  row: OrderRow | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage: boolean
  onRefund: (row: OrderRow) => void
  onCancel: (row: OrderRow) => void
}) {
  if (!row) return null

  const status = orderStatus(row.order.status)
  const payStatus = row.payment ? paymentStatus(row.payment.status) : undefined
  const buyer = row.buyer?.name ?? "Guest order"
  const buyerEmail = row.buyer?.email ?? "—"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{row.order.orderNumber}</SheetTitle>
          <SheetDescription>
            {buyer} · {formatDateTime(row.order.createdAt)}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
          <div className="flex flex-wrap gap-2">
            {status ? (
              <StatusBadge label={status.label} tone={status.tone} />
            ) : null}
            {payStatus ? (
              <Badge variant="outline">Payment · {payStatus.label}</Badge>
            ) : null}
            {row.refundStatus === "pending" ? (
              <Badge variant="secondary">Refund pending</Badge>
            ) : null}
          </div>

          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Buyer</p>
              <p className="mt-1 font-medium">{buyer}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="mt-1 font-medium">{buyerEmail}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="mt-1 font-medium">
                {row.order.paidAt ? formatDateTime(row.order.paidAt) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expires</p>
              <p className="mt-1 font-medium">
                {row.order.expiresAt
                  ? formatDateTime(row.order.expiresAt)
                  : "—"}
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Participants</p>
            {row.participants.map((participant) => (
              <div
                key={participant.participantId}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {participant.firstName} {participant.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {participant.raceName ?? "Race"}
                    {participant.categoryName
                      ? ` · ${participant.categoryName}`
                      : ""}
                  </p>
                </div>
              </div>
            ))}
            {row.participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No participants on this order.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Items</p>
            {row.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    Registration {item.registrationId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <p className="text-sm tabular-nums">
                  {formatCurrency(item.subtotal)}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span className="tabular-nums">
                {formatCurrency(row.order.totalAmount)}
              </span>
            </div>
          </div>

          {row.payment ? (
            <div className="rounded-lg border p-4 text-sm">
              <p className="font-medium">Payment</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Provider</p>
                  <p className="mt-1">{row.payment.provider}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Method</p>
                  <p className="mt-1">{row.payment.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="mt-1">
                    {payStatus?.label ?? row.payment.status}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid at</p>
                  <p className="mt-1">
                    {row.payment.paidAt
                      ? formatDateTime(row.payment.paidAt)
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No payment record for this order.
            </p>
          )}
        </div>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {canManage && row.order.status === "pending" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => onCancel(row)}
            >
              <X />
              Cancel order
            </Button>
          ) : null}
          {canManage && row.order.status === "paid" ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onRefund(row)}
            >
              <RotateCcw />
              Refund order
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default function EventOrdersPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const canManage = useCan("event:orders:manage")
  const queryClient = useQueryClient()

  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)
  const [cursorHistory, setCursorHistory] = React.useState<
    Array<string | undefined>
  >([])
  const [detailId, setDetailId] = React.useState<string | null>(null)
  const [refundOrder, setRefundOrder] = React.useState<OrderRow | null>(null)
  const [refundReason, setRefundReason] = React.useState("Organizer refund")
  const [cancelOrder, setCancelOrder] = React.useState<OrderRow | null>(null)

  React.useEffect(() => {
    setCursor(undefined)
    setCursorHistory([])
  }, [query, statusFilter])

  const event = useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["EventDto"]>(`/v1/events/${eventId}`),
  })

  const orders = useQuery({
    queryKey: queryKeys.orders(eventId, {
      q: query.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      cursor,
    }),
    queryFn: () =>
      getBrowserApi().requestEnvelope<OrderRow[]>(
        `/v1/events/${eventId}/orders`,
        {
          query: {
            q: query.trim() || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            limit: PAGE_SIZE,
            cursor,
          },
        }
      ),
  })

  const rows = orders.data?.data ?? []
  const pagination = orders.data?.meta.pagination
  const detailRow = rows.find((row) => row.order.id === detailId)
  const hasFilters = Boolean(query.trim()) || statusFilter !== "all"

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: ["event", eventId, "orders"],
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.eventOverview(eventId),
    })
  }

  async function submitRefund() {
    if (!refundOrder) return
    try {
      const updated = await getBrowserApi().request<Schemas["OrderRowDto"]>(
        `/v1/events/${eventId}/orders/${refundOrder.order.id}/refund`,
        {
          method: "POST",
          body: {
            reason: refundReason.trim(),
          } satisfies Schemas["RefundOrderRequest"],
        }
      )
      toast.success(
        updated.refundStatus === "pending" ? "Refund requested" : "Order refunded",
        {
          description:
            updated.refundStatus === "pending"
              ? "The provider will confirm the refund shortly."
              : refundOrder.order.orderNumber,
        }
      )
      invalidate()
      setDetailId(null)
    } catch (error) {
      toast.error("Could not refund the order", {
        description: errorMessage(error, "Try again."),
      })
      throw error
    } finally {
      setRefundOrder(null)
    }
  }

  async function submitCancel() {
    if (!cancelOrder) return
    try {
      await getBrowserApi().request(
        `/v1/events/${eventId}/orders/${cancelOrder.order.id}/cancel`,
        { method: "POST" }
      )
      toast.success("Order cancelled")
      invalidate()
      setDetailId(null)
    } catch (error) {
      toast.error("Could not cancel the order", {
        description: errorMessage(error, "Try again."),
      })
    } finally {
      setCancelOrder(null)
    }
  }

  function nextPage() {
    if (!pagination?.nextCursor) return
    setCursorHistory((history) => [...history, cursor])
    setCursor(pagination.nextCursor ?? undefined)
  }

  function previousPage() {
    const history = [...cursorHistory]
    const previous = history.pop()
    setCursorHistory(history)
    setCursor(previous)
  }

  return (
    <RequirePermission permission="event:orders:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Orders"
          description={`Registrations and payments for ${event.data?.name ?? "this event"}.`}
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(changeEvent) => setQuery(changeEvent.target.value)}
              placeholder="Search order number or buyer"
              className="pl-8"
              aria-label="Search orders"
            />
          </div>
          <Select
            items={statusFilterItems}
            value={statusFilter}
            onValueChange={(value) => {
              if (typeof value === "string") setStatusFilter(value)
            }}
          >
            <SelectTrigger className="w-[160px]" aria-label="Filter by status">
              <SelectValue>
                {(value) =>
                  statusFilterItems.find((item) => item.value === value)
                    ?.label ?? "All statuses"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statusFilterItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground lg:ml-auto">
            {orders.isPending
              ? "Loading orders…"
              : `${rows.length} on this page`}
          </p>
        </div>

        {orders.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load orders</AlertTitle>
            <AlertDescription>
              Check your connection and try again.
            </AlertDescription>
          </Alert>
        ) : null}

        {orders.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : null}

        {!orders.isPending && rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const status = orderStatus(row.order.status)
                  return (
                    <TableRow key={row.order.id}>
                      <TableCell className="font-mono text-xs">
                        {row.order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {row.buyer?.name ?? "Guest"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.buyer?.email ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        {row.participants.length} participant
                        {row.participants.length === 1 ? "" : "s"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatCurrency(row.order.totalAmount)}
                      </TableCell>
                      <TableCell>
                        {status ? (
                          <StatusBadge
                            label={status.label}
                            tone={status.tone}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(row.order.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${row.order.orderNumber}`}
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => setDetailId(row.order.id)}
                            >
                              <Eye />
                              View details
                            </DropdownMenuItem>
                            {canManage && row.order.status === "pending" ? (
                              <DropdownMenuItem
                                onClick={() => setCancelOrder(row)}
                              >
                                <X />
                                Cancel order
                              </DropdownMenuItem>
                            ) : null}
                            {canManage && row.order.status === "paid" ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setRefundReason("Organizer refund")
                                  setRefundOrder(row)
                                }}
                              >
                                <RotateCcw />
                                Refund
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {!orders.isPending && rows.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={
              hasFilters ? "No orders match these filters" : "No orders yet"
            }
            description={
              hasFilters
                ? "Try a different search or status."
                : "Orders appear here after public registration."
            }
            action={
              hasFilters ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("")
                    setStatusFilter("all")
                  }}
                >
                  Reset filters
                </Button>
              ) : undefined
            }
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {cursorHistory.length > 0
              ? `Page ${cursorHistory.length + 1}`
              : "Page 1"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={previousPage}
              disabled={cursorHistory.length === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={!pagination?.hasMore}
            >
              Next
            </Button>
          </div>
        </div>

        <OrderDetailSheet
          row={detailRow}
          open={Boolean(detailRow)}
          onOpenChange={(open) => {
            if (!open) setDetailId(null)
          }}
          canManage={canManage}
          onRefund={(row) => {
            setRefundReason("Organizer refund")
            setRefundOrder(row)
          }}
          onCancel={(row) => setCancelOrder(row)}
        />

        <AlertDialog
          open={Boolean(refundOrder)}
          onOpenChange={(open) => {
            if (!open) setRefundOrder(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Refund this order?</AlertDialogTitle>
              <AlertDialogDescription>
                {refundOrder
                  ? `${formatCurrency(refundOrder.order.totalAmount)} will be refunded for ${refundOrder.order.orderNumber}. The participant record stays in place.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={refundReason}
              onChange={(changeEvent) =>
                setRefundReason(changeEvent.target.value)
              }
              placeholder="Reason for the refund"
              aria-label="Refund reason"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogCancel
                variant="destructive"
                onClick={() => void submitRefund()}
              >
                Refund order
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={Boolean(cancelOrder)}
          onOpenChange={(open) => {
            if (!open) setCancelOrder(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
              <AlertDialogDescription>
                {cancelOrder?.order.orderNumber ?? "This order"} and its pending
                registrations will be cancelled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep order</AlertDialogCancel>
              <AlertDialogCancel
                variant="destructive"
                onClick={() => void submitCancel()}
              >
                Cancel order
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePermission>
  )
}
