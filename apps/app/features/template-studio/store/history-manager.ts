import { HISTORY_COALESCE_MS, HISTORY_LIMIT } from "../lib/constants"
import type { TemplateDocument } from "../model/template-document"

/** History only tracks the design surface; image/font libraries are not undoable. */
export type SceneSnapshot = Pick<TemplateDocument, "canvas" | "objects">

type HistoryEntry = {
  scene: SceneSnapshot
  key: string | null
  at: number
}

export function sceneOf(document: TemplateDocument): SceneSnapshot {
  return { canvas: document.canvas, objects: document.objects }
}

export function scenesEqual(a: SceneSnapshot, b: SceneSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export class HistoryStack {
  private readonly limit: number
  private past: HistoryEntry[] = []
  private future: HistoryEntry[] = []
  private pending: HistoryEntry | null = null

  constructor(limit = HISTORY_LIMIT) {
    this.limit = limit
  }

  canUndo(): boolean {
    return this.past.length > 0
  }

  canRedo(): boolean {
    return this.future.length > 0
  }

  /**
   * Records the scene *before* a mutation. Repeated pushes with the same key inside the coalesce
   * window keep the first snapshot, so a slider drag or typing burst becomes one undo step.
   */
  push(scene: SceneSnapshot, key: string | null = null): void {
    if (this.pending) {
      this.commit(scene)
    }

    const now = Date.now()
    const top = this.past[this.past.length - 1]
    if (key !== null && top && top.key === key && now - top.at < HISTORY_COALESCE_MS) {
      top.at = now
      this.future = []
      return
    }

    this.past.push({ scene, key, at: now })
    if (this.past.length > this.limit) this.past.shift()
    this.future = []
  }

  /** Captures the scene at the start of a multi-step edit, such as typing in a text object. */
  begin(scene: SceneSnapshot, key: string): void {
    if (this.pending) return
    this.pending = { scene, key, at: Date.now() }
  }

  /** Finishes a begun edit, pushing a single entry when the scene actually changed. */
  commit(current: SceneSnapshot): void {
    if (!this.pending) return
    const entry = this.pending
    this.pending = null

    if (scenesEqual(entry.scene, current)) return

    this.past.push({ scene: entry.scene, key: entry.key, at: Date.now() })
    if (this.past.length > this.limit) this.past.shift()
    this.future = []
  }

  cancel(): void {
    this.pending = null
  }

  undo(current: SceneSnapshot): SceneSnapshot | null {
    this.commit(current)
    const entry = this.past.pop()
    if (!entry) return null

    this.future.push({ scene: current, key: entry.key, at: Date.now() })
    return entry.scene
  }

  redo(current: SceneSnapshot): SceneSnapshot | null {
    const entry = this.future.pop()
    if (!entry) return null

    this.past.push({ scene: current, key: entry.key, at: Date.now() })
    return entry.scene
  }

  reset(): void {
    this.past = []
    this.future = []
    this.pending = null
  }
}
