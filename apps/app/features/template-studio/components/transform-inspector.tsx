"use client"

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Lock,
  LockOpen,
  Trash2,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import type { Alignment } from "../model/geometry"
import type { TemplateObject } from "../model/template-document"
import { useEditorStore } from "../store/editor-store-context"

import { NumberField } from "./number-field"

const ALIGNMENTS: Array<{
  value: Alignment
  label: string
  icon: typeof AlignStartVertical
}> = [
  { value: "left", label: "Align left", icon: AlignStartVertical },
  { value: "center", label: "Align centre", icon: AlignCenterVertical },
  { value: "right", label: "Align right", icon: AlignEndVertical },
  { value: "top", label: "Align top", icon: AlignStartHorizontal },
  { value: "middle", label: "Align middle", icon: AlignCenterHorizontal },
  { value: "bottom", label: "Align bottom", icon: AlignEndHorizontal },
]

export function TransformInspector({ objects }: { objects: TemplateObject[] }) {
  const updateObjects = useEditorStore((state) => state.updateObjects)
  const duplicateObjects = useEditorStore((state) => state.duplicateObjects)
  const removeObjects = useEditorStore((state) => state.removeObjects)
  const reorderObject = useEditorStore((state) => state.reorderObject)
  const alignSelection = useEditorStore((state) => state.alignSelection)
  const setSelection = useEditorStore((state) => state.setSelection)

  if (objects.length === 0) return null

  const ids = objects.map((object) => object.id)
  const primary = objects[0]
  if (!primary) return null

  const isText = primary.type === "text"
  const allLocked = objects.every((object) => object.locked)
  const single = objects.length === 1 ? primary : null

  function patchAll(patch: Parameters<typeof updateObjects>[1]): void {
    updateObjects(ids, patch, { historyKey: null })
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Position and size
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="X"
            value={primary.xMm}
            suffix="mm"
            step={0.5}
            onCommit={(value) => patchAll({ xMm: value })}
          />
          <NumberField
            label="Y"
            value={primary.yMm}
            suffix="mm"
            step={0.5}
            onCommit={(value) => patchAll({ yMm: value })}
          />
          <NumberField
            label="Width"
            value={primary.widthMm}
            suffix="mm"
            min={0.1}
            step={0.5}
            onCommit={(value) => patchAll({ widthMm: value })}
          />
          <NumberField
            label="Height"
            value={primary.heightMm}
            suffix="mm"
            min={0.1}
            step={0.5}
            disabled={isText}
            onCommit={(value) => patchAll({ heightMm: value })}
          />
        </div>
        {isText ? (
          <p className="text-[11px] text-muted-foreground">
            Text height follows its content.
          </p>
        ) : null}
      </section>

      <Separator />

      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Transform
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Rotation"
            value={primary.rotationDeg}
            suffix="°"
            min={-360}
            max={360}
            step={1}
            onCommit={(value) => patchAll({ rotationDeg: value })}
          />
          <NumberField
            label="Opacity"
            value={primary.opacity}
            min={0}
            max={1}
            step={0.05}
            onCommit={(value) => patchAll({ opacity: value })}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              patchAll({ locked: !allLocked })
              if (!allLocked) setSelection([])
            }}
          >
            {allLocked ? <LockOpen /> : <Lock />}
            {allLocked ? "Unlock" : "Lock"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => duplicateObjects(ids)}
          >
            <Copy />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => removeObjects(ids)}
          >
            <Trash2 />
            Delete
          </Button>
        </div>
      </section>

      {single ? (
        <>
          <Separator />
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Order
            </h3>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Move up"
                onClick={() => reorderObject(single.id, "up")}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Move down"
                onClick={() => reorderObject(single.id, "down")}
              >
                <ArrowDown />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Bring to front"
                onClick={() => reorderObject(single.id, "top")}
              >
                <ChevronsUp />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Send to back"
                onClick={() => reorderObject(single.id, "bottom")}
              >
                <ChevronsDown />
              </Button>
            </div>
          </section>
        </>
      ) : null}

      <Separator />

      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Align to {objects.length === 1 ? "canvas" : "selection"}
        </h3>
        <div className="flex flex-wrap gap-1">
          {ALIGNMENTS.map((alignment) => (
            <Tooltip key={alignment.value}>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={alignment.label}
                    onClick={() => alignSelection(alignment.value)}
                  >
                    <alignment.icon />
                  </Button>
                }
              />
              <TooltipContent>{alignment.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </section>
    </div>
  )
}
