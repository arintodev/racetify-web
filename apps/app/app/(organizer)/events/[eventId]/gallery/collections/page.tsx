"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  FolderOpen,
  Globe,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { useParams } from "next/navigation"
import * as React from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

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
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"

type Collection = Schemas["GalleryCollectionDto"]

const collectionSchema = z.object({
  name: z.string().min(2, "Collection name is required."),
  description: z
    .string()
    .max(240, "Keep the description under 240 characters."),
  isPublic: z.boolean(),
})

type CollectionValues = z.infer<typeof collectionSchema>

function CollectionSheet({
  eventId,
  collection,
  open,
  onOpenChange,
  onSaved,
}: {
  eventId: string
  collection: Collection | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const form = useForm<CollectionValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: { name: "", description: "", isPublic: false },
  })
  const errors = form.formState.errors

  React.useEffect(() => {
    if (!open) return
    form.reset({
      name: collection?.name ?? "",
      description: collection?.description ?? "",
      isPublic: collection?.isPublic ?? false,
    })
  }, [collection, form, open])

  async function onSubmit(values: CollectionValues) {
    try {
      if (collection) {
        await getBrowserApi().request(
          `/v1/events/${eventId}/gallery/collections/${collection.id}`,
          {
            method: "PATCH",
            body: {
              name: values.name.trim(),
              description: values.description.trim(),
              isPublic: values.isPublic,
            } satisfies Schemas["UpdateCollectionRequest"],
          }
        )
      } else {
        await getBrowserApi().request(
          `/v1/events/${eventId}/gallery/collections`,
          {
            method: "POST",
            body: {
              name: values.name.trim(),
              description: values.description.trim(),
              isPublic: values.isPublic,
            } satisfies Schemas["CreateCollectionRequest"],
          }
        )
      }
      toast.success(collection ? "Collection updated" : "Collection created")
      onSaved()
      onOpenChange(false)
    } catch (error) {
      toast.error(
        collection
          ? "Could not update the collection"
          : "Could not create the collection",
        {
          description: error instanceof Error ? error.message : "Try again.",
        }
      )
    }
  }

  const isPublic = form.watch("isPublic")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {collection ? "Edit collection" : "New collection"}
          </SheetTitle>
          <SheetDescription>
            Collections group photos inside this event and can be public or
            private.
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-4"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="collection-name">Name</FieldLabel>
              <Input
                id="collection-name"
                aria-invalid={Boolean(errors.name)}
                {...form.register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="collection-description">
                Description
              </FieldLabel>
              <Textarea
                id="collection-description"
                aria-invalid={Boolean(errors.description)}
                {...form.register("description")}
              />
              <FieldError errors={[errors.description]} />
            </Field>
            <Field>
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isPublic}
                  onCheckedChange={(checked) =>
                    form.setValue("isPublic", checked === true)
                  }
                  aria-label="Public collection"
                />
                <div>
                  <FieldLabel htmlFor="collection-public">
                    Public collection
                  </FieldLabel>
                  <FieldDescription>
                    Visible in the public event gallery.
                  </FieldDescription>
                </div>
              </div>
            </Field>
          </FieldGroup>
          <SheetFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <FolderOpen />
              )}
              {form.formState.isSubmitting ? "Saving…" : "Save collection"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export default function GalleryCollectionsPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Collection | null>(null)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [moveTo, setMoveTo] = React.useState("none")

  const collections = useQuery({
    queryKey: queryKeys.galleryCollections(eventId),
    queryFn: () =>
      getBrowserApi().request<Collection[]>(
        `/v1/events/${eventId}/gallery/collections`
      ),
  })

  const rows = collections.data ?? []
  const deleteCollection = rows.find((collection) => collection.id === deleteId)
  const moveOptions = [
    { value: "none", label: "Leave them uncategorized" },
    ...rows
      .filter((collection) => collection.id !== deleteId)
      .map((collection) => ({ value: collection.id, label: collection.name })),
  ]

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.galleryCollections(eventId),
    })
    void queryClient.invalidateQueries({
      queryKey: ["event", eventId, "gallery", "items"],
    })
  }

  async function deleteConfirmed() {
    if (!deleteId) return
    try {
      await getBrowserApi().request(
        `/v1/events/${eventId}/gallery/collections/${deleteId}`,
        {
          method: "DELETE",
          body: {
            moveItemsTo: moveTo === "none" ? "none" : moveTo,
          } satisfies Schemas["DeleteCollectionRequest"],
        }
      )
      toast.success("Collection removed")
      invalidate()
    } catch {
      toast.error("Could not remove the collection")
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <RequirePermission permission="event:gallery:manage">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Collections"
          description="Group event photos and control which collections are public."
          actions={
            <Button
              onClick={() => {
                setEditing(null)
                setSheetOpen(true)
              }}
            >
              <Plus />
              New collection
            </Button>
          }
        />

        {collections.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load collections</AlertTitle>
            <AlertDescription>
              Check your connection and try again.
            </AlertDescription>
          </Alert>
        ) : null}

        {collections.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        ) : null}

        {!collections.isPending && rows.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No collections yet"
            description="Create a collection to group this event's photos."
            action={
              <Button
                onClick={() => {
                  setEditing(null)
                  setSheetOpen(true)
                }}
              >
                <Plus />
                New collection
              </Button>
            }
          />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((collection) => (
            <div
              key={collection.id}
              className="flex flex-col overflow-hidden rounded-xl border"
            >
              <div className="relative aspect-[3/1] bg-muted">
                {collection.coverThumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={collection.coverThumbnailUrl}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <FolderOpen className="size-6" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{collection.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {collection.description || collection.slug}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${collection.name}`}
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(collection)
                          setSheetOpen(true)
                        }}
                      >
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          setMoveTo("none")
                          setDeleteId(collection.id)
                        }}
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Badge variant="outline">{collection.itemCount} photos</Badge>
                  <Badge variant="outline" className="gap-1">
                    {collection.isPublic ? <Globe /> : <Lock />}
                    {collection.isPublic ? "Public" : "Private"}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        <CollectionSheet
          eventId={eventId}
          collection={editing}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onSaved={invalidate}
        />

        <AlertDialog
          open={Boolean(deleteId)}
          onOpenChange={(open) => {
            if (!open) setDeleteId(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete collection?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteCollection?.name ?? "This collection"} will be removed.
                Choose where its {deleteCollection?.itemCount ?? 0} photos
                should go.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Select
              items={moveOptions}
              value={moveTo}
              onValueChange={(value) => {
                if (typeof value === "string") setMoveTo(value)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) =>
                    moveOptions.find((option) => option.value === value)
                      ?.label ?? "Leave them uncategorized"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {moveOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogCancel
                variant="destructive"
                onClick={() => void deleteConfirmed()}
              >
                Delete collection
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePermission>
  )
}
