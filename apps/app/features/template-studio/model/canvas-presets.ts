import { clamp, pxToMm } from "./units"

export type CanvasUnit = "mm" | "px"
export type CanvasOrientation = "portrait" | "landscape"
export type CanvasPreset = "a5" | "a4" | "a3" | "custom"

/** Preset dimensions in millimetres, portrait orientation. */
export const CANVAS_PRESETS = {
  a5: { label: "A5", widthMm: 148, heightMm: 210 },
  a4: { label: "A4", widthMm: 210, heightMm: 297 },
  a3: { label: "A3", widthMm: 297, heightMm: 420 },
} as const

export type NamedCanvasPreset = keyof typeof CANVAS_PRESETS

export const MIN_CANVAS_MM = 10
export const MAX_CANVAS_MM = 2000
export const DEFAULT_EDITOR_DPI = 96

export function isNamedPreset(value: string): value is NamedCanvasPreset {
  return value in CANVAS_PRESETS
}

export function presetSizeMm(
  preset: NamedCanvasPreset,
  orientation: CanvasOrientation
): { widthMm: number; heightMm: number } {
  const base = CANVAS_PRESETS[preset]
  const widthMm = orientation === "landscape" ? base.heightMm : base.widthMm
  const heightMm = orientation === "landscape" ? base.widthMm : base.heightMm
  return { widthMm, heightMm }
}

export function orientationOf(
  widthMm: number,
  heightMm: number
): CanvasOrientation {
  return widthMm > heightMm ? "landscape" : "portrait"
}

export function detectPreset(
  widthMm: number,
  heightMm: number
): CanvasPreset {
  for (const [key, size] of Object.entries(CANVAS_PRESETS)) {
    const matchesPortrait =
      Math.abs(size.widthMm - widthMm) < 0.5 &&
      Math.abs(size.heightMm - heightMm) < 0.5
    const matchesLandscape =
      Math.abs(size.widthMm - heightMm) < 0.5 &&
      Math.abs(size.heightMm - widthMm) < 0.5
    if (matchesPortrait || matchesLandscape) {
      return key as NamedCanvasPreset
    }
  }
  return "custom"
}

/**
 * Converts a value typed in the given display unit to millimetres. `px` values are interpreted at
 * the canvas DPI, which only affects the readout, not the stored millimetre geometry.
 */
export function displayValueToMm(
  value: number,
  unit: CanvasUnit,
  dpi: number
): number {
  return unit === "px" ? pxToMm(value, dpi) : value
}

export function clampCanvasMm(value: number): number {
  return clamp(value, MIN_CANVAS_MM, MAX_CANVAS_MM)
}
