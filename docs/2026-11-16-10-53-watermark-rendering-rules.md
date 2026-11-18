# Watermark Rendering Rules

> **Status:** Implemented (frontend, API contract, and Rust media worker)
> **Date:** 2026-11-16
> **Applies to:** `apps/app/features/watermarks`, `racetify-api` gallery processing, and the
> watermark configuration API
> **Related:** [Watermark Configuration UI](./2026-11-16-10-53-watermark-configuration-ui.md) ·
> [Gallery & Media Contract](./2026-11-10-19-17-api-contract-gallery-media.md)

This is the single source of truth for how a watermark maps from configuration to pixels. The
frontend implementation lives in `apps/app/features/watermarks/lib/geometry.ts` and is covered by
`geometry.test.ts`. A worker that rasterises watermarks must reproduce these rules exactly.

All dimensions are taken from the **original decoded photo after EXIF orientation**, never from the
preview.

## 1. Reference dimensions

```
longEdge  = max(photoWidth, photoHeight)
shortEdge = min(photoWidth, photoHeight)
```

Two different references are used deliberately:

| Value | Reference | Formula |
| --- | --- | --- |
| Watermark size | longest edge | `watermarkWidth = longEdge × sizeRatio` |
| Margin | shortest edge | `margin = shortEdge × marginRatio` |
| Repeat spacing | shortest edge | `spacing = shortEdge × spacingRatio` |

## 2. Image watermarks

```
watermarkWidth  = longEdge × sizeRatio
assetAspect     = assetWidth / assetHeight
watermarkHeight = watermarkWidth / assetAspect
```

The asset aspect ratio is never distorted. `sizeRatio` is stored as a fraction (`0.05`–`0.5`);
the UI displays it as a percentage (default 20%).

Because the reference is the longest edge, a `1280 × 720` landscape photo and a `720 × 1280`
portrait photo with `sizeRatio = 0.2` both produce a `256 px` wide watermark:

| Photo | Longest edge | Watermark width | Watermark height (3:1) |
| --- | ---: | ---: | ---: |
| 1280 × 720 | 1280 | 256 px | 85.3 px |
| 720 × 1280 | 1280 | 256 px | 85.3 px |

## 3. Text watermarks

Text has no intrinsic aspect ratio, so it uses a separate documented rule:

```
fontSize = longEdge × sizeRatio × TEXT_SIZE_FACTOR
TEXT_SIZE_FACTOR = 0.25
lineHeight = 1.2
```

The text is a single line measured with the configured font family and weight. If the measured
width exceeds `photoWidth − 2 × margin`, the font size is scaled down so the line fits. The
measured text box is then positioned and rotated like an image watermark.

The worker must use the same `TEXT_SIZE_FACTOR`, line height, and font stack. Web-font availability
can make text metrics differ slightly; this is accepted and documented rather than approximated.

## 4. Position presets

Nine anchors: `top_left`, `top_center`, `top_right`, `center_left`, `center`, `center_right`,
`bottom_left`, `bottom_center`, `bottom_right`.

For each axis:

| Anchor | Top-left coordinate |
| --- | --- |
| left / top | `margin` |
| center | `(photoSize − watermarkSize) / 2` |
| right / bottom | `photoSize − watermarkSize − margin` |

Margin only applies to the edge the anchor touches; centred axes ignore it.

### Clamping

1. Compute the rotated AABB of the watermark:
   `aabbW = |w·cosθ| + |h·sinθ|`, `aabbH = |w·sinθ| + |h·cosθ|`.
2. If the AABB exceeds the usable area (`photo − 2 × margin`), scale the whole watermark down
   proportionally until it fits.
3. Clamp the AABB top-left to the photo bounds, then centre the unrotated box inside the AABB.

The watermark therefore stays inside the photo for every preset, rotation, and asset aspect.

## 5. Repeat mode

Repeat ignores the position preset.

```
stepX = watermarkWidth  + shortEdge × spacingXRatio
stepY = watermarkHeight + shortEdge × spacingYRatio
```

Tiles are laid on a lattice **centred on the photo centre**: tile centres at
`(photoWidth/2 + i·stepX, photoHeight/2 + j·stepY)`. The lattice extends one step past the photo on
every side, and tiles are clipped at the photo bounds — clipped edges are intentional. Rotation is
around each tile's centre; opacity applies to every tile.

The tile count is capped at **2,000** to keep DOM and raster work bounded. Normal settings produce a
few hundred tiles; the cap only applies at extreme size/spacing combinations.

Defaults: horizontal and vertical spacing `0.12` (12% of the short edge).

## 6. Opacity and rotation

- `opacity` is stored as `0`–`1` (displayed 0–100%, default 35%).
- `rotation` is stored in degrees, `-180`–`180`, default `0`.

## 7. Live preview

The preview is a **square canvas** with a fixed logical size (`PREVIEW_CANVAS_SIZE = 600`).

```
previewScale = canvasSize / longEdge
photoRect    = contain(photo, canvasSize)   // longest edge maps to canvasSize
```

The photo is rendered with `object-fit: contain` inside the square. The watermark rectangles are
computed in canvas units using the **same** `previewScale`; nothing is scaled from the container's
width or height independently. The composition is expressed in percentages of the square (text uses
container-relative `cqw` units), so it scales uniformly with the viewport.

Example at 600 px:

| Photo | Preview photo | Watermark width (20%) | Watermark height (3:1) |
| --- | --- | ---: | ---: |
| 1280 × 720 | 600 × 337.5 | 120 px | 40 px |
| 720 × 1280 | 337.5 × 600 | 120 px | 40 px |

The preview and the worker must agree on every number above. If a rule changes, update this document
first, then `geometry.ts`, then the worker.

## 8. Worker application (as built)

The Rust worker implements these rules in `racetify-api/crates/modules/gallery/src/watermark.rs`.
See `racetify-api/docs/2026-11-16-12-04-gallery-watermark-application.md` for the full as-built
notes. Key points:

- The active default `gallery` preset is baked into the **stored original** during
  `gallery.process_item`, before bib/face detection, and the public preview is generated from the
  watermarked image. `gallery.refresh_preview` never applies a watermark.
- The original is overwritten in its source container (JPEG q90, PNG lossless, WebP lossy q90) so
  the object key, download filename, and content type stay consistent. EXIF/ICC metadata is lost and
  orientation is baked into the pixels.
- Image dimension, margin, and spacing use the same ratios and anchors; the rotated AABB is clamped
  and repeat uses the same centred lattice (`MAX_REPEAT_TILES = 2000`).
- Text uses `TEXT_SIZE_FACTOR = 0.25` and line height `1.2`, measured with `usvg`/`resvg`. The
  worker falls back to DejaVu Sans when the configured family is unavailable, so metrics can differ
  slightly from the browser (documented and accepted).
- Rendering failures publish the photo unwatermarked; a per-item claim prevents a retry from
  applying the same preset twice. Detectors therefore see watermarked pixels.
