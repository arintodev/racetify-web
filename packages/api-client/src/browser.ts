import {
  ApiError,
  createApiClient,
  type ApiClient,
  type RequestOptions,
} from "./core"

export const CSRF_COOKIE_NAME = "__Host-racetify_csrf"

const CSRF_EXEMPT_PATHS = [
  "/v1/auth/login",
  "/v1/auth/register",
  "/v1/auth/email/verify",
  "/v1/auth/email/resend",
  "/v1/auth/password/forgot",
  "/v1/auth/password/reset",
]

function readCookie(name: string) {
  if (typeof document === "undefined") return undefined
  const prefix = `${name}=`
  for (const part of document.cookie.split(";")) {
    const value = part.trim()
    if (value.startsWith(prefix)) {
      return decodeURIComponent(value.slice(prefix.length))
    }
  }
  return undefined
}

function isCsrfExempt(path: string) {
  // Public endpoints are origin-checked but never require a session-bound token.
  if (path.startsWith("/v1/public/")) {
    return true
  }
  if (path.startsWith("/v1/invitations/") && path.endsWith("/decline")) {
    return true
  }
  return CSRF_EXEMPT_PATHS.some((exempt) => path === exempt)
}

function redirectToLogin() {
  if (typeof window === "undefined") return
  const next = `${window.location.pathname}${window.location.search}`
  const loginUrl = `/login?next=${encodeURIComponent(next)}`
  if (window.location.pathname !== "/login") {
    window.location.assign(loginUrl)
  }
}

export type BrowserClientOptions = {
  baseUrl?: string
}

/**
 * Browser client. Uses the same-origin `/api` rewrite by default; the browser never needs CORS.
 * Reads the CSRF cookie and refreshes it once when the API reports `csrf_failed`.
 */
export function createBrowserApiClient(
  options: BrowserClientOptions = {}
): ApiClient {
  const baseUrl = options.baseUrl ?? "/api"
  const client = createApiClient({
    baseUrl,
    credentials: "include",
    csrfToken: () => readCookie(CSRF_COOKIE_NAME),
  })

  async function refreshCsrfToken() {
    await client.request<{ token: string }>("/v1/auth/csrf", { csrf: false })
  }

  async function execute<T>(
    path: string,
    requestOptions: RequestOptions,
    call: (options: RequestOptions) => Promise<T>
  ): Promise<T> {
    const method = requestOptions.method ?? "GET"
    const csrf = !isCsrfExempt(path)

    if (method !== "GET" && csrf && !readCookie(CSRF_COOKIE_NAME)) {
      await refreshCsrfToken()
    }

    try {
      return await call({ ...requestOptions, csrf })
    } catch (error) {
      if (error instanceof ApiError && error.code === "csrf_failed") {
        await refreshCsrfToken()
        return call({ ...requestOptions, csrf })
      }
      if (
        error instanceof ApiError &&
        error.status === 401 &&
        !path.startsWith("/v1/auth/")
      ) {
        redirectToLogin()
      }
      throw error
    }
  }

  function request<T>(path: string, requestOptions: RequestOptions = {}) {
    return execute(path, requestOptions, (options) =>
      client.request<T>(path, options)
    )
  }

  function requestEnvelope<T>(
    path: string,
    requestOptions: RequestOptions = {}
  ) {
    return execute(path, requestOptions, (options) =>
      client.requestEnvelope<T>(path, options)
    )
  }

  return { request, requestEnvelope }
}
