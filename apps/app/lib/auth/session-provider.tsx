"use client"

import type { Schemas } from "@workspace/api-client"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import * as React from "react"

import { getBrowserApi } from "@/lib/api/browser"

export type SessionDto = Schemas["SessionDto"]
export type UserDto = Schemas["UserDto"]

type SessionContextValue = {
  session: SessionDto | null
  signOut: () => Promise<void>
}

const SessionContext = React.createContext<SessionContextValue | null>(null)

export function SessionProvider({
  initialSession,
  children,
}: {
  initialSession: SessionDto | null
  children: React.ReactNode
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // The server is the source of truth. A router.refresh() after login/logout updates this prop.
  const session = initialSession

  const signOut = React.useCallback(async () => {
    try {
      await getBrowserApi().request("/v1/auth/logout", { method: "POST" })
    } catch {
      // The cookie may already be gone; clear local state regardless.
    }
    queryClient.clear()
    router.replace("/login")
    router.refresh()
  }, [queryClient, router])

  const value = React.useMemo(() => ({ session, signOut }), [session, signOut])

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession() {
  const value = React.useContext(SessionContext)
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider")
  }
  return value
}

type AccessContextValue = { permissions: Set<string> } | null

const AccessContext = React.createContext<AccessContextValue>(null)

/**
 * Provides the effective permissions for the current organization or event scope. `undefined`
 * means the scope is not resolved yet (show the navigation; the API still enforces access).
 */
export function AccessProvider({
  permissions,
  children,
}: {
  permissions?: string[]
  children: React.ReactNode
}) {
  const value = React.useMemo<AccessContextValue>(
    () => (permissions ? { permissions: new Set(permissions) } : null),
    [permissions]
  )

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  )
}

export function useAccess() {
  return React.useContext(AccessContext)
}

/** UI hint only. The API re-checks every request. */
export function useCan(permission: string) {
  const access = useAccess()
  if (!access) return true
  return access.permissions.has(permission)
}

export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return useCan(permission) ? <>{children}</> : <>{fallback}</>
}
