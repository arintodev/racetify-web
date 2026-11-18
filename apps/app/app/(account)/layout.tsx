"use client"

import { WorkspaceShell } from "@/components/app-shell/workspace-shell"
import { useSession } from "@/lib/auth/session-provider"
import { RequireSession } from "@/lib/auth/require-session"
import { getAccountNav } from "@/lib/navigation"

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session } = useSession()

  return (
    <RequireSession>
      {session ? (
        <WorkspaceShell
          workspace={{
            kind: "account",
            name: "Account",
            subtitle: session.user.email,
          }}
          navGroups={getAccountNav()}
          breadcrumbs={[{ label: "Account" }]}
        >
          {children}
        </WorkspaceShell>
      ) : null}
    </RequireSession>
  )
}
