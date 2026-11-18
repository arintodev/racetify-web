import { z } from "zod"

import { POSITION_PRESETS } from "./types"

export const watermarkFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Give the watermark a name.")
      .max(150, "Keep the name under 150 characters."),
    scope: z.enum(["gallery", "certificate"]),
    type: z.enum(["image", "text"]),
    active: z.boolean(),
    text: z.string().max(200, "Keep the text under 200 characters."),
    position: z.enum(POSITION_PRESETS),
    repeat: z.boolean(),
    sizePercent: z
      .number()
      .min(5, "Size must be at least 5%.")
      .max(50, "Size must be at most 50%."),
    marginPercent: z
      .number()
      .min(0, "Margin cannot be negative.")
      .max(20, "Margin must be at most 20%."),
    opacityPercent: z
      .number()
      .min(0, "Opacity cannot be negative.")
      .max(100, "Opacity must be at most 100%."),
    rotation: z
      .number()
      .min(-180, "Rotation must be between -180° and 180°.")
      .max(180, "Rotation must be between -180° and 180°."),
    spacingXPercent: z
      .number()
      .min(0, "Spacing cannot be negative.")
      .max(100, "Spacing must be at most 100%."),
    spacingYPercent: z
      .number()
      .min(0, "Spacing cannot be negative.")
      .max(100, "Spacing must be at most 100%."),
    fontFamily: z.string().trim().min(1, "Choose a font family."),
    fontWeight: z.number().int().min(100).max(900),
    textColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex colour."),
  })
  .refine(
    (values) => values.type !== "text" || values.text.trim().length > 0,
    {
      message: "Text watermarks need text.",
      path: ["text"],
    }
  )

export type WatermarkSchemaValues = z.output<typeof watermarkFormSchema>
