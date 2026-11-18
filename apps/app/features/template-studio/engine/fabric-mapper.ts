import {
  Ellipse,
  FabricImage,
  Path,
  Rect,
  Textbox,
  type FabricObject,
} from "fabric"

import { clampRotation } from "../model/geometry"
import type { ObjectPatch } from "../model/patch"
import type {
  EllipseObject,
  ImageObject,
  PathObject,
  RectObject,
  TemplateDocument,
  TemplateObject,
  TextObject,
} from "../model/template-document"
import { cssPxToMm, cssPxToPt, mmToCssPx, ptToCssPx } from "../model/units"

type TemplateFabricObject = FabricObject & { templateId?: string }

type GeometryProps = {
  left: number
  top: number
  originX: "center"
  originY: "center"
  angle: number
  opacity: number
  visible: boolean
  selectable: boolean
  evented: boolean
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()

export function templateIdOf(object: FabricObject): string | null {
  const value = (object as TemplateFabricObject).templateId
  return typeof value === "string" ? value : null
}

export function tagFabricObject(object: FabricObject, id: string): void {
  ;(object as TemplateFabricObject).templateId = id
}

function centers(object: TemplateObject): { left: number; top: number } {
  return {
    left: mmToCssPx(object.xMm + object.widthMm / 2),
    top: mmToCssPx(object.yMm + object.heightMm / 2),
  }
}

function geometryProps(object: TemplateObject): GeometryProps {
  const center = centers(object)
  return {
    left: center.left,
    top: center.top,
    originX: "center",
    originY: "center",
    angle: object.rotationDeg,
    opacity: object.opacity,
    visible: object.visible,
    selectable: !object.locked,
    evented: !object.locked,
  }
}

function stringFill(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src)
  if (cached) return cached

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not load the image."))
    image.src = src
  })
  imageCache.set(src, promise)
  return promise
}

function createText(object: TextObject): Textbox {
  return new Textbox(object.text, {
    ...geometryProps(object),
    width: mmToCssPx(object.widthMm),
    fontFamily: object.fontFamily,
    fontSize: ptToCssPx(object.fontSizePt),
    fontWeight: object.fontWeight,
    fontStyle: object.fontStyle,
    fill: object.fill,
    textAlign: object.textAlign,
    lineHeight: object.lineHeight,
    charSpacing: object.letterSpacingEm * 1000,
    underline: object.underline,
    splitByGrapheme: false,
    objectCaching: false,
  })
}

function createRect(object: RectObject): Rect {
  return new Rect({
    ...geometryProps(object),
    width: mmToCssPx(object.widthMm),
    height: mmToCssPx(object.heightMm),
    fill: object.fill,
    stroke: object.stroke ?? undefined,
    strokeWidth: mmToCssPx(object.strokeWidthMm),
    rx: mmToCssPx(object.radiusMm),
    ry: mmToCssPx(object.radiusMm),
    strokeUniform: true,
    objectCaching: false,
  })
}

function ellipseSize(object: EllipseObject): {
  rx: number
  ry: number
  width: number
  height: number
} {
  const width = mmToCssPx(object.widthMm)
  const height = mmToCssPx(object.heightMm)
  return { rx: width / 2, ry: height / 2, width, height }
}

function createEllipse(object: EllipseObject): Ellipse {
  const size = ellipseSize(object)
  return new Ellipse({
    ...geometryProps(object),
    ...size,
    fill: object.fill,
    stroke: object.stroke ?? undefined,
    strokeWidth: mmToCssPx(object.strokeWidthMm),
    strokeUniform: true,
    objectCaching: false,
  })
}

function createPath(object: PathObject): Path {
  const path = new Path(object.pathData, {
    ...geometryProps(object),
    fill: object.fill ?? "",
    stroke: object.stroke ?? undefined,
    strokeWidth: mmToCssPx(object.strokeWidthMm),
    strokeUniform: true,
    objectCaching: false,
  })

  const intrinsicWidth = path.width || 1
  const intrinsicHeight = path.height || 1
  path.set({
    scaleX: mmToCssPx(object.widthMm) / intrinsicWidth,
    scaleY: mmToCssPx(object.heightMm) / intrinsicHeight,
  })
  return path
}

async function createImage(
  object: ImageObject,
  document: TemplateDocument
): Promise<FabricImage> {
  const asset = document.assets.find((candidate) => candidate.id === object.assetId)
  if (!asset) {
    throw new Error("The image asset is missing from this template.")
  }

  const element = await loadImageElement(asset.dataUrl)
  const image = new FabricImage(element, geometryProps(object))
  const intrinsicWidth = element.naturalWidth || 1
  const intrinsicHeight = element.naturalHeight || 1
  image.set({
    scaleX: mmToCssPx(object.widthMm) / intrinsicWidth,
    scaleY: mmToCssPx(object.heightMm) / intrinsicHeight,
    objectCaching: false,
  })
  return image
}

export async function createFabricObject(
  object: TemplateObject,
  document: TemplateDocument
): Promise<FabricObject> {
  let fabricObject: FabricObject

  switch (object.type) {
    case "text":
      fabricObject = createText(object)
      break
    case "rect":
      fabricObject = createRect(object)
      break
    case "ellipse":
      fabricObject = createEllipse(object)
      break
    case "path":
      fabricObject = createPath(object)
      break
    case "image":
      fabricObject = await createImage(object, document)
      break
  }

  tagFabricObject(fabricObject, object.id)
  fabricObject.setCoords()
  return fabricObject
}

type ApplyOptions = {
  /** Skip the text content while the user is typing in the object. */
  skipText?: boolean
}

export function applyFabricObject(
  fabricObject: FabricObject,
  object: TemplateObject,
  options: ApplyOptions = {}
): void {
  fabricObject.set({
    ...geometryProps(object),
  })

  switch (object.type) {
    case "text": {
      const textbox = fabricObject as Textbox
      if (!options.skipText && textbox.text !== object.text) {
        textbox.set({ text: object.text })
      }
      textbox.set({
        width: mmToCssPx(object.widthMm),
        scaleX: 1,
        scaleY: 1,
        fontFamily: object.fontFamily,
        fontSize: ptToCssPx(object.fontSizePt),
        fontWeight: object.fontWeight,
        fontStyle: object.fontStyle,
        fill: object.fill,
        textAlign: object.textAlign,
        lineHeight: object.lineHeight,
        charSpacing: object.letterSpacingEm * 1000,
        underline: object.underline,
      })
      break
    }
    case "rect": {
      const rect = fabricObject as Rect
      rect.set({
        width: mmToCssPx(object.widthMm),
        height: mmToCssPx(object.heightMm),
        scaleX: 1,
        scaleY: 1,
        fill: object.fill,
        stroke: object.stroke ?? undefined,
        strokeWidth: mmToCssPx(object.strokeWidthMm),
        rx: mmToCssPx(object.radiusMm),
        ry: mmToCssPx(object.radiusMm),
      })
      break
    }
    case "ellipse": {
      const ellipse = fabricObject as Ellipse
      ellipse.set({
        ...ellipseSize(object),
        scaleX: 1,
        scaleY: 1,
        fill: object.fill,
        stroke: object.stroke ?? undefined,
        strokeWidth: mmToCssPx(object.strokeWidthMm),
      })
      break
    }
    case "path": {
      const path = fabricObject as Path
      const intrinsicWidth = path.width || 1
      const intrinsicHeight = path.height || 1
      path.set({
        scaleX: mmToCssPx(object.widthMm) / intrinsicWidth,
        scaleY: mmToCssPx(object.heightMm) / intrinsicHeight,
        fill: object.fill ?? "",
        stroke: object.stroke ?? undefined,
        strokeWidth: mmToCssPx(object.strokeWidthMm),
      })
      break
    }
    case "image": {
      const image = fabricObject as FabricImage
      const intrinsicWidth = image.width || 1
      const intrinsicHeight = image.height || 1
      image.set({
        scaleX: mmToCssPx(object.widthMm) / intrinsicWidth,
        scaleY: mmToCssPx(object.heightMm) / intrinsicHeight,
      })
      break
    }
  }

  fabricObject.setCoords()
}

function textAlignValue(
  value: unknown
): "left" | "center" | "right" | "justify" {
  return value === "left" ||
    value === "center" ||
    value === "right" ||
    value === "justify"
    ? value
    : "left"
}

function fontWeightValue(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isNaN(parsed)) return parsed
    return value === "bold" ? 700 : 400
  }
  return 400
}

/**
 * Reads the object's current Fabric geometry back into a document patch. Effective sizes are
 * computed from the object's scale so the document never stores scale itself.
 */
export function patchFromFabricObject(
  fabricObject: FabricObject
): ObjectPatch | null {
  const scaleX = fabricObject.scaleX ?? 1
  const scaleY = fabricObject.scaleY ?? 1
  const widthPx = (fabricObject.width ?? 0) * scaleX
  const heightPx = (fabricObject.height ?? 0) * scaleY
  const widthMm = cssPxToMm(widthPx)
  const heightMm = cssPxToMm(heightPx)
  const centerX = cssPxToMm(fabricObject.left ?? 0)
  const centerY = cssPxToMm(fabricObject.top ?? 0)

  const base: ObjectPatch = {
    xMm: centerX - widthMm / 2,
    yMm: centerY - heightMm / 2,
    widthMm,
    heightMm,
    rotationDeg: clampRotation(fabricObject.angle ?? 0),
    opacity: fabricObject.opacity ?? 1,
    visible: fabricObject.visible ?? true,
    locked: fabricObject.selectable === false,
  }

  if (fabricObject instanceof Textbox) {
    return {
      ...base,
      text: fabricObject.text,
      fontFamily: fabricObject.fontFamily,
      fontSizePt: cssPxToPt(fabricObject.fontSize * scaleY),
      fontWeight: fontWeightValue(fabricObject.fontWeight),
      fontStyle: fabricObject.fontStyle === "italic" ? "italic" : "normal",
      fill: stringFill(fabricObject.fill, "#111111"),
      textAlign: textAlignValue(fabricObject.textAlign),
      lineHeight: fabricObject.lineHeight ?? 1.2,
      letterSpacingEm: (fabricObject.charSpacing ?? 0) / 1000,
      underline: fabricObject.underline ?? false,
    }
  }

  if (fabricObject instanceof Rect) {
    return {
      ...base,
      fill: stringFill(fabricObject.fill, "#ffffff"),
      stroke: typeof fabricObject.stroke === "string" ? fabricObject.stroke : null,
      strokeWidthMm: cssPxToMm(fabricObject.strokeWidth ?? 0),
      radiusMm: cssPxToMm(fabricObject.rx ?? 0),
    }
  }

  if (fabricObject instanceof Ellipse) {
    return {
      ...base,
      fill: stringFill(fabricObject.fill, "#ffffff"),
      stroke: typeof fabricObject.stroke === "string" ? fabricObject.stroke : null,
      strokeWidthMm: cssPxToMm(fabricObject.strokeWidth ?? 0),
    }
  }

  if (fabricObject instanceof Path) {
    return {
      ...base,
      fill: typeof fabricObject.fill === "string" ? fabricObject.fill : null,
      stroke: typeof fabricObject.stroke === "string" ? fabricObject.stroke : null,
      strokeWidthMm: cssPxToMm(fabricObject.strokeWidth ?? 0),
    }
  }

  if (fabricObject instanceof FabricImage) {
    return base
  }

  return null
}
