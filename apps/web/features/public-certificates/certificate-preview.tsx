import { Award, BadgeCheck } from "lucide-react"

import type { Schemas } from "@workspace/api-client"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"

import { formatDate } from "@/lib/format"

export function CertificatePreview({
  certificate,
}: {
  certificate: Schemas["PublicCertificateDto"]
}) {
  return (
    <div className="rounded-xl border border-amber-600/30 bg-gradient-to-br from-amber-50 via-card to-card p-1 dark:from-amber-950/25">
      <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-lg border border-amber-600/25 px-5 py-10 text-center sm:px-8">
        <Award
          aria-hidden
          className="pointer-events-none absolute -right-6 -bottom-8 size-40 text-amber-600/10"
        />

        <div className="flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          <Award className="size-4" />
          Certificate of Completion
        </div>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Presented to</p>
          <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {certificate.participantName}
          </p>
        </div>

        <p className="max-w-md text-sm text-muted-foreground">
          for completing{" "}
          <span className="font-medium text-foreground">
            {certificate.raceName ?? certificate.event.name}
          </span>
          {certificate.categoryName ? ` · ${certificate.categoryName}` : ""}
        </p>

        <div className="grid w-full max-w-sm gap-3 pt-1 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Event</p>
            <p className="font-medium">{certificate.event.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium">
              {formatDate(certificate.event.startDate)}
            </p>
          </div>
        </div>

        <Separator className="max-w-xs" />

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="font-mono">{certificate.certificateNumber}</span>
          <Badge variant="secondary" className="gap-1">
            <BadgeCheck className="size-3.5" />
            Verified
          </Badge>
        </div>
      </div>
    </div>
  )
}
