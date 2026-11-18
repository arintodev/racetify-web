import { validateTemplatePlaceholders } from "../model/placeholder-engine"
import type {
  TemplateDocument,
  TemplateObject,
  TextObject,
} from "../model/template-document"

export function selectedObjects(
  document: TemplateDocument,
  selectedIds: string[]
): TemplateObject[] {
  const selected = new Set(selectedIds)
  return document.objects.filter((object) => selected.has(object.id))
}

export function selectedTextObject(
  document: TemplateDocument,
  selectedIds: string[]
): TextObject | null {
  if (selectedIds.length !== 1) return null
  const object = document.objects.find(
    (candidate) => candidate.id === selectedIds[0]
  )
  return object?.type === "text" ? object : null
}

export function objectById(
  document: TemplateDocument,
  id: string
): TemplateObject | null {
  return document.objects.find((object) => object.id === id) ?? null
}

/** Top of the layer list first. */
export function layersTopFirst(
  document: TemplateDocument
): TemplateObject[] {
  return [...document.objects].reverse()
}

export function placeholderIssues(document: TemplateDocument) {
  return validateTemplatePlaceholders(document)
}
