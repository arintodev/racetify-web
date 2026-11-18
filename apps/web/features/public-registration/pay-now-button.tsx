"use client"

import * as React from "react"
import { CreditCard, Loader2 } from "lucide-react"

import { ApiError, type Schemas } from "@workspace/api-client"
import { Button } from "@workspace/ui/components/button"

import { getBrowserApi } from "@/lib/api/browser"

export function PayNowButton({ orderNumber }: { orderNumber: string }) {
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function pay() {
    setPending(true)
    setError(null)
    try {
      const payment = await getBrowserApi().request<
        Schemas["PublicPaymentDto"]
      >(`/v1/public/orders/${orderNumber}/payments`, {
        method: "POST",
      })
      window.location.assign(payment.redirectUrl)
    } catch (paymentError) {
      setError(
        paymentError instanceof ApiError &&
          paymentError.code === "payment_not_configured"
          ? "Online payment is not available right now. Contact the organizer."
          : "Could not open the payment page. Try again."
      )
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" onClick={() => void pay()} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <CreditCard />}
        {pending ? "Opening payment…" : "Pay now"}
      </Button>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
