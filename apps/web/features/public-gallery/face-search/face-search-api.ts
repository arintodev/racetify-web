import { ApiError, type Schemas } from "@workspace/api-client"

import { getBrowserApi } from "@/lib/api/browser"

export const FACE_SEARCH_MAX_BYTES = 10 * 1024 * 1024
export const FACE_SEARCH_ACCEPT = "image/jpeg,image/png,image/webp"

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".")
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase()
}

/** Browsers sometimes report an empty type or `image/jpg`; mirror the upload fallback. */
export function normalizeImageMime(file: File): string | null {
  const type = file.type.toLowerCase()
  if (type === "image/jpg" || type === "image/pjpeg") return "image/jpeg"
  if (type === "image/jpeg" || type === "image/png" || type === "image/webp") {
    return type
  }
  if (type === "") return MIME_BY_EXTENSION[extensionOf(file.name)] ?? null
  return null
}

export function validateSelfie(file: File): string | null {
  if (file.size === 0) return "This file is empty."
  if (file.size > FACE_SEARCH_MAX_BYTES) {
    return "Choose an image under 10 MB."
  }
  if (!normalizeImageMime(file)) {
    return "Use a JPEG, PNG, or WebP image."
  }
  return null
}

export function createFaceSearch(
  eventSlug: string,
  file: File,
  consent: boolean
): Promise<Schemas["FaceSearchDto"]> {
  const body = new FormData()
  body.set("image", file)
  body.set("consent", String(consent))

  return getBrowserApi().request<Schemas["FaceSearchDto"]>(
    `/v1/public/events/${eventSlug}/gallery/face-searches`,
    { method: "POST", body }
  )
}

export function getFaceSearch(
  eventSlug: string,
  searchId: string
): Promise<Schemas["FaceSearchDto"]> {
  return getBrowserApi().request<Schemas["FaceSearchDto"]>(
    `/v1/public/events/${eventSlug}/gallery/face-searches/${searchId}`
  )
}

/** Maps request/poll HTTP failures to visitor-facing copy. */
export function faceSearchErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "face_search_consent_required":
        return "Tick the consent box to search."
      case "face_search_image_required":
        return "Choose a selfie first."
      case "face_search_image_too_large":
        return "The image is larger than 10 MB."
      case "unsupported_media_type":
        return "Use a JPEG, PNG, or WebP image."
      case "rate_limited":
        return "Too many searches. Try again in a few minutes."
      case "face_search_unavailable":
        return "Face search is temporarily unavailable for this event."
      case "face_search_expired":
        return "This search expired after 15 minutes. Start a new search."
      case "face_search_not_found":
        return "This search is no longer available. Start a new search."
      case "event_not_found":
        return "This gallery is no longer available."
      default:
        return (
          error.detail ??
          error.issues[0]?.message ??
          "Face search could not be completed. Try again."
        )
    }
  }

  if (error instanceof TypeError) {
    return "Check your connection and try again."
  }

  return "Face search could not be completed. Try again."
}

/** Maps a terminal `FaceSearchDto.error` from a completed async job. */
export function faceSearchFailureMessage(
  code: string | undefined,
  fallback: string
): string {
  switch (code) {
    case "face_search_no_face":
      return "We couldn't find a face. Use a clear, front-facing selfie."
    case "face_search_multiple_faces":
      return "Use a photo with exactly one face."
    case "face_search_invalid_image":
    case "face_search_invalid_embedding":
      return "That image couldn't be processed. Try another photo."
    case "face_search_unavailable":
      return "Face search is temporarily unavailable for this event."
    default:
      return fallback
  }
}
