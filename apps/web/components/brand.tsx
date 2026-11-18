import { Flag } from "lucide-react"
import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2.5", className)}
      aria-label="Racetify home"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Flag className="size-4" />
      </span>
      <span className="text-lg font-semibold tracking-tight">Racetify</span>
    </Link>
  )
}
