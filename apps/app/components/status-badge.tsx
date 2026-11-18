import { Circle, CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"

import type { StatusTone } from "@/lib/status"

const toneConfig = {
  neutral: {
    variant: "outline" as const,
    icon: Circle,
  },
  info: {
    variant: "secondary" as const,
    icon: Info,
  },
  success: {
    variant: "secondary" as const,
    icon: CircleCheck,
  },
  warning: {
    variant: "outline" as const,
    icon: TriangleAlert,
  },
  destructive: {
    variant: "destructive" as const,
    icon: CircleX,
  },
}

export function StatusBadge({
  label,
  tone,
}: {
  label: string
  tone: StatusTone
}) {
  const config = toneConfig[tone]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon />
      {label}
    </Badge>
  )
}
