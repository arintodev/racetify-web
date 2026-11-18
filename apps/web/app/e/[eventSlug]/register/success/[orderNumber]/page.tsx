import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CheckCircle2, Clock3 } from "lucide-react"

import { ApiError, type Schemas } from "@workspace/api-client"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"

import { ShareButton } from "@/components/share-button"
import { CopyOrderNumber } from "@/features/public-registration/copy-order-number"
import { PayNowButton } from "@/features/public-registration/pay-now-button"
import { getServerApi } from "@/lib/api/server"
import { formatCurrency, formatDateRange, formatDateTime } from "@/lib/format"

export const metadata: Metadata = {
  title: "Registration received",
  robots: { index: false, follow: false },
}

const statusLabel: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  cancelled: "Cancelled",
  expired: "Expired",
  refunded: "Refunded",
}

async function fetchOrder(orderNumber: string) {
  try {
    const api = await getServerApi()
    return await api.request<Schemas["PublicOrderDto"]>(
      `/v1/public/orders/${orderNumber}`
    )
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null
    throw error
  }
}

export default async function RegistrationSuccessPage({
  params,
}: {
  params: Promise<{ eventSlug: string; orderNumber: string }>
}) {
  const { eventSlug, orderNumber } = await params
  const order = await fetchOrder(orderNumber)

  if (!order) {
    notFound()
  }

  const pending = order.status === "pending"

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 pb-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="size-7" />
        </div>
        <div className="space-y-1">
          <Badge variant="outline">
            {statusLabel[order.status] ?? order.status}
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">
            Registration received
          </h2>
          <p className="text-sm text-muted-foreground">
            {order.event.name} ·{" "}
            {formatDateRange(order.event.startDate, order.event.endDate)}
          </p>
        </div>
      </div>

      <Card className="[--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="font-mono text-base break-all">
              {order.orderNumber}
            </CardTitle>
            <CopyOrderNumber orderNumber={order.orderNumber} />
          </div>
          <CardDescription>
            {order.lines.length > 0
              ? `This order covers ${order.lines.length} ${
                  order.lines.length === 1 ? "participant" : "participants"
                }.`
              : "This order has no lines."}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {order.lines.length > 0 ? (
            <>
              <ul className="flex flex-col gap-2">
                {order.lines.map((line) => (
                  <li
                    key={`${line.index}-${line.raceId}`}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        Participant {line.index + 1}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {line.raceName}
                        {line.categoryName ? ` · ${line.categoryName}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {formatCurrency(line.fee)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Order total</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                Open the registration link again to choose a race and create an
                order.
              </p>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/e/${eventSlug}/register`} />}
              >
                Go to registration
              </Button>
            </div>
          )}

          <Separator />

          {pending ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-600/30 bg-amber-500/5 p-3">
              <Clock3 className="mt-0.5 size-4 text-amber-600" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Payment is pending</p>
                <p className="text-muted-foreground">
                  Complete the payment to confirm your registration.
                  {order.expiresAt
                    ? ` This order expires ${formatDateTime(order.expiresAt)} if it is not paid.`
                    : " Keep this order number for reference."}
                </p>
                <PayNowButton orderNumber={order.orderNumber} />
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <p className="text-sm font-medium">What happens next</p>
            <p className="text-sm text-muted-foreground">
              Keep this order number for reference. If you lose access to this
              page, contact the organizer with the order number.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ShareButton
              title={`Register for ${order.event.name}`}
              text={`Register for ${order.event.name}`}
              url={`https://racetify.com/e/${eventSlug}/register`}
              label="Share event"
            />
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/e/${eventSlug}/register`} />}
            >
              Register another order
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/e/${eventSlug}/gallery`} />}
            >
              View gallery
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
