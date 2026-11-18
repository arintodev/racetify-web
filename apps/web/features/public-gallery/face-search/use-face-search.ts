"use client"

import { ApiError, queryKeys, type Schemas } from "@workspace/api-client"
import { useMutation, useQuery } from "@tanstack/react-query"
import * as React from "react"

import {
  createFaceSearch,
  faceSearchErrorMessage,
  faceSearchFailureMessage,
  getFaceSearch,
} from "./face-search-api"

type StartInput = {
  file: File
  consent: boolean
}

export function useFaceSearch(eventSlug: string) {
  const [searchId, setSearchId] = React.useState<string | null>(null)

  const mutation = useMutation<Schemas["FaceSearchDto"], Error, StartInput>({
    mutationFn: ({ file, consent }) =>
      createFaceSearch(eventSlug, file, consent),
    onSuccess: (data) => setSearchId(data.id),
  })

  const status = useQuery({
    queryKey: queryKeys.publicFaceSearch(eventSlug, searchId ?? ""),
    queryFn: () => getFaceSearch(eventSlug, searchId as string),
    enabled: Boolean(searchId),
    refetchInterval: (query) => {
      if (query.state.error) return false
      const state = query.state.data?.status
      return state === "pending" || state === "processing" ? 2500 : false
    },
    retry: (count, error) => {
      if (error instanceof ApiError) {
        if (error.status === 404 || error.status === 410) return false
        if (error.status < 500) return false
      }
      return count < 2
    },
  })

  const search = searchId ? (status.data ?? null) : null

  const terminalError =
    search?.status === "failed"
      ? faceSearchFailureMessage(
          search.error?.code,
          search.error?.message ?? "Face search failed. Try again."
        )
      : null

  const requestError = mutation.error
    ? faceSearchErrorMessage(mutation.error)
    : status.error
      ? faceSearchErrorMessage(status.error)
      : null

  const isSearching =
    mutation.isPending ||
    (Boolean(searchId) &&
      (status.isPending ||
        search?.status === "pending" ||
        search?.status === "processing"))

  const resultIds = search?.status === "completed" ? search.itemIds : null

  const start = React.useCallback(
    (file: File, consent: boolean) => {
      setSearchId(null)
      mutation.mutate({ file, consent })
    },
    [mutation]
  )

  const reset = React.useCallback(() => {
    setSearchId(null)
    mutation.reset()
  }, [mutation])

  return {
    searchId,
    search,
    start,
    reset,
    isSubmitting: mutation.isPending,
    isSearching,
    error: requestError ?? terminalError,
    resultIds,
    noResults: search?.status === "completed" && search.itemIds.length === 0,
  }
}
