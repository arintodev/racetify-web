import type { components } from "./generated/schema"

export type Schemas = components["schemas"]

export type ValidationIssue = {
  pointer: string
  code: string
  message: string
}

export type ProblemBody = {
  type?: string
  title?: string
  status?: number
  code?: string
  detail?: string
  instance?: string
  requestId?: string
  requiredPermission?: string
  errors?: ValidationIssue[]
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly title?: string
  readonly detail?: string
  readonly requestId?: string
  readonly requiredPermission?: string
  readonly issues: ValidationIssue[]

  constructor(status: number, problem: ProblemBody) {
    const code = problem.code ?? `http_${status}`
    super(
      problem.detail ?? problem.title ?? `Request failed with status ${status}`
    )
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.title = problem.title
    this.detail = problem.detail
    this.requestId = problem.requestId
    this.requiredPermission = problem.requiredPermission
    this.issues = problem.errors ?? []
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }

  get isNotFound() {
    return this.status === 404
  }

  get isValidationFailed() {
    return this.status === 422
  }
}

export type PaginationMeta = {
  limit: number
  nextCursor?: string | null
  hasMore: boolean
  total?: number
}

export type EnvelopeMeta = {
  requestId: string
  pagination?: PaginationMeta
}

export type Envelope<T> = {
  data: T
  meta: EnvelopeMeta
}

export type QueryValue =
  string | number | boolean | null | undefined | readonly (string | number)[]

export type QueryParams = Record<string, QueryValue>

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

export type CsrfTokenSource = () =>
  string | undefined | Promise<string | undefined>

export type ApiClientOptions = {
  baseUrl: string
  fetch?: FetchLike
  credentials?: RequestCredentials
  headers?: Record<string, string>
  csrfToken?: CsrfTokenSource
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  query?: QueryParams
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
  idempotencyKey?: string
  /** Set false for endpoints that are CSRF-exempt (login, register, etc.). */
  csrf?: boolean
}

function buildUrl(baseUrl: string, path: string, query?: QueryParams) {
  const base = baseUrl.replace(/\/$/, "")
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`
  if (!query) return url

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item))
    } else {
      params.append(key, String(value))
    }
  }
  const search = params.toString()
  return search ? `${url}?${search}` : url
}

function isRawBody(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    (typeof FormData !== "undefined" && value instanceof FormData) ||
    (typeof Blob !== "undefined" && value instanceof Blob) ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  )
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const text = await response.text()
  if (!text) return undefined
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("json")) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  return text
}

export function createApiClient(options: ApiClientOptions) {
  const fetchImpl = options.fetch ?? fetch
  const credentials = options.credentials ?? "include"

  async function send(
    path: string,
    requestOptions: RequestOptions = {}
  ): Promise<unknown> {
    const method = requestOptions.method ?? "GET"
    const headers = new Headers(options.headers)
    if (requestOptions.headers) {
      new Headers(requestOptions.headers).forEach((value, key) =>
        headers.set(key, value)
      )
    }

    let body: BodyInit | undefined
    if (requestOptions.body !== undefined) {
      if (isRawBody(requestOptions.body)) {
        body = requestOptions.body as BodyInit
      } else {
        headers.set("content-type", "application/json")
        body = JSON.stringify(requestOptions.body)
      }
    }

    if (requestOptions.idempotencyKey) {
      headers.set("Idempotency-Key", requestOptions.idempotencyKey)
    }

    const needsCsrf = requestOptions.csrf !== false && method !== "GET"
    if (needsCsrf && options.csrfToken) {
      const token = await options.csrfToken()
      if (token) headers.set("X-CSRF-Token", token)
    }

    const response = await fetchImpl(
      buildUrl(options.baseUrl, path, requestOptions.query),
      {
        method,
        headers,
        body,
        credentials,
        signal: requestOptions.signal,
      }
    )

    const payload = await parseBody(response)
    if (!response.ok) {
      const problem =
        payload && typeof payload === "object" ? (payload as ProblemBody) : {}
      throw new ApiError(response.status, problem)
    }

    return payload
  }

  async function request<T>(
    path: string,
    requestOptions: RequestOptions = {}
  ): Promise<T> {
    const payload = await send(path, requestOptions)
    if (payload && typeof payload === "object" && "data" in payload) {
      return (payload as Envelope<T>).data
    }
    return payload as T
  }

  async function requestEnvelope<T>(
    path: string,
    requestOptions: RequestOptions = {}
  ): Promise<Envelope<T>> {
    const payload = await send(path, requestOptions)
    if (
      payload &&
      typeof payload === "object" &&
      "data" in payload &&
      "meta" in payload
    ) {
      return payload as Envelope<T>
    }
    return {
      data: payload as T,
      meta: { requestId: "" },
    }
  }

  return { request, requestEnvelope }
}

export type ApiClient = ReturnType<typeof createApiClient>
