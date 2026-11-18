"use client"

import type { ReactNode } from "react"
import type { UseFormReturn } from "react-hook-form"

import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import { SliderField } from "@/components/slider-field"

import type { WatermarkAsset } from "../hooks/use-watermark-asset"
import type { WatermarkFormValues } from "../lib/types"
import {
  POSITION_LABELS,
  POSITION_PRESETS,
  type PositionPreset,
  type WatermarkScope,
} from "../lib/types"

import { AssetField } from "./asset-field"
import { TextStyleFields } from "./text-style-fields"

const SCOPE_ITEMS = [
  { value: "gallery", label: "Gallery" },
  { value: "certificate", label: "Certificate" },
]

const POSITION_ITEMS = [
  ...POSITION_PRESETS.map((position) => ({
    value: position,
    label: POSITION_LABELS[position],
  })),
  { value: "repeat", label: "Repeat pattern" },
]

export function ConfigPanel({
  form,
  eventId,
  isNew,
  asset,
  assetError,
  assetReadError,
  onChooseAsset,
  onRemoveAsset,
}: {
  form: UseFormReturn<WatermarkFormValues>
  eventId: string
  isNew: boolean
  asset: WatermarkAsset | null
  assetError?: string
  assetReadError?: boolean
  onChooseAsset: (file: File) => void
  onRemoveAsset: () => void
}) {
  const values = form.watch()
  const errors = form.formState.errors

  // react-hook-form's path generics cannot resolve a union key; the helper keeps the cast local.
  function setField<K extends keyof WatermarkFormValues>(
    key: K,
    value: WatermarkFormValues[K]
  ) {
    form.setValue(key as never, value as never, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Watermark configuration</CardTitle>
        <CardDescription>
          Percentages keep the mark consistent across photo resolutions and
          orientations.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Section title="Identity">
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="watermark-name">Name</FieldLabel>
            <Input
              id="watermark-name"
              placeholder="e.g. Venue mark"
              aria-invalid={Boolean(errors.name)}
              {...form.register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="watermark-scope">Scope</FieldLabel>
            {isNew ? (
              <Select
                items={SCOPE_ITEMS}
                value={values.scope}
                onValueChange={(value) => {
                  if (typeof value === "string") {
                    setField("scope", value as WatermarkScope)
                  }
                }}
              >
                <SelectTrigger id="watermark-scope" className="w-full">
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary" className="w-fit capitalize">
                {values.scope}
              </Badge>
            )}
            <FieldDescription>
              The scope decides which documents the preset can be applied to.
            </FieldDescription>
          </Field>
        </Section>

        <Separator />

        <Section title="Activation">
          <Field orientation="horizontal">
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="watermark-active">Active</FieldLabel>
              <FieldDescription>
                Only one active preset per scope is applied to processed
                photos. Turning it off keeps every other setting.
              </FieldDescription>
            </div>
            <Switch
              id="watermark-active"
              checked={values.active}
              onCheckedChange={(checked) => setField("active", checked)}
            />
          </Field>
        </Section>

        <Separator />

        <Section
          title="Type and asset"
          description="Image presets keep their aspect ratio; text presets use the font below."
        >
          <ToggleGroup
            aria-label="Watermark type"
            value={[values.type]}
            onValueChange={(value) => {
              const next = value[0]
              if (next === "image" || next === "text") {
                setField("type", next)
              }
            }}
          >
            <ToggleGroupItem value="image">Image</ToggleGroupItem>
            <ToggleGroupItem value="text">Text</ToggleGroupItem>
          </ToggleGroup>

          {values.type === "image" ? (
            <AssetField
              asset={asset}
              onChoose={onChooseAsset}
              onRemove={onRemoveAsset}
              error={assetError}
              readError={assetReadError}
            />
          ) : (
            <TextStyleFields
              eventId={eventId}
              text={values.text}
              fontFamily={values.fontFamily}
              fontWeight={values.fontWeight}
              textColor={values.textColor}
              textError={errors.text?.message}
              onTextChange={(value) => setField("text", value)}
              onFontFamilyChange={(value) => setField("fontFamily", value)}
              onFontWeightChange={(value) => setField("fontWeight", value)}
              onTextColorChange={(value) => setField("textColor", value)}
            />
          )}
        </Section>

        <Separator />

        <Section
          title="Position"
          description={
            values.repeat
              ? "Repeat fills the photo; margin does not apply."
              : "Margin is measured from the photo's shorter edge."
          }
        >
          <Field>
            <FieldLabel htmlFor="watermark-position">Placement</FieldLabel>
            <Select
              items={POSITION_ITEMS}
              value={values.repeat ? "repeat" : values.position}
              onValueChange={(value) => {
                if (typeof value !== "string") return
                if (value === "repeat") {
                  setField("repeat", true)
                  return
                }
                setField("repeat", false)
                setField("position", value as PositionPreset)
              }}
            >
              <SelectTrigger id="watermark-position" className="w-full">
                <SelectValue placeholder="Choose a placement" />
              </SelectTrigger>
              <SelectContent>
                {POSITION_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Choose a preset anchor, or repeat the watermark across the photo.
            </FieldDescription>
          </Field>

          <SliderField
            id="watermark-margin"
            label="Margin"
            value={values.marginPercent}
            min={0}
            max={20}
            step={0.5}
            suffix="%"
            disabled={values.repeat}
            description="Distance between the watermark and the photo edge."
            error={errors.marginPercent?.message}
            onChange={(value) => setField("marginPercent", value)}
          />
        </Section>

        <Separator />

        <Section
          title="Size and appearance"
          description="Size uses the longest edge; rotation and opacity apply to every tile."
        >
          <SliderField
            id="watermark-size"
            label="Size"
            value={values.sizePercent}
            min={5}
            max={50}
            step={1}
            suffix="%"
            description={
              values.type === "image"
                ? "Watermark width as a share of the photo's longest edge."
                : "Font size as a share of the photo's longest edge."
            }
            error={errors.sizePercent?.message}
            onChange={(value) => setField("sizePercent", value)}
          />
          <SliderField
            id="watermark-opacity"
            label="Opacity"
            value={values.opacityPercent}
            min={0}
            max={100}
            step={1}
            suffix="%"
            error={errors.opacityPercent?.message}
            onChange={(value) => setField("opacityPercent", value)}
          />
          <SliderField
            id="watermark-rotation"
            label="Rotation"
            value={values.rotation}
            min={-180}
            max={180}
            step={1}
            suffix="°"
            error={errors.rotation?.message}
            onChange={(value) => setField("rotation", value)}
          />
        </Section>

        {values.repeat ? (
          <>
            <Separator />
            <Section
              title="Repeat spacing"
              description="Gap between tiles, relative to the photo's shorter edge."
            >
              <SliderField
                id="watermark-spacing-x"
                label="Horizontal spacing"
                value={values.spacingXPercent}
                min={0}
                max={100}
                step={1}
                suffix="%"
                error={errors.spacingXPercent?.message}
                onChange={(value) => setField("spacingXPercent", value)}
              />
              <SliderField
                id="watermark-spacing-y"
                label="Vertical spacing"
                value={values.spacingYPercent}
                min={0}
                max={100}
                step={1}
                suffix="%"
                error={errors.spacingYPercent?.message}
                onChange={(value) => setField("spacingYPercent", value)}
              />
            </Section>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
