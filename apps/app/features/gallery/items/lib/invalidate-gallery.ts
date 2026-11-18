import { queryKeys } from "@workspace/api-client"
import type { QueryClient } from "@tanstack/react-query"

/** Everything a move or delete can affect: lists, counts, item detail, and the overview. */
export function invalidateGalleryItemQueries(
  queryClient: QueryClient,
  eventId: string
): void {
  void queryClient.invalidateQueries({
    queryKey: ["event", eventId, "gallery", "items"],
  })
  void queryClient.invalidateQueries({
    queryKey: queryKeys.galleryCollections(eventId),
  })
  void queryClient.invalidateQueries({
    queryKey: ["event", eventId, "gallery", "item"],
  })
  void queryClient.invalidateQueries({
    queryKey: queryKeys.eventOverview(eventId),
  })
}
