"use client"

import type { Schemas } from "@workspace/api-client"
import * as React from "react"

import { readImageDimensions, type ImageDimensions } from "../lib/asset"

type Watermark = Schemas["WatermarkDto"]

export type WatermarkAsset = {
  url: string
  name: string
  width: number | null
  height: number | null
}

type MeasuredAsset = ImageDimensions & { url: string }

/**
 * Holds the watermark image choice for the form. A pending file wins; otherwise the saved asset is
 * derived from the latest DTO, so a refreshed signed URL updates the preview automatically.
 *
 * Assets saved before image dimensions were stored fall back to an off-DOM measurement, because the
 * preview cannot render the image until its aspect ratio is known.
 */
export function useWatermarkAsset(watermark: Watermark | null) {
  const [pending, setPending] = React.useState<
    (WatermarkAsset & { file: File }) | null
  >(null)
  const [removed, setRemoved] = React.useState(false)
  const [measured, setMeasured] = React.useState<MeasuredAsset | null>(null)
  const [readError, setReadError] = React.useState(false)
  const objectUrlRef = React.useRef<string | null>(null)

  const revoke = React.useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  React.useEffect(() => {
    revoke()
    setPending(null)
    setRemoved(false)
    setMeasured(null)
    setReadError(false)
  }, [revoke, watermark?.id])

  const savedUrl = watermark?.imageUrl ?? null
  const savedWidth = watermark?.imageWidth ?? null
  const savedHeight = watermark?.imageHeight ?? null
  const pendingUrl = pending?.url ?? null
  const pendingHasSize = Boolean(pending?.width && pending?.height)

  // Legacy saved assets have no stored dimensions; measure them off-DOM.
  React.useEffect(() => {
    if (!savedUrl || savedWidth || savedHeight) return
    if (measured?.url === savedUrl) return
    let cancelled = false
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      setMeasured({
        url: savedUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
    }
    image.src = savedUrl
    return () => {
      cancelled = true
      image.onload = null
      image.removeAttribute("src")
    }
  }, [savedUrl, savedWidth, savedHeight, measured?.url])

  // A pending file normally reports dimensions immediately; this is the fallback.
  React.useEffect(() => {
    if (!pendingUrl || pendingHasSize) return
    let cancelled = false
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      setPending((current) =>
        current && current.url === pendingUrl
          ? {
              ...current,
              width: image.naturalWidth,
              height: image.naturalHeight,
            }
          : current
      )
    }
    image.onerror = () => {
      if (!cancelled) setReadError(true)
    }
    image.src = pendingUrl
    return () => {
      cancelled = true
      image.onload = null
      image.onerror = null
      image.removeAttribute("src")
    }
  }, [pendingUrl, pendingHasSize])

  React.useEffect(() => {
    return () => revoke()
  }, [revoke])

  const asset: WatermarkAsset | null = pending
    ? pending
    : !removed && savedUrl
      ? {
          url: savedUrl,
          name: watermark?.imageName ?? "Watermark image",
          width: savedWidth ?? (measured?.url === savedUrl ? measured.width : null),
          height:
            savedHeight ?? (measured?.url === savedUrl ? measured.height : null),
        }
      : null

  const choose = React.useCallback(
    async (file: File) => {
      revoke()
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      setRemoved(false)
      setReadError(false)
      setPending({ file, url, name: file.name, width: null, height: null })
      try {
        const size = await readImageDimensions(file)
        setPending((current) =>
          current && current.url === url
            ? { ...current, width: size.width, height: size.height }
            : current
        )
      } catch {
        // The off-DOM measurement effect retries; readError surfaces a failure.
        setReadError(true)
      }
    },
    [revoke]
  )

  const remove = React.useCallback(() => {
    revoke()
    setPending(null)
    setRemoved(true)
    setMeasured(null)
    setReadError(false)
  }, [revoke])

  return {
    asset,
    pendingFile: pending?.file ?? null,
    hasChanges: Boolean(pending) || removed,
    readError,
    choose,
    remove,
  }
}
