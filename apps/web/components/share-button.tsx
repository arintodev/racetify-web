"use client"

import { Share2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

export function ShareButton({
  title,
  text,
  url,
  label = "Share",
}: {
  title: string
  text?: string
  url?: string
  label?: string
}) {
  async function share() {
    const shareUrl = url ?? window.location.href

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: shareUrl })
        return
      } catch {
        // Fall through to clipboard when the share sheet is dismissed or
        // unavailable.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Link copied", {
        description: "The link can now be shared.",
      })
    } catch {
      toast.error("Could not copy the link.")
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={share}>
      <Share2 />
      {label}
    </Button>
  )
}
