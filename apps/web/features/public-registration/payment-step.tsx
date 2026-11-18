"use client"

import { CreditCard, Loader2 } from "lucide-react"

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
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { OrderSummaryLines, OrderTotal } from "./order-summary"
import type { OrderLine } from "./types"

export function PaymentStep({
  lines,
  total,
  isSubmitting,
  submitError,
}: {
  lines: OrderLine[]
  total: number
  isSubmitting: boolean
  submitError: string | null
}) {
  return (
    <div className="flex flex-col gap-4">
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>Registration not completed</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle>Your order</CardTitle>
          <CardDescription>
            {lines.length} {lines.length === 1 ? "participant" : "participants"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <OrderSummaryLines lines={lines} />
          <OrderTotal total={total} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Payment</CardTitle>
          <CardDescription>
            You will be redirected to a secure payment page after placing the order.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-4">
            <CreditCard className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Secure online payment</p>
              <p className="text-muted-foreground">
                QRIS, virtual account, and card payments are handled by the
                payment provider. No card details are entered on this site.
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Submitting creates your order and opens the payment page.
          </p>
        </CardContent>
      </Card>

      <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" />
            Completing…
          </>
        ) : (
          "Complete registration"
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Refreshing this page clears the form. Nothing is submitted until you complete registration.
      </p>
    </div>
  )
}
