import { MAX_FONT_BYTES } from "../lib/constants"
import {
  FileValidationError,
  assertFileSize,
  estimateDataUrlBytes,
  fileExtension,
  readFileAsDataUrl,
} from "../lib/file-read"
import { createId } from "../lib/id"
import type { FontAsset } from "../model/template-document"

const loadedKeys = new Set<string>()

const ACCEPTED_FONT_FORMATS = new Set(["woff2", "woff", "ttf", "otf"])

export type FontLoadFailure = {
  family: string
  message: string
}

export function fontAssetKey(font: FontAsset): string {
  return `${font.family}:${font.weight}:${font.style}`
}

function quoteFamily(family: string): string {
  return `"${family.replace(/"/g, "")}"`
}

export async function registerFont(font: FontAsset): Promise<void> {
  const key = fontAssetKey(font)
  if (loadedKeys.has(key)) return

  const face = new FontFace(font.family, `url(${font.dataUrl})`, {
    weight: String(font.weight),
    style: font.style,
  })
  await face.load()
  window.document.fonts.add(face)
  loadedKeys.add(key)
}

export async function ensureFontsLoaded(
  fonts: FontAsset[]
): Promise<FontLoadFailure[]> {
  const failures: FontLoadFailure[] = []
  for (const font of fonts) {
    try {
      await registerFont(font)
    } catch {
      failures.push({
        family: font.family,
        message: `The font "${font.family}" could not be loaded. Text will use a fallback.`,
      })
    }
  }
  return failures
}

export async function isFamilyAvailable(family: string): Promise<boolean> {
  if (!family) return false
  try {
    await window.document.fonts.load(`16px ${quoteFamily(family)}`)
  } catch {
    return false
  }
  return window.document.fonts.check(`16px ${quoteFamily(family)}`)
}

export async function createFontAssetFromFile(
  file: File,
  family: string,
  weight: number,
  style: "normal" | "italic"
): Promise<FontAsset> {
  const format = fileExtension(file.name)
  if (!ACCEPTED_FONT_FORMATS.has(format)) {
    throw new FileValidationError("Use a WOFF2, WOFF, TTF, or OTF font file.")
  }
  assertFileSize(file, MAX_FONT_BYTES, "Font")

  const trimmed = family.trim()
  if (!trimmed) {
    throw new FileValidationError("Enter the font family name.")
  }

  const dataUrl = await readFileAsDataUrl(file)
  const asset: FontAsset = {
    id: createId(),
    kind: "font",
    family: trimmed,
    fileName: file.name.slice(0, 255),
    format: format as FontAsset["format"],
    weight,
    style,
    dataUrl,
    bytes: estimateDataUrlBytes(dataUrl),
    createdAt: new Date().toISOString(),
  }

  await registerFont(asset)
  return asset
}
