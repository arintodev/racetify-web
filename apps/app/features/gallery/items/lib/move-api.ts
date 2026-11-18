import type { Schemas } from "@workspace/api-client"

import { getBrowserApi } from "@/lib/api/browser"

import type { MoveDestination } from "./types"

/** Mirrors the backend's bulk cap. */
export const MAX_MOVE_ITEMS = 1000

export function toBulkUpdateRequest(
  itemIds: string[],
  destination: MoveDestination
): Schemas["BulkUpdateItemsRequest"] {
  return destination.kind === "none"
    ? { itemIds, clearCollection: true }
    : { itemIds, collectionId: destination.collectionId }
}

/**
 * Moves every item in one request. The server updates existing items in a transaction and returns
 * the ids that were already gone, so the UI never needs a per-item fan-out.
 */
export function bulkUpdateGalleryItems(
  eventId: string,
  itemIds: string[],
  destination: MoveDestination
): Promise<Schemas["BulkUpdateItemsResponse"]> {
  return getBrowserApi().request<Schemas["BulkUpdateItemsResponse"]>(
    `/v1/events/${eventId}/gallery/items`,
    {
      method: "PATCH",
      body: toBulkUpdateRequest(itemIds, destination),
    }
  )
}
