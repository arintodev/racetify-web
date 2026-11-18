"use client"

import type { Schemas } from "@workspace/api-client"
import { FolderInput, MoreHorizontal, Trash2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "cn"

import { formatDateTime } from "@/lib/format"

type GalleryItem = Schemas["GalleryItemSummaryDto"]

type GalleryTileProps = {
  item: GalleryItem
  selectionMode: boolean
  selected: boolean
  canManage: boolean
  onOpen: (itemId: string) => void
  onToggleSelected: (item: GalleryItem, next: boolean) => void
  onMove: (item: GalleryItem) => void
  onDelete: (itemId: string) => void
}

export function GalleryTile({
  item,
  selectionMode,
  selected,
  canManage,
  onOpen,
  onToggleSelected,
  onMove,
  onDelete,
}: GalleryTileProps) {
  const label = item.bibs[0]?.bibText
    ? `Bib ${item.bibs[0].bibText}`
    : (item.originalName ?? "Photo")
  const accessibleName = item.collection
    ? `${label}, ${item.collection.name}`
    : label

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-muted",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <button
        type="button"
        className="block aspect-[4/3] w-full cursor-pointer"
        onClick={() =>
          selectionMode ? onToggleSelected(item, !selected) : onOpen(item.id)
        }
        aria-label={
          selectionMode
            ? `${selected ? "Deselect" : "Select"} ${accessibleName}`
            : `Open ${accessibleName}`
        }
        aria-pressed={selectionMode ? selected : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.previewUrl}
          alt={item.originalName ?? "Race photo"}
          className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          loading="lazy"
        />
      </button>

      {selectionMode ? (
        <div className="absolute top-2 left-2 z-10 rounded-md bg-background/90 p-1 shadow-sm">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) =>
              onToggleSelected(item, checked === true)
            }
            aria-label={`Select ${accessibleName}`}
          />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs text-white">
        <span className="truncate">{label}</span>
        <span className="ml-auto shrink-0">
          {formatDateTime(item.capturedAt)}
        </span>

        {canManage && !selectionMode ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="pointer-events-auto"
                  aria-label={`Actions for ${accessibleName}`}
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onMove(item)}>
                <FolderInput aria-hidden="true" />
                Move to collection…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 aria-hidden="true" />
                Remove photo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  )
}
