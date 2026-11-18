"use client"

import { Separator } from "@workspace/ui/components/separator"

import { ColorField } from "@/components/color-field"

import type {
  EllipseObject,
  ImageObject,
  PathObject,
  RectObject,
} from "../model/template-document"
import { useEditorStore } from "../store/editor-store-context"

import { NumberField } from "./number-field"

type ShapeObject = RectObject | EllipseObject | PathObject | ImageObject

export function ShapeInspector({ object }: { object: ShapeObject }) {
  const updateObject = useEditorStore((state) => state.updateObject)

  if (object.type === "image") {
    return (
      <p className="text-xs text-muted-foreground">
        Resize the image with its handles. Image replacement is not available in
        this version.
      </p>
    )
  }

  const hasFill = object.type !== "path" || object.fill !== null
  const fillValue =
    object.type === "path" ? (object.fill ?? "#000000") : object.fill
  const hasStroke = object.stroke !== null
  const strokeValue = object.stroke ?? "#000000"

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Appearance
        </h3>

        <ColorField
          label={hasFill ? "Fill" : "Fill (none)"}
          value={fillValue}
          allowTransparent
          onChange={(value) =>
            updateObject(
              object.id,
              object.type === "path"
                ? { fill: value === "transparent" ? null : value }
                : { fill: value },
              { historyKey: `fill:${object.id}` }
            )
          }
        />

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Stroke
          </span>
          <button
            type="button"
            className="text-xs text-primary underline-offset-2 hover:underline"
            onClick={() =>
              updateObject(
                object.id,
                { stroke: hasStroke ? null : "#000000" },
                { historyKey: null }
              )
            }
          >
            {hasStroke ? "Remove" : "Add"}
          </button>
        </div>

        {hasStroke || object.stroke === null ? (
          <ColorField
            label="Stroke colour"
            value={strokeValue}
            onChange={(value) =>
              updateObject(object.id, { stroke: value }, {
                historyKey: `stroke:${object.id}`,
              })
            }
          />
        ) : null}

        <NumberField
          label="Stroke width"
          value={object.strokeWidthMm}
          suffix="mm"
          min={0}
          max={20}
          step={0.1}
          onCommit={(value) =>
            updateObject(
              object.id,
              { strokeWidthMm: value },
              { historyKey: `stroke-width:${object.id}` }
            )
          }
        />

        {object.type === "rect" ? (
          <NumberField
            label="Corner radius"
            value={object.radiusMm}
            suffix="mm"
            min={0}
            max={500}
            step={0.5}
            onCommit={(value) =>
              updateObject(
                object.id,
                { radiusMm: value },
                { historyKey: `radius:${object.id}` }
              )
            }
          />
        ) : null}
      </section>

      <Separator />
      <p className="text-[11px] text-muted-foreground">
        {object.type === "path"
          ? "Vector paths keep their original outline. Fill and stroke are editable."
          : "Use the canvas handles or the position fields to resize."}
      </p>
    </div>
  )
}
