export type Bounds = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

export type BoxLike = {
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
  rotationDeg: number
}

export type PositionedBox = BoxLike & { id: string }

export type PositionPatch = {
  id: string
  xMm: number
  yMm: number
}

export type Alignment =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom"

export function boundsFromRect(
  left: number,
  top: number,
  width: number,
  height: number
): Bounds {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  }
}

/** Axis-aligned bounds of a possibly rotated box. */
export function rotatedBounds(box: BoxLike): Bounds {
  const centerX = box.xMm + box.widthMm / 2
  const centerY = box.yMm + box.heightMm / 2
  const radians = (box.rotationDeg * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  const halfWidth = (box.widthMm * cos + box.heightMm * sin) / 2
  const halfHeight = (box.widthMm * sin + box.heightMm * cos) / 2

  return {
    left: centerX - halfWidth,
    top: centerY - halfHeight,
    right: centerX + halfWidth,
    bottom: centerY + halfHeight,
    width: halfWidth * 2,
    height: halfHeight * 2,
  }
}

export function combinedBounds(boxes: BoxLike[]): Bounds | null {
  if (boxes.length === 0) return null

  let left = Number.POSITIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY

  for (const box of boxes) {
    const bounds = rotatedBounds(box)
    left = Math.min(left, bounds.left)
    top = Math.min(top, bounds.top)
    right = Math.max(right, bounds.right)
    bottom = Math.max(bottom, bounds.bottom)
  }

  return boundsFromRect(left, top, right - left, bottom - top)
}

function alignmentDelta(
  bounds: Bounds,
  target: Bounds,
  alignment: Alignment
): { dx: number; dy: number } {
  switch (alignment) {
    case "left":
      return { dx: target.left - bounds.left, dy: 0 }
    case "center":
      return {
        dx: target.left + target.width / 2 - (bounds.left + bounds.width / 2),
        dy: 0,
      }
    case "right":
      return { dx: target.right - bounds.right, dy: 0 }
    case "top":
      return { dx: 0, dy: target.top - bounds.top }
    case "middle":
      return {
        dx: 0,
        dy: target.top + target.height / 2 - (bounds.top + bounds.height / 2),
      }
    case "bottom":
      return { dx: 0, dy: target.bottom - bounds.bottom }
  }
}

/**
 * Aligns each box's rotated bounds to the target. Alignment uses the visible (rotated) bounds so
 * rotated imports behave as users expect; translation by the delta keeps the rotation intact.
 */
export function alignBoxes(
  boxes: PositionedBox[],
  target: Bounds,
  alignment: Alignment
): PositionPatch[] {
  return boxes.map((box) => {
    const delta = alignmentDelta(rotatedBounds(box), target, alignment)
    return {
      id: box.id,
      xMm: box.xMm + delta.dx,
      yMm: box.yMm + delta.dy,
    }
  })
}

export function clampRotation(value: number): number {
  let rotation = value % 360
  if (rotation > 180) rotation -= 360
  if (rotation <= -180) rotation += 360
  return Math.round(rotation * 100) / 100
}

export function duplicateOffset(step = 5): { x: number; y: number } {
  return { x: step, y: step }
}
