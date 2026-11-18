import type { MetadataRoute } from "next"

import { createServerApiClient, type Schemas } from "@workspace/api-client"

const baseUrl = "https://racetify.com"
const internalUrl =
  process.env.RACETIFY_API_INTERNAL_URL?.replace(/\/$/, "") ??
  "http://localhost:8080"

export const revalidate = 3600

/** Public event pages, capped so an unreachable or huge API cannot break the sitemap. */
async function eventEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const api = createServerApiClient({ baseUrl: internalUrl })
    const entries: MetadataRoute.Sitemap = []
    let cursor: string | undefined

    for (let page = 0; page < 20; page += 1) {
      const result = await api.requestEnvelope<
        Schemas["PublicEventSummaryDto"][]
      >("/v1/public/events", {
        query: { limit: 100, cursor },
      })

      for (const event of result.data) {
        entries.push({
          url: `${baseUrl}/e/${event.slug}`,
          lastModified: new Date(`${event.endDate}T00:00:00Z`),
          changeFrequency: "weekly",
          priority: 0.8,
        })
      }

      cursor = result.meta.pagination?.nextCursor ?? undefined
      if (!cursor || !result.meta.pagination?.hasMore) break
    }

    return entries
  } catch {
    // The API may be unavailable during a build; keep the static routes.
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()
  const events = await eventEntries()

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/refund-policy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...events,
  ]
}
