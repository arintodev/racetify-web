export type PresignedUpload = {
  uploadUrl: string
  method: string
  headers: Record<string, string>
  expiresAt: string
}

export type UploadOptions = {
  upload: PresignedUpload
  body: Blob | File | ArrayBuffer | Uint8Array
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

export type UploadResult = { etag?: string }

export class UploadHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfter: number | null = null
  ) {
    super(`Upload failed with status ${status}`)
    this.name = "UploadHttpError"
  }
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null
  const seconds = Number(value)
  return Number.isFinite(seconds) ? seconds : null
}

/**
 * PUTs bytes to a presigned URL. Only the headers returned by the API may be sent: the signature
 * covers Content-Type and Cache-Control, so adding Content-Type manually would break the request.
 */
export function uploadToPresignedUrl(
  options: UploadOptions
): Promise<UploadResult> {
  const { upload, body, onProgress, signal } = options
  const method = upload.method || "PUT"

  if (typeof XMLHttpRequest === "undefined") {
    return fetch(upload.uploadUrl, {
      method,
      headers: upload.headers,
      body: body as BodyInit,
      signal,
    }).then((response) => {
      if (!response.ok) {
        throw new UploadHttpError(
          response.status,
          parseRetryAfter(response.headers.get("retry-after"))
        )
      }
      return { etag: parseEtag(response.headers.get("etag")) }
    })
  }

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open(method, upload.uploadUrl, true)

    for (const [key, value] of Object.entries(upload.headers)) {
      request.setRequestHeader(key, value)
    }

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100)
        resolve({ etag: parseEtag(request.getResponseHeader("etag")) })
      } else {
        reject(
          new UploadHttpError(
            request.status,
            parseRetryAfter(request.getResponseHeader("retry-after"))
          )
        )
      }
    })
    request.addEventListener("error", () => reject(new Error("Upload failed")))
    request.addEventListener("abort", () => reject(new Error("Upload aborted")))

    if (signal) {
      if (signal.aborted) {
        request.abort()
        return
      }
      signal.addEventListener("abort", () => request.abort(), { once: true })
    }

    request.send(body as XMLHttpRequestBodyInit)
  })
}

export function parseEtag(headers: string | null): string | undefined {
  if (!headers) return undefined
  const match = /(?:^|,)\s*etag\s*:\s*"?([^",]+)"?/i.exec(headers)
  return match?.[1]?.trim()
}
