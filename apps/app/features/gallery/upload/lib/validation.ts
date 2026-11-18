import {
  ALLOWED_MIME,
  MAX_RAW_BYTES,
  MIME_BY_EXTENSION,
  UNSUPPORTED_HINTS,
} from "./constants"

export type FileValidation =
  { ok: true; mime: string } | { ok: false; reason: string }

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".")
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase()
}

export function replaceExtension(name: string, extension: string): string {
  const dot = name.lastIndexOf(".")
  const base = dot === -1 ? name : name.slice(0, dot)
  return `${base}.${extension}`
}

/**
 * Returns the MIME to declare to the API, or null when the file is not an accepted image.
 * Browsers sometimes report an empty type or `image/jpg`, hence the extension fallback.
 */
export function normalizeMime(file: File): string | null {
  const type = file.type.toLowerCase()
  if (type === "image/jpg" || type === "image/pjpeg") return "image/jpeg"
  if (ALLOWED_MIME.has(type)) return type
  if (type === "") {
    return MIME_BY_EXTENSION[extensionOf(file.name)] ?? null
  }
  return null
}

export function validateFile(file: File): FileValidation {
  if (file.size === 0) {
    return { ok: false, reason: "This file is empty." }
  }
  if (file.size > MAX_RAW_BYTES) {
    return {
      ok: false,
      reason: "This file is too large to process safely (maximum 80 MB).",
    }
  }
  if (file.name.length > 255) {
    return {
      ok: false,
      reason: "The file name is too long (maximum 255 characters).",
    }
  }

  const mime = normalizeMime(file)
  if (!mime) {
    const hint = UNSUPPORTED_HINTS[extensionOf(file.name)]
    return {
      ok: false,
      reason: hint ?? "Only JPEG, PNG, and WebP images are supported.",
    }
  }

  return { ok: true, mime }
}

/** Identifies the same file added twice in one queue (name + size + modified time). */
export function dedupeKey(file: File): string {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified}`
}
