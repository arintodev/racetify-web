import { imageWatermarkSize, shortEdge, type Size } from "./geometry"
import type { SamplePhoto } from "./sample-photos"
import { measureWatermarkText } from "./text-layout"
import type { WatermarkType } from "./types"

export type WatermarkMetrics = { size: Size; fontSize: number | null }

/** Size of the watermark in source pixels for one sample photo. Browser-only for text. */
export function computeWatermarkMetrics({
  type,
  photo,
  sizeRatio,
  marginRatio,
  asset,
  text,
}: {
  type: WatermarkType
  photo: SamplePhoto
  sizeRatio: number
  marginRatio: number
  asset: { width: number | null; height: number | null } | null
  text: { content: string; fontFamily: string; fontWeight: number }
}): WatermarkMetrics | null {
  if (type === "image") {
    if (!asset?.width || !asset.height) return null
    return {
      size: imageWatermarkSize(photo, asset.width / asset.height, sizeRatio),
      fontSize: null,
    }
  }

  if (!text.content.trim()) return null
  const measured = measureWatermarkText({
    text: text.content,
    fontFamily: text.fontFamily,
    fontWeight: text.fontWeight,
    photo,
    sizeRatio,
    margin: shortEdge(photo) * marginRatio,
  })
  return { size: measured.size, fontSize: measured.fontSize }
}
