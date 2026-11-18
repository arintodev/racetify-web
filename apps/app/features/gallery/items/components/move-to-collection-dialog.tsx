"use client"

import type { Schemas } from "@workspace/api-client"
import { FolderInput, FolderMinus, Globe, Loader2, Lock } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { formatNumber } from "@/lib/format"

import { useMoveGalleryItems } from "../hooks/use-move-gallery-items"
import { moveErrorMessage } from "../lib/move-errors"
import type { BulkMoveResult, MoveDestination, MoveItemRef } from "../lib/types"

const NO_COLLECTION = "none"

type MoveToCollectionDialogProps = {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  items: MoveItemRef[]
  collections: Schemas["GalleryCollectionDto"][] | undefined
  collectionsLoading: boolean
  collectionsError: boolean
  onRetryCollections: () => void
  onMoved: (result: BulkMoveResult) => void
}

export function MoveToCollectionDialog({
  eventId,
  open,
  onOpenChange,
  items,
  collections,
  collectionsLoading,
  collectionsError,
  onRetryCollections,
  onMoved,
}: MoveToCollectionDialogProps) {
  const { move, isMoving, error, reset } = useMoveGalleryItems(eventId)
  const resetRef = React.useRef(reset)
  resetRef.current = reset

  const [target, setTarget] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setTarget(null)
    resetRef.current()
  }, [open])

  // If the chosen collection disappears while the dialog is open, force a new choice.
  React.useEffect(() => {
    if (!target || target === NO_COLLECTION) return
    if (collectionsLoading || !collections) return
    if (!collections.some((collection) => collection.id === target)) {
      setTarget(null)
    }
  }, [collections, collectionsLoading, target])

  const selectItems = React.useMemo(
    () => [
      { value: NO_COLLECTION, label: "No collection" },
      ...(collections ?? []).map((collection) => ({
        value: collection.id,
        label: collection.isPublic
          ? collection.name
          : `${collection.name} (private)`,
      })),
    ],
    [collections]
  )

  const selectedCollection =
    collections?.find((collection) => collection.id === target) ?? null

  const destination: MoveDestination | null =
    target === NO_COLLECTION
      ? { kind: "none" }
      : selectedCollection
        ? {
            kind: "collection",
            collectionId: selectedCollection.id,
            collectionName: selectedCollection.name,
          }
        : null

  const total = items.length
  const isSingle = total === 1

  const collectionName = (id: string) =>
    collections?.find((collection) => collection.id === id)?.name ??
    "a collection"

  const currentIds = [
    ...new Set(
      items
        .map((item) => item.currentCollectionId)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const onlyCurrentId = currentIds.length === 1 ? currentIds[0] : undefined

  const currentContext = isSingle
    ? items[0]?.currentCollectionId
      ? `Currently in ${collectionName(items[0].currentCollectionId)}`
      : "Not in a collection"
    : currentIds.length === 0
      ? "All selected photos are unfiled"
      : onlyCurrentId
        ? `All selected photos are in ${collectionName(onlyCurrentId)}`
        : "Selected photos are in different collections"

  const alreadyCount = destination
    ? items.filter((item) =>
        destination.kind === "none"
          ? item.currentCollectionId === null
          : item.currentCollectionId === destination.collectionId
      ).length
    : 0

  const alreadyThere = isSingle && alreadyCount === 1
  const hasPublished = items.some((item) => item.status === "published")
  const targetIsPrivate =
    destination?.kind === "collection" && selectedCollection?.isPublic === false
  const showPublicWarning =
    hasPublished && (destination?.kind === "none" || targetIsPrivate)

  const canMove = Boolean(destination) && !alreadyThere && !isMoving
  const errorMessage = error ? moveErrorMessage(error) : null

  const actionLabel = destination
    ? destination.kind === "none"
      ? isSingle
        ? "Remove from collection"
        : `Remove ${formatNumber(total)} from collection`
      : isSingle
        ? "Move photo"
        : `Move ${formatNumber(total)} photos`
    : "Move photos"

  function handleOpenChange(next: boolean) {
    if (!next && isMoving) return
    if (!next) resetRef.current()
    onOpenChange(next)
  }

  function handleTargetChange(value: string) {
    resetRef.current()
    setTarget(value)
  }

  async function handleMove() {
    if (!destination || !canMove) return

    try {
      const result = await move(items, destination)
      onMoved(result)

      const moved = result.updatedIds.length
      if (moved === 0) {
        toast.error("No photos were moved", {
          description: result.missingIds.length
            ? "They were no longer available."
            : undefined,
        })
        handleOpenChange(false)
        return
      }

      toast.success(successMessage(destination, moved), {
        description: result.missingIds.length
          ? `${formatNumber(result.missingIds.length)} were no longer available.`
          : undefined,
      })
      handleOpenChange(false)
    } catch {
      // The mutation error is rendered inside the dialog.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isSingle ? "Move photo" : `Move ${formatNumber(total)} photos`}
          </DialogTitle>
          <DialogDescription>
            {isSingle
              ? "Choose where to file this photo."
              : "Choose a collection for the selected photos. They are moved together in one batch."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="move-target">Collection</Label>
            <Select
              items={selectItems}
              value={target ?? undefined}
              onValueChange={(value) => {
                if (typeof value === "string") handleTargetChange(value)
              }}
              disabled={isMoving}
            >
              <SelectTrigger
                id="move-target"
                className="w-full"
                aria-label="Destination collection"
              >
                <SelectValue placeholder="Choose a collection">
                  {(value) =>
                    selectItems.find((option) => option.value === value)
                      ?.label ?? "Choose a collection"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {selectItems.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">{currentContext}</p>

          {alreadyThere ? (
            <p className="text-xs text-muted-foreground">
              This photo is already{" "}
              {destination?.kind === "none" ? "unfiled" : "in this collection"}.
            </p>
          ) : null}

          {!isSingle && alreadyCount > 0 && alreadyCount < total ? (
            <p className="text-xs text-muted-foreground">
              {formatNumber(alreadyCount)} of {formatNumber(total)} photos are
              already at this destination and will be unchanged.
            </p>
          ) : null}

          {showPublicWarning ? (
            <Alert>
              {targetIsPrivate ? (
                <Lock aria-hidden="true" />
              ) : (
                <Globe aria-hidden="true" />
              )}
              <AlertTitle>
                {targetIsPrivate ? "Private collection" : "No collection"}
              </AlertTitle>
              <AlertDescription>
                {targetIsPrivate
                  ? "Published photos moved here will no longer appear in the public gallery."
                  : "Published photos without a collection do not appear in the public gallery."}
              </AlertDescription>
            </Alert>
          ) : null}

          {collectionsLoading ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2
                className="size-3 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Loading collections…
            </p>
          ) : null}

          {collectionsError ? (
            <Alert variant="destructive">
              <AlertTitle>Collections couldn&apos;t be loaded</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>You can still remove photos from their collection.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onRetryCollections}
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {!collectionsLoading &&
          !collectionsError &&
          (collections?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">
              No collections yet. You can choose No collection, or{" "}
              <Link
                className="underline underline-offset-4"
                href={`/events/${eventId}/gallery/collections`}
              >
                create one
              </Link>
              .
            </p>
          ) : null}

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Could not move photos</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleMove} disabled={!canMove}>
            {isMoving ? (
              <Loader2
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : destination?.kind === "none" ? (
              <FolderMinus aria-hidden="true" />
            ) : (
              <FolderInput aria-hidden="true" />
            )}
            {isMoving ? "Moving…" : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function successMessage(destination: MoveDestination, moved: number): string {
  if (destination.kind === "none") {
    return moved === 1
      ? "Removed from collection"
      : `Removed ${formatNumber(moved)} photos from their collection`
  }
  return moved === 1
    ? `Moved to ${destination.collectionName}`
    : `Moved ${formatNumber(moved)} photos to ${destination.collectionName}`
}
