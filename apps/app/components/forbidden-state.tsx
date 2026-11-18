import { Lock } from "lucide-react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { EmptyState } from "./empty-state"

export function ForbiddenState({
  description = "Your account does not include access to this screen.",
}: {
  description?: string
}) {
  return (
    <EmptyState
      icon={Lock}
      title="You do not have access"
      description={description}
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
