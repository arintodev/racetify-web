export const POSITION_PRESETS = [
  "top_left",
  "top_center",
  "top_right",
  "center_left",
  "center",
  "center_right",
  "bottom_left",
  "bottom_center",
  "bottom_right",
] as const

export type PositionPreset = (typeof POSITION_PRESETS)[number]

export const POSITION_LABELS: Record<PositionPreset, string> = {
  top_left: "Top left",
  top_center: "Top center",
  top_right: "Top right",
  center_left: "Center left",
  center: "Center",
  center_right: "Center right",
  bottom_left: "Bottom left",
  bottom_center: "Bottom center",
  bottom_right: "Bottom right",
}

export const WATERMARK_DEFAULTS = {
  sizePercent: 20,
  marginPercent: 3,
  opacityPercent: 35,
  rotation: 0,
  spacingXPercent: 12,
  spacingYPercent: 12,
  fontFamily: "Inter",
  fontWeight: 600,
  textColor: "#ffffff",
  position: "bottom_right" as PositionPreset,
  repeat: false,
}

export type WatermarkType = "image" | "text"
export type WatermarkScope = "gallery" | "certificate"

export type WatermarkFormValues = {
  name: string
  scope: WatermarkScope
  type: WatermarkType
  active: boolean
  text: string
  position: PositionPreset
  repeat: boolean
  sizePercent: number
  marginPercent: number
  opacityPercent: number
  rotation: number
  spacingXPercent: number
  spacingYPercent: number
  fontFamily: string
  fontWeight: number
  textColor: string
}

export const EMPTY_FORM_VALUES: WatermarkFormValues = {
  name: "",
  scope: "gallery",
  type: "image",
  active: true,
  text: "",
  ...WATERMARK_DEFAULTS,
}

export function percentToRatio(value: number): number {
  return Math.round(value * 10) / 1000
}

export function ratioToPercent(value: number): number {
  return Math.round(value * 1000) / 10
}
