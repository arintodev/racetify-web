import type { IExif } from "piexif-ts"

export type ExifCopyResult = {
  blob: Blob
  preserved: boolean
  warning: string | null
}

const EXIF_WARNING =
  "Metadata couldn't be copied; this photo will upload without EXIF."

/**
 * Copies the original JPEG's EXIF into the resized JPEG.
 *
 * The resized pixels already honor EXIF orientation (`createImageBitmap({ imageOrientation:
 * "from-image" })`), so Orientation is reset to 1 and stale dimension/thumbnail entries are fixed
 * or removed. Everything else — capture date, camera, lens, exposure, GPS — is preserved.
 *
 * Best-effort: any failure returns the resized JPEG unchanged with a non-fatal warning.
 */
export async function copyJpegExif(
  original: Blob,
  jpeg: Blob,
  width: number,
  height: number
): Promise<ExifCopyResult> {
  try {
    const module = (await import("piexif-ts")) as Piexif & { default?: Piexif }
    // piexif-ts is published as CommonJS; some bundlers expose it only as the default export.
    const piexif = module.default ?? module
    const exif = piexif.load(await blobToDataUrl(original))
    if (!hasMetadata(exif)) {
      return { blob: jpeg, preserved: false, warning: null }
    }

    normalizeExif(piexif, exif, width, height)
    const resized = await blobToDataUrl(jpeg)
    const restored = piexif.insert(piexif.dump(exif), resized)

    return { blob: dataUrlToBlob(restored), preserved: true, warning: null }
  } catch {
    return { blob: jpeg, preserved: false, warning: EXIF_WARNING }
  }
}

type Piexif = typeof import("piexif-ts")

function hasMetadata(exif: IExif): boolean {
  return (["0th", "Exif", "GPS", "Interop"] as const).some(
    (field) => Object.keys(exif[field] ?? {}).length > 0
  )
}

function normalizeExif(
  piexif: Piexif,
  exif: IExif,
  width: number,
  height: number
): void {
  piexif.resetOrientation(exif)

  const zeroth = (exif["0th"] = exif["0th"] ?? {})
  const imageWidth = piexif.TagValues.ImageIFD.ImageWidth
  const imageLength = piexif.TagValues.ImageIFD.ImageLength
  if (zeroth[imageWidth] !== undefined) zeroth[imageWidth] = width
  if (zeroth[imageLength] !== undefined) zeroth[imageLength] = height

  const exifIfd = exif.Exif
  if (exifIfd) {
    const pixelX = piexif.TagValues.ExifIFD.PixelXDimension
    const pixelY = piexif.TagValues.ExifIFD.PixelYDimension
    if (exifIfd[pixelX] !== undefined) exifIfd[pixelX] = width
    if (exifIfd[pixelY] !== undefined) exifIfd[pixelY] = height
  }

  // A stale embedded thumbnail would contradict the new dimensions.
  delete exif["1st"]
  delete exif.thumbnail
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",")
  const header = comma === -1 ? "" : dataUrl.slice(0, comma)
  const encoded = comma === -1 ? dataUrl : dataUrl.slice(comma + 1)
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? "image/jpeg"

  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: mime })
}
