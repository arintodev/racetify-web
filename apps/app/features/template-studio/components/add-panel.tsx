"use client"

import { ImagePlus, Type } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

import { importImageFile } from "../engine/image-importer"
import { FileValidationError } from "../lib/file-read"
import {
  createTextObject,
  nextTextName,
} from "../model/template-defaults"
import { useEditorStore } from "../store/editor-store-context"

import { ImportSvgButton } from "./import-svg-dialog"

export function AddPanel() {
  const document = useEditorStore((state) => state.document)
  const addObject = useEditorStore((state) => state.addObject)
  const addImageObject = useEditorStore((state) => state.addImageObject)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [importing, setImporting] = React.useState(false)

  function addText(): void {
    addObject(
      createTextObject({
        canvas: document.canvas,
        name: nextTextName(document.objects),
      })
    )
  }

  async function handleImage(file: File | undefined): Promise<void> {
    if (!file) return
    setImporting(true)
    try {
      const imported = await importImageFile(file, {
        widthMm: document.canvas.widthMm,
        heightMm: document.canvas.heightMm,
      })
      addImageObject(imported.asset, imported.object)
      toast.success("Image added")
    } catch (error) {
      toast.error(
        error instanceof FileValidationError
          ? error.message
          : "The image could not be added."
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button className="w-full justify-start" onClick={addText}>
        <Type />
        Add text
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          void handleImage(file)
        }}
      />
      <Button
        variant="outline"
        className="w-full justify-start"
        disabled={importing}
        onClick={() => fileInputRef.current?.click()}
      >
        <ImagePlus />
        {importing ? "Adding image…" : "Add image"}
      </Button>

      <ImportSvgButton />

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Images and fonts are embedded in this browser draft. They are not
        uploaded or used by generation yet.
      </p>
    </div>
  )
}
