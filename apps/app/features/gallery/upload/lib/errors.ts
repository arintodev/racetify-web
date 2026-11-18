import { ApiError, UploadHttpError } from "@workspace/api-client"

import type { UploadFailureStage, UploadItemError } from "./types"

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  )
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.detail ?? error.title ?? error.message
  }
  if (error instanceof Error) return error.message
  return "Something went wrong."
}

export function itemError(
  stage: UploadFailureStage,
  error: unknown
): UploadItemError {
  if (error instanceof ApiError) {
    return {
      stage,
      message: errorMessage(error),
      retryable: isRetryableStatus(error.status),
      httpStatus: error.status,
    }
  }

  if (error instanceof UploadHttpError) {
    return {
      stage,
      message:
        error.status === 0
          ? "The upload connection failed."
          : `The upload failed with status ${error.status}.`,
      retryable: error.status === 0 || isRetryableStatus(error.status),
      httpStatus: error.status,
    }
  }

  return {
    stage,
    message: errorMessage(error),
    retryable: error instanceof TypeError,
  }
}

export function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500
}
