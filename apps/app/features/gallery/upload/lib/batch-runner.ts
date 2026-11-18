import {
  ApiError,
  UploadHttpError,
  uploadToPresignedUrl,
} from "@workspace/api-client"

import { PRESIGN_SAFETY_MS, PUT_CONCURRENCY } from "./constants"
import {
  errorMessage,
  isAbortError,
  isRetryableStatus,
  itemError,
} from "./errors"
import type {
  BatchItemOutcome,
  ServerUploadFile,
  UploadBatch,
  UploadBatchStatus,
  UploadItem,
  UploadItemError,
} from "./types"
import {
  abortUploadSession,
  completeUploadSession,
  createUploadSession,
  getUploadSession,
  presignUploadFile,
} from "./upload-api"

export type BatchRunResult = {
  status: UploadBatchStatus
  outcomes: BatchItemOutcome[]
  error: string | null
}

type RunnerHooks = {
  isStopRequested: () => boolean
  onItemUploading: (clientId: string) => void
  onItemProgress: (clientId: string, percent: number) => void
  onItemUploaded: (
    clientId: string,
    serverFileId: string,
    etag: string | null
  ) => void
  onItemFailed: (clientId: string, error: UploadItemError) => void
  onFileRefreshed: (clientId: string, file: ServerUploadFile) => void
  onBatchCreated: (sessionId: string, files: ServerUploadFile[]) => void
  onBatchCompleting: () => void
}

/**
 * Runs one upload session end to end: create → concurrent PUTs → complete.
 *
 * Never retries by itself into a new session; the caller decides what to do with the outcome.
 * Only files whose PUT succeeded are submitted to `complete`, so a partial batch never loses
 * already-uploaded bytes.
 */
export async function runUploadBatch(
  eventId: string,
  batch: UploadBatch,
  items: UploadItem[],
  signal: AbortSignal,
  hooks: RunnerHooks
): Promise<BatchRunResult> {
  const session = await createWithRetry(eventId, batch, items)
  if (!session) {
    return {
      status: "failed",
      outcomes: items.map((item) => ({
        clientId: item.clientId,
        status: "ready" as const,
      })),
      error: "The upload batch could not be started.",
    }
  }

  // The session id lives on the server response, not on the local `batch` object: the reducer
  // updates its own copy in `onBatchCreated`, so the runner must thread this id explicitly.
  const uploadId = session.id
  if (!uploadId) {
    return {
      status: "failed",
      outcomes: items.map((item) => ({
        clientId: item.clientId,
        status: "ready" as const,
      })),
      error: "The upload server did not return a session id.",
    }
  }

  hooks.onBatchCreated(uploadId, session.files)

  if (signal.aborted || hooks.isStopRequested()) {
    await abortUploadSession(eventId, uploadId).catch(() => undefined)
    return {
      status: "canceled",
      outcomes: items.map((item) => ({
        clientId: item.clientId,
        status: "ready" as const,
      })),
      error: null,
    }
  }

  const serverFiles = new Map<string, ServerUploadFile>()
  for (const file of session.files) {
    if (file.clientId) serverFiles.set(file.clientId, file)
  }

  const uploaded = new Map<
    string,
    { serverFileId: string; etag: string | null }
  >()
  const failed = new Map<string, UploadItemError>()
  const stopped = new Set<string>()
  const candidateIds = items
    .filter((item) => serverFiles.has(item.clientId))
    .map((item) => item.clientId)

  for (const item of items) {
    if (!serverFiles.has(item.clientId)) {
      const error: UploadItemError = {
        stage: "create",
        message: "The server did not return an upload URL for this photo.",
        retryable: true,
      }
      failed.set(item.clientId, error)
      hooks.onItemFailed(item.clientId, error)
    }
  }

  let cursor = 0
  const workerCount = Math.min(PUT_CONCURRENCY, candidateIds.length)
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < candidateIds.length) {
        if (signal.aborted || hooks.isStopRequested()) return
        const clientId = candidateIds[cursor]
        cursor += 1
        if (!clientId) return
        const item = items.find((entry) => entry.clientId === clientId)
        const file = serverFiles.get(clientId)
        if (!item?.body || !file) continue

        const result = await uploadOne(
          eventId,
          uploadId,
          item,
          file,
          signal,
          hooks
        )

        if (result.kind === "uploaded") {
          uploaded.set(clientId, result.file)
        } else if (result.kind === "stopped") {
          stopped.add(clientId)
        } else {
          failed.set(clientId, result.error)
          hooks.onItemFailed(clientId, result.error)
        }
      }
    })
  )

  if (uploaded.size === 0) {
    await abortUploadSession(eventId, uploadId).catch(() => undefined)
    return {
      status: stopped.size > 0 ? "canceled" : "failed",
      outcomes: items.map((item) => ({
        clientId: item.clientId,
        status: failed.has(item.clientId)
          ? ("failed" as const)
          : ("ready" as const),
        error: failed.get(item.clientId) ?? null,
      })),
      error:
        failed.size > 0 ? "No photos in this batch could be uploaded." : null,
    }
  }

  hooks.onBatchCompleting()
  const completeFiles = items
    .filter((item) => uploaded.has(item.clientId))
    .map((item) => ({
      id: uploaded.get(item.clientId)!.serverFileId,
      etag: uploaded.get(item.clientId)!.etag ?? undefined,
    }))

  const completion = await completeWithRetry(
    eventId,
    uploadId,
    batch.completeKey,
    completeFiles
  )

  if (completion.kind === "failed") {
    const outcomeError: UploadItemError = {
      stage: "complete",
      message: completion.message,
      retryable: true,
      httpStatus: completion.status,
    }
    return {
      status: "failed",
      outcomes: items.map((item) =>
        uploaded.has(item.clientId)
          ? {
              clientId: item.clientId,
              status: "failed" as const,
              error: outcomeError,
            }
          : {
              clientId: item.clientId,
              status: failed.has(item.clientId)
                ? ("failed" as const)
                : ("ready" as const),
              error: failed.get(item.clientId) ?? null,
            }
      ),
      error: completion.message,
    }
  }

  const outcomes = items.map((item) => {
    const done = uploaded.get(item.clientId)
    if (done && completion.confirmed.has(item.clientId)) {
      return {
        clientId: item.clientId,
        status: "completed" as const,
        serverFileId: done.serverFileId,
        etag: done.etag,
      }
    }
    if (done) {
      const message =
        completion.failures.get(item.clientId) ??
        "The server did not confirm this photo."
      return {
        clientId: item.clientId,
        status: "failed" as const,
        error: {
          stage: "complete" as const,
          message,
          retryable: true,
        },
      }
    }
    return {
      clientId: item.clientId,
      status: failed.has(item.clientId)
        ? ("failed" as const)
        : ("ready" as const),
      error: failed.get(item.clientId) ?? null,
    }
  })

  const hasFailure = outcomes.some((outcome) => outcome.status === "failed")
  return {
    status: hasFailure || stopped.size > 0 ? "partial" : "completed",
    outcomes,
    error: null,
  }
}

async function createWithRetry(
  eventId: string,
  batch: UploadBatch,
  items: UploadItem[]
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await createUploadSession(
        eventId,
        {
          collectionId: batch.collectionId,
          files: items.map((item) => ({
            clientId: item.clientId,
            originalName: item.declaredName,
            mimeType: item.declaredMime,
            size: item.declaredSize,
          })),
        },
        batch.createKey
      )
    } catch (error) {
      if (error instanceof ApiError && !isRetryableStatus(error.status)) {
        return null
      }
      if (attempt === 0) {
        await sleep(500)
        continue
      }
      return null
    }
  }
  return null
}

type UploadOneResult =
  | { kind: "uploaded"; file: { serverFileId: string; etag: string | null } }
  | { kind: "failed"; error: UploadItemError }
  | { kind: "stopped" }

async function uploadOne(
  eventId: string,
  uploadId: string,
  item: UploadItem,
  initial: ServerUploadFile,
  signal: AbortSignal,
  hooks: RunnerHooks
): Promise<UploadOneResult> {
  hooks.onItemUploading(item.clientId)

  let file = initial
  let refreshUsed = false
  let forceRefresh = false

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (signal.aborted) return { kind: "stopped" }

    if (forceRefresh || needsRefresh(file)) {
      const refreshed = await refreshFile(eventId, uploadId, file)
      if (!refreshed) {
        return {
          kind: "failed",
          error: {
            stage: "upload",
            message: "The upload link expired and could not be refreshed.",
            retryable: true,
          },
        }
      }
      file = refreshed
      forceRefresh = false
      hooks.onFileRefreshed(item.clientId, refreshed)
    }

    if (!file.uploadUrl) {
      return {
        kind: "failed",
        error: {
          stage: "upload",
          message: "The server did not return an upload URL for this photo.",
          retryable: true,
        },
      }
    }

    try {
      const result = await uploadToPresignedUrl({
        upload: {
          uploadUrl: file.uploadUrl,
          method: file.method ?? "PUT",
          headers: file.headers ?? {},
          expiresAt: file.expiresAt ?? new Date().toISOString(),
        },
        body: item.body as Blob,
        signal,
        onProgress: (percent) => hooks.onItemProgress(item.clientId, percent),
      })
      hooks.onItemUploaded(item.clientId, file.id, result.etag ?? null)
      return {
        kind: "uploaded",
        file: { serverFileId: file.id, etag: result.etag ?? null },
      }
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return { kind: "stopped" }

      const status = error instanceof UploadHttpError ? error.status : null
      const expiredSignature = status === 403

      if (expiredSignature && !refreshUsed) {
        refreshUsed = true
        forceRefresh = true
        continue
      } else if (!isRetryableUpload(error)) {
        return { kind: "failed", error: itemError("upload", error) }
      }

      if (attempt < 2) {
        await sleep(attempt === 0 ? 500 : 1_500)
        continue
      }
      return { kind: "failed", error: itemError("upload", error) }
    }
  }

  return {
    kind: "failed",
    error: {
      stage: "upload",
      message: "The upload failed repeatedly.",
      retryable: true,
    },
  }
}

async function refreshFile(
  eventId: string,
  uploadId: string,
  file: ServerUploadFile
): Promise<ServerUploadFile | null> {
  try {
    return await presignUploadFile(eventId, uploadId, file.id)
  } catch {
    return null
  }
}

function needsRefresh(file: ServerUploadFile): boolean {
  if (!file.expiresAt) return false
  const expiresAt = new Date(file.expiresAt).getTime()
  return (
    Number.isFinite(expiresAt) && expiresAt - Date.now() < PRESIGN_SAFETY_MS
  )
}

function isRetryableUpload(error: unknown): boolean {
  if (error instanceof UploadHttpError) {
    return error.status === 0 || isRetryableStatus(error.status)
  }
  return error instanceof TypeError
}

type CompletionResult =
  | {
      kind: "ok"
      confirmed: Set<string>
      failures: Map<string, string>
    }
  | { kind: "failed"; message: string; status?: number }

async function completeWithRetry(
  eventId: string,
  uploadId: string,
  completeKey: string,
  files: Array<{ id: string; etag?: string }>
): Promise<CompletionResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const session = await completeUploadSession(
        eventId,
        uploadId,
        { files },
        completeKey
      )
      const confirmed = new Set<string>()
      const failures = new Map<string, string>()
      for (const file of session.files) {
        if (!file.clientId) continue
        if (
          file.status === "published" ||
          file.status === "processing" ||
          file.status === "uploaded" ||
          file.status === "attached"
        ) {
          confirmed.add(file.clientId)
        } else if (file.status === "failed") {
          failures.set(
            file.clientId,
            file.error?.message ?? "The server rejected this photo."
          )
        }
      }
      if (confirmed.size === 0) {
        // The server accepted the request but reported nothing confirmed; trust the PUTs.
        const byId = new Set(
          files
            .map((file) => byServerFileId(session, file.id))
            .filter((clientId): clientId is string => Boolean(clientId))
        )
        return { kind: "ok", confirmed: byId, failures }
      }
      return { kind: "ok", confirmed, failures }
    } catch (error) {
      if (error instanceof ApiError) {
        if (
          error.code === "upload_already_completed" ||
          error.code === "no_uploaded_files"
        ) {
          return reconcile(eventId, uploadId, error.code)
        }
        if (error.code === "upload_expired") {
          return {
            kind: "failed",
            message: "This upload batch expired. Retry the affected photos.",
            status: error.status,
          }
        }
        if (!isRetryableStatus(error.status)) {
          return {
            kind: "failed",
            message: errorMessage(error),
            status: error.status,
          }
        }
      }
      if (attempt < 2) {
        await sleep(attempt === 0 ? 750 : 2_000)
        continue
      }
      return {
        kind: "failed",
        message:
          "The uploads finished, but the batch could not be finalized. Retry to finish.",
      }
    }
  }
  return { kind: "failed", message: "The batch could not be finalized." }
}

async function reconcile(
  eventId: string,
  uploadId: string,
  code: string
): Promise<CompletionResult> {
  try {
    const session = await getUploadSession(eventId, uploadId)
    const confirmed = new Set<string>()
    const failures = new Map<string, string>()
    for (const file of session.files) {
      if (!file.clientId) continue
      if (
        file.status === "published" ||
        file.status === "processing" ||
        file.status === "uploaded" ||
        file.status === "attached"
      ) {
        confirmed.add(file.clientId)
      } else if (file.status === "failed") {
        failures.set(
          file.clientId,
          file.error?.message ?? "The server rejected this photo."
        )
      }
    }
    if (confirmed.size > 0) return { kind: "ok", confirmed, failures }
    return {
      kind: "failed",
      message:
        code === "no_uploaded_files"
          ? "The server did not receive any of this batch's photos."
          : "The batch was already finalized without these photos.",
    }
  } catch {
    return {
      kind: "failed",
      message: "The batch state could not be checked. Retry to finish.",
    }
  }
}

function byServerFileId(
  session: { files: ServerUploadFile[] },
  fileId: string
): string | null {
  return session.files.find((file) => file.id === fileId)?.clientId ?? null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
