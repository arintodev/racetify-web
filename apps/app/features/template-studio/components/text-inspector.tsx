"use client"

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Italic,
  Underline as UnderlineIcon,
} from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import { Textarea } from "@workspace/ui/components/textarea"
import { Toggle } from "@workspace/ui/components/toggle"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import { ColorField } from "@/components/color-field"

import type { TextObject } from "../model/template-document"
import { useEditorStore } from "../store/editor-store-context"

import { FontPicker } from "./font-picker"
import { NumberField } from "./number-field"

const WEIGHTS = [300, 400, 500, 600, 700, 800, 900] as const

const ALIGNMENTS = [
  { value: "left", label: "Align left", icon: AlignLeft },
  { value: "center", label: "Align centre", icon: AlignCenter },
  { value: "right", label: "Align right", icon: AlignRight },
  { value: "justify", label: "Justify", icon: AlignJustify },
] as const

export function TextInspector({
  object,
  eventId,
}: {
  object: TextObject
  eventId: string
}) {
  const updateObject = useEditorStore((state) => state.updateObject)

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Text
        </h3>
        <Textarea
          value={object.text}
          rows={4}
          maxLength={5000}
          className="text-sm"
          onChange={(event) =>
            updateObject(
              object.id,
              { text: event.target.value },
              { historyKey: `text:${object.id}` }
            )
          }
        />
        <p className="text-[11px] text-muted-foreground">
          Type text and placeholders such as {"{FULL_NAME}"} together.
        </p>
      </section>

      <Separator />

      <section className="flex flex-col gap-2">
        <FontPicker
          eventId={eventId}
          value={object.fontFamily}
          onChange={(family) =>
            updateObject(
              object.id,
              { fontFamily: family },
              { historyKey: null }
            )
          }
        />

        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Size"
            value={object.fontSizePt}
            suffix="pt"
            min={1}
            max={1000}
            step={1}
            onCommit={(value) =>
              updateObject(
                object.id,
                { fontSizePt: value },
                { historyKey: `size:${object.id}` }
              )
            }
          />
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Weight
            </span>
            <Select
              items={WEIGHTS.map((weight) => ({
                value: String(weight),
                label: String(weight),
              }))}
              value={String(object.fontWeight)}
              onValueChange={(value) => {
                if (typeof value !== "string") return
                updateObject(
                  object.id,
                  { fontWeight: Number(value) },
                  { historyKey: null }
                )
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEIGHTS.map((weight) => (
                  <SelectItem key={weight} value={String(weight)}>
                    {weight}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        <div className="flex items-center gap-1">
          <Toggle
            size="sm"
            pressed={object.fontStyle === "italic"}
            aria-label="Italic"
            onPressedChange={(pressed) =>
              updateObject(
                object.id,
                { fontStyle: pressed ? "italic" : "normal" },
                { historyKey: null }
              )
            }
          >
            <Italic />
          </Toggle>
          <Toggle
            size="sm"
            pressed={object.underline}
            aria-label="Underline"
            onPressedChange={(pressed) =>
              updateObject(
                object.id,
                { underline: pressed },
                { historyKey: null }
              )
            }
          >
            <UnderlineIcon />
          </Toggle>
        </div>

        <ColorField
          label="Colour"
          value={object.fill}
          onChange={(value) =>
            updateObject(
              object.id,
              { fill: value },
              { historyKey: `fill:${object.id}` }
            )
          }
        />

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Alignment
          </span>
          <ToggleGroup
            size="sm"
            value={[object.textAlign]}
            onValueChange={(value) => {
              const next = value[0]
              if (
                next === "left" ||
                next === "center" ||
                next === "right" ||
                next === "justify"
              ) {
                updateObject(
                  object.id,
                  { textAlign: next },
                  { historyKey: null }
                )
              }
            }}
          >
            {ALIGNMENTS.map((alignment) => (
              <ToggleGroupItem
                key={alignment.value}
                value={alignment.value}
                aria-label={alignment.label}
              >
                <alignment.icon />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Line height"
            value={object.lineHeight}
            min={0.5}
            max={5}
            step={0.05}
            onCommit={(value) =>
              updateObject(
                object.id,
                { lineHeight: value },
                { historyKey: `line:${object.id}` }
              )
            }
          />
          <NumberField
            label="Letter spacing"
            value={object.letterSpacingEm}
            suffix="em"
            min={-0.2}
            max={2}
            step={0.01}
            onCommit={(value) =>
              updateObject(
                object.id,
                { letterSpacingEm: value },
                { historyKey: `spacing:${object.id}` }
              )
            }
          />
        </div>
      </section>
    </div>
  )
}
