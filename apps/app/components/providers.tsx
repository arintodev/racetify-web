"use client"

import { Toaster } from "@workspace/ui/components/sonner"
import { TooltipProvider } from "@workspace/ui/components/tooltip"

import { SessionProvider, type SessionDto } from "@/lib/auth/session-provider"
import { QueryProvider } from "@/lib/query/query-provider"

import { ThemeProvider } from "./theme-provider"

export function Providers({
  session,
  children,
}: {
  session: SessionDto | null
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <SessionProvider initialSession={session}>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </TooltipProvider>
        </SessionProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}
