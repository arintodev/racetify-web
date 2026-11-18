"use client"

import { createBrowserApiClient, type ApiClient } from "@workspace/api-client"

let client: ApiClient | null = null

/** Same-origin client for client components; calls `/api/v1/*` through the Next rewrite. */
export function getBrowserApi(): ApiClient {
  client ??= createBrowserApiClient()
  return client
}
