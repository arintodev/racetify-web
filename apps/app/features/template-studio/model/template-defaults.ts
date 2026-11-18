import { createId } from "../lib/id"

import {
  CANVAS_PRESETS,
  DEFAULT_EDITOR_DPI,
  clampCanvasMm,
  displayValueToMm,
  isNamedPreset,
  orientationOf,
  presetSizeMm,
  type CanvasOrientation,
  type CanvasPreset,
  type CanvasUnit,
} from "./canvas-presets"
import { defaultExampleData } from "./placeholder-catalog"
import type {
  CanvasSpec,
  TemplateDocument,
  TemplateScope,
  TextObject,
} from "./template-document"

export const DEFAULT_FONT_FAMILY = "Arial"
export const DEFAULT_FONT_SIZE_PT = 24
export const DEFAULT_TEXT_FILL = "#111111"

export function createCanvasSpec(input: {
  preset: CanvasPreset
  orientation: CanvasOrientation
  unit: CanvasUnit
  customWidth?: number
  customHeight?: number
  dpi?: number
}): CanvasSpec {
  const dpi = input.dpi ?? DEFAULT_EDITOR_DPI

  if (isNamedPreset(input.preset)) {
    const size = presetSizeMm(input.preset, input.orientation)
    return {
      preset: input.preset,
      unit: input.unit,
      dpi,
      widthMm: size.widthMm,
      heightMm: size.heightMm,
      background: "#ffffff",
    }
  }

  const rawWidth = input.customWidth ?? 210
  const rawHeight = input.customHeight ?? 297
  const widthMm = clampCanvasMm(displayValueToMm(rawWidth, input.unit, dpi))
  const heightMm = clampCanvasMm(displayValueToMm(rawHeight, input.unit, dpi))

  return {
    preset: "custom",
    unit: input.unit,
    dpi,
    widthMm,
    heightMm,
    background: "#ffffff",
  }
}

export function createTemplateDocument(input: {
  name: string
  scope: TemplateScope
  eventId: string | null
  preset: CanvasPreset
  orientation: CanvasOrientation
  unit: CanvasUnit
  customWidth?: number
  customHeight?: number
}): TemplateDocument {
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    id: createId(),
    name: input.name.trim(),
    scope: input.scope,
    eventId: input.eventId,
    canvas: createCanvasSpec(input),
    objects: [],
    exampleData: defaultExampleData(),
    assets: [],
    fonts: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function createTextObject(input: {
  canvas: CanvasSpec
  name?: string
  text?: string
  xMm?: number
  yMm?: number
  widthMm?: number
}): TextObject {
  const widthMm = Math.max(
    Math.min(input.widthMm ?? 120, input.canvas.widthMm - 20),
    10
  )
  const fontSizePt = DEFAULT_FONT_SIZE_PT
  return {
    id: createId(),
    type: "text",
    name: input.name ?? "Text",
    xMm: input.xMm ?? Math.max((input.canvas.widthMm - widthMm) / 2, 10),
    yMm: input.yMm ?? Math.max(input.canvas.heightMm / 2 - 10, 10),
    widthMm,
    heightMm: 20,
    rotationDeg: 0,
    opacity: 1,
    visible: true,
    locked: false,
    text: input.text ?? "Add text",
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSizePt,
    fontWeight: 400,
    fontStyle: "normal",
    fill: DEFAULT_TEXT_FILL,
    textAlign: "center",
    lineHeight: 1.2,
    letterSpacingEm: 0,
    underline: false,
  }
}

export function nextTextName(objects: TemplateDocument["objects"]): string {
  let index = objects.filter((object) => object.type === "text").length + 1
  const names = new Set(objects.map((object) => object.name))
  while (names.has(`Text ${index}`)) index += 1
  return `Text ${index}`
}

export function canvasOrientation(canvas: CanvasSpec): CanvasOrientation {
  return orientationOf(canvas.widthMm, canvas.heightMm)
}

export function canvasPresetLabel(canvas: CanvasSpec): string {
  if (canvas.preset === "custom") return "Custom"
  return CANVAS_PRESETS[canvas.preset].label
}
