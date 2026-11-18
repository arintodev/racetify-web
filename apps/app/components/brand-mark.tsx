import { Flag } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

export function BrandMark({
  className,
  showSubtitle = false,
}: {
  className?: string
  showSubtitle?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Flag className="size-5" />
      </div>
      <div className="leading-tight">
        <span className="text-lg font-semibold tracking-tight">Racetify</span>
        {showSubtitle ? (
          <span className="block text-xs text-muted-foreground">
            Race operations
          </span>
        ) : null}
      </div>
    </div>
  )
}
