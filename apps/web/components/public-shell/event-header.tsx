import { CalendarDays, MapPin } from "lucide-react"

import type { Schemas } from "@workspace/api-client"

import { formatDateRange } from "@/lib/format"

export function EventHeader({ event }: { event: Schemas["PublicEventDto"] }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 pt-6 md:pt-10">
      <div className="relative h-52 overflow-hidden rounded-2xl border bg-zinc-900 shadow-sm sm:h-64">
        {event.coverUrl ? (
          // Public bucket URLs bypass the Next image optimizer (no remotePatterns configured).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#3f3f46,transparent_55%),radial-gradient(circle_at_80%_10%,#52525b,transparent_45%),linear-gradient(160deg,#18181b,#27272a)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 text-white sm:p-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {event.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {formatDateRange(event.startDate, event.endDate)}
            </span>
            {event.location ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {event.location}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
