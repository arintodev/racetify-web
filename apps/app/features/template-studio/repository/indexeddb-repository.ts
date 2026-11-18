import { createStore, del, get, getMany, keys, set } from "idb-keyval"

import { DRAFT_STORE_DB, DRAFT_STORE_NAME } from "../lib/constants"
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

const store = createStore(DRAFT_STORE_DB, DRAFT_STORE_NAME)

function draftKey(eventId: string, draftId: string): string {
  return `${eventId}:${draftId}`
}

function eventPrefix(eventId: string): string {
  return `${eventId}:`
}

function isRecord(value: unknown): value is DraftRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "document" in value &&
    "eventId" in value
  )
}

function withUpdatedAt(document: TemplateDocument): TemplateDocument {
  return { ...document, updatedAt: new Date().toISOString() }
}

function storageError(cause: unknown, message: string): TemplateStorageError {
  const detail = cause instanceof Error ? cause.message : String(cause)
  return new TemplateStorageError(`${message} (${detail})`)
}

async function list(eventId: string): Promise<DraftSummary[]> {
  try {
    const allKeys = await keys<string>(store)
    const scopedKeys = allKeys.filter((key) =>
      key.startsWith(eventPrefix(eventId))
    )
    const records = await getMany<DraftRecord>(scopedKeys, store)

    return records
      .filter(isRecord)
      .map((record) =>
        summarizeDraft(eventId, record.document, record.thumbnailDataUrl)
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch (error) {
    throw storageError(error, "Could not read local drafts")
  }
}

async function getDraft(
  eventId: string,
  draftId: string
): Promise<TemplateDraft | null> {
  try {
    const record = await get<DraftRecord>(draftKey(eventId, draftId), store)
    return record && isRecord(record) ? toDraft(eventId, record) : null
  } catch (error) {
    throw storageError(error, "Could not open the draft")
  }
}

async function create(
  eventId: string,
  document: TemplateDocument
): Promise<TemplateDraft> {
  try {
    const stored = withUpdatedAt(document)
    const record: DraftRecord = {
      eventId,
      document: stored,
      thumbnailDataUrl: null,
    }
    await set(draftKey(eventId, stored.id), record, store)
    return toDraft(eventId, record)
  } catch (error) {
    throw storageError(
      error,
      "Could not save the draft. Browser storage may be full or unavailable."
    )
  }
}

async function save(
  eventId: string,
  document: TemplateDocument,
  thumbnailDataUrl?: string | null
): Promise<TemplateDraft> {
  try {
    const stored = withUpdatedAt(document)
    const existing = await get<DraftRecord>(
      draftKey(eventId, stored.id),
      store
    )
    const record: DraftRecord = {
      eventId,
      document: stored,
      thumbnailDataUrl:
        thumbnailDataUrl === undefined
          ? (existing?.thumbnailDataUrl ?? null)
          : thumbnailDataUrl,
    }
    await set(draftKey(eventId, stored.id), record, store)
    return toDraft(eventId, record)
  } catch (error) {
    throw storageError(
      error,
      "Could not save the draft. Browser storage may be full or unavailable."
    )
  }
}

async function remove(eventId: string, draftId: string): Promise<void> {
  try {
    await del(draftKey(eventId, draftId), store)
  } catch (error) {
    throw storageError(error, "Could not delete the draft")
  }
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

export const indexedDbTemplateRepository: TemplateRepository = {
  list,
  get: getDraft,
  create,
  save,
  delete: remove,
  duplicate,
}
