import type { ObjectPatch } from "../model/patch"
import type { ImageAsset, TemplateObject } from "../model/template-document"

export type EngineObjectUpdate = {
  id: string
  patch: ObjectPatch
}

export type EngineIntent =
  | { type: "selectionChanged"; ids: string[] }
  | { type: "objectsCommitted"; updates: EngineObjectUpdate[] }
  | { type: "textChanged"; id: string; text: string }
  | { type: "editingChanged"; id: string | null }

export type EngineOptions = {
  onIntent: (intent: EngineIntent) => void
}

export type SvgImportWarning = {
  element: string
  reason: string
}

export type SvgImportResult = {
  objects: TemplateObject[]
  assets: ImageAsset[]
  warnings: SvgImportWarning[]
  widthMm: number
  heightMm: number
}
