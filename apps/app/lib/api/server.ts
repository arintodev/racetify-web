import { createServerApiClient, type ApiClient } from "@workspace/api-client"
import { cookies, headers } from "next/headers"

const internalUrl =
  process.env.RACETIFY_API_INTERNAL_URL?.replace(/\/$/, "") ??
  "http://localhost:8080"

/**
 * Server-side API client for layouts, pages, and server actions. Forwards the incoming session
 * cookie and the app origin (needed by the API's CSRF origin check on mutations).
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
