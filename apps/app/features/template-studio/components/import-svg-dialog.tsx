"use client"

import { FileUp } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"

import { FileValidationError } from "../lib/file-read"
import { detectPreset } from "../model/canvas-presets"
import { formatCanvasSize } from "../model/units"
import { useEditorStore } from "../store/editor-store-context"

export function ImportSvgDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const document = useEditorStore((state) => state.document)
  const addObjects = useEditorStore((state) => state.addObjects)
  const updateCanvas = useEditorStore((state) => state.updateCanvas)
  const [error, setError] = React.useState<string | null>(null)
  const [warnings, setWarnings] = React.useState<string[]>([])
  const [importing, setImporting] = React.useState(false)
  const [matchCanvas, setMatchCanvas] = React.useState(false)
  const [pageSize, setPageSize] = React.useState<{
    widthMm: number
    heightMm: number
  } | null>(null)

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) return
    setError(null)
    setWarnings([])
    setPageSize(null)
    setImporting(true)
    try {
      // Fabric is browser-only, so the parser is loaded on demand outside the SSR graph.
      const { importSvgFile } = await import("../engine/svg-importer")
      // The option is hidden once the canvas has objects; guard in case the checkbox stayed checked.
      const shouldMatchCanvas = matchCanvas && document.objects.length === 0
      const result = await importSvgFile(
        file,
        {
          widthMm: document.canvas.widthMm,
          heightMm: document.canvas.heightMm,
        },
        { matchCanvasSize: shouldMatchCanvas }
      )

      if (shouldMatchCanvas && result.widthMm > 0 && result.heightMm > 0) {
        updateCanvas({
          widthMm: result.widthMm,
          heightMm: result.heightMm,
          preset: detectPreset(result.widthMm, result.heightMm),
        })
      }

      addObjects(result.objects, result.assets)
      setPageSize({ widthMm: result.widthMm, heightMm: result.heightMm })
      setWarnings(
        result.warnings.map((warning) => `${warning.element}: ${warning.reason}`)
      )
      toast.success(
        `Imported ${result.objects.length} ${result.objects.length === 1 ? "object" : "objects"}`
      )
      if (result.warnings.length === 0) {
        onOpenChange(false)
      }
    } catch (importError) {
      setError(
        importError instanceof FileValidationError
          ? importError.message
          : "The SVG could not be imported."
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import SVG</DialogTitle>
          <DialogDescription>
            Supported shapes, paths, images, and text become editable objects.
            Groups are flattened.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {document.objects.length === 0 ? (
            <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
              <Checkbox
                checked={matchCanvas}
                onCheckedChange={(checked) =>
                  setMatchCanvas(Boolean(checked))
                }
                className="mt-0.5"
              />
              <span>
                Match canvas to the SVG page
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Resizes the empty draft to the SVG&apos;s physical size before
                  adding its objects.
                </span>
              </span>
            </label>
          ) : null}

          <Input
            type="file"
            accept=".svg,image/svg+xml"
            disabled={importing}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              void handleFile(file)
            }}
          />

          {pageSize && pageSize.widthMm > 0 ? (
            <p className="text-xs text-muted-foreground">
              SVG page:{" "}
              {formatCanvasSize(pageSize.widthMm, pageSize.heightMm, "mm")}
            </p>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not import the SVG</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {warnings.length > 0 ? (
            <Alert>
              <AlertTitle>Imported with some changes</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          {importing ? (
            <p className="text-sm text-muted-foreground">
              Reading the SVG and converting its elements…
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ImportSvgButton(): React.ReactNode {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button variant="outline" className="w-full justify-start" onClick={() => setOpen(true)}>
        <FileUp />
        Import SVG
      </Button>
      <ImportSvgDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
