"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQueryClient } from "@tanstack/react-query"
import * as React from "react"

import {
  BATCH_SIZE,
  MAX_FILES_PER_ADD,
  PREPARE_CONCURRENCY,
  PREPARE_WINDOW,
  PREPARE_WINDOW_BYTES,
  PROGRESS_TICK_MS,
  QUIET_FLUSH_MS,
} from "../lib/constants"
import {
  batchCountFor,
  itemsInOrder,
  nextBatchItemIds,
  pendingCount,
  readyItems,
  totalDeclaredBytes,
} from "../lib/batch-selection"
import { runUploadBatch } from "../lib/batch-runner"
import { isAbortError, itemError } from "../lib/errors"
import { prepareImage } from "../lib/image-prepare"
import {
  initialUploadState,
  uploadReducer,
  type UploadAction,
} from "../lib/reducer"
import type { UploadBatch, UploadItem, UploadState } from "../lib/types"
import { dedupeKey, validateFile } from "../lib/validation"
import type { SelectedFile } from "../lib/file-collection"

export type UploadTotals = {
  total: number
  queued: number
  preparing: number
  ready: number
  uploading: number
  uploaded: number
  completed: number
  failed: number
  /** Failures that a retry can actually help with (validation failures cannot). */
  retryableFailed: number
  bytes: number
  resized: number
  converted: number
  batches: number
  /** Sum of per-file percentages for rows currently uploading (0–100 each). */
  uploadingProgress: number
  activeBatchProgress: number
  activeBatchCount: number
}

export type UploadWorkspace = {
  state: UploadState
  totals: UploadTotals
  isBusy: boolean
  /** True after the user stops a run, until they add files, resume, or retry. */
  isPaused: boolean
  addFiles: (files: SelectedFile[]) => void
  setDestination: (collectionId: string | null) => void
  stop: () => void
  resume: () => void
  retryFailed: () => { retried: number; skipped: number }
  retryItem: (clientId: string) => void
  removeItem: (clientId: string) => void
  clearCompleted: () => void
  clearRejected: () => void
}

/**
 * Owns the upload queue: validation, preparation, auto-batched sessions, and the completion
 * result. All non-serializable values (File/Blob/AbortController) stay in refs; nothing here is
 * placed in the TanStack Query cache.
 */
export function useUploadWorkspace(eventId: string): UploadWorkspace {
  const queryClient = useQueryClient()
  const [state, dispatch] = React.useReducer(
    uploadReducer,
    eventId,
    initialUploadState
  )
  const [isPaused, setIsPaused] = React.useState(false)

  const stateRef = React.useRef(state)
  stateRef.current = state

  const prepActiveRef = React.useRef(0)
  const prepControllers = React.useRef(new Map<string, AbortController>())
  const prepWindowSaturatedRef = React.useRef(false)
  const batchControllerRef = React.useRef<AbortController | null>(null)
  const runnerReservedRef = React.useRef(false)
  const stopRequestedRef = React.useRef(false)
  const progressRef = React.useRef(new Map<string, number>())
  const quietTimerRef = React.useRef<number | null>(null)
  const quietElapsedRef = React.useRef(false)
  const invalidateTimerRef = React.useRef<number | null>(null)
  const startPreparationRef = React.useRef<() => void>(() => undefined)
  const maybeStartBatchRef = React.useRef<() => void>(() => undefined)
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      for (const controller of prepControllers.current.values()) {
        controller.abort()
      }
      batchControllerRef.current?.abort()
      if (quietTimerRef.current !== null) {
        window.clearTimeout(quietTimerRef.current)
      }
      if (invalidateTimerRef.current !== null) {
        window.clearTimeout(invalidateTimerRef.current)
      }
    }
  }, [])

  const invalidateGallery = React.useCallback(
    (immediate = false) => {
      const run = () => {
        void queryClient.invalidateQueries({
          queryKey: ["event", eventId, "gallery", "items"],
        })
        void queryClient.invalidateQueries({
          queryKey: queryKeys.galleryCollections(eventId),
        })
        void queryClient.invalidateQueries({
          queryKey: queryKeys.eventOverview(eventId),
        })
      }

      if (invalidateTimerRef.current !== null) {
        window.clearTimeout(invalidateTimerRef.current)
        invalidateTimerRef.current = null
      }
      if (immediate) {
        run()
        return
      }
      invalidateTimerRef.current = window.setTimeout(run, 1_000)
    },
    [eventId, queryClient]
  )

  // -------------------------------------------------------------- preparation
  const runPreparation = React.useCallback(
    async (item: UploadItem, signal: AbortSignal) => {
      try {
        const validation = validateFile(item.file!)
        if (!validation.ok) {
          dispatch({
            type: "prepare-failed",
            clientId: item.clientId,
            error: {
              stage: "validate",
              message: validation.reason,
              retryable: false,
            },
          })
          return
        }

        const prepared = await prepareImage(item.file!, validation.mime, signal)
        if (signal.aborted) return
        dispatch({ type: "prepared", clientId: item.clientId, prepared })
        resetQuietTimer()
      } catch (error) {
        if (signal.aborted || isAbortError(error)) return
        dispatch({
          type: "prepare-failed",
          clientId: item.clientId,
          error: itemError("prepare", error),
        })
        resetQuietTimer()
      } finally {
        prepActiveRef.current = Math.max(0, prepActiveRef.current - 1)
        prepControllers.current.delete(item.clientId)
        if (mountedRef.current) {
          queueMicrotask(() => startPreparationRef.current())
        }
      }
    },
    []
  )

  const startPreparation = React.useCallback(() => {
    if (stopRequestedRef.current) return
    const current = stateRef.current
    const items = itemsInOrder(current)
    const inWindow = items.filter(
      (item) => item.status === "preparing" || item.status === "ready"
    )
    let windowUsed = inWindow.length
    // Bound both the number and the total bytes of prepared work. A queued item has no prepared
    // body yet, so its original size is the conservative estimate.
    let windowBytes = inWindow.reduce(
      (sum, item) => sum + (item.body?.size ?? item.originalSize),
      0
    )
    let blockedByWindow =
      windowUsed >= PREPARE_WINDOW || windowBytes >= PREPARE_WINDOW_BYTES

    if (!blockedByWindow) {
      for (const item of items) {
        if (prepActiveRef.current >= PREPARE_CONCURRENCY) break
        if (windowUsed >= PREPARE_WINDOW) {
          blockedByWindow = true
          break
        }
        if (item.status !== "queued" || !item.file) continue

        const estimatedBytes = item.originalSize
        if (
          windowUsed > 0 &&
          windowBytes + estimatedBytes > PREPARE_WINDOW_BYTES
        ) {
          blockedByWindow = true
          break
        }

        const controller = new AbortController()
        prepControllers.current.set(item.clientId, controller)
        prepActiveRef.current += 1
        windowUsed += 1
        windowBytes += estimatedBytes
        dispatch({ type: "claim-prepare", clientId: item.clientId })
        void runPreparation(item, controller.signal)
      }
    }

    // A window full of prepared photos with more queued would otherwise deadlock: no batch can
    // reach 100 and no preparation slot can free. Let the scheduler start a partial batch instead.
    const hasQueued = items.some(
      (item) => item.status === "queued" && item.file
    )
    // Only a stalled window (nothing preparing) warrants a partial batch; while preparation is
    // running it will keep filling as prepared bodies are smaller than their sources.
    prepWindowSaturatedRef.current =
      blockedByWindow && hasQueued && prepActiveRef.current === 0
  }, [runPreparation])

  startPreparationRef.current = startPreparation

  // Preparation is rerun only when the queue composition changes: an item becomes queued, or an
  // item leaves the preparing/ready window (starts uploading, fails, completes, or is retried).
  // Progress ticks never change these counts, so they no longer rescan the whole queue.
  const prepSignals = React.useMemo(() => {
    let queued = 0
    let settled = 0
    for (const item of itemsInOrder(state)) {
      if (item.status === "queued" && item.file) {
        queued += 1
      } else if (item.status !== "preparing" && item.status !== "ready") {
        settled += 1
      }
    }
    return { queued, settled }
  }, [state])
  React.useEffect(() => {
    startPreparation()
  }, [state.itemIds, prepSignals.queued, prepSignals.settled, startPreparation])

  // --------------------------------------------------------------- batching
  const scheduleQuietFlush = React.useCallback(() => {
    if (quietTimerRef.current !== null) return
    quietTimerRef.current = window.setTimeout(() => {
      quietTimerRef.current = null
      quietElapsedRef.current = true
      maybeStartBatchRef.current()
    }, QUIET_FLUSH_MS)
  }, [])

  function resetQuietTimer() {
    quietElapsedRef.current = false
    if (quietTimerRef.current !== null) {
      window.clearTimeout(quietTimerRef.current)
      quietTimerRef.current = null
    }
    scheduleQuietFlush()
  }

  const maybeStartBatch = React.useCallback(() => {
    const current = stateRef.current
    if (stopRequestedRef.current) return
    if (current.runner !== "idle" || runnerReservedRef.current) return

    const ids = nextBatchItemIds(
      current,
      true // the flush rules below decide whether a partial batch is allowed
    )
    if (!ids) return

    const ready = readyItems(current)
    const settled = pendingCount(current) === 0
    const mayStart =
      quietElapsedRef.current ||
      settled ||
      ready.length >= BATCH_SIZE ||
      prepWindowSaturatedRef.current

    if (!mayStart) {
      scheduleQuietFlush()
      return
    }

    if (quietTimerRef.current !== null) {
      window.clearTimeout(quietTimerRef.current)
      quietTimerRef.current = null
    }
    quietElapsedRef.current = false
    runnerReservedRef.current = true

    const batch: UploadBatch = {
      id: crypto.randomUUID(),
      seq: current.batchOrder.length + 1,
      collectionId: current.destinationId,
      itemIds: ids,
      status: "creating",
      sessionId: null,
      createKey: crypto.randomUUID(),
      completeKey: crypto.randomUUID(),
      error: null,
      startedAt: Date.now(),
      finishedAt: null,
    }
    const snapshot = ids
      .map((clientId) => current.itemsById[clientId])
      .filter((item): item is UploadItem => Boolean(item))

    dispatch({ type: "start-batch", batch, itemIds: ids })
    // Ready items just left the preparation window; keep preparing the rest of the queue.
    startPreparationRef.current()

    const controller = new AbortController()
    batchControllerRef.current = controller
    progressRef.current.clear()

    void runUploadBatch(eventId, batch, snapshot, controller.signal, {
      isStopRequested: () => stopRequestedRef.current,
      onItemUploading: (clientId) =>
        dispatch({ type: "item-status", clientId, status: "uploading" }),
      onItemProgress: (clientId, percent) =>
        progressRef.current.set(clientId, percent),
      onItemUploaded: (clientId, serverFileId, etag) =>
        dispatch({
          type: "item-status",
          clientId,
          status: "uploaded",
          patch: { serverFileId, etag, progress: 100 },
        }),
      onItemFailed: (clientId, error) =>
        dispatch({
          type: "item-status",
          clientId,
          status: "failed",
          patch: { error },
        }),
      onFileRefreshed: (clientId, file) =>
        dispatch({
          type: "item-status",
          clientId,
          status: "uploading",
          patch: {
            uploadUrl: file.uploadUrl ?? null,
            uploadHeaders: file.headers ?? null,
            presignExpiresAt: file.expiresAt
              ? new Date(file.expiresAt).getTime()
              : null,
          },
        }),
      onBatchCreated: (sessionId, files) =>
        dispatch({
          type: "batch-created",
          batchId: batch.id,
          sessionId,
          files,
        }),
      onBatchCompleting: () =>
        dispatch({
          type: "batch-status",
          batchId: batch.id,
          status: "completing",
        }),
    })
      .then((result) => {
        if (!mountedRef.current) return
        dispatch({
          type: "batch-finished",
          batchId: batch.id,
          status: result.status,
          outcomes: result.outcomes,
        })
        batchControllerRef.current = null
        runnerReservedRef.current = false

        if (stopRequestedRef.current) {
          dispatch({ type: "runner", runner: "idle", activeBatchId: null })
          invalidateGallery(true)
          return
        }

        if (result.status === "failed" || result.status === "canceled") {
          dispatch({
            type: "runner",
            runner: result.status === "failed" ? "paused-error" : "idle",
            activeBatchId: null,
          })
          invalidateGallery()
          return
        }

        dispatch({ type: "runner", runner: "idle", activeBatchId: null })
        invalidateGallery()
        startPreparationRef.current()
        queueMicrotask(() => maybeStartBatchRef.current())
      })
      .catch(() => {
        if (!mountedRef.current) return
        dispatch({ type: "requeue", clientIds: batch.itemIds })
        dispatch({
          type: "batch-status",
          batchId: batch.id,
          status: "failed",
          error: "The upload batch stopped unexpectedly.",
        })
        dispatch({
          type: "runner",
          runner: "paused-error",
          activeBatchId: null,
        })
        batchControllerRef.current = null
        runnerReservedRef.current = false
      })
  }, [eventId, invalidateGallery, scheduleQuietFlush])

  maybeStartBatchRef.current = maybeStartBatch

  const readyCount = readyItems(state).length
  // Only rerun the scheduler when something it cares about changes; progress ticks no longer
  // invoke it on every state update.
  React.useEffect(() => {
    maybeStartBatch()
  }, [
    readyCount,
    state.runner,
    state.activeBatchId,
    state.destinationId,
    maybeStartBatch,
  ])

  // --------------------------------------------------------------- progress
  React.useEffect(() => {
    if (state.runner !== "running") return
    const timer = window.setInterval(() => {
      if (progressRef.current.size === 0) return
      const updates = Array.from(progressRef.current.entries()).map(
        ([clientId, progress]) => ({ clientId, progress })
      )
      progressRef.current.clear()
      dispatch({ type: "progress", updates })
    }, PROGRESS_TICK_MS)
    return () => window.clearInterval(timer)
  }, [state.runner])

  // ------------------------------------------------------------ invalidation
  const wasRunningRef = React.useRef(false)
  React.useEffect(() => {
    const running = state.runner === "running"
    if (wasRunningRef.current && !running && state.hasUploaded) {
      invalidateGallery(true)
    }
    wasRunningRef.current = running
  }, [state.runner, state.hasUploaded, invalidateGallery])

  // ---------------------------------------------------------------- actions
  const addFiles = React.useCallback((selected: SelectedFile[]) => {
    const current = stateRef.current
    const existing = new Set(
      itemsInOrder(current)
        .filter((item) => item.status !== "completed" && item.file)
        .map((item) => dedupeKey(item.file!))
    )

    const items: UploadItem[] = []
    const rejected: Array<{ name: string; reason: string }> = []
    let seq = current.nextSeq

    for (const { file, relativePath } of selected.slice(0, MAX_FILES_PER_ADD)) {
      const validation = validateFile(file)
      if (!validation.ok) {
        rejected.push({ name: file.name, reason: validation.reason })
        continue
      }
      const key = dedupeKey(file)
      if (existing.has(key)) {
        rejected.push({
          name: file.name,
          reason: "This photo is already in the queue.",
        })
        continue
      }
      existing.add(key)

      items.push({
        clientId: crypto.randomUUID(),
        seq,
        file,
        relativePath,
        displayName: file.name,
        declaredName: file.name,
        declaredMime: validation.mime,
        originalSize: file.size,
        declaredSize: file.size,
        body: null,
        width: null,
        height: null,
        resized: false,
        converted: false,
        exifPreserved: null,
        warning: null,
        status: "queued",
        progress: 0,
        batchId: null,
        serverFileId: null,
        uploadUrl: null,
        uploadHeaders: null,
        presignExpiresAt: null,
        etag: null,
        attempts: 0,
        error: null,
      })
      seq += 1
    }

    if (selected.length > MAX_FILES_PER_ADD) {
      rejected.push({
        name: `${selected.length - MAX_FILES_PER_ADD} more files`,
        reason: `Only ${MAX_FILES_PER_ADD} files can be added at once. Add the rest in another group.`,
      })
    }

    dispatch({ type: "add-files", items, rejected })
    if (items.length > 0) {
      // Adding files is a fresh intent to upload, so it also lifts a Stop or a paused batch.
      stopRequestedRef.current = false
      setIsPaused(false)
      if (stateRef.current.runner === "paused-error") {
        dispatch({ type: "runner", runner: "idle", activeBatchId: null })
      }
      resetQuietTimer()
    }
    queueMicrotask(() => startPreparationRef.current())
  }, [])

  const setDestination = React.useCallback((collectionId: string | null) => {
    dispatch({ type: "set-destination", destinationId: collectionId })
  }, [])

  const stop = React.useCallback(() => {
    if (stateRef.current.runner !== "running") return
    stopRequestedRef.current = true
    setIsPaused(true)
    dispatch({ type: "runner", runner: "stopping" })
    batchControllerRef.current?.abort()
  }, [])

  const resume = React.useCallback(() => {
    stopRequestedRef.current = false
    setIsPaused(false)
    dispatch({ type: "runner", runner: "idle", activeBatchId: null })
    quietElapsedRef.current = true
    queueMicrotask(() => {
      startPreparationRef.current()
      maybeStartBatchRef.current()
    })
  }, [])

  const retryFailed = React.useCallback(() => {
    const current = stateRef.current
    const failed = itemsInOrder(current).filter(
      (item) => item.status === "failed"
    )
    const ids = failed
      .filter((item) => item.error?.retryable)
      .map((item) => item.clientId)
    const skipped = failed.length - ids.length

    if (ids.length === 0 || current.runner === "stopping") {
      return { retried: 0, skipped }
    }

    stopRequestedRef.current = false
    setIsPaused(false)
    dispatch({ type: "retry", clientIds: ids })
    // Never reset a running batch from here; the retried rows will join the next batch.
    if (current.runner === "paused-error") {
      dispatch({ type: "runner", runner: "idle", activeBatchId: null })
    }
    quietElapsedRef.current = true
    queueMicrotask(() => {
      startPreparationRef.current()
      maybeStartBatchRef.current()
    })
    return { retried: ids.length, skipped }
  }, [])

  const retryItem = React.useCallback((clientId: string) => {
    const current = stateRef.current
    if (current.runner === "stopping") return
    stopRequestedRef.current = false
    setIsPaused(false)
    dispatch({ type: "retry", clientIds: [clientId] })
    if (current.runner === "paused-error") {
      dispatch({ type: "runner", runner: "idle", activeBatchId: null })
    }
    queueMicrotask(() => {
      startPreparationRef.current()
      maybeStartBatchRef.current()
    })
  }, [])

  const removeItem = React.useCallback((clientId: string) => {
    prepControllers.current.get(clientId)?.abort()
    prepControllers.current.delete(clientId)
    dispatch({ type: "remove", clientId })
  }, [])

  const clearCompleted = React.useCallback(() => {
    dispatch({ type: "clear-completed" })
  }, [])

  const clearRejected = React.useCallback(() => {
    dispatch({ type: "clear-rejected" })
  }, [])

  // ----------------------------------------------------------------- totals
  const totals = React.useMemo<UploadTotals>(() => {
    const items = itemsInOrder(state)
    let queued = 0
    let preparing = 0
    let ready = 0
    let uploading = 0
    let uploaded = 0
    let completed = 0
    let failed = 0
    let retryableFailed = 0
    let resized = 0
    let converted = 0
    let uploadingProgress = 0
    let activeBatchCount = 0
    let activeBatchDone = 0

    for (const item of items) {
      if (item.resized) resized += 1
      if (item.converted) converted += 1

      if (state.activeBatchId && item.batchId === state.activeBatchId) {
        activeBatchCount += 1
        if (item.status === "completed" || item.status === "uploaded") {
          activeBatchDone += 1
        }
      }

      switch (item.status) {
        case "queued":
          queued += 1
          break
        case "preparing":
          preparing += 1
          break
        case "ready":
          ready += 1
          break
        case "uploading":
          uploading += 1
          uploadingProgress += item.progress
          break
        case "uploaded":
          uploaded += 1
          break
        case "completed":
          completed += 1
          break
        case "failed":
          failed += 1
          if (item.error?.retryable) retryableFailed += 1
          break
      }
    }

    return {
      total: items.length,
      queued,
      preparing,
      ready,
      uploading,
      uploaded,
      completed,
      failed,
      retryableFailed,
      bytes: totalDeclaredBytes(items),
      resized,
      converted,
      batches: batchCountFor(items.length),
      uploadingProgress,
      activeBatchProgress:
        activeBatchCount === 0
          ? 0
          : Math.round((activeBatchDone / activeBatchCount) * 100),
      activeBatchCount,
    }
  }, [state])

  const isBusy = state.runner === "running" || state.runner === "stopping"

  return {
    state,
    totals,
    isBusy,
    isPaused,
    addFiles,
    setDestination,
    stop,
    resume,
    retryFailed,
    retryItem,
    removeItem,
    clearCompleted,
    clearRejected,
  }
}
