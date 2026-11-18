export const SELFIE_MAX_EDGE = 1_280
export const SELFIE_MAX_BYTES = 2 * 1024 * 1024

const JPEG_QUALITIES = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]

type Canvas = HTMLCanvasElement | OffscreenCanvas

/**
 * Prepares a selfie for face search.
 *
 * The longest edge is capped at 1280 px and the JPEG is encoded under 2 MB, so a phone photo never
 * ships megabytes to the server or holds a full-size bitmap in memory during the search. Re-encoding
 * also drops EXIF, including GPS. The processing is silent: callers only see a smaller `File`.
 */
export async function prepareSelfie(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  })

  let canvas: Canvas
  try {
    const maxEdge = Math.max(bitmap.width, bitmap.height)
    const scale = maxEdge > SELFIE_MAX_EDGE ? SELFIE_MAX_EDGE / maxEdge : 1
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    canvas = createCanvas(width, height)
    drawOpaque(canvas, bitmap)
  } finally {
    bitmap.close()
  }

  const body = await encodeUnderLimit(canvas)
  return new File([body], jpegName(file.name), {
    type: "image/jpeg",
    lastModified: file.lastModified,
  })
}

function jpegName(name: string): string {
  const dot = name.lastIndexOf(".")
  const base = dot > 0 ? name.slice(0, dot) : name
  return `${base || "selfie"}.jpg`
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

async function encodeUnderLimit(canvas: Canvas): Promise<Blob> {
  let last: Blob | null = null

  for (const quality of JPEG_QUALITIES) {
    last = await encodeJpeg(canvas, quality)
    if (last.size <= SELFIE_MAX_BYTES) return last
  }

  throw new Error("This image couldn't be processed. Try another photo.")
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
          : reject(new Error("This image couldn't be processed.")),
      "image/jpeg",
      quality
    )
  })
}
