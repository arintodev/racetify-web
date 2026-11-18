import {
  ActiveSelection,
  Canvas,
  Textbox,
  type FabricObject,
} from "fabric"

import { THUMBNAIL_MULTIPLIER } from "../lib/constants"
import type { SceneSnapshot } from "../store/history-manager"
import type { TemplateDocument } from "../model/template-document"
import { mmToCssPx } from "../model/units"

import {
  applyFabricObject,
  createFabricObject,
  patchFromFabricObject,
  tagFabricObject,
  templateIdOf,
} from "./fabric-mapper"
import type { EngineIntent, EngineObjectUpdate } from "./types"

type EngineOptions = {
  onIntent: (intent: EngineIntent) => void
}

function canvasSize(document: TemplateDocument): {
  width: number
  height: number
} {
  return {
    width: mmToCssPx(document.canvas.widthMm),
    height: mmToCssPx(document.canvas.heightMm),
  }
}

export class EditorEngine {
  private readonly container: HTMLElement
  private readonly canvas: Canvas
  private readonly canvasElement: HTMLCanvasElement
  private readonly onIntent: (intent: EngineIntent) => void
  private readonly objects = new Map<string, FabricObject>()
  private readonly disposers: VoidFunction[] = []
  private document: TemplateDocument
  private applying = false
  private editingId: string | null = null
  private previewing = false
  private disposed = false
  private applyChain: Promise<void> = Promise.resolve()

  private constructor(
    container: HTMLElement,
    canvas: Canvas,
    canvasElement: HTMLCanvasElement,
    document: TemplateDocument,
    options: EngineOptions
  ) {
    this.container = container
    this.canvas = canvas
    this.canvasElement = canvasElement
    this.document = document
    this.onIntent = options.onIntent
  }

  static async create(
    container: HTMLElement,
    document: TemplateDocument,
    options: EngineOptions
  ): Promise<EditorEngine> {
    const element = window.document.createElement("canvas")
    element.setAttribute("aria-label", "Template design canvas")
    element.setAttribute("role", "img")
    container.append(element)

    const size = canvasSize(document)
    const canvas = new Canvas(element, {
      width: size.width,
      height: size.height,
      backgroundColor: document.canvas.background,
      preserveObjectStacking: true,
      selection: true,
      renderOnAddRemove: false,
      enableRetinaScaling: true,
    })

    const engine = new EditorEngine(container, canvas, element, document, options)
    engine.wireEvents()
    await engine.loadDocument(document)
    canvas.requestRenderAll()
    return engine
  }

  private wireEvents(): void {
    this.disposers.push(
      this.canvas.on("selection:created", () => this.emitSelection()),
      this.canvas.on("selection:updated", () => this.emitSelection()),
      this.canvas.on("selection:cleared", () => this.emitSelection()),
      this.canvas.on("object:modified", (event) =>
        this.commitTransform(event.target)
      ),
      this.canvas.on("mouse:up", () => {
        this.canvas.requestRenderAll()
      }),
      this.canvas.on("text:editing:entered", () => {
        if (this.applying) return
        const active = this.canvas.getActiveObject()
        if (!(active instanceof Textbox)) return
        const id = templateIdOf(active)
        if (!id) return
        this.editingId = id
        this.onIntent({ type: "editingChanged", id })
      }),
      this.canvas.on("text:changed", () => {
        if (this.applying || this.previewing) return
        const active = this.canvas.getActiveObject()
        if (!(active instanceof Textbox)) return
        const id = templateIdOf(active)
        if (!id) return
        this.onIntent({ type: "textChanged", id, text: active.text })
      }),
      this.canvas.on("text:editing:exited", () => {
        const active = this.canvas.getActiveObject()
        const id = this.editingId
        this.editingId = null
        if (!id) return
        if (active instanceof Textbox) {
          this.onIntent({ type: "textChanged", id, text: active.text })
        }
        this.onIntent({ type: "editingChanged", id: null })
      })
    )
  }

  private emitSelection(): void {
    if (this.applying || this.disposed) return
    const ids = this.canvas
      .getActiveObjects()
      .map((object) => templateIdOf(object))
      .filter((id): id is string => id !== null)
    this.onIntent({ type: "selectionChanged", ids })
  }

  private commitTransform(target?: FabricObject): void {
    if (this.applying || this.previewing || this.disposed) return

    const targets =
      target && !(target instanceof ActiveSelection)
        ? [target]
        : this.canvas.getActiveObjects()
    const updated = targets
      .map((target) => this.readUpdate(target))
      .filter((update): update is EngineObjectUpdate => update !== null)

    if (updated.length > 0) {
      this.onIntent({ type: "objectsCommitted", updates: updated })
    }
  }

  private readUpdate(object: FabricObject): EngineObjectUpdate | null {
    const id = templateIdOf(object)
    if (!id) return null

    if (object instanceof Textbox) {
      const scaleX = object.scaleX ?? 1
      const scaleY = object.scaleY ?? 1
      if (scaleX !== 1 || scaleY !== 1) {
        object.set({
          width: object.width * scaleX,
          fontSize: object.fontSize * scaleY,
          scaleX: 1,
          scaleY: 1,
        })
      }
    }

    object.setCoords()
    const patch = patchFromFabricObject(object)
    return patch ? { id, patch } : null
  }

  private async loadDocument(document: TemplateDocument): Promise<void> {
    this.applying = true
    try {
      for (const object of document.objects) {
        try {
          const fabricObject = await createFabricObject(object, document)
          this.objects.set(object.id, fabricObject)
          this.canvas.add(fabricObject)
        } catch {
          // Skip only the broken object (for example an image with a missing asset).
        }
      }
    } finally {
      this.applying = false
    }
  }

  /**
   * Diffs the next scene against the canvas. Objects are matched by id, absent objects are removed,
   * and paint order follows the document array (bottom to top).
   */
  async applyScene(
    _previous: SceneSnapshot,
    next: SceneSnapshot,
    document: TemplateDocument
  ): Promise<void> {
    const run = async (): Promise<void> => {
      if (this.disposed || this.previewing) return
      this.document = document

      this.applying = true
      try {
        this.resizeCanvas(document)

        const nextIds = new Set(next.objects.map((object) => object.id))
        for (const [id, fabricObject] of this.objects) {
          if (!nextIds.has(id)) {
            this.canvas.remove(fabricObject)
            this.objects.delete(id)
          }
        }

        for (const object of next.objects) {
          if (this.disposed) return
          const existing = this.objects.get(object.id)
          if (!existing) {
            try {
              const created = await createFabricObject(object, document)
              if (this.disposed) return
              this.objects.set(object.id, created)
              this.canvas.add(created)
            } catch {
              // A missing image asset (for example a broken import) skips only that object.
            }
            continue
          }

          if (this.editingId === object.id) continue
          applyFabricObject(existing, object)
        }

        const desiredOrder = next.objects.map((object) => object.id)
        const currentOrder = this.canvas
          .getObjects()
          .map((object) => templateIdOf(object))
        const orderChanged =
          desiredOrder.length !== currentOrder.length ||
          desiredOrder.some((id, index) => id !== currentOrder[index])

        if (orderChanged) {
          next.objects.forEach((object, index) => {
            const fabricObject = this.objects.get(object.id)
            if (fabricObject) this.canvas.moveObjectTo(fabricObject, index)
          })
        }

        this.pruneSelection()
        this.canvas.requestRenderAll()
      } finally {
        this.applying = false
      }
    }

    this.applyChain = this.applyChain
      .then(run, run)
      .catch(() => undefined)
    return this.applyChain
  }

  private resizeCanvas(document: TemplateDocument): void {
    const size = canvasSize(document)
    if (
      this.canvas.getWidth() !== size.width ||
      this.canvas.getHeight() !== size.height
    ) {
      this.canvas.setDimensions(size)
      this.canvasElement.style.width = `${size.width}px`
      this.canvasElement.style.height = `${size.height}px`
    }
    if (this.canvas.backgroundColor !== document.canvas.background) {
      this.canvas.backgroundColor = document.canvas.background
    }
  }

  private pruneSelection(): void {
    const active = this.canvas.getActiveObjects()
    const exists = (object: FabricObject): boolean => {
      const id = templateIdOf(object)
      return id !== null && this.objects.has(id)
    }
    if (active.length > 0 && active.some((object) => !exists(object))) {
      this.canvas.discardActiveObject()
      this.canvas.requestRenderAll()
    }
  }

  setSelection(ids: string[], options: { silent?: boolean } = {}): void {
    if (this.applying || this.previewing || this.disposed) return

    if (options.silent) this.applying = true
    try {
      if (ids.length === 0) {
        this.canvas.discardActiveObject()
      } else {
        const selected = ids
          .map((id) => this.objects.get(id))
          .filter((object): object is FabricObject => object !== undefined)

        if (selected.length === 1) {
          const [only] = selected
          if (only) this.canvas.setActiveObject(only)
        } else if (selected.length > 1) {
          this.canvas.setActiveObject(
            new ActiveSelection(selected, { canvas: this.canvas })
          )
        }
      }
      this.canvas.requestRenderAll()
    } finally {
      if (options.silent) this.applying = false
    }
  }

  setPreview(
    overrides: Map<string, string> | null,
    document?: TemplateDocument
  ): void {
    if (this.disposed) return
    if (document) this.document = document

    this.applying = true
    try {
      this.previewing = overrides !== null
      this.canvas.selection = overrides === null

      for (const [id, fabricObject] of this.objects) {
        const native = this.document.objects.find((object) => object.id === id)
        if (!native) continue

        const interactive = overrides === null && !native.locked
        fabricObject.set({
          selectable: interactive,
          evented: interactive,
        })

        if (native.type === "text" && fabricObject instanceof Textbox) {
          const text = overrides?.get(id) ?? native.text
          if (fabricObject.text !== text) {
            fabricObject.set({ text })
          }
        }
      }

      if (overrides !== null) {
        this.canvas.discardActiveObject()
      }
      this.canvas.requestRenderAll()
    } finally {
      this.applying = false
    }
  }

  isEditingText(): boolean {
    return this.editingId !== null
  }

  getSelectedIds(): string[] {
    return this.canvas
      .getActiveObjects()
      .map((object) => templateIdOf(object))
      .filter((id): id is string => id !== null)
  }

  insertTextAtCursor(text: string): boolean {
    const active = this.canvas.getActiveObject()
    if (!(active instanceof Textbox) || !active.isEditing) return false
    active.insertChars(text, undefined, active.selectionStart, active.selectionEnd)
    this.canvas.requestRenderAll()
    return true
  }

  getCursor(): { objectId: string; start: number; end: number } | null {
    const active = this.canvas.getActiveObject()
    if (!(active instanceof Textbox) || !active.isEditing) return null
    const id = templateIdOf(active)
    if (!id) return null
    return {
      objectId: id,
      start: active.selectionStart,
      end: active.selectionEnd,
    }
  }

  getCanvasSize(): { width: number; height: number } {
    return { width: this.canvas.getWidth(), height: this.canvas.getHeight() }
  }

  captureThumbnail(): string | null {
    if (this.disposed) return null
    try {
      return this.canvas.toDataURL({
        format: "png",
        multiplier: THUMBNAIL_MULTIPLIER,
        quality: 1,
      })
    } catch {
      return null
    }
  }

  requestRender(): void {
    this.canvas.requestRenderAll()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true

    for (const dispose of this.disposers) dispose()
    this.disposers.length = 0
    this.objects.clear()

    this.canvas.dispose()
    if (this.canvasElement.parentNode === this.container) {
      this.container.removeChild(this.canvasElement)
    }
  }
}
