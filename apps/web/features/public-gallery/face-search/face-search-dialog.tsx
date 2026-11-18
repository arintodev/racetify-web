"use client"

import { ImagePlus, Loader2, ScanFace } from "lucide-react"
import Link from "next/link"
import * as React from "react"

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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"

import { FACE_SEARCH_ACCEPT, validateSelfie } from "./face-search-api"
import { prepareSelfie } from "./selfie-image"
import { useFaceSearch } from "./use-face-search"

type FaceSearchDialogProps = {
  eventSlug: string
  onClose: () => void
  onResults: (itemIds: string[]) => void
}

export function FaceSearchDialog({
  eventSlug,
  onClose,
  onResults,
}: FaceSearchDialogProps) {
  const search = useFaceSearch(eventSlug)
  const [file, setFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [consent, setConsent] = React.useState(false)
  const [fileError, setFileError] = React.useState<string | null>(null)
  const [preparing, setPreparing] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const previewRef = React.useRef<string | null>(null)
  const deliveredRef = React.useRef<string | null>(null)
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [])

  function setPreview(nextFile: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = nextFile ? URL.createObjectURL(nextFile) : null
    setPreviewUrl(previewRef.current)
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0]
    event.target.value = ""
    if (!next) return

    const error = validateSelfie(next)
    if (error) {
      setFileError(error)
      return
    }

    setFileError(null)
    setPreparing(true)
    try {
      // Downscale before preview and upload so a full-resolution photo is never held or sent.
      const prepared = await prepareSelfie(next)
      if (!mountedRef.current) return
      setFile(prepared)
      setPreview(prepared)
      search.reset()
    } catch {
      if (mountedRef.current) {
        setFileError("This image couldn't be processed. Try another photo.")
      }
    } finally {
      if (mountedRef.current) setPreparing(false)
    }
  }

  function removeFile() {
    setFile(null)
    setPreview(null)
    setFileError(null)
    search.reset()
  }

  const busy = preparing || search.isSubmitting || search.isSearching
  const canSubmit = Boolean(file) && consent && !busy

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file || !consent || busy) return
    setFileError(null)
    search.start(file, consent)
  }

  React.useEffect(() => {
    if (!search.searchId || !search.resultIds) return
    if (search.resultIds.length === 0) return
    if (deliveredRef.current === search.searchId) return

    deliveredRef.current = search.searchId
    onResults(search.resultIds)
    onClose()
  }, [onClose, onResults, search.resultIds, search.searchId])

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Find my photos</DialogTitle>
          <DialogDescription>
            Upload a selfie and we&apos;ll search this event&apos;s public
            gallery. No account needed.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" noValidate onSubmit={handleSubmit}>
          {previewUrl ? (
            <div className="overflow-hidden rounded-xl border">
              <div className="aspect-[4/3] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Selected selfie preview"
                  className="size-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2 border-t p-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                >
                  Change
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={removeFile}
                  disabled={busy}
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {preparing ? (
                  <Loader2
                    className="size-5 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <ImagePlus className="size-5" aria-hidden="true" />
                )}
              </span>
              <span className="text-sm font-medium">Choose a selfie</span>
              <span className="text-xs text-muted-foreground">
                JPEG, PNG or WebP · up to 10 MB
              </span>
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={FACE_SEARCH_ACCEPT}
            className="sr-only"
            onChange={handleFileChange}
            aria-label="Choose a selfie"
            tabIndex={-1}
          />

          {fileError ? (
            <p role="alert" className="text-sm text-destructive">
              {fileError}
            </p>
          ) : null}

          <Field orientation="horizontal">
            <Checkbox
              id="face-search-consent"
              checked={consent}
              disabled={busy}
              onCheckedChange={(checked) => setConsent(checked === true)}
              aria-describedby="face-search-consent-description"
            />
            <FieldContent>
              <FieldLabel
                htmlFor="face-search-consent"
                className="leading-snug font-normal"
              >
                I consent to using this selfie to search the public gallery.
              </FieldLabel>
              <FieldDescription id="face-search-consent-description">
                Your selfie is used only for this search and deleted after
                processing. Results expire in 15 minutes.{" "}
                <Link href="/privacy" className="underline underline-offset-4">
                  Privacy
                </Link>
              </FieldDescription>
            </FieldContent>
          </Field>

          {search.error ? (
            <Alert variant="destructive">
              <AlertTitle>Face search failed</AlertTitle>
              <AlertDescription>{search.error}</AlertDescription>
            </Alert>
          ) : null}

          {search.noResults ? (
            <Alert>
              <AlertTitle>No photos found</AlertTitle>
              <AlertDescription>
                No public photos matched your selfie. Try a clearer,
                front-facing photo.
              </AlertDescription>
            </Alert>
          ) : null}

          {search.isSubmitting || search.isSearching ? (
            <p
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              {search.isSubmitting
                ? "Uploading your selfie…"
                : "Searching for your photos…"}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {search.isSubmitting || search.isSearching ? (
                <Loader2
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <ScanFace aria-hidden="true" />
              )}
              {search.isSubmitting
                ? "Uploading…"
                : search.isSearching
                  ? "Searching…"
                  : "Search my photos"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
