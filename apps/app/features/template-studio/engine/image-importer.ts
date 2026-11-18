import {
  IMAGE_DOWNSCALE_BYTES,
  IMAGE_MAX_DIMENSION,
  IMAGE_WEBP_QUALITY,
  MAX_IMAGE_BYTES,
} from "../lib/constants"
import {
  FileValidationError,
  assertFileSize,
  estimateDataUrlBytes,
  imageDimensions,
  readFileAsDataUrl,
} from "../lib/file-read"
import { createId } from "../lib/id"
import type { ImageAsset, ImageObject } from "../model/template-document"
import { cssPxToMm } from "../model/units"

const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])

type ImportedImage = {
  asset: ImageAsset
  object: ImageObject
}

function assetMimeType(dataUrl: string): ImageAsset["mimeType"] {
  if (dataUrl.startsWith("data:image/jpeg")) return "image/jpeg"
  if (dataUrl.startsWith("data:image/webp")) return "image/webp"
  return "image/png"
}

function stripExtension(name: string): string {
  const index = name.lastIndexOf(".")
  return (index > 0 ? name.slice(0, index) : name).slice(0, 120) || "Image"
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new FileValidationError("Could not read the image."))
    image.src = dataUrl
  })
}

async function downscaleIfNeeded(
  dataUrl: string,
  widthPx: number,
  heightPx: number
): Promise<{ dataUrl: string; widthPx: number; heightPx: number }> {
  const longestSide = Math.max(widthPx, heightPx)
  const bytes = estimateDataUrlBytes(dataUrl)
  if (longestSide <= IMAGE_MAX_DIMENSION && bytes <= IMAGE_DOWNSCALE_BYTES) {
    return { dataUrl, widthPx, heightPx }
  }

  const scale = Math.min(
    1,
    IMAGE_MAX_DIMENSION / longestSide,
    Math.sqrt(IMAGE_DOWNSCALE_BYTES / Math.max(bytes, 1))
  )
  const targetWidth = Math.max(1, Math.round(widthPx * scale))
  const targetHeight = Math.max(1, Math.round(heightPx * scale))

  const image = await loadImage(dataUrl)
  const canvas = window.document.createElement("canvas")
  canvas.width = targetWidth
  canvas.height = targetHeight
  const context = canvas.getContext("2d")
  if (!context) {
    throw new FileValidationError("Could not prepare the image.")
  }
  context.drawImage(image, 0, 0, targetWidth, targetHeight)

  const resized = canvas.toDataURL("image/webp", IMAGE_WEBP_QUALITY)
  return {
    dataUrl: resized,
    widthPx: targetWidth,
    heightPx: targetHeight,
  }
}

/**
 * Reads an image file, constrains its size, and returns an asset plus an object sized to fit
 * comfortably inside the canvas while preserving the aspect ratio.
 */
export async function importImageFile(
  file: File,
  canvas: { widthMm: number; heightMm: number }
): Promise<ImportedImage> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new FileValidationError("Use a PNG, JPEG, or WebP image.")
  }
  assertFileSize(file, MAX_IMAGE_BYTES, "Image")

  const original = await readFileAsDataUrl(file)
  const originalSize = await imageDimensions(original)
  const resized = await downscaleIfNeeded(
    original,
    originalSize.widthPx,
    originalSize.heightPx
  )

  const maxWidthMm = canvas.widthMm * 0.8
  const maxHeightMm = canvas.heightMm * 0.8
  const aspect = resized.widthPx / Math.max(resized.heightPx, 1)
  let widthMm = maxWidthMm
  let heightMm = widthMm / aspect
  if (heightMm > maxHeightMm) {
    heightMm = maxHeightMm
    widthMm = heightMm * aspect
  }

  // Convert intrinsic pixels to a sensible print size when the image is smaller than the canvas.
  const naturalWidthMm = cssPxToMm(resized.widthPx)
  const naturalHeightMm = cssPxToMm(resized.heightPx)
  if (naturalWidthMm < widthMm && naturalHeightMm < heightMm) {
    widthMm = naturalWidthMm
    heightMm = naturalHeightMm
  }

  const now = new Date().toISOString()
  const name = stripExtension(file.name)
  const asset: ImageAsset = {
    id: createId(),
    kind: "image",
    name,
    mimeType: assetMimeType(resized.dataUrl),
    dataUrl: resized.dataUrl,
    widthPx: resized.widthPx,
    heightPx: resized.heightPx,
    bytes: estimateDataUrlBytes(resized.dataUrl),
    createdAt: now,
  }

  const object: ImageObject = {
    id: createId(),
    type: "image",
    name,
    assetId: asset.id,
    xMm: (canvas.widthMm - widthMm) / 2,
    yMm: (canvas.heightMm - heightMm) / 2,
    widthMm,
    heightMm,
    rotationDeg: 0,
    opacity: 1,
    visible: true,
    locked: false,
  }

  return { asset, object }
}

export async function createImageAssetFromDataUrl(
  dataUrl: string,
  name: string
): Promise<ImageAsset | null> {
  if (!dataUrl.startsWith("data:image/")) return null
  const size = await imageDimensions(dataUrl)
  return {
    id: createId(),
    kind: "image",
    name: name.slice(0, 255),
    mimeType: assetMimeType(dataUrl),
    dataUrl,
    widthPx: size.widthPx,
    heightPx: size.heightPx,
    bytes: estimateDataUrlBytes(dataUrl),
    createdAt: new Date().toISOString(),
  }
}
