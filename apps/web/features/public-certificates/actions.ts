"use server"

import type { Schemas } from "@workspace/api-client"

import { getServerApi } from "@/lib/api/server"

export async function searchCertificates(
  eventSlug: string,
  query: string
): Promise<Schemas["PublicCertificateSearchDto"]> {
  const api = await getServerApi()
  return api.request<Schemas["PublicCertificateSearchDto"]>(
    `/v1/public/events/${eventSlug}/certificates/search`,
    { query: { q: query } }
  )
}
