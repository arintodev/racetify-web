import { z } from "zod"

import type { CanvasOrientation, CanvasPreset, CanvasUnit } from "./canvas-presets"

export const TEMPLATE_SCHEMA_VERSION = 1

export const PLACEHOLDER_KEYS = [
  "FULL_NAME",
  "FIRST_NAME",
  "LAST_NAME",
  "BIB",
  "GENDER",
  "COUNTRY",
  "CATEGORY",
  "DISTANCE",
  "FINISH_TIME",
  "OVERALL_RANK",
  "GENDER_RANK",
  "CATEGORY_RANK",
] as const

export type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number]

export const TemplateScopeSchema = z.enum(["bib", "certificate"])
export type TemplateScope = z.infer<typeof TemplateScopeSchema>

export const CanvasUnitSchema = z.enum(["mm", "px"])
export const CanvasOrientationSchema = z.enum(["portrait", "landscape"])
export const CanvasPresetSchema = z.enum(["a5", "a4", "a3", "custom"])

const HEX_OR_TRANSPARENT = /^(#[0-9a-fA-F]{3,8}|transparent)$/

export const CanvasSpecSchema = z.object({
  preset: CanvasPresetSchema,
  unit: CanvasUnitSchema,
  dpi: z.number().int().min(72).max(600),
  widthMm: z.number().positive().min(10).max(2000),
  heightMm: z.number().positive().min(10).max(2000),
  background: z.string().regex(HEX_OR_TRANSPARENT, "Use a hex colour"),
})

export type CanvasSpec = z.infer<typeof CanvasSpecSchema>

const baseObjectFields = {
  id: z.uuid(),
  name: z.string().min(1).max(120),
  xMm: z.number(),
  yMm: z.number(),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  rotationDeg: z.number().min(-360).max(360),
  opacity: z.number().min(0).max(1),
  visible: z.boolean(),
  locked: z.boolean(),
}

export const TextObjectSchema = z.object({
  ...baseObjectFields,
  type: z.literal("text"),
  text: z.string().max(5000),
  fontFamily: z.string().min(1).max(150),
  fontSizePt: z.number().min(1).max(1000),
  fontWeight: z.number().int().min(100).max(900),
  fontStyle: z.enum(["normal", "italic"]),
  fill: z.string().min(1).max(64),
  textAlign: z.enum(["left", "center", "right", "justify"]),
  lineHeight: z.number().min(0.5).max(5),
  letterSpacingEm: z.number().min(-0.2).max(2),
  underline: z.boolean(),
})

export const ImageObjectSchema = z.object({
  ...baseObjectFields,
  type: z.literal("image"),
  assetId: z.uuid(),
})

export const RectObjectSchema = z.object({
  ...baseObjectFields,
  type: z.literal("rect"),
  fill: z.string().min(1).max(64),
  stroke: z.string().max(64).nullable(),
  strokeWidthMm: z.number().min(0).max(20),
  radiusMm: z.number().min(0).max(500),
})

export const EllipseObjectSchema = z.object({
  ...baseObjectFields,
  type: z.literal("ellipse"),
  fill: z.string().min(1).max(64),
  stroke: z.string().max(64).nullable(),
  strokeWidthMm: z.number().min(0).max(20),
})

export const PathObjectSchema = z.object({
  ...baseObjectFields,
  type: z.literal("path"),
  pathData: z.string().min(1).max(100_000),
  fill: z.string().max(64).nullable(),
  stroke: z.string().max(64).nullable(),
  strokeWidthMm: z.number().min(0).max(20),
})

export const TemplateObjectSchema = z.discriminatedUnion("type", [
  TextObjectSchema,
  ImageObjectSchema,
  RectObjectSchema,
  EllipseObjectSchema,
  PathObjectSchema,
])

export type TextObject = z.infer<typeof TextObjectSchema>
export type ImageObject = z.infer<typeof ImageObjectSchema>
export type RectObject = z.infer<typeof RectObjectSchema>
export type EllipseObject = z.infer<typeof EllipseObjectSchema>
export type PathObject = z.infer<typeof PathObjectSchema>
export type TemplateObject = z.infer<typeof TemplateObjectSchema>

export const ImageAssetSchema = z.object({
  id: z.uuid(),
  kind: z.literal("image"),
  name: z.string().min(1).max(255),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  dataUrl: z.string().startsWith("data:image/"),
  widthPx: z.number().int().positive(),
  heightPx: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
  createdAt: z.string(),
})

export const FontAssetSchema = z.object({
  id: z.uuid(),
  kind: z.literal("font"),
  family: z.string().min(1).max(150),
  fileName: z.string().min(1).max(255),
  format: z.enum(["woff2", "woff", "ttf", "otf"]),
  weight: z.number().int().min(100).max(900),
  style: z.enum(["normal", "italic"]),
  dataUrl: z.string().startsWith("data:"),
  bytes: z.number().int().nonnegative(),
  createdAt: z.string(),
})

export type ImageAsset = z.infer<typeof ImageAssetSchema>
export type FontAsset = z.infer<typeof FontAssetSchema>
export type TemplateAsset = ImageAsset

export const ExampleDataSchema = z.record(
  z.string().max(80),
  z.string().max(1000)
)

export const TemplateDocumentSchema = z.object({
  schemaVersion: z.literal(TEMPLATE_SCHEMA_VERSION),
  id: z.uuid(),
  name: z.string().min(1).max(120),
  scope: TemplateScopeSchema,
  eventId: z.string().nullable(),
  canvas: CanvasSpecSchema,
  /** Bottom-to-top paint order. */
  objects: z.array(TemplateObjectSchema).max(1000),
  exampleData: ExampleDataSchema,
  assets: z.array(ImageAssetSchema).max(50),
  fonts: z.array(FontAssetSchema).max(20),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type TemplateDocument = z.infer<typeof TemplateDocumentSchema>

export type CanvasMeta = {
  preset: CanvasPreset
  unit: CanvasUnit
  orientation: CanvasOrientation
}
