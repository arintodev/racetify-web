"use client"

import { RequireSession } from "@/lib/auth/require-session"

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireSession>{children}</RequireSession>
}
