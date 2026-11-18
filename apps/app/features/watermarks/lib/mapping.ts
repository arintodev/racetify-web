import type { Schemas } from "@workspace/api-client"

import {
  percentToRatio,
  ratioToPercent,
  type PositionPreset,
  type WatermarkFormValues,
  type WatermarkScope,
  type WatermarkType,
} from "./types"

type Watermark = Schemas["WatermarkDto"]

export function watermarkToFormValues(
  watermark: Watermark
): WatermarkFormValues {
  return {
    name: watermark.name,
    scope: watermark.scope as WatermarkScope,
    type: watermark.type as WatermarkType,
    active: watermark.isDefault,
    text: watermark.text ?? "",
    position: watermark.position as PositionPreset,
    repeat: watermark.repeatMode === "tiled",
    sizePercent: ratioToPercent(watermark.sizeRatio),
    marginPercent: ratioToPercent(watermark.marginRatio),
    opacityPercent: ratioToPercent(watermark.opacity),
    rotation: watermark.rotation,
    spacingXPercent: ratioToPercent(watermark.spacingXRatio),
    spacingYPercent: ratioToPercent(watermark.spacingYRatio),
    fontFamily: watermark.fontFamily,
    fontWeight: watermark.fontWeight,
    textColor: watermark.textColor,
  }
}

function sharedFields(values: WatermarkFormValues) {
  return {
    name: values.name.trim(),
    position: values.position,
    repeatMode: values.repeat ? ("tiled" as const) : ("none" as const),
    opacity: percentToRatio(values.opacityPercent),
    sizeRatio: percentToRatio(values.sizePercent),
    marginRatio: percentToRatio(values.marginPercent),
    spacingXRatio: percentToRatio(values.spacingXPercent),
    spacingYRatio: percentToRatio(values.spacingYPercent),
    rotation: values.rotation,
    fontFamily: values.fontFamily,
    fontWeight: values.fontWeight,
    textColor: values.textColor,
    isDefault: values.active,
  }
}

export function formValuesToCreate(
  values: WatermarkFormValues,
  uploadId?: string
): Schemas["CreateWatermarkRequest"] {
  return {
    ...sharedFields(values),
    scope: values.scope,
    type: values.type,
    text: values.type === "text" ? values.text.trim() : null,
    uploadId,
  }
}

export function formValuesToUpdate(
  values: WatermarkFormValues,
  uploadId?: string
): Schemas["UpdateWatermarkRequest"] {
  return {
    ...sharedFields(values),
    type: values.type,
    text: values.type === "text" ? values.text.trim() : undefined,
    uploadId,
  }
}
