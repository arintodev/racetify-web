"use client"

import { Separator } from "@workspace/ui/components/separator"

import { useEditorStore } from "../store/editor-store-context"
import { selectedObjects } from "../store/selectors"


import { CanvasInspector } from "./canvas-inspector"
import { ShapeInspector } from "./shape-inspector"
import { TextInspector } from "./text-inspector"
import { TransformInspector } from "./transform-inspector"

export function InspectorPanel({ eventId }: { eventId: string }) {
  const document = useEditorStore((state) => state.document)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const preview = useEditorStore((state) => state.preview)
  const objects = selectedObjects(document, selectedIds)
  const single = objects.length === 1 ? objects[0] : null

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l bg-background lg:flex">
      <div className="flex h-10 shrink-0 items-center border-b px-3">
        <span className="truncate text-xs font-medium">
          {!single
            ? objects.length > 1
              ? `${objects.length} objects`
              : "Canvas"
            : single.name}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {preview ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Previewing with sample data. Exit preview to edit the design.
          </p>
        ) : objects.length === 0 ? (
          <CanvasInspector />
        ) : (
          <div className="flex flex-col gap-4">
            {single?.type === "text" ? (
              <>
                <TextInspector object={single} eventId={eventId} />
                <Separator />
              </>
            ) : null}
            {single && single.type !== "text" ? (
              <>
                <ShapeInspector object={single} />
                <Separator />
              </>
            ) : null}
            <TransformInspector objects={objects} />
          </div>
        )}
      </div>
    </aside>
  )
}
