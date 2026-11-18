"use client"

import {
  ArrowLeft,
  Check,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Redo2,
  TriangleAlert,
  Undo2,
} from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"

import { downloadTemplateDocument } from "../repository/json-transfer"
import { useEditorStore } from "../store/editor-store-context"

function SaveStatus() {
  const saveState = useEditorStore((state) => state.saveState)
  const savedAt = useEditorStore((state) => state.savedAt)

  if (saveState === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Saving…
      </span>
    )
  }

  if (saveState === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-destructive">
        <TriangleAlert className="size-3" />
        Not saved
      </span>
    )
  }

  if (saveState === "dirty") {
    return (
      <span className="text-xs text-muted-foreground">Unsaved changes</span>
    )
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Check className="size-3" />
      Saved locally
      {savedAt
        ? ` · ${new Date(savedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : ""}
    </span>
  )
}

export function StudioTopbar({ eventId }: { eventId: string }) {
  const document = useEditorStore((state) => state.document)
  const preview = useEditorStore((state) => state.preview)
  const canUndo = useEditorStore((state) => state.canUndo)
  const canRedo = useEditorStore((state) => state.canRedo)
  const renameDocument = useEditorStore((state) => state.renameDocument)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const setPreview = useEditorStore((state) => state.setPreview)

  const [nameDraft, setNameDraft] = React.useState(document.name)

  React.useEffect(() => {
    setNameDraft(document.name)
  }, [document.name])

  function commitName(): void {
    renameDocument(nameDraft)
    setNameDraft(document.name)
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Back to templates"
        nativeButton={false}
        render={<Link href={`/events/${eventId}/template-studio`} />}
      >
        <ArrowLeft />
      </Button>

      <Input
        value={nameDraft}
        maxLength={120}
        aria-label="Template name"
        className="h-8 w-48 border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none focus-visible:border-input"
        onChange={(event) => setNameDraft(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
          if (event.key === "Escape") {
            setNameDraft(document.name)
            event.currentTarget.blur()
          }
        }}
      />

      <SaveStatus />

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Undo"
          disabled={!canUndo || preview}
          onClick={undo}
        >
          <Undo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Redo"
          disabled={!canRedo || preview}
          onClick={redo}
        >
          <Redo2 />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          variant={preview ? "default" : "outline"}
          size="sm"
          onClick={() => setPreview(!preview)}
        >
          {preview ? <EyeOff /> : <Eye />}
          {preview ? "Exit preview" : "Preview"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadTemplateDocument(document)}
        >
          <Download />
          Export
        </Button>
      </div>
    </div>
  )
}
