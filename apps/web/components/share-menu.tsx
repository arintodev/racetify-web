"use client"

import * as React from "react"
import { Copy, MoreHorizontal, QrCode, Share2 } from "lucide-react"
import QRCode from "react-qr-code"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

export function ShareMenu({
  title,
  text,
  url,
}: {
  title: string
  text?: string
  url: string
}) {
  const [qrOpen, setQrOpen] = React.useState(false)

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {
        // Fall through to clipboard when the share sheet is dismissed or
        // unavailable.
      }
    }

    await copyLink()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied", {
        description: "The event link can now be shared.",
      })
    } catch {
      toast.error("Could not copy the link.")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="outline" size="icon">
              <MoreHorizontal />
              <span className="sr-only">Share options</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2" onClick={share}>
            <Share2 />
            Share link
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onClick={() => setQrOpen(true)}>
            <QrCode />
            Show QR code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Scan to open this event page on a phone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-xl bg-white p-4">
              <QRCode
                value={url}
                size={200}
                bgColor="#ffffff"
                fgColor="#111111"
                aria-label={`QR code for ${title}`}
              />
            </div>
            <p className="text-center text-xs break-all text-muted-foreground">
              {url}
            </p>
            <Button type="button" variant="outline" onClick={copyLink}>
              <Copy />
              Copy link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
