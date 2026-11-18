"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ImageIcon, Pencil, Plus, Star, Trash2 } from "lucide-react"
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
import { Skeleton } from "@workspace/ui/components/skeleton"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import {
  POSITION_LABELS,
  type PositionPreset,
} from "@/features/watermarks/lib/types"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"

type Watermark = Schemas["WatermarkDto"]

export default function WatermarksPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const base = `/events/${eventId}/gallery/watermarks`
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  const watermarks = useQuery({
    queryKey: queryKeys.watermarks(eventId),
    queryFn: () =>
      getBrowserApi().request<Watermark[]>(
        `/v1/events/${eventId}/watermarks`
      ),
  })

  const rows = watermarks.data ?? []
  const deleteRow = rows.find((row) => row.id === deleteId)

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.watermarks(eventId),
    })
  }

  async function deleteConfirmed() {
    if (!deleteId) return
    try {
      await getBrowserApi().request(
        `/v1/events/${eventId}/watermarks/${deleteId}`,
        { method: "DELETE" }
      )
      toast.success("Watermark removed")
      invalidate()
    } catch {
      toast.error("Could not remove the watermark")
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <RequirePermission permission="event:watermarks:manage">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Watermarks"
          description="Presets applied to gallery photos and certificates. Open one to tune it with a live preview."
          actions={
            <Button
              render={<Link href={`${base}/new`} />}
              nativeButton={false}
            >
              <Plus />
              New watermark
            </Button>
          }
        />

        {watermarks.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load watermarks</AlertTitle>
            <AlertDescription>
              Check your connection and try again.
            </AlertDescription>
          </Alert>
        ) : null}

        {watermarks.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-52 w-full rounded-xl" />
            ))}
          </div>
        ) : null}

        {!watermarks.isPending && rows.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="No watermarks yet"
            description="Create a watermark preset for the gallery or certificates."
            action={
              <Button
                render={<Link href={`${base}/new`} />}
                nativeButton={false}
              >
                <Plus />
                New watermark
              </Button>
            }
          />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((watermark) => (
            <div key={watermark.id} className="overflow-hidden rounded-xl border">
              <div className="flex aspect-[3/1] items-center justify-center bg-muted">
                {watermark.type === "image" && watermark.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={watermark.imageUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain p-4"
                  />
                ) : (
                  <p className="px-4 text-center text-sm font-medium text-muted-foreground">
                    {watermark.text ?? "Text watermark"}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{watermark.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {watermark.scope} · {watermark.type} ·{" "}
                      {watermark.repeatMode === "tiled"
                        ? "Repeat"
                        : positionLabel(watermark.position)}{" "}
                      · {Math.round(watermark.sizeRatio * 100)}%
                    </p>
                  </div>
                  {watermark.isDefault ? (
                    <Badge variant="secondary" className="gap-1">
                      <Star />
                      Active
                    </Badge>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`${base}/${watermark.id}`} />}
                    nativeButton={false}
                  >
                    <Pencil />
                    Configure
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${watermark.name}`}
                    onClick={() => setDeleteId(watermark.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <AlertDialog
          open={Boolean(deleteId)}
          onOpenChange={(open) => {
            if (!open) setDeleteId(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete watermark?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteRow?.name ?? "This watermark"} will be removed. Photos
                already rendered keep their existing files.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogCancel
                variant="destructive"
                onClick={() => void deleteConfirmed()}
              >
                Delete watermark
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePermission>
  )
}

function positionLabel(position: string): string {
  return POSITION_LABELS[position as PositionPreset] ?? "Custom position"
}
