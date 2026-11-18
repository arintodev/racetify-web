"use client"

import { Upload } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { createFontAssetFromFile } from "../engine/font-registry"
import { FileValidationError } from "../lib/file-read"
import { useEditorStore } from "../store/editor-store-context"

const WEIGHTS = [300, 400, 500, 600, 700, 800, 900] as const

function familyFromFileName(name: string): string {
  const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 150)
}

export function FontUploadDialog({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploaded: (family: string) => void
}) {
  const addFont = useEditorStore((state) => state.addFont)
  const [file, setFile] = React.useState<File | null>(null)
  const [family, setFamily] = React.useState("")
  const [weight, setWeight] = React.useState("400")
  const [style, setStyle] = React.useState<"normal" | "italic">("normal")
  const [error, setError] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)

  function reset(): void {
    setFile(null)
    setFamily("")
    setWeight("400")
    setStyle("normal")
    setError(null)
  }

  async function submit(): Promise<void> {
    if (!file) {
      setError("Choose a font file.")
      return
    }
    if (!family.trim()) {
      setError("Enter the font family name.")
      return
    }

    setError(null)
    setUploading(true)
    try {
      const asset = await createFontAssetFromFile(
        file,
        family,
        Number(weight),
        style
      )
      addFont(asset)
      onUploaded(asset.family)
      toast.success("Font added", { description: asset.family })
      reset()
      onOpenChange(false)
    } catch (uploadError) {
      setError(
        uploadError instanceof FileValidationError
          ? uploadError.message
          : "The font could not be loaded."
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a font</DialogTitle>
          <DialogDescription>
            The font is embedded in this browser draft. You are responsible for
            its licence.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field data-invalid={error && !file ? true : undefined}>
            <FieldLabel htmlFor="font-file">Font file</FieldLabel>
            <Input
              id="font-file"
              type="file"
              accept=".woff2,.woff,.ttf,.otf"
              disabled={uploading}
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null
                setFile(next)
                if (next) {
                  setFamily((current) =>
                    current ? current : familyFromFileName(next.name)
                  )
                  setError(null)
                }
              }}
            />
            <FieldDescription>WOFF2, WOFF, TTF, or OTF. Up to 2 MB.</FieldDescription>
          </Field>

          <Field data-invalid={error && file ? true : undefined}>
            <FieldLabel htmlFor="font-family">Family name</FieldLabel>
            <Input
              id="font-family"
              value={family}
              maxLength={150}
              placeholder="For example, Race Display"
              onChange={(event) => setFamily(event.target.value)}
            />
            <FieldDescription>
              Use the same name the font declares, so text renders correctly.
            </FieldDescription>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="font-weight">Weight</FieldLabel>
              <Select value={weight} onValueChange={(value) => {
                if (typeof value === "string") setWeight(value)
              }}>
                <SelectTrigger id="font-weight" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEIGHTS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="font-style">Style</FieldLabel>
              <Select value={style} onValueChange={(value) => {
                if (value === "normal" || value === "italic") setStyle(value)
              }}>
                <SelectTrigger id="font-style" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="italic">Italic</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {error ? <FieldError errors={[{ message: error }]} /> : null}
        </FieldGroup>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset()
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={uploading}>
            <Upload />
            {uploading ? "Loading…" : "Add font"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
