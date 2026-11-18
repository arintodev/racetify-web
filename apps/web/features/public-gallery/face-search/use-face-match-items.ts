"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQueries } from "@tanstack/react-query"
import * as React from "react"

import { getBrowserApi } from "@/lib/api/browser"

/**
 * The face-search response carries item IDs only, so each match is resolved through the public
 * item-detail endpoint. Results are capped by the backend (50) and cached with the gallery item key.
 */
export function useFaceMatchItems(eventSlug: string, itemIds: string[] | null) {
  const uniqueIds = React.useMemo(() => [...new Set(itemIds ?? [])], [itemIds])

  const queries = useQueries({
    queries: uniqueIds.map((itemId) => ({
      queryKey: queryKeys.publicGalleryItem(eventSlug, itemId),
      queryFn: () =>
        getBrowserApi().request<Schemas["PublicGalleryItemDto"]>(
          `/v1/public/events/${eventSlug}/gallery/items/${itemId}`
        ),
      staleTime: 60_000,
      retry: 1,
    })),
  })

  const photos = React.useMemo(() => {
    const byId = new Map<string, Schemas["PublicGalleryItemDto"]>()
    for (const query of queries) {
      if (query.data) byId.set(query.data.id, query.data)
    }
    return uniqueIds
      .map((itemId) => byId.get(itemId))
      .filter((photo): photo is Schemas["PublicGalleryItemDto"] =>
        Boolean(photo)
      )
  }, [queries, uniqueIds])

  const failedQueries = queries.filter((query) => query.isError)

  const retryFailed = React.useCallback(async () => {
    await Promise.all(failedQueries.map((query) => query.refetch()))
  }, [failedQueries])

  return {
    photos,
    pending: queries.some((query) => query.isPending),
    failedCount: failedQueries.length,
    retryFailed,
  }
}
