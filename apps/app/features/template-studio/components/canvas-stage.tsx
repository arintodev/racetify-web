"use client"

import { Maximize2, Minus, Plus } from "lucide-react"
import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { EditorEngine } from "../engine/fabric-engine"
import { useEngineRef } from "../engine/engine-context"
import {
  FIT_PADDING_PX,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
} from "../lib/constants"
import { previewOverrides } from "../model/preview"
import { clamp, mmToCssPx } from "../model/units"
import { useEditorStore, useEditorStoreApi } from "../store/editor-store-context"
import { sceneOf, type SceneSnapshot } from "../store/history-manager"

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [role='textbox']"
    )
  )
}

export function CanvasStage() {
  const store = useEditorStoreApi()
  const engineRef = useEngineRef()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const lastSceneRef = React.useRef<SceneSnapshot | null>(null)
  const wasPreviewingRef = React.useRef(false)
  const panRef = React.useRef<{
    pointerId: number
    x: number
    y: number
    scrollLeft: number
    scrollTop: number
  } | null>(null)
  const spaceRef = React.useRef(false)

  const document = useEditorStore((state) => state.document)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const preview = useEditorStore((state) => state.preview)
  const zoom = useEditorStore((state) => state.zoom)
  const setZoom = useEditorStore((state) => state.setZoom)
  const [ready, setReady] = React.useState(false)
  const [loadError, setLoadError] = React.useState(false)

  const artboardWidth = mmToCssPx(document.canvas.widthMm)
  const artboardHeight = mmToCssPx(document.canvas.heightMm)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let engine: EditorEngine | null = null

    void EditorEngine.create(container, store.getState().document, {
      onIntent: (intent) => {
        const state = store.getState()
        switch (intent.type) {
          case "selectionChanged":
            state.setSelection(intent.ids)
            break
          case "objectsCommitted":
            state.applyEngineUpdates(intent.updates)
            break
          case "textChanged":
            state.setObjectText(intent.id, intent.text)
            break
          case "editingChanged":
            if (intent.id) {
              state.beginTextEditing(intent.id)
            } else {
              state.endTextEditing()
            }
            break
        }
      },
    }).then((created) => {
      if (cancelled) {
        created.dispose()
        return
      }
      engine = created
      engineRef.current = created
      created.setSelection(store.getState().selectedIds, { silent: true })
      setReady(true)
    }).catch(() => {
      if (!cancelled) setLoadError(true)
    })

    return () => {
      cancelled = true
      engine?.dispose()
      if (engineRef.current === engine) engineRef.current = null
    }
  }, [engineRef, store])

  React.useEffect(() => {
    const engine = engineRef.current
    if (!engine || !ready) return

    const next = sceneOf(document)
    const previous = lastSceneRef.current
    lastSceneRef.current = next

    if (
      previous &&
      previous.canvas === next.canvas &&
      previous.objects === next.objects
    ) {
      return
    }

    void engine.applyScene(previous ?? next, next, document).then(() => {
      // Newly created objects only exist after the async apply; restore the store selection then.
      if (engine.isEditingText() || store.getState().preview) return
      const selected = store.getState().selectedIds
      const active = engine.getSelectedIds()
      const activeSet = new Set(active)
      const sameSelection =
        active.length === selected.length &&
        selected.every((id) => activeSet.has(id))
      if (!sameSelection) {
        engine.setSelection(selected, { silent: true })
      }
    })
  }, [document, engineRef, ready, store])

  React.useEffect(() => {
    const engine = engineRef.current
    if (!engine || !ready) return
    engine.setSelection(selectedIds, { silent: true })
  }, [selectedIds, engineRef, ready])

  const overrides = React.useMemo(
    () => (preview ? previewOverrides(document) : null),
    [document, preview]
  )

  React.useEffect(() => {
    const engine = engineRef.current
    if (!engine || !ready) return
    if (!preview && !wasPreviewingRef.current) return
    wasPreviewingRef.current = preview
    engine.setPreview(preview ? overrides : null, document)
    if (!preview) {
      // Re-apply anything edited while preview was active.
      const scene = sceneOf(document)
      void engine.applyScene(scene, scene, document)
    }
  }, [document, engineRef, overrides, preview, ready])

  const fitToScreen = React.useCallback(() => {
    const scroll = scrollRef.current
    if (!scroll) return
    const availableWidth = scroll.clientWidth - FIT_PADDING_PX * 2
    const availableHeight = scroll.clientHeight - FIT_PADDING_PX * 2
    if (availableWidth <= 0 || availableHeight <= 0) return
    const next = Math.min(
      availableWidth / artboardWidth,
      availableHeight / artboardHeight,
      1
    )
    setZoom(clamp(next, ZOOM_MIN, ZOOM_MAX))
  }, [artboardHeight, artboardWidth, setZoom])

  React.useEffect(() => {
    if (!ready) return
    fitToScreen()
  }, [fitToScreen, ready])

  React.useEffect(() => {
    const scroll = scrollRef.current
    if (!scroll) return

    const onWheel = (event: WheelEvent): void => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const current = store.getState().zoom
      const next = clamp(
        current * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP),
        ZOOM_MIN,
        ZOOM_MAX
      )
      store.getState().setZoom(next)
    }

    scroll.addEventListener("wheel", onWheel, { passive: false })
    return () => scroll.removeEventListener("wheel", onWheel)
  }, [store])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.code !== "Space" || isEditableTarget(event.target)) return
      spaceRef.current = true
      if (scrollRef.current) scrollRef.current.style.cursor = "grab"
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.code !== "Space") return
      spaceRef.current = false
      if (!panRef.current && scrollRef.current) {
        scrollRef.current.style.cursor = ""
      }
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  function startPan(event: React.PointerEvent<HTMLDivElement>): void {
    if (!spaceRef.current && event.button !== 1) return
    const scroll = scrollRef.current
    if (!scroll) return
    event.preventDefault()
    event.stopPropagation()
    panRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: scroll.scrollLeft,
      scrollTop: scroll.scrollTop,
    }
    scroll.setPointerCapture(event.pointerId)
    scroll.style.cursor = "grabbing"
  }

  function movePan(event: React.PointerEvent<HTMLDivElement>): void {
    const pan = panRef.current
    const scroll = scrollRef.current
    if (!pan || !scroll || pan.pointerId !== event.pointerId) return
    scroll.scrollLeft = pan.scrollLeft - (event.clientX - pan.x)
    scroll.scrollTop = pan.scrollTop - (event.clientY - pan.y)
  }

  function endPan(event: React.PointerEvent<HTMLDivElement>): void {
    const scroll = scrollRef.current
    if (!panRef.current || !scroll) return
    if (scroll.hasPointerCapture(event.pointerId)) {
      scroll.releasePointerCapture(event.pointerId)
    }
    panRef.current = null
    scroll.style.cursor = spaceRef.current ? "grab" : ""
  }

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        The canvas could not start. Reload the page to try again.
      </div>
    )
  }

  return (
    <div className="relative flex min-w-0 flex-1 flex-col bg-muted/40">
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-auto"
        onPointerDownCapture={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <div className="flex min-h-full min-w-full items-center justify-center p-12">
          <div
            style={{
              width: artboardWidth * zoom,
              height: artboardHeight * zoom,
            }}
          >
            <div
              ref={containerRef}
              className="relative bg-white shadow-lg ring-1 ring-border"
              style={{
                width: artboardWidth,
                height: artboardHeight,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
              {!ready ? (
                <Skeleton className="absolute inset-0 size-full" />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-4 left-4 flex items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-sm backdrop-blur">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Zoom out"
          disabled={zoom <= ZOOM_MIN}
          onClick={() => setZoom(clamp(zoom / ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))}
        >
          <Minus />
        </Button>
        <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Zoom in"
          disabled={zoom >= ZOOM_MAX}
          onClick={() => setZoom(clamp(zoom * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))}
        >
          <Plus />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Fit to screen"
          onClick={fitToScreen}
        >
          <Maximize2 />
        </Button>
      </div>

      <p className="sr-only" role="status">
        Canvas zoom {Math.round(zoom * 100)} percent.
      </p>
    </div>
  )
}
