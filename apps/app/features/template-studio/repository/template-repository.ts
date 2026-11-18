import type { CanvasUnit } from "../model/canvas-presets"
import type { TemplateDocument, TemplateScope } from "../model/template-document"

export type DraftSummary = {
  id: string
  eventId: string
  name: string
  scope: TemplateScope
  widthMm: number
  heightMm: number
  unit: CanvasUnit
  dpi: number
  objectCount: number
  updatedAt: string
  thumbnailDataUrl: string | null
}

export type TemplateDraft = {
  summary: DraftSummary
  document: TemplateDocument
}

export type DraftRecord = {
  eventId: string
  document: TemplateDocument
  thumbnailDataUrl: string | null
}

export interface TemplateRepository {
  list(eventId: string): Promise<DraftSummary[]>
  get(eventId: string, draftId: string): Promise<TemplateDraft | null>
  create(eventId: string, document: TemplateDocument): Promise<TemplateDraft>
  /** Passing `null` clears the thumbnail; omitting it keeps the stored one. */
  save(
    eventId: string,
    document: TemplateDocument,
    thumbnailDataUrl?: string | null
  ): Promise<TemplateDraft>
  delete(eventId: string, draftId: string): Promise<void>
  duplicate(eventId: string, draftId: string): Promise<TemplateDraft>
}

export class TemplateStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TemplateStorageError"
  }
}

export function summarizeDraft(
  eventId: string,
  document: TemplateDocument,
  thumbnailDataUrl: string | null
): DraftSummary {
  return {
    id: document.id,
    eventId,
    name: document.name,
    scope: document.scope,
    widthMm: document.canvas.widthMm,
    heightMm: document.canvas.heightMm,
    unit: document.canvas.unit,
    dpi: document.canvas.dpi,
    objectCount: document.objects.length,
    updatedAt: document.updatedAt,
    thumbnailDataUrl,
  }
}

export function toDraft(eventId: string, record: DraftRecord): TemplateDraft {
  return {
    summary: summarizeDraft(eventId, record.document, record.thumbnailDataUrl),
    document: record.document,
  }
}
