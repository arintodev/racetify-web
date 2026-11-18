"use client"

import * as React from "react"
import { toast } from "sonner"

import { useEngineRef } from "../engine/engine-context"
import {
  AUTOSAVE_DELAY_MS,
  THUMBNAIL_MIN_INTERVAL_MS,
} from "../lib/constants"
import { getTemplateRepository } from "../repository"
import { useEditorStoreApi } from "../store/editor-store-context"

/**
 * Saves the draft shortly after every committed change. The engine thumbnail is throttled; the
 * repository keeps the previous thumbnail when none is supplied.
 */
export function useAutosave({ eventId }: { eventId: string }) {
  const store = useEditorStoreApi()
  const engineRef = useEngineRef()
  const { repository, kind } = getTemplateRepository()
  const lastThumbnailRef = React.useRef(0)
  const savingRef = React.useRef(false)
  const reportedErrorRef = React.useRef(false)

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    async function saveNow(): Promise<void> {
      if (savingRef.current) return
      const state = store.getState()
      if (state.revision === state.savedRevision) return

      savingRef.current = true
      const revision = state.revision
      store.getState().markSaving()

      try {
        const now = Date.now()
        let thumbnail: string | null | undefined
        if (now - lastThumbnailRef.current > THUMBNAIL_MIN_INTERVAL_MS) {
          lastThumbnailRef.current = now
          thumbnail = engineRef.current?.captureThumbnail() ?? null
        }
        await repository.save(eventId, state.document, thumbnail)
        store.getState().markSaved(revision)
        reportedErrorRef.current = false
      } catch {
        store.getState().markSaveError()
        if (!reportedErrorRef.current) {
          reportedErrorRef.current = true
          toast.error("Could not save the draft", {
            description:
              "Browser storage may be full or unavailable. Export the template to keep your work.",
          })
        }
      } finally {
        savingRef.current = false
      }
    }

    const unsubscribe = store.subscribe((state, previous) => {
      if (state.revision === previous.revision) return
      if (state.revision === state.savedRevision) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void saveNow(), AUTOSAVE_DELAY_MS)
    })

    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
      void saveNow()
    }
  }, [engineRef, eventId, repository, store])

  React.useEffect(() => {
    if (kind !== "indexeddb") return
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return
    void navigator.storage.persist().catch(() => undefined)
  }, [kind])

  return { persistent: kind === "indexeddb" }
}
