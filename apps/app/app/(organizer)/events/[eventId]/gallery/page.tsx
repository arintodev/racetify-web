"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckSquare, FolderOpen, Images, Search, Upload } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { EmptyState } from "@/components/empty-state"
import { GalleryLightbox } from "@/components/gallery/gallery-lightbox"
import { PageHeader } from "@/components/page-header"
import {
  GallerySelectionBar,
  GalleryTile,
  MAX_MOVE_ITEMS,
  MoveToCollectionDialog,
  invalidateGalleryItemQueries,
  type BulkMoveResult,
  type MoveItemRef,
} from "@/features/gallery/items"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { useCan } from "@/lib/auth/session-provider"
import { formatNumber } from "@/lib/format"

const PAGE_SIZE = 24

const bibPresenceItems = [
  { value: "all", label: "Any bib" },
  { value: "with", label: "Has bib" },
  { value: "without", label: "No bib" },
]

const facePresenceItems = [
  { value: "all", label: "Any faces" },
  { value: "with", label: "Has faces" },
  { value: "without", label: "No faces" },
]

type GalleryItem = Schemas["GalleryItemSummaryDto"]

export default function EventGalleryPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const canUpload = useCan("event:gallery:upload")
  const canManage = useCan("event:gallery:manage")
  const queryClient = useQueryClient()

  const [query, setQuery] = React.useState("")
  const [collectionFilter, setCollectionFilter] = React.useState("all")
  const [bibFilter, setBibFilter] = React.useState("all")
  const [faceFilter, setFaceFilter] = React.useState("all")
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)
  const [cursorHistory, setCursorHistory] = React.useState<
    Array<string | undefined>
  >([])
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(
    null
  )
  const [deleteItemId, setDeleteItemId] = React.useState<string | null>(null)
  const [selectionMode, setSelectionMode] = React.useState(false)
  const [selectedItems, setSelectedItems] = React.useState<
    Map<string, MoveItemRef>
  >(new Map())
  const [moveOpen, setMoveOpen] = React.useState(false)
  const [moveItems, setMoveItems] = React.useState<MoveItemRef[]>([])

  React.useEffect(() => {
    setCursor(undefined)
    setCursorHistory([])
    setSelectionMode(false)
    setSelectedItems(new Map())
  }, [query, collectionFilter, bibFilter, faceFilter])

  const event = useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["EventDto"]>(`/v1/events/${eventId}`),
  })

  const collections = useQuery({
    queryKey: queryKeys.galleryCollections(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["GalleryCollectionDto"][]>(
        `/v1/events/${eventId}/gallery/collections`
      ),
  })

  const items = useQuery({
    queryKey: queryKeys.galleryItems(eventId, {
      q: query.trim() || undefined,
      collectionId: collectionFilter === "all" ? undefined : collectionFilter,
      hasBib: bibFilter === "all" ? undefined : bibFilter === "with",
      hasFace: faceFilter === "all" ? undefined : faceFilter === "with",
      cursor,
    }),
    queryFn: () =>
      getBrowserApi().requestEnvelope<GalleryItem[]>(
        `/v1/events/${eventId}/gallery/items`,
        {
          query: {
            q: query.trim() || undefined,
            collectionId:
              collectionFilter === "all" ? undefined : collectionFilter,
            hasBib: bibFilter === "all" ? undefined : bibFilter === "with",
            hasFace: faceFilter === "all" ? undefined : faceFilter === "with",
            limit: PAGE_SIZE,
            cursor,
          },
        }
      ),
  })

  const rows = items.data?.data ?? []
  const pagination = items.data?.meta.pagination
  const selectedItem = rows.find((item) => item.id === selectedItemId) ?? null
  const deleteItem = rows.find((item) => item.id === deleteItemId)
  const hasFilters =
    Boolean(query.trim()) ||
    collectionFilter !== "all" ||
    bibFilter !== "all" ||
    faceFilter !== "all"

  function invalidate() {
    invalidateGalleryItemQueries(queryClient, eventId)
  }

  function toMoveItemRef(item: GalleryItem): MoveItemRef {
    return {
      id: item.id,
      name: item.originalName ?? "Photo",
      currentCollectionId: item.collection?.id ?? null,
      status: item.status,
    }
  }

  function toggleSelected(item: GalleryItem, next: boolean) {
    if (
      next &&
      !selectedItems.has(item.id) &&
      selectedItems.size >= MAX_MOVE_ITEMS
    ) {
      toast.error(`Select up to ${formatNumber(MAX_MOVE_ITEMS)} photos at once`)
      return
    }

    setSelectedItems((current) => {
      const map = new Map(current)
      if (next) map.set(item.id, toMoveItemRef(item))
      else map.delete(item.id)
      return map
    })
  }

  function selectPage() {
    const next = new Map(selectedItems)
    let capped = false
    for (const item of rows) {
      if (next.has(item.id)) continue
      if (next.size >= MAX_MOVE_ITEMS) {
        capped = true
        break
      }
      next.set(item.id, toMoveItemRef(item))
    }
    if (capped) {
      toast.error(`Select up to ${formatNumber(MAX_MOVE_ITEMS)} photos at once`)
    }
    setSelectedItems(next)
  }

  function deselectPage() {
    const next = new Map(selectedItems)
    for (const item of rows) next.delete(item.id)
    setSelectedItems(next)
  }

  function clearSelection() {
    setSelectedItems(new Map())
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    clearSelection()
  }

  function openMoveForItems(refs: MoveItemRef[]) {
    if (refs.length === 0) return
    setMoveItems(refs)
    setMoveOpen(true)
  }

  function openMoveForItem(item: GalleryItem) {
    openMoveForItems([toMoveItemRef(item)])
  }

  function openMoveForSelected() {
    openMoveForItems([...selectedItems.values()])
  }

  function openMoveFromLightbox(item: GalleryItem) {
    setSelectedItemId(null)
    openMoveForItems([toMoveItemRef(item)])
  }

  function handleMoved(result: BulkMoveResult) {
    const removed = new Set([...result.updatedIds, ...result.missingIds])
    if (removed.size === 0) return

    const remaining = [...selectedItems.keys()].filter((id) => !removed.has(id))
    setSelectedItems((current) => {
      const map = new Map(current)
      for (const id of removed) map.delete(id)
      return map
    })
    if (selectionMode && remaining.length === 0) {
      setSelectionMode(false)
    }
  }

  function toggleSelectionMode() {
    if (selectionMode) exitSelectionMode()
    else setSelectionMode(true)
  }

  async function openOriginal(item: GalleryItem) {
    try {
      const detail = await getBrowserApi().request<Schemas["GalleryItemDto"]>(
        `/v1/events/${eventId}/gallery/items/${item.id}`
      )
      window.open(detail.originalUrl, "_blank", "noopener,noreferrer")
    } catch {
      toast.error("Could not open the original image")
    }
  }

  async function deleteItemConfirmed() {
    if (!deleteItemId) return
    try {
      await getBrowserApi().request(
        `/v1/events/${eventId}/gallery/items/${deleteItemId}`,
        { method: "DELETE" }
      )
      setSelectedItems((current) => {
        const map = new Map(current)
        map.delete(deleteItemId)
        return map
      })
      if (selectedItemId === deleteItemId) setSelectedItemId(null)
      toast.success("Photo removed")
      invalidate()
    } catch {
      toast.error("Could not remove the photo")
    } finally {
      setDeleteItemId(null)
    }
  }

  function nextPage() {
    if (!pagination?.nextCursor) return
    setCursorHistory((history) => [...history, cursor])
    setCursor(pagination.nextCursor ?? undefined)
  }

  function previousPage() {
    const history = [...cursorHistory]
    const previous = history.pop()
    setCursorHistory(history)
    setCursor(previous)
  }

  const collectionItems = collections.data ?? []

  return (
    <RequirePermission permission="event:gallery:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Gallery"
          description={`Race photos for ${event.data?.name ?? "this event"}.`}
          actions={
            <>
              {canManage ? (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link href={`/events/${eventId}/gallery/collections`} />
                  }
                >
                  <FolderOpen />
                  Collections
                </Button>
              ) : null}
              {canUpload ? (
                <Button
                  nativeButton={false}
                  render={<Link href={`/events/${eventId}/gallery/upload`} />}
                >
                  <Upload />
                  Upload photos
                </Button>
              ) : null}
            </>
          }
        />

        {event.isError || items.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load the gallery</AlertTitle>
            <AlertDescription>
              Check your connection and try again.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{collectionItems.length} collections</Badge>
          <Badge variant="outline">{rows.length} on this page</Badge>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              variant={collectionFilter === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCollectionFilter("all")}
            >
              All photos
            </Button>
            <Button
              variant={collectionFilter === "none" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCollectionFilter("none")}
            >
              No collection
            </Button>
            {collectionItems.map((collection) => (
              <Button
                key={collection.id}
                variant={
                  collectionFilter === collection.id ? "secondary" : "ghost"
                }
                size="sm"
                onClick={() => setCollectionFilter(collection.id)}
              >
                {collection.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1 xl:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(changeEvent) => setQuery(changeEvent.target.value)}
              placeholder="Search photos"
              className="pl-8"
              aria-label="Search photos"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              items={bibPresenceItems}
              value={bibFilter}
              onValueChange={(value) => {
                if (typeof value === "string") setBibFilter(value)
              }}
            >
              <SelectTrigger className="w-[140px]" aria-label="Filter by bib">
                <SelectValue>
                  {(value) =>
                    bibPresenceItems.find((item) => item.value === value)
                      ?.label ?? "Any bib"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {bibPresenceItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              items={facePresenceItems}
              value={faceFilter}
              onValueChange={(value) => {
                if (typeof value === "string") setFaceFilter(value)
              }}
            >
              <SelectTrigger className="w-[150px]" aria-label="Filter by face">
                <SelectValue>
                  {(value) =>
                    facePresenceItems.find((item) => item.value === value)
                      ?.label ?? "Any faces"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {facePresenceItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManage && (rows.length > 0 || selectionMode) ? (
              <Button
                variant={selectionMode ? "secondary" : "outline"}
                size="sm"
                onClick={toggleSelectionMode}
                aria-pressed={selectionMode}
              >
                <CheckSquare aria-hidden="true" />
                {selectionMode ? "Cancel" : "Select"}
              </Button>
            ) : null}
          </div>
        </div>

        {selectionMode ? (
          <GallerySelectionBar
            selectedCount={selectedItems.size}
            pageSelectedCount={
              rows.filter((item) => selectedItems.has(item.id)).length
            }
            pageCount={rows.length}
            onMove={openMoveForSelected}
            onSelectPage={selectPage}
            onDeselectPage={deselectPage}
            onClear={clearSelection}
            onDone={exitSelectionMode}
          />
        ) : null}

        {items.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton
                key={index}
                className="aspect-[4/3] w-full rounded-xl"
              />
            ))}
          </div>
        ) : null}

        {!items.isPending && rows.length === 0 ? (
          <EmptyState
            icon={Images}
            title={
              hasFilters ? "No photos match these filters" : "No photos yet"
            }
            description={
              hasFilters
                ? "Try another collection, bib or face filter, or search term."
                : "Upload the first photos for this event."
            }
            action={
              hasFilters ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("")
                    setCollectionFilter("all")
                    setBibFilter("all")
                    setFaceFilter("all")
                  }}
                >
                  Reset filters
                </Button>
              ) : canUpload ? (
                <Button
                  nativeButton={false}
                  render={<Link href={`/events/${eventId}/gallery/upload`} />}
                >
                  <Upload />
                  Upload photos
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {rows.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((item) => (
              <GalleryTile
                key={item.id}
                item={item}
                selectionMode={selectionMode}
                selected={selectedItems.has(item.id)}
                canManage={canManage}
                onOpen={setSelectedItemId}
                onToggleSelected={toggleSelected}
                onMove={openMoveForItem}
                onDelete={setDeleteItemId}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {cursorHistory.length > 0
              ? `Page ${cursorHistory.length + 1}`
              : "Page 1"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={previousPage}
              disabled={cursorHistory.length === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={!pagination?.hasMore}
            >
              Next
            </Button>
          </div>
        </div>

        <GalleryLightbox
          item={selectedItem}
          items={rows}
          onNavigate={setSelectedItemId}
          onClose={() => setSelectedItemId(null)}
          onDownloadOriginal={openOriginal}
          canManage={canManage}
          onMove={openMoveFromLightbox}
        />

        <MoveToCollectionDialog
          eventId={eventId}
          open={moveOpen}
          onOpenChange={(open) => {
            setMoveOpen(open)
            if (!open) setMoveItems([])
          }}
          items={moveItems}
          collections={collections.data}
          collectionsLoading={collections.isPending}
          collectionsError={collections.isError}
          onRetryCollections={() => void collections.refetch()}
          onMoved={handleMoved}
        />

        <AlertDialog
          open={Boolean(deleteItemId)}
          onOpenChange={(open) => {
            if (!open) setDeleteItemId(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this photo?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteItem?.originalName ?? "This photo"} and its preview will
                be removed from the gallery. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep photo</AlertDialogCancel>
              <AlertDialogCancel
                variant="destructive"
                onClick={() => void deleteItemConfirmed()}
              >
                Remove photo
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePermission>
  )
}
