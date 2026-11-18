export {
  TemplateStorageError,
  summarizeDraft,
  toDraft,
  type DraftRecord,
  type DraftSummary,
  type TemplateDraft,
  type TemplateRepository,
} from "./template-repository"
export { indexedDbTemplateRepository } from "./indexeddb-repository"
export { inMemoryTemplateRepository } from "./in-memory-repository"

import { indexedDbTemplateRepository } from "./indexeddb-repository"
import { inMemoryTemplateRepository } from "./in-memory-repository"
import type { TemplateRepository } from "./template-repository"

export type RepositoryKind = "indexeddb" | "memory"

let active: { repository: TemplateRepository; kind: RepositoryKind } | null =
  null

/**
 * Local drafts are browser-only. When IndexedDB is unavailable (private browsing or a hardened
 * browser), fall back to memory so the editor still works for the session; the UI must show that
 * the draft will not survive a reload.
 */
export function getTemplateRepository(): {
  repository: TemplateRepository
  kind: RepositoryKind
} {
  if (active) return active

  const kind: RepositoryKind =
    typeof indexedDB === "undefined" ? "memory" : "indexeddb"
  active = {
    repository:
      kind === "indexeddb"
        ? indexedDbTemplateRepository
        : inMemoryTemplateRepository,
    kind,
  }
  return active
}
