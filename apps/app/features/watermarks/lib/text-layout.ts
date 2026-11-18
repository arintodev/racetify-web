import { longEdge, shortEdge, type Size } from "./geometry"

/** Text font size as a share of `longEdge × sizeRatio`. The future rasteriser must use this too. */
export const TEXT_SIZE_FACTOR = 0.25
export const TEXT_LINE_HEIGHT = 1.2

export type TextMetrics = {
  size: Size
  fontSize: number
}

/**
 * Single-line text watermark. The browser is the measuring authority; the worker must reproduce the
 * same font stack, `TEXT_SIZE_FACTOR`, and line height to match.
 */
export function measureWatermarkText({
  text,
  fontFamily,
  fontWeight,
  photo,
  sizeRatio,
  margin,
}: {
  text: string
  fontFamily: string
  fontWeight: number
  photo: Size
  sizeRatio: number
  margin: number
}): TextMetrics {
  const fontSize = longEdge(photo) * sizeRatio * TEXT_SIZE_FACTOR
  const maxWidth = Math.max(1, photo.width - margin * 2)
  const measured = measureLineWidth(text, fontFamily, fontWeight, fontSize)
  const scale = measured > maxWidth ? maxWidth / measured : 1
  const finalFontSize = fontSize * scale
  return {
    fontSize: finalFontSize,
    size: {
      width: measured * scale,
      height: finalFontSize * TEXT_LINE_HEIGHT,
    },
  }
}

function measureLineWidth(
  text: string,
  fontFamily: string,
  fontWeight: number,
  fontSize: number
): number {
  if (typeof document === "undefined") {
    // Server-render fallback; the preview is client-only in normal use.
    return Math.max(1, text.length * fontSize * 0.6)
  }
  try {
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) return Math.max(1, text.length * fontSize * 0.6)
    context.font = `${fontWeight} ${fontSize}px "${fontFamily.replaceAll('"', '\\"')}", sans-serif`
    return Math.max(1, context.measureText(text).width)
  } catch {
    return Math.max(1, text.length * fontSize * 0.6)
  }
}

export function textMargin(photo: Size, marginRatio: number): number {
  return shortEdge(photo) * marginRatio
}
