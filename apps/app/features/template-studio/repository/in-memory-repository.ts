import { createId } from "../lib/id"
import type { TemplateDocument } from "../model/template-document"

import {
  TemplateStorageError,
  summarizeDraft,
  toDraft,
  type DraftRecord,
  type DraftSummary,
  type TemplateDraft,
  type TemplateRepository,
} from "./template-repository"

const records = new Map<string, DraftRecord>()

function draftKey(eventId: string, draftId: string): string {
  return `${eventId}:${draftId}`
}

function withUpdatedAt(document: TemplateDocument): TemplateDocument {
  return { ...document, updatedAt: new Date().toISOString() }
}

async function list(eventId: string): Promise<DraftSummary[]> {
  return Array.from(records.entries())
    .filter(([key]) => key.startsWith(`${eventId}:`))
    .map(([, record]) =>
      summarizeDraft(eventId, record.document, record.thumbnailDataUrl)
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

async function getDraft(
  eventId: string,
  draftId: string
): Promise<TemplateDraft | null> {
  const record = records.get(draftKey(eventId, draftId))
  return record ? toDraft(eventId, record) : null
}

async function create(
  eventId: string,
  document: TemplateDocument
): Promise<TemplateDraft> {
  const stored = withUpdatedAt(document)
  records.set(draftKey(eventId, stored.id), {
    eventId,
    document: stored,
    thumbnailDataUrl: null,
  })
  return toDraft(eventId, {
    eventId,
    document: stored,
    thumbnailDataUrl: null,
  })
}

async function save(
  eventId: string,
  document: TemplateDocument,
  thumbnailDataUrl?: string | null
): Promise<TemplateDraft> {
  const stored = withUpdatedAt(document)
  const existing = records.get(draftKey(eventId, stored.id))
  const record: DraftRecord = {
    eventId,
    document: stored,
    thumbnailDataUrl:
      thumbnailDataUrl === undefined
        ? (existing?.thumbnailDataUrl ?? null)
        : thumbnailDataUrl,
  }
  records.set(draftKey(eventId, stored.id), record)
  return toDraft(eventId, record)
}

async function remove(eventId: string, draftId: string): Promise<void> {
  records.delete(draftKey(eventId, draftId))
}

async function duplicate(
  eventId: string,
  draftId: string
): Promise<TemplateDraft> {
  const existing = await getDraft(eventId, draftId)
  if (!existing) {
    throw new TemplateStorageError("The draft could not be found.")
  }

  const now = new Date().toISOString()
  const copy: TemplateDocument = {
    ...structuredClone(existing.document),
    id: createId(),
    name: `${existing.document.name} copy`.slice(0, 120),
    createdAt: now,
    updatedAt: now,
  }

  return create(eventId, copy)
}

export const inMemoryTemplateRepository: TemplateRepository = {
  list,
  get: getDraft,
  create,
  save,
  delete: remove,
  duplicate,
}
