import { Building2, PauseCircle, Archive } from "lucide-react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { EmptyState } from "./empty-state"

const copy = {
  pending: {
    icon: Building2,
    title: "Awaiting activation",
    description:
      "A Racetify platform administrator must activate this organization before it can be used.",
  },
  suspended: {
    icon: PauseCircle,
    title: "Organization suspended",
    description:
      "This organization is suspended. Contact a Racetify platform administrator if you need access.",
  },
  archived: {
    icon: Archive,
    title: "Organization archived",
    description:
      "This organization is archived and no longer accepts changes.",
  },
} as const

export function OrganizationUnavailableState({
  kind,
}: {
  kind: keyof typeof copy
}) {
  const state = copy[kind]

  return (
    <EmptyState
      icon={state.icon}
      title={state.title}
      description={state.description}
      action={
        <Button
          nativeButton={false}
          render={<Link href="/workspaces" />}
          variant="outline"
        >
          Back to workspaces
        </Button>
      }
    />
  )
}
