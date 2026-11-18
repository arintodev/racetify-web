import type { Schemas } from "@workspace/api-client"

import { getBrowserApi } from "@/lib/api/browser"

import type { ServerUploadFile, ServerUploadSession } from "./types"

const base = (eventId: string) => `/v1/events/${eventId}/gallery/uploads`

export function createUploadSession(
  eventId: string,
  body: Schemas["CreateUploadRequest"],
  idempotencyKey: string
): Promise<ServerUploadSession> {
  return getBrowserApi().request<ServerUploadSession>(base(eventId), {
    method: "POST",
    body,
    idempotencyKey,
  })
}

export function completeUploadSession(
  eventId: string,
  uploadId: string,
  body: Schemas["CompleteUploadRequest"],
  idempotencyKey: string
): Promise<ServerUploadSession> {
  return getBrowserApi().request<ServerUploadSession>(
    `${base(eventId)}/${uploadId}/complete`,
    { method: "POST", body, idempotencyKey }
  )
}

export function presignUploadFile(
  eventId: string,
  uploadId: string,
  fileId: string
): Promise<ServerUploadFile> {
  return getBrowserApi().request<ServerUploadFile>(
    `${base(eventId)}/${uploadId}/files/${fileId}/presign`,
    { method: "POST" }
  )
}

export function removeUploadFile(
  eventId: string,
  uploadId: string,
  fileId: string
): Promise<void> {
  return getBrowserApi().request<void>(
    `${base(eventId)}/${uploadId}/files/${fileId}`,
    { method: "DELETE" }
  )
}

export function abortUploadSession(
  eventId: string,
  uploadId: string
): Promise<ServerUploadSession> {
  return getBrowserApi().request<ServerUploadSession>(
    `${base(eventId)}/${uploadId}/abort`,
    { method: "POST" }
  )
}

/** Used only to reconcile a conflict after a failed `complete`; not polled. */
export function getUploadSession(
  eventId: string,
  uploadId: string
): Promise<ServerUploadSession> {
  return getBrowserApi().request<ServerUploadSession>(
    `${base(eventId)}/${uploadId}`
  )
}
