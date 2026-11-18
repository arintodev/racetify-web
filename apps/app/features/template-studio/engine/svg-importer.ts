import DOMPurify from "dompurify"
import {
  Circle,
  Ellipse,
  FabricImage,
  Group,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  Text,
  Textbox,
  loadSVGFromString,
  util,
  type FabricObject,
} from "fabric"

import { MAX_SVG_BYTES, MAX_SVG_NODES } from "../lib/constants"
import {
  FileValidationError,
  assertFileSize,
  readFileAsText,
} from "../lib/file-read"
import { createId } from "../lib/id"
import { combinedBounds } from "../model/geometry"
import type {
  EllipseObject,
  ImageAsset,
  ImageObject,
  PathObject,
  RectObject,
  TemplateObject,
  TextObject,
} from "../model/template-document"
import { cssPxToMm, cssPxToPt } from "../model/units"

import { isFamilyAvailable } from "./font-registry"
import { createImageAssetFromDataUrl } from "./image-importer"
import type { SvgImportResult, SvgImportWarning } from "./types"

type CanvasSize = {
  widthMm: number
  heightMm: number
}

type LeafConversion = {
  object: TemplateObject
  asset?: ImageAsset
}

type BaseGeometry = {
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
  rotationDeg: number
  opacity: number
  visible: boolean
  locked: boolean
}

type GradientLike = {
  colorStops?: Array<{ color?: string }>
}

const UNSUPPORTED_TAGS = [
  "filter",
  "mask",
  "clipPath",
  "use",
  "symbol",
  "foreignObject",
  "textPath",
  "pattern",
]

function normalizeRotation(angle: number): number {
  let rotation = angle % 360
  if (rotation > 180) rotation -= 360
  if (rotation <= -180) rotation += 360
  return Math.round(rotation * 100) / 100
}

function effectiveOpacity(object: FabricObject): number {
  let opacity = object.opacity ?? 1
  let group = object.group
  while (group) {
    opacity *= group.opacity ?? 1
    group = group.group
  }
  return Math.min(Math.max(opacity, 0), 1)
}

function solidColor(
  value: unknown,
  fallback: string,
  warnings: SvgImportWarning[],
  label: string
): string {
  if (typeof value === "string") {
    return value === "none" || value === "" ? fallback : value
  }
  if (value && typeof value === "object") {
    const first = (value as GradientLike).colorStops?.[0]?.color
    warnings.push({
      element: label,
      reason: "Used a gradient or pattern; approximated with its first colour.",
    })
    return typeof first === "string" ? first : fallback
  }
  return fallback
}

function optionalStroke(value: unknown): string | null {
  return typeof value === "string" && value !== "none" ? value : null
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

function collectLeaves(object: FabricObject, leaves: FabricObject[]): void {
  if (object instanceof Group) {
    for (const child of object.getObjects()) {
      collectLeaves(child, leaves)
    }
    return
  }
  leaves.push(object)
}

function baseGeometry(
  object: FabricObject,
  transform: ReturnType<typeof util.qrDecompose>,
  warnings: SvgImportWarning[]
): BaseGeometry {
  const scaleX = Math.abs(transform.scaleX) || 1
  const scaleY = Math.abs(transform.scaleY) || 1
  const widthPx = Math.max((object.width ?? 0) * scaleX, 0.1)
  const heightPx = Math.max((object.height ?? 0) * scaleY, 0.1)
  const centerX = transform.translateX
  const centerY = transform.translateY

  if (Math.abs(transform.skewX) > 0.01 || Math.abs(transform.skewY) > 0.01) {
    warnings.push({
      element: object.type ?? "object",
      reason: "Skew is not supported and was approximated with rotation.",
    })
  }

  return {
    xMm: cssPxToMm(centerX - widthPx / 2),
    yMm: cssPxToMm(centerY - heightPx / 2),
    widthMm: cssPxToMm(widthPx),
    heightMm: cssPxToMm(heightPx),
    rotationDeg: normalizeRotation(transform.angle),
    opacity: effectiveOpacity(object),
    visible: object.visible !== false,
    locked: false,
  }
}

function textPathForLine(line: Line): string {
  const x1 = line.x1 ?? 0
  const y1 = line.y1 ?? 0
  const x2 = line.x2 ?? 0
  const y2 = line.y2 ?? 0
  return `M ${x1} ${y1} L ${x2} ${y2}`
}

function textPathForPoints(
  points: Array<{ x: number; y: number }>,
  close: boolean
): string {
  const commands = points.map(
    (point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
  )
  return `${commands.join(" ")}${close ? " Z" : ""}`
}

function pathDataFromPath(path: Path): string {
  return path.path.map((command) => command.join(" ")).join(" ")
}

async function convertLeaf(
  object: FabricObject,
  element: Element | undefined,
  transform: ReturnType<typeof util.qrDecompose>,
  warnings: SvgImportWarning[]
): Promise<LeafConversion | null> {
  const base = baseGeometry(object, transform, warnings)
  const scaleX = Math.abs(transform.scaleX) || 1
  const scaleY = Math.abs(transform.scaleY) || 1

  // SVG scales strokes with the element transform (including the root viewBox group). The editor
  // rebuilds paths at a different Fabric scale with `strokeUniform`, so the stroke must already be
  // expressed in final page units or it renders enormously thick.
  const strokeScale = Math.sqrt(scaleX * scaleY)
  const toStrokeWidthMm = (width: number | undefined, fallback = 0): number =>
    cssPxToMm((width ?? fallback) * strokeScale)

  if (Math.abs(scaleX - scaleY) / Math.max(scaleX, scaleY) > 0.05) {
    warnings.push({
      element: object.type ?? "object",
      reason:
        "Non-uniform scaling changes stroke thickness; a single uniform stroke width was used.",
    })
  }

  if (object instanceof Textbox || object instanceof Text) {
    const text: TextObject = {
      ...base,
      id: createId(),
      type: "text",
      name: "Imported text",
      text: object.text ?? "",
      fontFamily: object.fontFamily || "Arial",
      fontSizePt: cssPxToPt((object.fontSize || 16) * scaleY),
      fontWeight: fontWeightValue(object.fontWeight),
      fontStyle: object.fontStyle === "italic" ? "italic" : "normal",
      fill: solidColor(object.fill, "#111111", warnings, "Text"),
      textAlign:
        object.textAlign === "center" ||
        object.textAlign === "right" ||
        object.textAlign === "justify"
          ? object.textAlign
          : "left",
      lineHeight: object.lineHeight ?? 1.2,
      letterSpacingEm: (object.charSpacing ?? 0) / 1000,
      underline: object.underline ?? false,
    }
    return { object: text }
  }

  if (object instanceof FabricImage) {
    const src = object.getSrc()
    const asset = await createImageAssetFromDataUrl(
      src,
      "Imported image"
    )
    if (!asset) {
      warnings.push({
        element: "image",
        reason: "External images are not allowed and were skipped.",
      })
      return null
    }
    const image: ImageObject = {
      ...base,
      id: createId(),
      type: "image",
      name: asset.name,
      assetId: asset.id,
    }
    return { object: image, asset }
  }

  if (object instanceof Circle || object instanceof Ellipse) {
    const ellipse: EllipseObject = {
      ...base,
      id: createId(),
      type: "ellipse",
      name: "Imported ellipse",
      fill: solidColor(object.fill, "transparent", warnings, "Ellipse"),
      stroke: optionalStroke(object.stroke),
      strokeWidthMm: toStrokeWidthMm(object.strokeWidth),
    }
    return { object: ellipse }
  }

  if (object instanceof Rect) {
    const rect: RectObject = {
      ...base,
      id: createId(),
      type: "rect",
      name: "Imported rectangle",
      fill: solidColor(object.fill, "transparent", warnings, "Rectangle"),
      stroke: optionalStroke(object.stroke),
      strokeWidthMm: toStrokeWidthMm(object.strokeWidth),
      radiusMm: cssPxToMm(
        (object.rx ?? 0) * (Math.abs(transform.scaleX) || 1)
      ),
    }
    return { object: rect }
  }

  if (object instanceof Path) {
    const pathData = element?.getAttribute("d") ?? pathDataFromPath(object)
    const path: PathObject = {
      ...base,
      id: createId(),
      type: "path",
      name: "Imported path",
      pathData,
      fill: typeof object.fill === "string" ? object.fill : null,
      stroke: optionalStroke(object.stroke),
      strokeWidthMm: toStrokeWidthMm(object.strokeWidth),
    }
    return { object: path }
  }

  if (object instanceof Polyline || object instanceof Polygon) {
    const pathData = textPathForPoints(
      object.points ?? [],
      object instanceof Polygon
    )
    const path: PathObject = {
      ...base,
      id: createId(),
      type: "path",
      name: "Imported shape",
      pathData,
      fill: typeof object.fill === "string" ? object.fill : null,
      stroke: optionalStroke(object.stroke),
      strokeWidthMm: toStrokeWidthMm(object.strokeWidth),
    }
    return { object: path }
  }

  if (object instanceof Line) {
    const path: PathObject = {
      ...base,
      id: createId(),
      type: "path",
      name: "Imported line",
      pathData: textPathForLine(object),
      fill: null,
      stroke: optionalStroke(object.stroke) ?? "#000000",
      strokeWidthMm: toStrokeWidthMm(object.strokeWidth, 1),
    }
    return { object: path }
  }

  warnings.push({
    element: object.type ?? "object",
    reason: "This element type is not supported and was skipped.",
  })
  return null
}

type PageSize = {
  widthMm: number
  heightMm: number
}

/**
 * Fabric normalizes the root viewBox into `options.width`/`options.height` in CSS px at 96 DPI.
 * Those dimensions are the SVG page, which is what imported objects are positioned against.
 */
function pageSizeMm(
  options: Record<string, unknown>,
  objects: TemplateObject[]
): PageSize | null {
  const widthPx = Number(options.width)
  const heightPx = Number(options.height)
  if (
    Number.isFinite(widthPx) &&
    widthPx > 0 &&
    Number.isFinite(heightPx) &&
    heightPx > 0
  ) {
    return { widthMm: cssPxToMm(widthPx), heightMm: cssPxToMm(heightPx) }
  }

  // Fallback for SVGs without width/height or a viewBox: use the artwork extent.
  const bounds = combinedBounds(objects)
  return bounds
    ? { widthMm: bounds.width, heightMm: bounds.height }
    : null
}

/**
 * Maps the SVG page onto the canvas 1:1 (scaling down only when the page exceeds the canvas) and
 * keeps every object's position relative to the page. Fitting the content bounds instead would
 * blow up small elements that sit inside a large page.
 */
function placePageOnCanvas(
  objects: TemplateObject[],
  page: PageSize,
  canvas: CanvasSize
): void {
  const scale = Math.min(
    1,
    canvas.widthMm / Math.max(page.widthMm, 0.001),
    canvas.heightMm / Math.max(page.heightMm, 0.001)
  )
  const offsetX = (canvas.widthMm - page.widthMm * scale) / 2
  const offsetY = (canvas.heightMm - page.heightMm * scale) / 2

  for (const object of objects) {
    object.xMm = offsetX + object.xMm * scale
    object.yMm = offsetY + object.yMm * scale
    object.widthMm = Math.max(object.widthMm * scale, 0.1)
    object.heightMm = Math.max(object.heightMm * scale, 0.1)

    if (object.type === "text") {
      object.fontSizePt = Math.max(object.fontSizePt * scale, 1)
    }
    if (object.type === "rect") {
      object.radiusMm *= scale
    }
    if (
      object.type === "rect" ||
      object.type === "ellipse" ||
      object.type === "path"
    ) {
      object.strokeWidthMm *= scale
    }
  }
}

export type SvgImportOptions = {
  /**
   * Place the page 1:1 and let the caller resize the canvas to match the reported page size.
   * Used by the "Match canvas to SVG" import option.
   */
  matchCanvasSize?: boolean
}

export async function importSvgString(
  source: string,
  canvas: CanvasSize,
  options: SvgImportOptions = {}
): Promise<SvgImportResult> {
  const clean = DOMPurify.sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["script", "foreignObject", "iframe", "object", "embed"],
    ADD_ATTR: ["xlink:href"],
  })

  const parsed = new DOMParser().parseFromString(clean, "image/svg+xml")
  if (parsed.querySelector("parsererror")) {
    throw new FileValidationError("The SVG could not be parsed.")
  }
  if (parsed.documentElement.tagName.toLowerCase() !== "svg") {
    throw new FileValidationError("The file is not an SVG.")
  }
  if (parsed.querySelectorAll("*").length > MAX_SVG_NODES) {
    throw new FileValidationError(
      "This SVG is too complex to edit. Use a simpler export."
    )
  }

  const lower = clean.toLowerCase()
  for (const forbidden of [
    "<script",
    "javascript:",
    'href="http',
    "href='http",
    'xlink:href="http',
    "xlink:href='http",
  ]) {
    if (lower.includes(forbidden)) {
      throw new FileValidationError(
        "The SVG contains external or unsafe content and cannot be imported."
      )
    }
  }

  const warnings: SvgImportWarning[] = []
  for (const tag of UNSUPPORTED_TAGS) {
    if (parsed.querySelector(tag)) {
      warnings.push({
        element: tag,
        reason: "This SVG feature is not supported and was ignored.",
      })
    }
  }

  const elementByObject = new WeakMap<FabricObject, Element>()
  const parsedSvg = await loadSVGFromString(clean, (element, fabricObject) => {
    elementByObject.set(fabricObject, element)
  })


  const leaves: FabricObject[] = []
  for (const object of parsedSvg.objects) {
    if (object) collectLeaves(object, leaves)
  }

  const objects: TemplateObject[] = []
  const assets: ImageAsset[] = []

  for (const leaf of leaves) {
    const matrix = leaf.calcTransformMatrix()
    const transform = util.qrDecompose(matrix)
    const element = elementByObject.get(leaf)
    const conversion = await convertLeaf(leaf, element, transform, warnings)
    if (!conversion) continue
    objects.push(conversion.object)
    if (conversion.asset) assets.push(conversion.asset)
  }

  if (objects.length === 0) {
    throw new FileValidationError(
      "The SVG does not contain any supported elements."
    )
  }

  // Font detection: text keeps its declared family, but say so if this device cannot render it.
  const families = new Set(
    objects
      .filter((object) => object.type === "text")
      .map((object) => object.fontFamily)
  )
  for (const family of families) {
    if (!(await isFamilyAvailable(family))) {
      warnings.push({
        element: "text",
        reason: `Font "${family}" is not available on this device; text will use a fallback.`,
      })
    }
  }

  const page = pageSizeMm(parsedSvg.options, objects)
  if (page) {
    // With "match canvas", place the page against its own frame so the caller can resize the
    // canvas to the reported size and keep a 1:1 mapping (zero offsets).
    const placementCanvas = options.matchCanvasSize
      ? { widthMm: page.widthMm, heightMm: page.heightMm }
      : canvas
    placePageOnCanvas(objects, page, placementCanvas)
  }

  const uniqueWarnings = Array.from(
    new Map(
      warnings.map((warning) => [
        `${warning.element}:${warning.reason}`,
        warning,
      ])
    ).values()
  )

  return {
    objects,
    assets,
    warnings: uniqueWarnings,
    widthMm: page?.widthMm ?? 0,
    heightMm: page?.heightMm ?? 0,
  }
}

export async function importSvgFile(
  file: File,
  canvas: CanvasSize,
  options: SvgImportOptions = {}
): Promise<SvgImportResult> {
  assertFileSize(file, MAX_SVG_BYTES, "SVG")
  const source = await readFileAsText(file)
  return importSvgString(source, canvas, options)
}
