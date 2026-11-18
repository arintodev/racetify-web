import { ApiError } from "@workspace/api-client"

export function moveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "You no longer have permission to move photos."
    }
    if (error.status === 404) {
      return "The event or collection no longer exists."
    }
    return (
      error.detail ??
      error.issues[0]?.message ??
      "The photos could not be moved."
    )
  }

  if (error instanceof TypeError) {
    return "Check your connection and try again."
  }

  return "The photos could not be moved. Try again."
}
