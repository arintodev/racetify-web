export const MAX_EDGE = 2_100
export const MAX_FILE_BYTES = 15 * 1024 * 1024
export const MAX_RAW_BYTES = 80 * 1024 * 1024
export const MAX_RAW_PIXELS = 100_000_000
export const MAX_FILES_PER_ADD = 2_000

export const BATCH_SIZE = 100
export const PUT_CONCURRENCY = 3
export const PREPARE_CONCURRENCY = 2
export const PREPARE_WINDOW = 120
/** Bound prepared bytes as well as item count so a 500-photo add cannot exhaust the tab. */
export const PREPARE_WINDOW_BYTES = 400 * 1024 * 1024
export const QUIET_FLUSH_MS = 600
export const PRESIGN_SAFETY_MS = 90_000
export const PROGRESS_TICK_MS = 200

export const JPEG_QUALITY = 0.9
export const JPEG_QUALITY_FALLBACKS = [0.8, 0.72]

export const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"])

/** Extensions accepted when the browser reports an empty `File.type`. */
export const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}

/** Formats a photographer is likely to try but the API/app cannot process. */
export const UNSUPPORTED_HINTS: Record<string, string> = {
  heic: "HEIC isn't supported. Convert the photo to JPEG first.",
  heif: "HEIF isn't supported. Convert the photo to JPEG first.",
  avif: "AVIF isn't supported. Convert the photo to JPEG first.",
  gif: "GIF isn't supported. Use JPEG, PNG, or WebP.",
  tif: "TIFF isn't supported. Convert the photo to JPEG first.",
  tiff: "TIFF isn't supported. Convert the photo to JPEG first.",
  dng: "RAW isn't supported. Export the photo as JPEG first.",
  cr2: "RAW isn't supported. Export the photo as JPEG first.",
  cr3: "RAW isn't supported. Export the photo as JPEG first.",
  nef: "RAW isn't supported. Export the photo as JPEG first.",
  arw: "RAW isn't supported. Export the photo as JPEG first.",
  raf: "RAW isn't supported. Export the photo as JPEG first.",
}
