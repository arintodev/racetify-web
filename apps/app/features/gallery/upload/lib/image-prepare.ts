import {
  JPEG_QUALITY,
  JPEG_QUALITY_FALLBACKS,
  MAX_EDGE,
  MAX_FILE_BYTES,
  MAX_RAW_PIXELS,
} from "./constants"
import { copyJpegExif } from "./exif"
import { orientedSize, probeImage } from "./image-probe"
import type { PreparedImage } from "./types"
import { replaceExtension } from "./validation"

type Canvas = HTMLCanvasElement | OffscreenCanvas

/**
 * Prepares one photo for upload.
 *
 * - Photos whose longest edge is already ≤ 2100 px are returned byte-identical (no decode/re-encode,
 *   EXIF untouched).
 * - Larger photos are scaled so the longest edge is 2100 px and encoded as JPEG. JPEG sources keep
 *   EXIF; PNG/WebP sources are converted to JPEG and metadata is dropped.
 */
export async function prepareImage(
  file: File,
  mime: string,
  signal: AbortSignal
): Promise<PreparedImage> {
  assertNotAborted(signal)

  const info = await probeImage(file)
  assertNotAborted(signal)

  if (info.width * info.height > MAX_RAW_PIXELS) {
    throw new Error("This photo has too many pixels to process safely.")
  }

  const source = orientedSize(info)

  if (Math.max(source.width, source.height) <= MAX_EDGE) {
    return originalResult(file, mime, source.width, source.height)
  }

  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  })
  let canvas: Canvas
  let width = 0
  let height = 0
  try {
    assertNotAborted(signal)

    // Trust the decoded dimensions over the header probe: the browser has applied EXIF
    // orientation, so these are the pixel dimensions the canvas will actually see.
    const maxEdge = Math.max(bitmap.width, bitmap.height)
    if (maxEdge <= MAX_EDGE) {
      return originalResult(file, mime, bitmap.width, bitmap.height)
    }

    const scale = MAX_EDGE / maxEdge
    width = Math.max(1, Math.round(bitmap.width * scale))
    height = Math.max(1, Math.round(bitmap.height * scale))
    canvas = createCanvas(width, height)
    drawOpaque(canvas, bitmap)
  } finally {
    bitmap.close()
  }

  const encoded = await encodeUnderLimit(canvas, signal)
  const converted = mime !== "image/jpeg"

  let body: Blob = encoded
  let exifPreserved: boolean | null = null
  let warning: string | null = null

  if (!converted) {
    const copied = await copyJpegExif(file, encoded, width, height)
    if (copied.blob.size <= MAX_FILE_BYTES) {
      body = copied.blob
      exifPreserved = copied.preserved
      warning = copied.warning
    } else {
      // Metadata alone pushed the file over the limit; keep the smaller encoded body.
      body = encoded
      exifPreserved = false
      warning =
        "EXIF made the photo exceed 15 MB, so it was uploaded without metadata."
    }
  }

  return {
    body,
    declaredName: converted ? replaceExtension(file.name, "jpg") : file.name,
    declaredMime: "image/jpeg",
    declaredSize: body.size,
    width,
    height,
    resized: true,
    converted,
    exifPreserved,
    warning,
  }
}

function originalResult(
  file: File,
  mime: string,
  width: number,
  height: number
): PreparedImage {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `This photo is ${formatMegabytes(file.size)} but is already within ${MAX_EDGE} px, so it can't be resized under the 15 MB limit.`
    )
  }
  return {
    body: file,
    declaredName: file.name,
    declaredMime: mime,
    declaredSize: file.size,
    width,
    height,
    resized: false,
    converted: false,
    exifPreserved: null,
    warning: null,
  }
}

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException("Preparation canceled", "AbortError")
  }
}

function createCanvas(width: number, height: number): Canvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height)
  }
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return canvas
}

/** JPEG has no alpha channel; a white matte avoids black backgrounds on transparent PNG/WebP. */
function drawOpaque(canvas: Canvas, bitmap: ImageBitmap): void {
  const context = canvas.getContext("2d") as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!context) throw new Error("This browser can't resize images.")

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
}

async function encodeUnderLimit(
  canvas: Canvas,
  signal: AbortSignal
): Promise<Blob> {
  const qualities = [JPEG_QUALITY, ...JPEG_QUALITY_FALLBACKS]
  let last: Blob | null = null

  for (const quality of qualities) {
    assertNotAborted(signal)
    last = await encodeJpeg(canvas, quality)
    if (last.size <= MAX_FILE_BYTES) return last
  }

  if (!last) throw new Error("This photo could not be encoded.")
  throw new Error(
    `This photo is still ${formatMegabytes(last.size)} after resizing; the limit is 15 MB.`
  )
}

function encodeJpeg(canvas: Canvas, quality: number): Promise<Blob> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type: "image/jpeg", quality })
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("This photo could not be encoded.")),
      "image/jpeg",
      quality
    )
  })
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
