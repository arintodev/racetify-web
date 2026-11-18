import type { Schemas } from "@workspace/api-client"

export type ServerUploadFile = Schemas["UploadFileDto"]
export type ServerUploadSession = Schemas["UploadSessionDto"]

export type UploadItemStatus =
  | "queued"
  | "preparing"
  | "ready"
  | "uploading"
  | "uploaded"
  | "completed"
  | "failed"
  | "canceled"

export type UploadFailureStage =
  "validate" | "prepare" | "create" | "upload" | "complete"

export type UploadItemError = {
  stage: UploadFailureStage
  message: string
  retryable: boolean
  httpStatus?: number
}

export type UploadItem = {
  clientId: string
  /** Insertion order; batches and display order follow it. */
  seq: number
  /** Original file, kept for retries and re-preparation until cleared. */
  file: File | null
  /** Folder path when the file came from a folder selection/drop; UI label only. */
  relativePath: string | null
  displayName: string
  /** Name/mime/size declared to the API after preparation. */
  declaredName: string
  declaredMime: string
  originalSize: number
  declaredSize: number
  /** Prepared bytes; freed once the batch is confirmed. */
  body: Blob | File | null
  width: number | null
  height: number | null
  resized: boolean
  converted: boolean
  exifPreserved: boolean | null
  warning: string | null
  status: UploadItemStatus
  progress: number
  batchId: string | null
  serverFileId: string | null
  uploadUrl: string | null
  uploadHeaders: Record<string, string> | null
  presignExpiresAt: number | null
  etag: string | null
  attempts: number
  error: UploadItemError | null
}

export type PreparedImage = {
  body: Blob | File
  declaredName: string
  declaredMime: string
  declaredSize: number
  width: number
  height: number
  resized: boolean
  converted: boolean
  exifPreserved: boolean | null
  warning: string | null
}

export type UploadBatchStatus =
  | "creating"
  | "uploading"
  | "completing"
  | "completed"
  | "partial"
  | "failed"
  | "canceled"

export type UploadBatch = {
  id: string
  seq: number
  collectionId: string | null
  itemIds: string[]
  status: UploadBatchStatus
  sessionId: string | null
  /** Stable Idempotency-Key for create/complete retries. */
  createKey: string
  completeKey: string
  error: string | null
  startedAt: number
  finishedAt: number | null
}

export type RunnerState = "idle" | "running" | "stopping" | "paused-error"

export type RejectedFile = {
  name: string
  reason: string
}

export type UploadState = {
  eventId: string
  destinationId: string | null
  itemIds: string[]
  itemsById: Record<string, UploadItem>
  batchOrder: string[]
  batchesById: Record<string, UploadBatch>
  runner: RunnerState
  activeBatchId: string | null
  /** First 50 rejected files, shown in the skipped-files dialog. */
  rejected: RejectedFile[]
  /** True number of rejected files; the details list above is capped. */
  rejectedTotal: number
  nextSeq: number
  /** True once a batch has completed since the queue was last cleared. */
  hasUploaded: boolean
}

export type BatchItemOutcome = {
  clientId: string
  status: Extract<UploadItemStatus, "completed" | "failed" | "ready">
  error?: UploadItemError | null
  serverFileId?: string | null
  etag?: string | null
}
