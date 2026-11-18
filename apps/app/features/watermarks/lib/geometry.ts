import type { PositionPreset } from "./types"

export type Size = { width: number; height: number }
export type Rect = { x: number; y: number; width: number; height: number }

export type Placement = Rect & { rotation: number }

export type GeometryConfig = {
  position: PositionPreset
  sizeRatio: number
  marginRatio: number
  rotation: number
  repeat: boolean
  spacingXRatio: number
  spacingYRatio: number
}

export type SourceMetrics = {
  /** Effective watermark size in source pixels (after any fit-down). */
  watermark: Size
  margin: number
  stepX: number | null
  stepY: number | null
  tiles: number
}

export type WatermarkLayout = {
  canvas: number
  /** Preview pixels per source pixel. Identical for both orientations at the same long edge. */
  scale: number
  /** Contained photo rectangle in canvas units. */
  photo: Rect
  placements: Placement[]
  source: SourceMetrics
}

export const PREVIEW_CANVAS_SIZE = 600
export const MAX_REPEAT_TILES = 2000

export function longEdge(size: Size): number {
  return Math.max(size.width, size.height)
}

export function shortEdge(size: Size): number {
  return Math.min(size.width, size.height)
}

/** Watermark width is a share of the longest edge; height follows the asset aspect ratio. */
export function imageWatermarkSize(
  photo: Size,
  assetAspect: number,
  sizeRatio: number
): Size {
  const width = longEdge(photo) * sizeRatio
  const aspect = assetAspect > 0 ? assetAspect : 1
  return { width, height: width / aspect }
}

/** Contain math for a square canvas: the longest edge maps to the canvas size. */
export function fitPhotoContain(photo: Size, canvasSize: number): Rect {
  const scale = canvasSize / longEdge(photo)
  const width = photo.width * scale
  const height = photo.height * scale
  return {
    x: (canvasSize - width) / 2,
    y: (canvasSize - height) / 2,
    width,
    height,
  }
}

export function resolveLayout(
  photo: Size,
  canvasSize: number,
  watermark: Size,
  config: GeometryConfig
): WatermarkLayout {
  const scale = canvasSize / longEdge(photo)
  const photoRect = fitPhotoContain(photo, canvasSize)
  const margin = shortEdge(photo) * config.marginRatio
  const rotation = normalizeRotation(config.rotation)

  const result = config.repeat
    ? repeatLayout(photo, watermark, margin, config, rotation)
    : singleLayout(photo, watermark, margin, config.position, rotation)

  return {
    canvas: canvasSize,
    scale,
    photo: photoRect,
    placements: result.placements.map((placement) => ({
      x: photoRect.x + placement.x * scale,
      y: photoRect.y + placement.y * scale,
      width: placement.width * scale,
      height: placement.height * scale,
      rotation: placement.rotation,
    })),
    source: result.source,
  }
}

function singleLayout(
  photo: Size,
  watermark: Size,
  margin: number,
  position: PositionPreset,
  rotation: number
): { placements: Placement[]; source: SourceMetrics } {
  const usableWidth = Math.max(1, photo.width - margin * 2)
  const usableHeight = Math.max(1, photo.height - margin * 2)
  let { width, height } = watermark
  let bounds = rotatedBounds(width, height, rotation)

  // Keep the rotated watermark inside the photo, inside its margins.
  const fit = Math.min(
    bounds.width > usableWidth ? usableWidth / bounds.width : 1,
    bounds.height > usableHeight ? usableHeight / bounds.height : 1,
    1
  )
  if (fit < 1) {
    width *= fit
    height *= fit
    bounds = rotatedBounds(width, height, rotation)
  }

  const x = clamp(
    anchor(position, "x", photo.width, bounds.width, margin),
    0,
    Math.max(0, photo.width - bounds.width)
  )
  const y = clamp(
    anchor(position, "y", photo.height, bounds.height, margin),
    0,
    Math.max(0, photo.height - bounds.height)
  )

  return {
    placements: [
      {
        x: x + (bounds.width - width) / 2,
        y: y + (bounds.height - height) / 2,
        width,
        height,
        rotation,
      },
    ],
    source: {
      watermark: { width, height },
      margin,
      stepX: null,
      stepY: null,
      tiles: 1,
    },
  }
}

function repeatLayout(
  photo: Size,
  watermark: Size,
  margin: number,
  config: GeometryConfig,
  rotation: number
): { placements: Placement[]; source: SourceMetrics } {
  const short = shortEdge(photo)
  const stepX = Math.max(1, watermark.width + short * config.spacingXRatio)
  const stepY = Math.max(1, watermark.height + short * config.spacingYRatio)
  const centerX = photo.width / 2
  const centerY = photo.height / 2

  let halfX = Math.ceil(photo.width / (2 * stepX)) + 1
  let halfY = Math.ceil(photo.height / (2 * stepY)) + 1
  while ((2 * halfX + 1) * (2 * halfY + 1) > MAX_REPEAT_TILES) {
    if (halfX >= halfY) halfX -= 1
    else halfY -= 1
  }

  const placements: Placement[] = []
  for (let i = -halfX; i <= halfX; i += 1) {
    for (let j = -halfY; j <= halfY; j += 1) {
      placements.push({
        x: centerX + i * stepX - watermark.width / 2,
        y: centerY + j * stepY - watermark.height / 2,
        width: watermark.width,
        height: watermark.height,
        rotation,
      })
    }
  }

  return {
    placements,
    source: {
      watermark,
      margin,
      stepX,
      stepY,
      tiles: placements.length,
    },
  }
}

function anchor(
  position: PositionPreset,
  axis: "x" | "y",
  photoSize: number,
  watermarkSize: number,
  margin: number
): number {
  if (axis === "x") {
    if (position.endsWith("_left")) return margin
    if (position.endsWith("_right")) return photoSize - watermarkSize - margin
    return (photoSize - watermarkSize) / 2
  }
  if (position.startsWith("top_")) return margin
  if (position.startsWith("bottom_")) return photoSize - watermarkSize - margin
  return (photoSize - watermarkSize) / 2
}

export function rotatedBounds(
  width: number,
  height: number,
  rotation: number
): Size {
  const radians = (normalizeRotation(rotation) * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  }
}

export function normalizeRotation(rotation: number): number {
  if (!Number.isFinite(rotation)) return 0
  return Math.min(Math.max(rotation, -180), 180)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
