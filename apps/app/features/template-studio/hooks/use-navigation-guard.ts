"use client"

import * as React from "react"

/** Covers reloads and tab closes. In-app navigation is handled by the autosave flush. */
export function useNavigationGuard(enabled: boolean): void {
  React.useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [enabled])
}
