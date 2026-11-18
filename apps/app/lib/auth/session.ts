import { ApiError, type Schemas } from "@workspace/api-client"
import { cache } from "react"

import { getServerApi } from "@/lib/api/server"

export type SessionDto = Schemas["SessionDto"]

/**
 * Resolves the current session once per request. Missing/expired sessions and a temporarily
 * unavailable API return null so the app renders the signed-out shell instead of crashing.
 */
export const getSession = cache(async (): Promise<SessionDto | null> => {
  try {
    const api = await getServerApi()
    return await api.request<SessionDto>("/v1/auth/session")
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      return null
    }
    console.error("session lookup failed", error)
    return null
  }
})
