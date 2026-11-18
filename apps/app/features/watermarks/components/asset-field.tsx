"use client"

import { ImageIcon, Upload, X } from "lucide-react"
import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import type { WatermarkAsset } from "../hooks/use-watermark-asset"

const ACCEPTED = "image/png,image/webp"

export function AssetField({
  asset,
  onChoose,
  onRemove,
  error,
  readError,
  disabled,
}: {
  asset: WatermarkAsset | null
  onChoose: (file: File) => void
  onRemove: () => void
  error?: string
  readError?: boolean
  disabled?: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [thumbError, setThumbError] = React.useState(false)

  React.useEffect(() => {
    setThumbError(false)
  }, [asset?.url])

  function pick(file: File | undefined) {
    if (!file) return
    onChoose(file)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Watermark image</span>
        {asset ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              <Upload />
              Change
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove watermark image"
              disabled={disabled}
              onClick={onRemove}
            >
              <X />
            </Button>
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => pick(event.target.files?.[0])}
      />

      {asset ? (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {thumbError ? (
              <ImageIcon className="size-5 text-muted-foreground" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.url}
                alt=""
                className="max-h-full max-w-full object-contain"
                onError={() => setThumbError(true)}
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{asset.name}</p>
            <p className="text-xs text-muted-foreground">
              {asset.width && asset.height
                ? `${asset.width} × ${asset.height} px`
                : "Measuring…"}
            </p>
            {thumbError ? (
              <p className="text-xs text-destructive">
                The preview could not load this image. Choose a replacement.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors hover:bg-muted/40",
            error ? "border-destructive" : "border-border"
          )}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium">Choose an image</span>
          <span className="text-xs text-muted-foreground">
            PNG or WebP · up to 5 MB
          </span>
        </button>
      )}

      {readError ? (
        <p className="text-xs text-destructive">
          The file could not be read as an image.
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
