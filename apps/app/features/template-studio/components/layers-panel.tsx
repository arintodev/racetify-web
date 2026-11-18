"use client"

import {
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  Circle,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  LockOpen,
  MoreHorizontal,
  PenTool,
  Square,
  Trash2,
  Type,
} from "lucide-react"
import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import type { TemplateObject } from "../model/template-document"
import { useEditorStore } from "../store/editor-store-context"
import { layersTopFirst } from "../store/selectors"

function LayerIcon({ type }: { type: TemplateObject["type"] }) {
  switch (type) {
    case "text":
      return <Type className="size-3.5" />
    case "image":
      return <ImageIcon className="size-3.5" />
    case "rect":
      return <Square className="size-3.5" />
    case "ellipse":
      return <Circle className="size-3.5" />
    case "path":
      return <PenTool className="size-3.5" />
  }
}

export function LayersPanel() {
  const document = useEditorStore((state) => state.document)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const setSelection = useEditorStore((state) => state.setSelection)
  const renameObject = useEditorStore((state) => state.renameObject)
  const setObjectVisible = useEditorStore((state) => state.setObjectVisible)
  const setObjectLocked = useEditorStore((state) => state.setObjectLocked)
  const removeObjects = useEditorStore((state) => state.removeObjects)
  const duplicateObjects = useEditorStore((state) => state.duplicateObjects)
  const reorderObject = useEditorStore((state) => state.reorderObject)

  const [renameId, setRenameId] = React.useState<string | null>(null)
  const [renameDraft, setRenameDraft] = React.useState("")
  const layers = layersTopFirst(document)
  const selected = new Set(selectedIds)

  function selectLayer(id: string, additive: boolean): void {
    if (!additive) {
      setSelection([id])
      return
    }
    setSelection(
      selected.has(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id]
    )
  }

  if (layers.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        Objects you add or import appear here. Use the Add tab to start.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {layers.map((object) => {
        const isSelected = selected.has(object.id)
        return (
          <div
            key={object.id}
            className={cn(
              "group flex items-center gap-1 rounded-md px-1 py-0.5",
              isSelected ? "bg-muted" : "hover:bg-muted/60"
            )}
          >
            <Button
              variant="ghost"
              size="xs"
              className="min-w-0 flex-1 justify-start gap-2 px-1.5"
              aria-pressed={isSelected}
              onClick={(event) =>
                selectLayer(object.id, event.shiftKey || event.metaKey)
              }
            >
              <span className="text-muted-foreground">
                <LayerIcon type={object.type} />
              </span>
              <span className="truncate text-xs">{object.name}</span>
              {!object.visible ? (
                <span className="text-[10px] text-muted-foreground">
                  hidden
                </span>
              ) : null}
            </Button>

            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={object.visible ? "Hide layer" : "Show layer"}
              onClick={() => setObjectVisible(object.id, !object.visible)}
            >
              {object.visible ? <Eye /> : <EyeOff />}
            </Button>

            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={object.locked ? "Unlock layer" : "Lock layer"}
              onClick={() => setObjectLocked(object.id, !object.locked)}
            >
              {object.locked ? <Lock /> : <LockOpen />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Actions for ${object.name}`}
                  >
                    <MoreHorizontal />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setRenameId(object.id)
                    setRenameDraft(object.name)
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => duplicateObjects([object.id])}
                >
                  <Copy />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => reorderObject(object.id, "up")}
                >
                  <ArrowUp />
                  Move up
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => reorderObject(object.id, "down")}
                >
                  <ArrowDown />
                  Move down
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => reorderObject(object.id, "top")}
                >
                  <ChevronsUp />
                  Bring to front
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => reorderObject(object.id, "bottom")}
                >
                  <ChevronsDown />
                  Send to back
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => removeObjects([object.id])}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      })}

      <Dialog
        open={renameId !== null}
        onOpenChange={(open) => {
          if (!open) setRenameId(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename layer</DialogTitle>
          </DialogHeader>
          <Input
            value={renameDraft}
            maxLength={120}
            autoFocus
            onChange={(event) => setRenameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur()
            }}
            onBlur={() => {
              if (renameId) renameObject(renameId, renameDraft)
              setRenameId(null)
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameId(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renameId) renameObject(renameId, renameDraft)
                setRenameId(null)
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
