"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import * as React from "react"

import {
  Field,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"

import { ColorField } from "@/components/color-field"
import { getBrowserApi } from "@/lib/api/browser"
import { FONT_WEIGHTS, SYSTEM_FONT_FAMILIES } from "@/lib/fonts"

export function TextStyleFields({
  eventId,
  text,
  fontFamily,
  fontWeight,
  textColor,
  textError,
  disabled,
  onTextChange,
  onFontFamilyChange,
  onFontWeightChange,
  onTextColorChange,
}: {
  eventId: string
  text: string
  fontFamily: string
  fontWeight: number
  textColor: string
  textError?: string
  disabled?: boolean
  onTextChange: (value: string) => void
  onFontFamilyChange: (value: string) => void
  onFontWeightChange: (value: number) => void
  onTextColorChange: (value: string) => void
}) {
  const eventFonts = useQuery({
    queryKey: queryKeys.eventFonts(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["FontDto"][]>(
        `/v1/events/${eventId}/fonts`
      ),
    staleTime: 60_000,
    retry: false,
  })

  const families = React.useMemo(() => {
    const names = new Set<string>([
      ...SYSTEM_FONT_FAMILIES,
      ...(eventFonts.data ?? []).map((font) => font.family),
    ])
    if (fontFamily) names.add(fontFamily)
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [eventFonts.data, fontFamily])

  const weightOptions = React.useMemo(() => {
    const options: { value: string; label: string }[] = FONT_WEIGHTS.map(
      (weight) => ({
        value: String(weight.value),
        label: weight.label,
      })
    )
    if (!FONT_WEIGHTS.some((weight) => weight.value === fontWeight)) {
      options.push({ value: String(fontWeight), label: String(fontWeight) })
      options.sort((a, b) => Number(a.value) - Number(b.value))
    }
    return options
  }, [fontWeight])

  return (
    <div className="flex flex-col gap-4">
      <Field data-invalid={Boolean(textError)}>
        <FieldLabel htmlFor="watermark-text">Text</FieldLabel>
        <Textarea
          id="watermark-text"
          value={text}
          disabled={disabled}
          rows={2}
          maxLength={200}
          placeholder="Event name, venue, or copyright"
          aria-invalid={Boolean(textError)}
          onChange={(event) => onTextChange(event.target.value)}
        />
        <FieldError
          errors={textError ? [{ message: textError }] : undefined}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Font family</span>
          <Select
            items={families.map((family) => ({ value: family, label: family }))}
            value={fontFamily}
            disabled={disabled}
            onValueChange={(value) => {
              if (typeof value === "string") onFontFamilyChange(value)
            }}
          >
            <SelectTrigger className="w-full" aria-label="Font family">
              <SelectValue placeholder="Choose a font" />
            </SelectTrigger>
            <SelectContent>
              {families.map((family) => (
                <SelectItem key={family} value={family}>
                  {family}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Font weight</span>
          <Select
            items={weightOptions}
            value={String(fontWeight)}
            disabled={disabled}
            onValueChange={(value) => {
              if (typeof value === "string") {
                onFontWeightChange(Number(value))
              }
            }}
          >
            <SelectTrigger className="w-full" aria-label="Font weight">
              <SelectValue placeholder="Choose a weight" />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHTS.map((weight) => (
                <SelectItem key={weight.value} value={String(weight.value)}>
                  {weight.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ColorField
        label="Text colour"
        value={textColor}
        onChange={onTextColorChange}
      />
    </div>
  )
}
