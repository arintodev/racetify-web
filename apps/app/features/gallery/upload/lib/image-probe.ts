export type ImageInfo = {
  /** Raw pixel width as stored in the file (before EXIF orientation). */
  width: number
  /** Raw pixel height as stored in the file (before EXIF orientation). */
  height: number
  /** EXIF orientation (1–8); 1 when unknown or not a JPEG. */
  orientation: number
}

const HEAD_BYTES = 256 * 1024

/**
 * Reads image dimensions (and EXIF orientation for JPEGs) from the file header so a photo that is
 * already small enough can be uploaded byte-identically without decoding it. Falls back to a real
 * decode when the header cannot be parsed.
 */
export async function probeImage(file: Blob): Promise<ImageInfo> {
  const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer())

  return (
    probeJpeg(head) ??
    probePng(head) ??
    probeWebp(head) ??
    (await probeWithDecode(file))
  )
}

/** Dimensions as the browser will display them (EXIF orientation applied). */
export function orientedSize(info: ImageInfo): {
  width: number
  height: number
} {
  return info.orientation >= 5 && info.orientation <= 8
    ? { width: info.height, height: info.width }
    : { width: info.width, height: info.height }
}

async function probeWithDecode(file: Blob): Promise<ImageInfo> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  })
  try {
    return { width: bitmap.width, height: bitmap.height, orientation: 1 }
  } finally {
    bitmap.close()
  }
}

// ------------------------------------------------------------------------- JPEG

function probeJpeg(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null

  let offset = 2
  let orientation = 1
  let width = 0
  let height = 0

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = bytes[offset + 1]
    if (marker === undefined) break

    // Standalone markers carry no length.
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 2
      continue
    }
    if (marker === 0xd9 || marker === 0xda) break

    const length = readUint16(bytes, offset + 2)
    if (length < 2) break

    if (marker === 0xe1) {
      const found = readExifOrientation(bytes, offset + 4, length - 2)
      if (found) orientation = found
    } else if (isStartOfFrame(marker)) {
      height = readUint16(bytes, offset + 5)
      width = readUint16(bytes, offset + 7)
    }

    offset += 2 + length
  }

  if (width === 0 || height === 0) return null
  return { width, height, orientation }
}

function isStartOfFrame(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  )
}

function readExifOrientation(
  bytes: Uint8Array,
  start: number,
  length: number
): number | null {
  const end = Math.min(bytes.length, start + length)
  if (start + 6 > end) return null
  if (
    bytes[start] !== 0x45 || // E
    bytes[start + 1] !== 0x78 || // x
    bytes[start + 2] !== 0x69 || // i
    bytes[start + 3] !== 0x66 || // f
    bytes[start + 4] !== 0x00 ||
    bytes[start + 5] !== 0x00
  ) {
    return null
  }
  return readTiffOrientation(bytes, start + 6, end)
}

function readTiffOrientation(
  bytes: Uint8Array,
  start: number,
  end: number
): number | null {
  if (start + 8 > end) return null

  const little = bytes[start] === 0x49 && bytes[start + 1] === 0x49 // II
  const big = bytes[start] === 0x4d && bytes[start + 1] === 0x4d // MM
  if (!little && !big) return null

  const read16 = (at: number) =>
    little
      ? bytes[at]! | (bytes[at + 1]! << 8)
      : (bytes[at]! << 8) | bytes[at + 1]!
  const read32 = (at: number) =>
    little
      ? (bytes[at]! |
          (bytes[at + 1]! << 8) |
          (bytes[at + 2]! << 16) |
          (bytes[at + 3]! << 24)) >>>
        0
      : ((bytes[at]! << 24) |
          (bytes[at + 1]! << 16) |
          (bytes[at + 2]! << 8) |
          bytes[at + 3]!) >>>
        0

  if (read16(start + 2) !== 42) return null

  const ifd = start + read32(start + 4)
  if (ifd + 2 > end) return null

  const count = read16(ifd)
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + index * 12
    if (entry + 12 > end) return null
    if (read16(entry) === 0x0112) {
      const value = read16(entry + 8)
      return value >= 1 && value <= 8 ? value : null
    }
  }
  return null
}

// -------------------------------------------------------------------------- PNG

function probePng(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 24) return null
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (!signature.every((value, index) => bytes[index] === value)) return null
  return {
    width: readUint32(bytes, 16),
    height: readUint32(bytes, 20),
    orientation: 1,
  }
}

// ------------------------------------------------------------------------- WebP

function probeWebp(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 30) return null
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP")
    return null

  const format = ascii(bytes, 12, 4)

  if (format === "VP8X") {
    return {
      width: 1 + readUint24(bytes, 24),
      height: 1 + readUint24(bytes, 27),
      orientation: 1,
    }
  }

  if (format === "VP8L") {
    if (bytes[20] !== 0x2f) return null
    const b0 = bytes[21]!
    const b1 = bytes[22]!
    const b2 = bytes[23]!
    const b3 = bytes[24]!
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      orientation: 1,
    }
  }

  if (format === "VP8 ") {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
      return null
    }
    return {
      width: (bytes[26]! | (bytes[27]! << 8)) & 0x3fff,
      height: (bytes[28]! | (bytes[29]! << 8)) & 0x3fff,
      orientation: 1,
    }
  }

  return null
}

// ----------------------------------------------------------------------- helpers

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let text = ""
  for (let index = 0; index < length; index += 1) {
    text += String.fromCharCode(bytes[start + index] ?? 0)
  }
  return text
}

function readUint16(bytes: Uint8Array, at: number): number {
  return ((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0)
}

function readUint24(bytes: Uint8Array, at: number): number {
  return (
    (bytes[at] ?? 0) |
    ((bytes[at + 1] ?? 0) << 8) |
    ((bytes[at + 2] ?? 0) << 16)
  )
}

function readUint32(bytes: Uint8Array, at: number): number {
  return (
    (((bytes[at] ?? 0) << 24) |
      ((bytes[at + 1] ?? 0) << 16) |
      ((bytes[at + 2] ?? 0) << 8) |
      (bytes[at + 3] ?? 0)) >>>
    0
  )
}
