"use client"

import { createBrowserApiClient, type ApiClient } from "@workspace/api-client"

let client: ApiClient | null = null

/** Same-origin client for interactive public widgets (gallery, registration). */
export function getBrowserApi(): ApiClient {
  client ??= createBrowserApiClient()
  return client
}
