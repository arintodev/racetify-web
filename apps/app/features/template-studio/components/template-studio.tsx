"use client"

import { Eye, EyeOff, TriangleAlert } from "lucide-react"
import dynamic from "next/dynamic"
import * as React from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"

import { EngineProvider } from "../engine/engine-context"
import type { EditorEngine } from "../engine/fabric-engine"
import { useAutosave } from "../hooks/use-autosave"
import { useEditorShortcuts } from "../hooks/use-editor-shortcuts"
import { useNavigationGuard } from "../hooks/use-navigation-guard"
import type { TemplateDocument } from "../model/template-document"
import {
  EditorStoreProvider,
  useEditorStore,
} from "../store/editor-store-context"

import { InspectorPanel } from "./inspector-panel"
import { LeftPanel } from "./left-panel"
import { MobileFallback } from "./mobile-fallback"
import { StudioTopbar } from "./studio-topbar"

const CanvasStage = dynamic(
  () => import("./canvas-stage").then((module) => module.CanvasStage),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center bg-muted/40">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  }
)

export function TemplateStudio({
  eventId,
  document,
}: {
  eventId: string
  document: TemplateDocument
}) {
  const engineRef = React.useRef<EditorEngine | null>(null)

  return (
    <EditorStoreProvider document={document}>
      <EngineProvider engineRef={engineRef}>
        <StudioWorkspace eventId={eventId} />
      </EngineProvider>
    </EditorStoreProvider>
  )
}

function PreviewBanner() {
  const setPreview = useEditorStore((state) => state.setPreview)
  const preview = useEditorStore((state) => state.preview)

  if (!preview) return null

  return (
    <div className="flex shrink-0 items-center gap-2 border-b bg-muted/60 px-3 py-1.5 text-xs">
      <Eye className="size-3.5" />
      <span>
        Previewing with sample data. The template itself is unchanged.
      </span>
      <Button
        variant="ghost"
        size="xs"
        className="ml-auto"
        onClick={() => setPreview(false)}
      >
        <EyeOff />
        Exit preview
      </Button>
    </div>
  )
}

function StudioWorkspace({ eventId }: { eventId: string }) {
  useEditorShortcuts()
  const { persistent } = useAutosave({ eventId })
  const saveState = useEditorStore((state) => state.saveState)
  const isMobile = useIsMobile()
  const [mounted, setMounted] = React.useState(false)

  useNavigationGuard(saveState !== "saved")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-[calc(100svh-4rem)] flex-col gap-3 p-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-full w-full" />
      </div>
    )
  }

  if (isMobile) {
    return <MobileFallback eventId={eventId} />
  }

  return (
    <div className="-m-4 flex h-[calc(100svh-4rem)] flex-col overflow-hidden rounded-xl border bg-background md:-m-6">
      <StudioTopbar eventId={eventId} />
      <PreviewBanner />
      {!persistent ? (
        <Alert className="shrink-0 rounded-none border-x-0 border-t-0">
          <TriangleAlert />
          <AlertTitle>Browser storage is unavailable</AlertTitle>
          <AlertDescription>
            This draft is kept in memory only. Export it before leaving this
            page.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <LeftPanel />
        <CanvasStage />
        <InspectorPanel eventId={eventId} />
      </div>
    </div>
  )
}
