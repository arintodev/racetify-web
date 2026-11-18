import { describe, expect, it } from "vitest"

import {
  imageWatermarkSize,
  MAX_REPEAT_TILES,
  PREVIEW_CANVAS_SIZE,
  resolveLayout,
  shortEdge,
  type GeometryConfig,
  type WatermarkLayout,
} from "./geometry"
import type { PositionPreset } from "./types"

function firstPlacement(layout: WatermarkLayout) {
  const placement = layout.placements[0]
  if (!placement) throw new Error("expected a watermark placement")
  return placement
}

const LANDSCAPE = { width: 1280, height: 720 }
const PORTRAIT = { width: 720, height: 1280 }
const THREE_TO_ONE = 3

function config(
  overrides: Partial<GeometryConfig> = {}
): GeometryConfig {
  return {
    position: "bottom_right",
    sizeRatio: 0.2,
    marginRatio: 0.03,
    rotation: 0,
    repeat: false,
    spacingXRatio: 0.12,
    spacingYRatio: 0.12,
    ...overrides,
  }
}

describe("resolution-independent watermark sizing", () => {
  it("produces identical source pixels for landscape and portrait", () => {
    const landscape = imageWatermarkSize(LANDSCAPE, THREE_TO_ONE, 0.2)
    const portrait = imageWatermarkSize(PORTRAIT, THREE_TO_ONE, 0.2)

    expect(landscape.width).toBeCloseTo(256, 6)
    expect(portrait.width).toBeCloseTo(256, 6)
    expect(landscape.height).toBeCloseTo(256 / 3, 6)
    expect(portrait.height).toBeCloseTo(256 / 3, 6)
  })

  it("produces identical preview dimensions on a 600px canvas", () => {
    const landscape = resolveLayout(
      LANDSCAPE,
      PREVIEW_CANVAS_SIZE,
      imageWatermarkSize(LANDSCAPE, THREE_TO_ONE, 0.2),
      config()
    )
    const portrait = resolveLayout(
      PORTRAIT,
      PREVIEW_CANVAS_SIZE,
      imageWatermarkSize(PORTRAIT, THREE_TO_ONE, 0.2),
      config()
    )

    expect(firstPlacement(landscape).width).toBeCloseTo(120, 6)
    expect(firstPlacement(portrait).width).toBeCloseTo(120, 6)
    expect(firstPlacement(landscape).height).toBeCloseTo(40, 6)
    expect(firstPlacement(portrait).height).toBeCloseTo(40, 6)
  })

  it("uses the shorter edge for the margin", () => {
    const marginRatio = 0.03
    const landscape = resolveLayout(
      LANDSCAPE,
      PREVIEW_CANVAS_SIZE,
      imageWatermarkSize(LANDSCAPE, THREE_TO_ONE, 0.2),
      config({ marginRatio })
    )
    const portrait = resolveLayout(
      PORTRAIT,
      PREVIEW_CANVAS_SIZE,
      imageWatermarkSize(PORTRAIT, THREE_TO_ONE, 0.2),
      config({ marginRatio })
    )

    expect(landscape.source.margin).toBeCloseTo(shortEdge(LANDSCAPE) * marginRatio, 6)
    expect(portrait.source.margin).toBeCloseTo(shortEdge(PORTRAIT) * marginRatio, 6)
    expect(landscape.source.margin).toBeCloseTo(portrait.source.margin, 6)
  })
})

describe("positioning", () => {
  function placementFor(
    photo: { width: number; height: number },
    position: PositionPreset
  ) {
    const layout = resolveLayout(
      photo,
      PREVIEW_CANVAS_SIZE,
      imageWatermarkSize(photo, THREE_TO_ONE, 0.2),
      config({ position })
    )
    return { layout, placement: firstPlacement(layout) }
  }

  it("anchors to the bottom-right margin", () => {
    const { layout, placement } = placementFor(LANDSCAPE, "bottom_right")
    const margin = layout.source.margin
    const scale = layout.scale

    expect(placement.x + placement.width).toBeCloseTo(
      layout.photo.x + (LANDSCAPE.width - margin) * scale,
      6
    )
    expect(placement.y + placement.height).toBeCloseTo(
      layout.photo.y + (LANDSCAPE.height - margin) * scale,
      6
    )
  })

  it("centres in the middle", () => {
    const { layout, placement } = placementFor(PORTRAIT, "center")
    expect(placement.x + placement.width / 2).toBeCloseTo(
      layout.photo.x + layout.photo.width / 2,
      6
    )
    expect(placement.y + placement.height / 2).toBeCloseTo(
      layout.photo.y + layout.photo.height / 2,
      6
    )
  })

  it("fits a rotated watermark inside the photo", () => {
    const photo = { width: 720, height: 1280 }
    const oversized = { width: 900, height: 400 }
    const layout = resolveLayout(photo, PREVIEW_CANVAS_SIZE, oversized, config({ rotation: 90 }))
    const placement = firstPlacement(layout)
    const scale = layout.scale

    const rotatedWidth = placement.height
    const rotatedHeight = placement.width
    expect(rotatedWidth).toBeLessThanOrEqual(
      (photo.width - layout.source.margin * 2) * scale + 1e-6
    )
    expect(rotatedHeight).toBeLessThanOrEqual(
      (photo.height - layout.source.margin * 2) * scale + 1e-6
    )
  })
})

describe("repeat mode", () => {
  it("tiles with both spacing axes and clips at the photo bounds", () => {
    const spacingXRatio = 0.12
    const spacingYRatio = 0.2
    const layout = resolveLayout(
      LANDSCAPE,
      PREVIEW_CANVAS_SIZE,
      imageWatermarkSize(LANDSCAPE, THREE_TO_ONE, 0.2),
      config({ repeat: true, spacingXRatio, spacingYRatio })
    )

    expect(layout.placements.length).toBeGreaterThan(1)
    expect(layout.source.tiles).toBe(layout.placements.length)
    expect(layout.source.stepX).toBeCloseTo(
      256 + LANDSCAPE.height * spacingXRatio,
      6
    )
    expect(layout.source.stepY).toBeCloseTo(
      256 / 3 + LANDSCAPE.height * spacingYRatio,
      6
    )
  })

  it("caps the tile count", () => {
    const layout = resolveLayout(
      { width: 8000, height: 8000 },
      PREVIEW_CANVAS_SIZE,
      { width: 1, height: 1 },
      config({ repeat: true, spacingXRatio: 0, spacingYRatio: 0 })
    )
    expect(layout.placements.length).toBeLessThanOrEqual(MAX_REPEAT_TILES)
  })
})
