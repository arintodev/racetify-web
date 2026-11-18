import type {
  BatchItemOutcome,
  PreparedImage,
  RejectedFile,
  RunnerState,
  ServerUploadFile,
  UploadBatch,
  UploadBatchStatus,
  UploadItem,
  UploadItemError,
  UploadItemStatus,
  UploadState,
} from "./types"

export function initialUploadState(eventId: string): UploadState {
  return {
    eventId,
    destinationId: null,
    itemIds: [],
    itemsById: {},
    batchOrder: [],
    batchesById: {},
    runner: "idle",
    activeBatchId: null,
    rejected: [],
    rejectedTotal: 0,
    nextSeq: 0,
    hasUploaded: false,
  }
}

export type UploadAction =
  | { type: "add-files"; items: UploadItem[]; rejected: RejectedFile[] }
  | { type: "claim-prepare"; clientId: string }
  | { type: "prepared"; clientId: string; prepared: PreparedImage }
  | { type: "prepare-failed"; clientId: string; error: UploadItemError }
  | { type: "set-destination"; destinationId: string | null }
  | { type: "start-batch"; batch: UploadBatch; itemIds: string[] }
  | {
      type: "batch-created"
      batchId: string
      sessionId: string
      files: ServerUploadFile[]
    }
  | {
      type: "item-status"
      clientId: string
      status: UploadItemStatus
      patch?: Partial<UploadItem>
    }
  | { type: "progress"; updates: Array<{ clientId: string; progress: number }> }
  | {
      type: "batch-status"
      batchId: string
      status: UploadBatchStatus
      error?: string | null
    }
  | {
      type: "batch-finished"
      batchId: string
      status: UploadBatchStatus
      outcomes: BatchItemOutcome[]
    }
  | { type: "runner"; runner: RunnerState; activeBatchId?: string | null }
  | { type: "requeue"; clientIds: string[] }
  | { type: "retry"; clientIds: string[] }
  | { type: "remove"; clientId: string }
  | { type: "clear-completed" }
  | { type: "clear-rejected" }

export function uploadReducer(
  state: UploadState,
  action: UploadAction
): UploadState {
  switch (action.type) {
    case "add-files": {
      if (action.items.length === 0 && action.rejected.length === 0) {
        return state
      }
      const itemsById = { ...state.itemsById }
      for (const item of action.items) itemsById[item.clientId] = item
      return {
        ...state,
        itemIds: [
          ...state.itemIds,
          ...action.items.map((item) => item.clientId),
        ],
        itemsById,
        rejected: [...state.rejected, ...action.rejected].slice(0, 50),
        rejectedTotal: state.rejectedTotal + action.rejected.length,
        nextSeq: state.nextSeq + action.items.length,
      }
    }

    case "claim-prepare":
      return patchItem(state, action.clientId, (item) =>
        item.status === "queued"
          ? { ...item, status: "preparing", error: null }
          : item
      )

    case "prepared":
      return patchItem(state, action.clientId, (item) => ({
        ...item,
        ...action.prepared,
        status: "ready",
        progress: 0,
        error: null,
      }))

    case "prepare-failed":
      return patchItem(state, action.clientId, (item) => ({
        ...item,
        status: "failed",
        error: action.error,
      }))

    case "set-destination":
      return { ...state, destinationId: action.destinationId }

    case "start-batch": {
      const itemsById = { ...state.itemsById }
      for (const clientId of action.itemIds) {
        const item = itemsById[clientId]
        if (item) itemsById[clientId] = { ...item, batchId: action.batch.id }
      }
      return {
        ...state,
        itemsById,
        batchesById: {
          ...state.batchesById,
          [action.batch.id]: action.batch,
        },
        batchOrder: [...state.batchOrder, action.batch.id],
        runner: "running",
        activeBatchId: action.batch.id,
      }
    }

    case "batch-created": {
      const byClientId = new Map(
        action.files
          .filter((file) => file.clientId)
          .map((file) => [file.clientId as string, file])
      )
      const itemsById = { ...state.itemsById }
      for (const item of Object.values(state.itemsById)) {
        if (item.batchId !== action.batchId) continue
        const file = byClientId.get(item.clientId)
        if (!file) continue
        itemsById[item.clientId] = {
          ...item,
          serverFileId: file.id,
          uploadUrl: file.uploadUrl ?? null,
          uploadHeaders: file.headers ?? null,
          presignExpiresAt: file.expiresAt
            ? new Date(file.expiresAt).getTime()
            : null,
        }
      }
      return {
        ...state,
        itemsById,
        batchesById: {
          ...state.batchesById,
          [action.batchId]: {
            ...state.batchesById[action.batchId]!,
            status: "uploading",
            sessionId: action.sessionId,
          },
        },
      }
    }

    case "item-status":
      return patchItem(state, action.clientId, (item) => ({
        ...item,
        ...action.patch,
        status: action.status,
      }))

    case "progress": {
      if (action.updates.length === 0) return state
      const itemsById = { ...state.itemsById }
      let changed = false
      for (const { clientId, progress } of action.updates) {
        const item = itemsById[clientId]
        if (!item || item.status !== "uploading") continue
        if (item.progress === progress) continue
        itemsById[clientId] = { ...item, progress }
        changed = true
      }
      return changed ? { ...state, itemsById } : state
    }

    case "batch-status": {
      const batch = state.batchesById[action.batchId]
      if (!batch) return state
      const patch: Partial<UploadBatch> = { status: action.status }
      if (action.error !== undefined) patch.error = action.error
      if (isTerminalBatchStatus(action.status)) patch.finishedAt = Date.now()
      return {
        ...state,
        batchesById: {
          ...state.batchesById,
          [action.batchId]: { ...batch, ...patch },
        },
      }
    }

    case "batch-finished": {
      const batch = state.batchesById[action.batchId]
      const itemsById = { ...state.itemsById }
      for (const outcome of action.outcomes) {
        const item = itemsById[outcome.clientId]
        if (!item) continue
        if (outcome.status === "completed") {
          itemsById[outcome.clientId] = {
            ...item,
            status: "completed",
            progress: 100,
            batchId: action.batchId,
            serverFileId: outcome.serverFileId ?? item.serverFileId,
            etag: outcome.etag ?? item.etag,
            error: null,
            // Neither the prepared bytes nor the source File are needed once the server
            // confirmed the file; release both so a long queue stays lean.
            body: null,
            file: null,
          }
        } else if (outcome.status === "failed") {
          itemsById[outcome.clientId] = {
            ...item,
            status: "failed",
            batchId: action.batchId,
            error: outcome.error ?? item.error,
          }
        } else {
          itemsById[outcome.clientId] = {
            ...item,
            status: "ready",
            progress: 0,
            batchId: null,
            serverFileId: null,
            uploadUrl: null,
            uploadHeaders: null,
            presignExpiresAt: null,
            etag: null,
            error: null,
          }
        }
      }
      return {
        ...state,
        itemsById,
        batchesById: batch
          ? {
              ...state.batchesById,
              [action.batchId]: {
                ...batch,
                status: action.status,
                finishedAt: Date.now(),
              },
            }
          : state.batchesById,
        hasUploaded:
          state.hasUploaded ||
          action.status === "completed" ||
          action.status === "partial",
      }
    }

    case "runner":
      return {
        ...state,
        runner: action.runner,
        activeBatchId:
          action.activeBatchId === undefined
            ? state.activeBatchId
            : action.activeBatchId,
      }

    case "requeue": {
      const itemsById = { ...state.itemsById }
      for (const clientId of action.clientIds) {
        const item = itemsById[clientId]
        if (!item) continue
        itemsById[clientId] = {
          ...clearServerRefs(item),
          status: item.body ? "ready" : "queued",
          progress: 0,
          attempts: item.attempts,
          error: null,
        }
      }
      return { ...state, itemsById }
    }

    case "retry": {
      const itemsById = { ...state.itemsById }
      for (const clientId of action.clientIds) {
        const item = itemsById[clientId]
        if (!item || item.status !== "failed") continue
        // Validation failures cannot succeed on a retry.
        if (!item.error?.retryable || item.error.stage === "validate") continue
        itemsById[clientId] = {
          ...clearServerRefs(item),
          status: item.body ? "ready" : "queued",
          progress: 0,
          attempts: 0,
          error: null,
        }
      }
      return { ...state, itemsById }
    }

    case "remove": {
      const item = state.itemsById[action.clientId]
      if (!item) return state
      if (item.batchId === state.activeBatchId && state.runner !== "idle") {
        return state
      }
      const itemsById = { ...state.itemsById }
      delete itemsById[action.clientId]
      return {
        ...state,
        itemsById,
        itemIds: state.itemIds.filter(
          (clientId) => clientId !== action.clientId
        ),
      }
    }

    case "clear-completed": {
      const itemsById: Record<string, UploadItem> = {}
      const itemIds: string[] = []
      for (const clientId of state.itemIds) {
        const item = state.itemsById[clientId]
        if (!item || item.status === "completed") continue
        itemsById[clientId] = item
        itemIds.push(clientId)
      }
      return { ...state, itemsById, itemIds }
    }

    case "clear-rejected":
      return state.rejectedTotal === 0
        ? state
        : { ...state, rejected: [], rejectedTotal: 0 }
  }
}

export function isTerminalBatchStatus(status: UploadBatchStatus): boolean {
  return (
    status === "completed" ||
    status === "partial" ||
    status === "failed" ||
    status === "canceled"
  )
}

function clearServerRefs(item: UploadItem): UploadItem {
  return {
    ...item,
    batchId: null,
    serverFileId: null,
    uploadUrl: null,
    uploadHeaders: null,
    presignExpiresAt: null,
    etag: null,
  }
}

function patchItem(
  state: UploadState,
  clientId: string,
  patch: (item: UploadItem) => UploadItem
): UploadState {
  const item = state.itemsById[clientId]
  if (!item) return state
  const next = patch(item)
  if (next === item) return state
  return {
    ...state,
    itemsById: { ...state.itemsById, [clientId]: next },
  }
}
