"use client"

import * as React from "react"

import { ForbiddenState } from "@/components/forbidden-state"

import { useCan } from "./session-provider"

export function RequirePermission({
  permission,
  children,
  description,
}: {
  permission: string
  children: React.ReactNode
  description?: string
}) {
  const allowed = useCan(permission)

  if (!allowed) {
    return <ForbiddenState description={description} />
  }

  return <>{children}</>
}
