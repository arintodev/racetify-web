import { createApiClient, type ApiClient } from "./core"

export type ServerClientOptions = {
  /** Internal API origin, e.g. http://localhost:8080. Never send this to the browser. */
  baseUrl: string
  /** The incoming request Cookie header, forwarded to the API. */
  cookie?: string
  /** The app origin, used for the API's origin check on mutations. */
  origin?: string
  /** The incoming client IP chain, forwarded so API rate limits stay per-client. */
  forwardedFor?: string
  /** CSRF token when a server-side mutation is performed. */
  csrfToken?: string
}

/**
 * Server-only client. Keeps the wire protocol in one place and never imports `next/headers`.
 * Server Components should use this with a forwarded cookie and `cache: "no-store"` semantics
 * (the caller decides the fetch cache policy).
 */
export function createServerApiClient(options: ServerClientOptions): ApiClient {
  const headers: Record<string, string> = {}
  if (options.cookie) headers.cookie = options.cookie
  if (options.origin) headers.origin = options.origin
  if (options.forwardedFor) headers["x-forwarded-for"] = options.forwardedFor

  return createApiClient({
    baseUrl: options.baseUrl,
    credentials: "omit",
    headers,
    csrfToken: () => options.csrfToken,
  })
}
