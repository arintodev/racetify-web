/**
 * Unit conversions for the template document.
 *
 * Canonical document geometry is millimetres. The editor draws at the CSS reference of 96 DPI,
 * which keeps an A4 canvas at roughly 794 × 1123 device-independent pixels. Print resolution is an
 * export concern and must never drive the editing canvas size.
 */

export const MM_PER_INCH = 25.4
export const CSS_PX_PER_MM = 96 / 25.4
export const PT_PER_INCH = 72

/** Millimetres to editor pixels at the CSS reference resolution. */
export function mmToCssPx(mm: number): number {
  return mm * CSS_PX_PER_MM
}

/** Editor pixels to millimetres at the CSS reference resolution. */
export function cssPxToMm(px: number): number {
  return px / CSS_PX_PER_MM
}

/** Millimetres to pixels at an arbitrary DPI (used for display-only px readouts). */
export function mmToPx(mm: number, dpi = 96): number {
  return (mm * dpi) / MM_PER_INCH
}

/** Pixels at an arbitrary DPI to millimetres. */
export function pxToMm(px: number, dpi = 96): number {
  return (px * MM_PER_INCH) / dpi
}

/** Points to editor pixels (1 pt = 1/72 in, editor renders at 96 px/in). */
export function ptToCssPx(pt: number): number {
  return (pt * 96) / PT_PER_INCH
}

/** Editor pixels to points. */
export function cssPxToPt(px: number): number {
  return (px * PT_PER_INCH) / 96
}

export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function formatDimension(value: number, decimals = 1): string {
  return roundTo(value, decimals).toString()
}

/** Human-readable canvas size, e.g. `210 × 297 mm`. */
export function formatCanvasSize(
  widthMm: number,
  heightMm: number,
  unit: "mm" | "px",
  dpi = 96
): string {
  if (unit === "px") {
    const width = Math.round(mmToPx(widthMm, dpi))
    const height = Math.round(mmToPx(heightMm, dpi))
    return `${width} × ${height} px`
  }
  return `${formatDimension(widthMm)} × ${formatDimension(heightMm)} mm`
}
