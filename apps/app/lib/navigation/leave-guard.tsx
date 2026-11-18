"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"

type Blocker = {
  message: string
  onLeave?: () => Promise<void> | void
}

type LeaveGuardContextValue = {
  register: (blocker: Blocker | null) => void
  requestNavigation: (href: string) => boolean
  navigate: (href: string) => void
}

const LeaveGuardContext = React.createContext<LeaveGuardContextValue | null>(
  null
)

const DEFAULT_MESSAGE =
  "An upload is still running. Files that have already finished will be saved, but photos still uploading or waiting in the queue may be lost."

/**
 * Blocks in-app navigation while a page registers a blocker. The upload workspace uses it so a
 * photographer cannot accidentally leave mid-batch; finished batches remain safe server-side.
 */
export function LeaveGuardProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const blockerRef = React.useRef<Blocker | null>(null)
  const [pendingHref, setPendingHref] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState(DEFAULT_MESSAGE)
  const [leaving, setLeaving] = React.useState(false)

  const register = React.useCallback((blocker: Blocker | null) => {
    blockerRef.current = blocker
    if (blocker) setMessage(blocker.message)
  }, [])

  const requestNavigation = React.useCallback((href: string) => {
    if (!blockerRef.current) return false
    setPendingHref(href)
    return true
  }, [])

  const navigate = React.useCallback(
    (href: string) => {
      if (!requestNavigation(href)) router.push(href)
    },
    [requestNavigation, router]
  )

  const value = React.useMemo(
    () => ({ register, requestNavigation, navigate }),
    [register, requestNavigation, navigate]
  )

  async function confirmLeave() {
    const href = pendingHref
    if (!href) return
    setLeaving(true)
    try {
      await withTimeout(blockerRef.current?.onLeave?.(), 3_000)
    } catch {
      // Leaving must never hang on a best-effort finish.
    }
    setLeaving(false)
    setPendingHref(null)
    router.push(href)
  }

  return (
    <LeaveGuardContext.Provider value={value}>
      {children}
      <AlertDialog
        open={pendingHref !== null}
        onOpenChange={(open) => {
          if (!open && !leaving) setPendingHref(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave while uploading?</AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaving}>Stay</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={leaving}
              onClick={(event) => {
                event.preventDefault()
                void confirmLeave()
              }}
            >
              {leaving ? "Stopping uploads…" : "Leave and stop"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LeaveGuardContext.Provider>
  )
}

function useLeaveGuard(): LeaveGuardContextValue | null {
  return React.useContext(LeaveGuardContext)
}

/** Registers a navigation blocker and the browser's `beforeunload` prompt while enabled. */
export function useBlockNavigation(
  enabled: boolean,
  options: {
    message?: string
    onLeave?: () => Promise<void> | void
  } = {}
): void {
  const guard = useLeaveGuard()
  const register = guard?.register
  const { message, onLeave } = options

  React.useEffect(() => {
    if (!register) return
    if (!enabled) {
      register(null)
      return
    }
    register({ message: message ?? DEFAULT_MESSAGE, onLeave })
    return () => register(null)
  }, [enabled, message, onLeave, register])

  React.useEffect(() => {
    if (!enabled) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [enabled])
}

/** Next `<Link>` that respects the active blocker (plain Link without a provider). */
export function GuardedLink({
  onNavigate,
  ...props
}: React.ComponentProps<typeof Link>) {
  const guard = useLeaveGuard()
  if (!guard) return <Link {...props} onNavigate={onNavigate} />

  return (
    <Link
      {...props}
      onNavigate={(event) => {
        onNavigate?.(event)
        if (guard.requestNavigation(String(props.href))) event.preventDefault()
      }}
    />
  )
}

/** `router.push` equivalent used by controls that are not `<Link>`s. */
export function useGuardedNavigate(): (href: string) => void {
  const guard = useLeaveGuard()
  const router = useRouter()

  return React.useCallback(
    (href: string) => {
      if (guard) {
        guard.navigate(href)
      } else {
        router.push(href)
      }
    },
    [guard, router]
  )
}

function withTimeout<T>(value: T | Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([
    Promise.resolve(value),
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ])
}
