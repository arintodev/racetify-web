"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { BrandMark } from "@/components/brand-mark"
import { useSession } from "@/lib/auth/session-provider"

export default function RootPage() {
  const { session } = useSession()
  const router = useRouter()

  React.useEffect(() => {
    router.replace(session ? "/workspaces" : "/login")
  }, [router, session])

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30">
      <BrandMark showSubtitle />
    </div>
  )
}
