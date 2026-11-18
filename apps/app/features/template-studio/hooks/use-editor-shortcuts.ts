"use client"

import * as React from "react"

import { NUDGE_SHIFT_STEP_MM, NUDGE_STEP_MM } from "../lib/constants"
import { useEditorStoreApi } from "../store/editor-store-context"

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [role='textbox']"
    )
  )
}

export function useEditorShortcuts(): void {
  const store = useEditorStoreApi()

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (isEditableTarget(event.target)) return

      const state = store.getState()
      if (state.preview) return

      const modifier = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (modifier && key === "z") {
        event.preventDefault()
        if (event.shiftKey) state.redo()
        else state.undo()
        return
      }

      if (modifier && key === "y") {
        event.preventDefault()
        state.redo()
        return
      }

      if (modifier && key === "d") {
        event.preventDefault()
        if (state.selectedIds.length > 0) {
          state.duplicateObjects(state.selectedIds)
        }
        return
      }

      if (key === "delete" || key === "backspace") {
        if (state.selectedIds.length === 0) return
        event.preventDefault()
        state.removeObjects(state.selectedIds)
        return
      }

      if (key === "escape") {
        state.setSelection([])
        return
      }

      if (key.startsWith("arrow")) {
        if (state.selectedIds.length === 0) return
        event.preventDefault()
        const step = event.shiftKey ? NUDGE_SHIFT_STEP_MM : NUDGE_STEP_MM
        const dx =
          key === "arrowleft" ? -step : key === "arrowright" ? step : 0
        const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0
        state.nudgeSelection(dx, dy)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [store])
}
