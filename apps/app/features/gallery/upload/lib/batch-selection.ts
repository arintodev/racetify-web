import { BATCH_SIZE } from "./constants"
import type { UploadItem, UploadState } from "./types"

export function itemsInOrder(state: UploadState): UploadItem[] {
  return state.itemIds
    .map((clientId) => state.itemsById[clientId])
    .filter((item): item is UploadItem => Boolean(item))
}

export function readyItems(state: UploadState): UploadItem[] {
  return itemsInOrder(state).filter(
    (item) => item.status === "ready" && item.batchId === null
  )
}

export function pendingCount(state: UploadState): number {
  return itemsInOrder(state).filter(
    (item) => item.status === "queued" || item.status === "preparing"
  ).length
}

export function activeCount(state: UploadState): number {
  return itemsInOrder(state).filter(
    (item) => item.status === "uploading" || item.status === "uploaded"
  ).length
}

/**
 * Picks the next batch. A full batch starts immediately; a partial one only when preparation has
 * settled, the quiet window elapsed, or the user pressed "Start now".
 */
export function nextBatchItemIds(
  state: UploadState,
  allowPartial: boolean
): string[] | null {
  const ready = readyItems(state)
  if (ready.length === 0) return null
  if (!allowPartial && ready.length < BATCH_SIZE) return null
  return ready.slice(0, BATCH_SIZE).map((item) => item.clientId)
}

/** Upload size in bytes after preparation; used for the summary and progress. */
export function totalDeclaredBytes(items: UploadItem[]): number {
  return items.reduce((sum, item) => sum + item.declaredSize, 0)
}

export function batchCountFor(total: number): number {
  return Math.max(1, Math.ceil(total / BATCH_SIZE))
}
