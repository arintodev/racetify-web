import { createServerApiClient, type ApiClient } from "@workspace/api-client"
import { cookies, headers } from "next/headers"

const internalUrl =
  process.env.RACETIFY_API_INTERNAL_URL?.replace(/\/$/, "") ??
  "http://localhost:8080"

/** Internal API origin for route handlers that need a non-JSON response (e.g. downloads). */
export function serverApiBaseUrl(): string {
  return internalUrl
}

/**
 * Server-side API client. Public pages may omit cookies; the receipt page relies on the forwarded
 * order-access cookie. The caller decides the fetch cache policy.
 */
export async function getServerApi(): Promise<ApiClient> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])

  const cookie = cookieStore
    .getAll()
    .map((value) => `${value.name}=${value.value}`)
    .join("; ")

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? headerStore.get("origin") ?? undefined

  return createServerApiClient({
    baseUrl: internalUrl,
    cookie: cookie || undefined,
    origin,
    forwardedFor: headerStore.get("x-forwarded-for") ?? undefined,
  })
}
