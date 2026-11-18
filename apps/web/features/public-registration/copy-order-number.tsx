"use client"

import { Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

export function CopyOrderNumber({ orderNumber }: { orderNumber: string }) {
  async function copyOrderNumber() {
    try {
      await navigator.clipboard.writeText(orderNumber)
      toast.success("Order number copied")
    } catch {
      toast.error("Could not copy the order number.")
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label="Copy order number"
      onClick={copyOrderNumber}
    >
      <Copy />
      Copy
    </Button>
  )
}
