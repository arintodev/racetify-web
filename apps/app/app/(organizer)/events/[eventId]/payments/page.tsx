"use client"

import { ApiError, queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CreditCard,
  Eye,
  MoreHorizontal,
  RotateCcw,
  Search,
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
import { paymentStatuses } from "@/lib/status"

const PAGE_SIZE = 25

type PaymentRow = Schemas["PaymentRowDto"]

const statusFilterItems = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "expired", label: "Expired" },
  { value: "refunded", label: "Refunded" },
]

function paymentStatus(status: string) {
  return paymentStatuses[status as keyof typeof paymentStatuses]
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.detail ?? error.issues[0]?.message ?? fallback
  }
  return fallback
}

function PaymentDetailSheet({
  row,
  open,
  onOpenChange,
  canManage,
  onRefund,
}: {
  row: PaymentRow | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage: boolean
  onRefund: (row: PaymentRow) => void
}) {
  if (!row) return null
  const status = paymentStatus(row.payment.status)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{row.payment.providerReference}</SheetTitle>
          <SheetDescription>
            {row.payment.provider} · {row.payment.paymentMethod} ·{" "}
            {formatDateTime(row.payment.createdAt)}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
          <div className="flex flex-wrap gap-2">
            {status ? (
              <StatusBadge label={status.label} tone={status.tone} />
            ) : null}
            <Badge variant="outline">{row.payment.provider}</Badge>
            <Badge variant="outline">{row.payment.paymentMethod}</Badge>
          </div>

          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatCurrency(row.payment.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="mt-1 font-medium">
                {row.payment.paidAt ? formatDateTime(row.payment.paidAt) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Order</p>
              <p className="mt-1 font-mono text-xs">
                {row.order?.orderNumber ?? row.payment.orderId}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment ID</p>
              <p className="mt-1 font-mono text-xs">{row.payment.id}</p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Participants</p>
            {row.participants.map((participant) => (
              <div
                key={participant.participantId}
                className="rounded-lg border p-3 text-sm"
              >
                <p className="font-medium">
                  {participant.firstName} {participant.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {participant.raceName ?? "Race"}
                </p>
              </div>
            ))}
            {row.participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No participants linked to this payment.
              </p>
            ) : null}
          </div>
        </div>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {canManage && row.payment.status === "success" ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onRefund(row)}
            >
              <RotateCcw />
              Refund payment
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default function EventPaymentsPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const canManage = useCan("event:payments:manage")
  const queryClient = useQueryClient()

  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)
  const [cursorHistory, setCursorHistory] = React.useState<
    Array<string | undefined>
  >([])
  const [detailId, setDetailId] = React.useState<string | null>(null)
  const [refundRow, setRefundRow] = React.useState<PaymentRow | null>(null)
  const [refundReason, setRefundReason] = React.useState("Organizer refund")

  React.useEffect(() => {
    setCursor(undefined)
    setCursorHistory([])
  }, [query, statusFilter])

  const event = useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["EventDto"]>(`/v1/events/${eventId}`),
  })

  const payments = useQuery({
    queryKey: queryKeys.payments(eventId, {
      q: query.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      cursor,
    }),
    queryFn: () =>
      getBrowserApi().requestEnvelope<PaymentRow[]>(
        `/v1/events/${eventId}/payments`,
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

  const rows = payments.data?.data ?? []
  const pagination = payments.data?.meta.pagination
  const detailRow = rows.find((row) => row.payment.id === detailId)
  const hasFilters = Boolean(query.trim()) || statusFilter !== "all"

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: ["event", eventId, "payments"],
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.eventOverview(eventId),
    })
  }

  async function submitRefund() {
    if (!refundRow) return
    try {
      const updated = await getBrowserApi().request<Schemas["OrderRowDto"]>(
        `/v1/events/${eventId}/payments/${refundRow.payment.id}/refund`,
        {
          method: "POST",
          body: {
            reason: refundReason.trim(),
          } satisfies Schemas["RefundOrderRequest"],
        }
      )
      toast.success(
        updated.refundStatus === "pending" ? "Refund requested" : "Payment refunded",
        {
          description:
            updated.refundStatus === "pending"
              ? "The provider will confirm the refund shortly."
              : refundRow.payment.providerReference,
        }
      )
      invalidate()
      setDetailId(null)
    } catch (error) {
      toast.error("Could not refund the payment", {
        description: errorMessage(error, "Try again."),
      })
      throw error
    } finally {
      setRefundRow(null)
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
    <RequirePermission permission="event:payments:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Payments"
          description={`Payment attempts for ${event.data?.name ?? "this event"}.`}
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(changeEvent) => setQuery(changeEvent.target.value)}
              placeholder="Search reference, order, or buyer"
              className="pl-8"
              aria-label="Search payments"
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
            {payments.isPending
              ? "Loading payments…"
              : `${rows.length} on this page`}
          </p>
        </div>

        {payments.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load payments</AlertTitle>
            <AlertDescription>
              Check your connection and try again.
            </AlertDescription>
          </Alert>
        ) : null}

        {payments.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : null}

        {!payments.isPending && rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const status = paymentStatus(row.payment.status)
                  return (
                    <TableRow key={row.payment.id}>
                      <TableCell className="font-mono text-xs">
                        {row.payment.providerReference}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.order?.orderNumber ?? row.payment.orderId}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatCurrency(row.payment.amount)}
                      </TableCell>
                      <TableCell>
                        <p>{row.payment.provider}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.payment.paymentMethod}
                        </p>
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
                        {formatDateTime(row.payment.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${row.payment.providerReference}`}
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => setDetailId(row.payment.id)}
                            >
                              <Eye />
                              View details
                            </DropdownMenuItem>
                            {canManage && row.payment.status === "success" ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setRefundReason("Organizer refund")
                                  setRefundRow(row)
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

        {!payments.isPending && rows.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={
              hasFilters ? "No payments match these filters" : "No payments yet"
            }
            description={
              hasFilters
                ? "Try a different search or status."
                : "Payment attempts appear here after checkout."
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

        <PaymentDetailSheet
          row={detailRow}
          open={Boolean(detailRow)}
          onOpenChange={(open) => {
            if (!open) setDetailId(null)
          }}
          canManage={canManage}
          onRefund={(row) => {
            setRefundReason("Organizer refund")
            setRefundRow(row)
          }}
        />

        <AlertDialog
          open={Boolean(refundRow)}
          onOpenChange={(open) => {
            if (!open) setRefundRow(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Refund this payment?</AlertDialogTitle>
              <AlertDialogDescription>
                {refundRow
                  ? `${formatCurrency(refundRow.payment.amount)} will be refunded for ${refundRow.order?.orderNumber ?? refundRow.payment.orderId}.`
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
                Refund payment
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePermission>
  )
}
