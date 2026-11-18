"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

import { PageHeader } from "@/components/page-header"
import { getBrowserApi } from "@/lib/api/browser"
import { GuardedLink, useBlockNavigation } from "@/lib/navigation/leave-guard"

import { UploadDestinationPicker } from "./components/upload-destination-picker"
import { UploadDropzone } from "./components/upload-dropzone"
import { UploadQueue } from "./components/upload-queue"
import { UploadQueueSummary } from "./components/upload-queue-summary"
import { UploadQueueToolbar } from "./components/upload-queue-toolbar"
import { UploadRejectedFiles } from "./components/upload-rejected-files"
import { UploadRunAlert } from "./components/upload-run-alert"
import { useUploadWorkspace } from "./hooks/use-upload-workspace"
import { itemsInOrder } from "./lib/batch-selection"
import { exportFailedUploads } from "./lib/export-failed"
import { fromFileList } from "./lib/file-collection"
import { filterUploadItems } from "./lib/queue-view"

const ACCEPT = "image/jpeg,image/png,image/webp"

export function GalleryUploadWorkspace({ eventId }: { eventId: string }) {
  const workspace = useUploadWorkspace(eventId)
  const { state, totals } = workspace
  const { setDestination } = workspace
  const photosInput = React.useRef<HTMLInputElement>(null)
  const folderInput = React.useRef<HTMLInputElement>(null)
  const [search, setSearch] = React.useState("")
  const [skippedOpen, setSkippedOpen] = React.useState(false)
  const [announcement, setAnnouncement] = React.useState("")
  const deferredSearch = React.useDeferredValue(search)

  const collections = useQuery({
    queryKey: queryKeys.galleryCollections(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["GalleryCollectionDto"][]>(
        `/v1/events/${eventId}/gallery/collections`
      ),
  })

  React.useEffect(() => {
    const input = folderInput.current
    if (!input) return
    // `webkitdirectory` is not part of React's input typings and some browsers ignore
    // unknown attributes set through JSX, so set them on the DOM node.
    input.setAttribute("webkitdirectory", "")
    input.setAttribute("directory", "")
  }, [])

  useBlockNavigation(workspace.isBusy, {
    message:
      "An upload is still running. Photos that already finished will be saved, but the current batch and queued photos may be lost.",
    onLeave: workspace.stop,
  })

  // If the selected collection was deleted in another tab, fall back to No collection.
  React.useEffect(() => {
    if (!state.destinationId) return
    if (collections.isPending || !collections.data) return
    if (collections.data.some((item) => item.id === state.destinationId)) return
    setDestination(null)
    toast.error("That collection no longer exists. Uploading without one.")
  }, [
    state.destinationId,
    collections.isPending,
    collections.data,
    setDestination,
  ])

  React.useEffect(() => {
    if (workspace.isBusy && state.activeBatchId) {
      const batch = state.batchesById[state.activeBatchId]
      if (batch) {
        setAnnouncement(
          `Uploading batch ${batch.seq} of approximately ${totals.batches}.`
        )
      }
      return
    }
    if (workspace.isPaused) {
      setAnnouncement("Uploads paused.")
      return
    }
    if (state.runner === "idle" && state.hasUploaded && totals.completed > 0) {
      setAnnouncement(
        `Upload finished. ${totals.completed} photos uploaded, ${totals.failed} failed.`
      )
    }
  }, [
    workspace.isBusy,
    workspace.isPaused,
    state.activeBatchId,
    state.batchesById,
    state.runner,
    state.hasUploaded,
    totals.batches,
    totals.completed,
    totals.failed,
  ])

  const allItems = React.useMemo(() => itemsInOrder(state), [state])
  const filteredItems = React.useMemo(
    () => filterUploadItems(allItems, deferredSearch),
    [allItems, deferredSearch]
  )
  const searchActive = search.trim().length > 0

  function handlePhotos(event: React.ChangeEvent<HTMLInputElement>) {
    workspace.addFiles(fromFileList(event.target.files))
    event.target.value = ""
  }

  function handleFolder(event: React.ChangeEvent<HTMLInputElement>) {
    workspace.addFiles(fromFileList(event.target.files))
    event.target.value = ""
  }

  function handleRetryFailed() {
    const { retried, skipped } = workspace.retryFailed()
    if (retried === 0 && skipped === 0) return
    if (retried > 0) {
      toast.success(
        `Retried ${retried} photo${retried === 1 ? "" : "s"}`,
        skipped > 0
          ? {
              description: `${skipped} photo${skipped === 1 ? "" : "s"} can't be retried and need replacing.`,
            }
          : undefined
      )
      return
    }
    toast.error("No failed photos can be retried", {
      description: `${skipped} photo${skipped === 1 ? "" : "s"} need replacing.`,
    })
  }

  function handleExportFailed() {
    const count = exportFailedUploads(allItems)
    if (count === 0) {
      toast.error("There are no failed photos to export")
      return
    }
    toast.success(
      `Exported ${count} failed photo${count === 1 ? "" : "s"} to CSV`
    )
  }

  function handleClearCompleted() {
    const count = totals.completed
    if (count === 0) return
    workspace.clearCompleted()
    toast.success(
      `Cleared ${count} uploaded photo${count === 1 ? "" : "s"} from the queue`
    )
  }

  function handleClearRejected() {
    workspace.clearRejected()
    setSkippedOpen(false)
  }

  const openFiles = () => photosInput.current?.click()
  const openFolder = () => folderInput.current?.click()

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <PageHeader
        title="Upload photos"
        description="Add photos or a whole folder. Uploads start automatically and are split into batches of 100."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<GuardedLink href={`/events/${eventId}/gallery`} />}
          >
            Back to gallery
          </Button>
        }
      />

      <input
        ref={photosInput}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        onChange={handlePhotos}
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={folderInput}
        type="file"
        multiple
        className="sr-only"
        onChange={handleFolder}
        tabIndex={-1}
        aria-hidden="true"
      />

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <UploadDestinationPicker
        collections={collections.data}
        loading={collections.isPending}
        failed={collections.isError}
        value={state.destinationId}
        onChange={setDestination}
        onRetry={() => void collections.refetch()}
      />

      <UploadDropzone
        compact={totals.total > 0}
        onFiles={workspace.addFiles}
        onOpenFiles={openFiles}
        onOpenFolder={openFolder}
      />

      <Card>
        <div className="space-y-3 px-(--card-spacing)">
          <UploadQueueSummary state={state} totals={totals} />
          <UploadQueueToolbar
            search={search}
            onSearchChange={setSearch}
            onClearSearch={() => setSearch("")}
            filteredCount={filteredItems.length}
            totals={totals}
            runner={state.runner}
            isPaused={workspace.isPaused}
            onStop={workspace.stop}
            onResume={workspace.resume}
            onRetryFailed={handleRetryFailed}
            onExportFailed={handleExportFailed}
            onClearCompleted={handleClearCompleted}
            onViewSkipped={() => setSkippedOpen(true)}
            rejectedTotal={state.rejectedTotal}
          />
          <UploadRunAlert
            state={state}
            totals={totals}
            isPaused={workspace.isPaused}
            onResume={workspace.resume}
            onRetryFailed={handleRetryFailed}
            onExportFailed={handleExportFailed}
          />
        </div>
        <CardContent className="px-0">
          <UploadQueue
            items={filteredItems}
            activeBatchId={state.activeBatchId}
            runner={state.runner}
            search={deferredSearch}
            searchActive={searchActive}
            onClearSearch={() => setSearch("")}
            onRemove={workspace.removeItem}
            onRetry={workspace.retryItem}
          />
        </CardContent>
      </Card>

      <UploadRejectedFiles
        open={skippedOpen}
        onOpenChange={setSkippedOpen}
        rejected={state.rejected}
        total={state.rejectedTotal}
        onClear={handleClearRejected}
      />
    </div>
  )
}
