"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as React from "react"

import { invalidateGalleryItemQueries } from "../lib/invalidate-gallery"
import { bulkUpdateGalleryItems } from "../lib/move-api"
import type { BulkMoveResult, MoveDestination, MoveItemRef } from "../lib/types"

type MoveVariables = {
  items: MoveItemRef[]
  destination: MoveDestination
}

/**
 * One bulk request per move. The server reports ids that disappeared between selection and submit,
 * so there is no per-item retry loop here.
 */
export function useMoveGalleryItems(eventId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation<BulkMoveResult, Error, MoveVariables>({
    mutationFn: async ({ items, destination }) => {
      const response = await bulkUpdateGalleryItems(
        eventId,
        items.map((item) => item.id),
        destination
      )
      return {
        destination,
        updatedIds: response.updatedItemIds,
        missingIds: response.missingItemIds,
      }
    },
    onSuccess: () => {
      invalidateGalleryItemQueries(queryClient, eventId)
    },
  })

  const move = React.useCallback(
    (items: MoveItemRef[], destination: MoveDestination) =>
      mutation.mutateAsync({ items, destination }),
    [mutation]
  )

  return {
    move,
    isMoving: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}
