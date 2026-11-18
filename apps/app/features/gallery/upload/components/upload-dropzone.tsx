"use client"

import { FolderOpen, ImagePlus, UploadCloud } from "lucide-react"
import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "cn"

import { MAX_FILES_PER_ADD } from "../lib/constants"
import { fromDataTransfer, type SelectedFile } from "../lib/file-collection"

type UploadDropzoneProps = {
  compact: boolean
  onFiles: (files: SelectedFile[]) => void
  onOpenFiles: () => void
  onOpenFolder: () => void
}

/**
 * Always-visible add surface. Clicking the dashed area opens the file picker; the buttons inside
 * are the keyboard and screen-reader path.
 */
export function UploadDropzone({
  compact,
  onFiles,
  onOpenFiles,
  onOpenFolder,
}: UploadDropzoneProps) {
  const [dragging, setDragging] = React.useState(false)
  const dragDepth = React.useRef(0)

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    try {
      const files = await fromDataTransfer(
        event.dataTransfer,
        MAX_FILES_PER_ADD + 1
      )
      if (files.length > 0) onFiles(files)
    } catch {
      // An unreadable folder yields nothing; the buttons remain available.
    }
  }

  return (
    <div
      onClick={onOpenFiles}
      onDragEnter={(event) => {
        event.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "copy"
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDrop={(event) => void handleDrop(event)}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed text-center transition-colors",
        compact
          ? "bg-background/95 px-4 py-5 backdrop-blur"
          : "px-6 py-10",
        dragging
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/20 hover:border-primary/60"
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
        <UploadCloud className="size-5" aria-hidden="true" />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">
          {dragging
            ? "Drop photos or folders to add them"
            : "Drag photos or folders here"}
        </p>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG or WebP · up to 15 MB · 2100 px · EXIF kept
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onOpenFiles()
          }}
        >
          <ImagePlus aria-hidden="true" />
          Upload files
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation()
            onOpenFolder()
          }}
        >
          <FolderOpen aria-hidden="true" />
          Upload folder
        </Button>
      </div>
    </div>
  )
}
