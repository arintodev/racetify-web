"use client"

import { Separator } from "@workspace/ui/components/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"

import { ColorField } from "@/components/color-field"

import {
  CANVAS_PRESETS,
  clampCanvasMm,
  detectPreset,
  displayValueToMm,
  isNamedPreset,
  orientationOf,
  presetSizeMm,
  type CanvasPreset,
} from "../model/canvas-presets"
import type { CanvasSpec } from "../model/template-document"
import { mmToPx, roundTo } from "../model/units"
import { useEditorStore } from "../store/editor-store-context"

import { NumberField } from "./number-field"

const PRESET_ITEMS = [
  { value: "a5", label: "A5 — 148 × 210 mm" },
  { value: "a4", label: "A4 — 210 × 297 mm" },
  { value: "a3", label: "A3 — 297 × 420 mm" },
  { value: "custom", label: "Custom" },
]

function displayValue(canvas: CanvasSpec, mm: number): number {
  return canvas.unit === "px"
    ? roundTo(mmToPx(mm, canvas.dpi), 0)
    : roundTo(mm, 1)
}

export function CanvasInspector() {
  const document = useEditorStore((state) => state.document)
  const updateCanvas = useEditorStore((state) => state.updateCanvas)
  const canvas = document.canvas
  const orientation = orientationOf(canvas.widthMm, canvas.heightMm)

  function applyPreset(preset: CanvasPreset): void {
    if (preset === "custom") {
      updateCanvas({ preset: "custom" })
      return
    }
    const size = presetSizeMm(preset, orientation)
    updateCanvas({
      preset,
      widthMm: size.widthMm,
      heightMm: size.heightMm,
    })
  }

  function applyOrientation(next: "portrait" | "landscape"): void {
    if (next === orientation) return
    const widthMm = canvas.heightMm
    const heightMm = canvas.widthMm
    updateCanvas({
      widthMm,
      heightMm,
      preset: detectPreset(widthMm, heightMm),
    })
  }

  function applyDimension(axis: "width" | "height", value: number): void {
    const mm = clampCanvasMm(
      displayValueToMm(value, canvas.unit, canvas.dpi)
    )
    const widthMm = axis === "width" ? mm : canvas.widthMm
    const heightMm = axis === "height" ? mm : canvas.heightMm
    updateCanvas({
      widthMm,
      heightMm,
      preset: detectPreset(widthMm, heightMm),
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Canvas
        </h3>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Size</span>
          <Select
            items={PRESET_ITEMS}
            value={canvas.preset}
            onValueChange={(value) => {
              if (typeof value === "string") applyPreset(value as CanvasPreset)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Orientation
          </span>
          <ToggleGroup
            size="sm"
            value={[orientation]}
            onValueChange={(value) => {
              const next = value[0]
              if (next === "portrait" || next === "landscape") {
                applyOrientation(next)
              }
            }}
          >
            <ToggleGroupItem value="portrait">Portrait</ToggleGroupItem>
            <ToggleGroupItem value="landscape">Landscape</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Display unit
          </span>
          <ToggleGroup
            size="sm"
            value={[canvas.unit]}
            onValueChange={(value) => {
              const next = value[0]
              if (next === "mm" || next === "px") updateCanvas({ unit: next })
            }}
          >
            <ToggleGroupItem value="mm">mm</ToggleGroupItem>
            <ToggleGroupItem value="px">px</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={`Width (${canvas.unit})`}
            value={displayValue(canvas, canvas.widthMm)}
            min={1}
            step={1}
            onCommit={(value) => applyDimension("width", value)}
          />
          <NumberField
            label={`Height (${canvas.unit})`}
            value={displayValue(canvas, canvas.heightMm)}
            min={1}
            step={1}
            onCommit={(value) => applyDimension("height", value)}
          />
        </div>

        <ColorField
          label="Background"
          value={canvas.background}
          onChange={(value) => updateCanvas({ background: value })}
        />
      </section>

      <Separator />

      <section className="flex flex-col gap-1 text-xs text-muted-foreground">
        <p>
          {isNamedPreset(canvas.preset)
            ? `${CANVAS_PRESETS[canvas.preset].label} · `
            : "Custom · "}
          {orientation}
        </p>
        <p>
          Editing at 96 DPI. Geometry is stored in millimetres; changing the
          display unit or size never rescales existing objects.
        </p>
      </section>
    </div>
  )
}
