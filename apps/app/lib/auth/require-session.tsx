"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { Skeleton } from "@workspace/ui/components/skeleton"

import { useSession } from "./session-provider"

export function RequireSession({ children }: { children: React.ReactNode }) {
  const { session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [pathname, router, session])

  if (!session) {
    return (
      <div className="flex min-h-svh flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return <>{children}</>
}
