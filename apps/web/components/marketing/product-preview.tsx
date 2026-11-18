import {
  ClipboardList,
  CreditCard,
  Images,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react"

const modules: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Registration", icon: ClipboardList },
  { label: "Participants", icon: Users },
  { label: "Orders", icon: CreditCard },
  { label: "Media", icon: Images },
  { label: "Results", icon: Trophy },
]

export function ProductPreview() {
  return (
    <div
      role="img"
      aria-label="Preview of the Racetify organizer workspace"
      className="relative"
    >
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="size-2 rounded-full bg-primary" />
            Organizer workspace
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2 rounded-full bg-muted-foreground/20" />
            <span className="size-2 rounded-full bg-muted-foreground/20" />
            <span className="size-2 rounded-full bg-muted-foreground/20" />
          </div>
        </div>

        <div className="grid gap-2 pt-3 sm:grid-cols-2">
          {modules.map((module) => {
            const Icon = module.icon

            return (
              <div
                key={module.label}
                className="rounded-xl border bg-background p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="text-sm font-medium">{module.label}</span>
                </div>
                <div className="mt-3 space-y-1.5" aria-hidden="true">
                  <div className="h-1.5 w-2/3 rounded-full bg-muted" />
                  <div className="h-1.5 w-1/2 rounded-full bg-muted" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="absolute -right-4 -bottom-4 hidden rounded-xl border bg-background px-4 py-3 text-xs text-muted-foreground shadow-sm sm:block">
        One workspace. One event team.
      </div>
    </div>
  )
}
