export type MoveDestination =
  | { kind: "collection"; collectionId: string; collectionName: string }
  | { kind: "none" }

/** The small snapshot the move dialog needs; full summary DTOs stay in the page. */
export type MoveItemRef = {
  id: string
  name: string
  currentCollectionId: string | null
  status: string
}

export type BulkMoveResult = {
  destination: MoveDestination
  updatedIds: string[]
  missingIds: string[]
}
