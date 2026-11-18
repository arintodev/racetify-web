import { createStore, type StoreApi } from "zustand/vanilla"

import { MAX_OBJECTS } from "../lib/constants"
import { createId } from "../lib/id"
import {
  alignBoxes,
  boundsFromRect,
  combinedBounds,
  type Alignment,
  type Bounds,
} from "../model/geometry"
import { mergeObject, type ObjectPatch } from "../model/patch"
import { defaultExampleData } from "../model/placeholder-catalog"
import type {
  CanvasSpec,
  FontAsset,
  ImageAsset,
  TemplateDocument,
  TemplateObject,
} from "../model/template-document"

import { HistoryStack, sceneOf } from "./history-manager"

export type EngineObjectUpdate = {
  id: string
  patch: ObjectPatch
}

export type SaveState = "saved" | "dirty" | "saving" | "error"
export type LeftTab = "add" | "layers" | "data"
export type ReorderDirection = "up" | "down" | "top" | "bottom"

export type EditorState = {
  document: TemplateDocument
  selectedIds: string[]
  preview: boolean
  zoom: number
  saveState: SaveState
  savedAt: string | null
  revision: number
  savedRevision: number
  leftTab: LeftTab
  canUndo: boolean
  canRedo: boolean
}

export type EditorActions = {
  renameDocument(name: string): void
  updateCanvas(patch: Partial<CanvasSpec>): void
  addObject(object: TemplateObject): void
  addObjects(objects: TemplateObject[], assets?: ImageAsset[]): void
  updateObject(
    id: string,
    patch: ObjectPatch,
    options?: { historyKey?: string | null }
  ): void
  updateObjects(
    ids: string[],
    patch: ObjectPatch,
    options?: { historyKey?: string | null }
  ): void
  applyEngineUpdates(updates: EngineObjectUpdate[]): void
  removeObjects(ids: string[]): void
  duplicateObjects(ids: string[]): void
  reorderObject(id: string, direction: ReorderDirection): void
  renameObject(id: string, name: string): void
  setObjectVisible(id: string, visible: boolean): void
  setObjectLocked(id: string, locked: boolean): void
  setObjectText(id: string, text: string): void
  beginTextEditing(id: string): void
  endTextEditing(): void
  insertToken(objectId: string, token: string, caret: number | null): void
  replaceTextWithToken(objectId: string, token: string): void
  setSelection(ids: string[]): void
  alignSelection(alignment: Alignment): void
  nudgeSelection(dxMm: number, dyMm: number): void
  setExampleValue(key: string, value: string): void
  resetExampleData(): void
  addImageObject(asset: ImageAsset, object: TemplateObject): void
  addFont(font: FontAsset): void
  setPreview(preview: boolean): void
  setZoom(zoom: number): void
  setLeftTab(tab: LeftTab): void
  markSaving(): void
  markSaved(revision: number): void
  markSaveError(): void
  undo(): void
  redo(): void
}

export type EditorStore = EditorState & EditorActions

function uniqueCopyName(name: string, taken: Set<string>): string {
  let candidate = `${name} copy`
  let index = 2
  while (taken.has(candidate)) {
    candidate = `${name} copy ${index}`
    index += 1
  }
  return candidate.slice(0, 120)
}

function canvasBounds(document: TemplateDocument): Bounds {
  return boundsFromRect(
    0,
    0,
    document.canvas.widthMm,
    document.canvas.heightMm
  )
}

export function createEditorStore(
  initialDocument: TemplateDocument
): StoreApi<EditorStore> {
  const history = new HistoryStack()

  return createStore<EditorStore>()((set, get) => {
    function applyDocument(
      next: TemplateDocument,
      options: { historyKey?: string | null; skipHistory?: boolean } = {}
    ): void {
      const state = get()
      if (state.preview && !options.skipHistory) return

      if (!options.skipHistory) {
        history.push(sceneOf(state.document), options.historyKey ?? null)
      }

      set({
        document: next,
        revision: state.revision + 1,
        saveState: "dirty",
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      })
    }

    return {
      document: initialDocument,
      selectedIds: [],
      preview: false,
      zoom: 1,
      saveState: "saved",
      savedAt: null,
      revision: 0,
      savedRevision: 0,
      leftTab: "add",
      canUndo: false,
      canRedo: false,

      renameDocument(name) {
        const trimmed = name.trim().slice(0, 120)
        if (!trimmed || trimmed === get().document.name) return
        applyDocument(
          { ...get().document, name: trimmed },
          { skipHistory: true }
        )
      },

      updateCanvas(patch) {
        const state = get()
        applyDocument(
          { ...state.document, canvas: { ...state.document.canvas, ...patch } },
          { historyKey: "canvas" }
        )
      },

      addObject(object) {
        const state = get()
        if (state.document.objects.length >= MAX_OBJECTS) return
        applyDocument(
          {
            ...state.document,
            objects: [...state.document.objects, object],
          },
          { historyKey: null }
        )
        set({ selectedIds: [object.id] })
      },

      addObjects(objects, assets = []) {
        const state = get()
        if (objects.length === 0) return
        const capacity = Math.max(MAX_OBJECTS - state.document.objects.length, 0)
        const accepted = objects.slice(0, capacity)
        if (accepted.length === 0) return

        const existingAssets = new Set(
          state.document.assets.map((asset) => asset.id)
        )
        const nextAssets = [
          ...state.document.assets,
          ...assets.filter((asset) => !existingAssets.has(asset.id)),
        ]

        applyDocument(
          {
            ...state.document,
            assets: nextAssets,
            objects: [...state.document.objects, ...accepted],
          },
          { historyKey: null }
        )
        set({ selectedIds: accepted.map((object) => object.id) })
      },

      updateObject(id, patch, options) {
        const state = get()
        const objects = state.document.objects.map((object) =>
          object.id === id ? mergeObject(object, patch) : object
        )
        applyDocument(
          { ...state.document, objects },
          { historyKey: options?.historyKey ?? `object:${id}` }
        )
      },

      updateObjects(ids, patch, options) {
        const state = get()
        if (ids.length === 0) return
        const targets = new Set(ids)
        const objects = state.document.objects.map((object) =>
          targets.has(object.id) ? mergeObject(object, patch) : object
        )
        applyDocument(
          { ...state.document, objects },
          { historyKey: options?.historyKey ?? null }
        )
      },

      applyEngineUpdates(updates) {
        const state = get()
        if (updates.length === 0) return
        const byId = new Map(updates.map((update) => [update.id, update.patch]))
        let changed = false

        const objects = state.document.objects.map((object) => {
          const patch = byId.get(object.id)
          if (!patch) return object

          const hasChange = Object.entries(patch).some(
            ([key, value]) =>
              (object as Record<string, unknown>)[key] !== value
          )
          if (!hasChange) return object
          changed = true
          return mergeObject(object, patch)
        })

        if (!changed) return
        applyDocument({ ...state.document, objects }, { historyKey: null })
      },

      removeObjects(ids) {
        const state = get()
        if (ids.length === 0) return
        const remove = new Set(ids)
        applyDocument(
          {
            ...state.document,
            objects: state.document.objects.filter(
              (object) => !remove.has(object.id)
            ),
          },
          { historyKey: null }
        )
        set({
          selectedIds: state.selectedIds.filter((id) => !remove.has(id)),
        })
      },

      duplicateObjects(ids) {
        const state = get()
        const selected = new Set(ids)
        const source = state.document.objects.filter((object) =>
          selected.has(object.id)
        )
        if (source.length === 0) return

        const taken = new Set(state.document.objects.map((object) => object.name))
        const copies = source.map((object) => {
          const copy = {
            ...structuredClone(object),
            id: createId(),
            name: uniqueCopyName(object.name, taken),
            xMm: object.xMm + 5,
            yMm: object.yMm + 5,
          }
          taken.add(copy.name)
          return copy
        })

        applyDocument(
          {
            ...state.document,
            objects: [...state.document.objects, ...copies],
          },
          { historyKey: null }
        )
        set({ selectedIds: copies.map((copy) => copy.id) })
      },

      reorderObject(id, direction) {
        const state = get()
        const objects = [...state.document.objects]
        const index = objects.findIndex((object) => object.id === id)
        if (index < 0) return

        const [object] = objects.splice(index, 1)
        if (!object) return

        const target =
          direction === "top"
            ? objects.length
            : direction === "bottom"
              ? 0
              : direction === "up"
                ? Math.min(index + 1, objects.length)
                : Math.max(index - 1, 0)

        objects.splice(target, 0, object)
        applyDocument({ ...state.document, objects }, { historyKey: null })
      },

      renameObject(id, name) {
        const trimmed = name.trim().slice(0, 120)
        if (!trimmed) return
        get().updateObject(id, { name: trimmed }, { historyKey: null })
      },

      setObjectVisible(id, visible) {
        get().updateObject(id, { visible }, { historyKey: null })
      },

      setObjectLocked(id, locked) {
        get().updateObject(id, { locked }, { historyKey: null })
        if (locked) {
          set({
            selectedIds: get().selectedIds.filter((value) => value !== id),
          })
        }
      },

      setObjectText(id, text) {
        const state = get()
        const objects = state.document.objects.map((object) =>
          object.id === id && object.type === "text"
            ? { ...object, text }
            : object
        )
        applyDocument(
          { ...state.document, objects },
          { skipHistory: true }
        )
      },

      beginTextEditing(id) {
        history.begin(sceneOf(get().document), `text:${id}`)
      },

      endTextEditing() {
        history.commit(sceneOf(get().document))
        set({ canUndo: history.canUndo(), canRedo: history.canRedo() })
      },

      insertToken(objectId, token, caret) {
        const state = get()
        const object = state.document.objects.find(
          (candidate) => candidate.id === objectId
        )
        if (!object || object.type !== "text") return

        const text =
          caret == null
            ? `${object.text}${token}`
            : `${object.text.slice(0, caret)}${token}${object.text.slice(caret)}`

        get().updateObject(objectId, { text }, { historyKey: null })
      },

      replaceTextWithToken(objectId, token) {
        get().updateObject(objectId, { text: token }, { historyKey: null })
      },

      setSelection(ids) {
        const state = get()
        const existing = new Set(state.document.objects.map((object) => object.id))
        const next = ids.filter((id) => existing.has(id))
        if (
          next.length === state.selectedIds.length &&
          next.every((id, index) => id === state.selectedIds[index])
        ) {
          return
        }
        set({ selectedIds: next })
      },

      alignSelection(alignment) {
        const state = get()
        const selected = new Set(state.selectedIds)
        const objects = state.document.objects.filter(
          (object) => selected.has(object.id) && object.visible
        )
        if (objects.length === 0) return

        const target =
          objects.length === 1
            ? canvasBounds(state.document)
            : combinedBounds(objects)
        if (!target) return

        const patches = alignBoxes(
          objects.map((object) => ({ ...object })),
          target,
          alignment
        )
        const byId = new Map(
          patches.map((patch) => [patch.id, patch] as const)
        )
        const next = state.document.objects.map((object) => {
          const patch = byId.get(object.id)
          return patch
            ? { ...object, xMm: patch.xMm, yMm: patch.yMm }
            : object
        })
        applyDocument({ ...state.document, objects: next }, { historyKey: null })
      },

      nudgeSelection(dxMm, dyMm) {
        const state = get()
        const selected = new Set(state.selectedIds)
        if (selected.size === 0) return

        const objects = state.document.objects.map((object) =>
          selected.has(object.id) && !object.locked
            ? { ...object, xMm: object.xMm + dxMm, yMm: object.yMm + dyMm }
            : object
        )
        applyDocument({ ...state.document, objects }, { historyKey: "nudge" })
      },

      setExampleValue(key, value) {
        const state = get()
        // Example data stays editable while previewing, so it bypasses the history stack.
        applyDocument(
          {
            ...state.document,
            exampleData: { ...state.document.exampleData, [key]: value },
          },
          { skipHistory: true }
        )
      },

      resetExampleData() {
        const state = get()
        applyDocument(
          { ...state.document, exampleData: defaultExampleData() },
          { skipHistory: true }
        )
      },

      addImageObject(asset, object) {
        const state = get()
        const assets = state.document.assets.some(
          (existing) => existing.id === asset.id
        )
          ? state.document.assets
          : [...state.document.assets, asset]
        applyDocument(
          {
            ...state.document,
            assets,
            objects: [...state.document.objects, object],
          },
          { historyKey: null }
        )
        set({ selectedIds: [object.id] })
      },

      addFont(font) {
        const state = get()
        const duplicate = state.document.fonts.some(
          (existing) =>
            existing.family === font.family &&
            existing.weight === font.weight &&
            existing.style === font.style
        )
        if (duplicate) return
        applyDocument(
          { ...state.document, fonts: [...state.document.fonts, font] },
          { historyKey: null }
        )
      },

      setPreview(preview) {
        set({
          preview,
          selectedIds: preview ? [] : get().selectedIds,
        })
      },

      setZoom(zoom) {
        set({ zoom })
      },

      setLeftTab(tab) {
        set({ leftTab: tab })
      },

      markSaving() {
        set({ saveState: "saving" })
      },

      markSaved(revision) {
        const state = get()
        set({
          savedRevision: revision,
          savedAt: new Date().toISOString(),
          saveState: state.revision === revision ? "saved" : "dirty",
          document: {
            ...state.document,
            updatedAt: new Date().toISOString(),
          },
        })
      },

      markSaveError() {
        set({ saveState: "error" })
      },

      undo() {
        const state = get()
        if (state.preview) return
        const current = sceneOf(state.document)
        const scene = history.undo(current)
        if (!scene) return

        const existing = new Set(scene.objects.map((object) => object.id))
        set({
          document: { ...state.document, ...scene },
          selectedIds: state.selectedIds.filter((id) => existing.has(id)),
          revision: state.revision + 1,
          saveState: "dirty",
          canUndo: history.canUndo(),
          canRedo: history.canRedo(),
        })
      },

      redo() {
        const state = get()
        if (state.preview) return
        const current = sceneOf(state.document)
        const scene = history.redo(current)
        if (!scene) return

        const existing = new Set(scene.objects.map((object) => object.id))
        set({
          document: { ...state.document, ...scene },
          selectedIds: state.selectedIds.filter((id) => existing.has(id)),
          revision: state.revision + 1,
          saveState: "dirty",
          canUndo: history.canUndo(),
          canRedo: history.canRedo(),
        })
      },
    }
  })
}
