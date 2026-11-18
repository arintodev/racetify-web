# Watermark Configuration UI

> **Status:** Implemented
> **Date:** 2026-11-16
> **Applies to:** `apps/app` organizer event gallery, `racetify-api` watermark module
> **Related:** [Rendering Rules](./2026-11-16-10-53-watermark-rendering-rules.md) ·
> [Gallery & Media Contract](./2026-11-10-19-17-api-contract-gallery-media.md)

## What changed

The event watermark screen is now a preset list plus a dedicated, full-width configuration editor
with a live, resolution-independent preview.

| Route | Purpose |
| --- | --- |
| `/events/[eventId]/gallery/watermarks` | Preset list; active badge, configure and delete actions |
| `/events/[eventId]/gallery/watermarks/new` | Create a preset |
| `/events/[eventId]/gallery/watermarks/[watermarkId]` | Configure a preset |

The editor uses a two-column layout on desktop: configuration on the left, sticky preview and
summary on the right. On mobile the columns stack.

## Preset model and activation

The existing API models multiple named presets per `(event, scope)`, with at most one default. The
spec's single "watermark configuration" is therefore implemented as the configuration of one
preset:

- `isDefault` is surfaced as **Active**. Turning it off keeps every other setting and lets the
  worker process photos without this preset. Only one preset per scope can be active.
- Creating and editing are separate routes because a preset needs a name and scope before it can be
  configured.
- `scope` is editable while creating; it is immutable afterwards (the API has no scope update).

## Configuration contract

All persisted values are resolution-independent:

| Field | API field | Stored range | UI |
| --- | --- | --- | --- |
| Size | `sizeRatio` | `0.05`–`0.5` of the longest edge | 5–50%, step 1 |
| Margin | `marginRatio` | `0`–`0.2` of the shortest edge | 0–20%, step 0.5 |
| Opacity | `opacity` | `0`–`1` | 0–100%, step 1 |
| Rotation | `rotation` | `-180`–`180°` | −180–180°, step 1 |
| Horizontal spacing | `spacingXRatio` | `0`–`1` of the shortest edge | 0–100%, step 1 |
| Vertical spacing | `spacingYRatio` | `0`–`1` of the shortest edge | 0–100%, step 1 |
| Position | `position` | nine presets | Dropdown (nine anchors + Repeat) |
| Repeat | `repeatMode` | `none` / `tiled` | Repeat tile in the picker |
| Text style | `fontFamily`, `fontWeight`, `textColor` | family ≤ 100 chars, weight 100–900, `#RRGGBB` | Font / weight / colour |

Defaults: size 20%, margin 3%, opacity 35%, rotation 0°, spacing 12%/12%, bottom-right, Inter 600
`#ffffff`.

The image asset also stores `imageName`, `imageWidth`, `imageHeight`, resolved at upload time
(dimensions are read from the image header and kept in `storage.uploads.context` until attach), so
the editor can show the asset dimensions and compute the preview without waiting for the image.

## Save, cancel, reset

- **Save** uploads a pending replacement image, rejects an image preset with no asset, persists all
  fields, invalidates the preset list, toasts, and returns to the list. A failed save keeps the form.
- **Cancel** confirms when the form is dirty (or the asset changed), then returns to the list.
- **Reset** confirms, then restores the configuration defaults while keeping the name, scope, type,
  image, and text. `isDirty` is re-based on the reset values.

## Preview behaviour

- Fixed square canvas; both orientations use the same canvas size and scale factor.
- The photo is laid out with contain math; the watermark rectangles are derived from the same
  `previewScale` (see the rendering rules).
- Switching orientation never changes configuration.
- Instant updates on every form change.
- Empty states for a missing image or empty text; a preview image failure shows an inline alert,
  refreshes the 15-minute signed URL once, and never blocks editing or saving.
- The summary table shows the computed watermark, margin, and spacing pixels for both samples and
  highlights the current orientation.

## Deliberate deviations

- **No media library.** The API has no reusable asset catalog. The asset field uses the existing
  event-scoped watermark upload with Change/Remove, and displays the stored name and dimensions.
  A shared library is a follow-up.
- **No organization defaults or inheritance** in this iteration; configuration is event-level only.
- **No drag positioning.** The nine presets plus margin are the positioning model, as agreed.
- **Text sizing** uses the documented `TEXT_SIZE_FACTOR` constant because the specification only
  defines a formula for image watermarks.
- The specification's separate **Advanced options** group is represented by the repeat-spacing and
  typography sections rather than a distinct panel.
- **`scale` retired.** The old multiplier never reached a rasteriser. Migration
  `1710_media__watermark_configuration.sql` maps existing values with
  `size_ratio = clamp(scale × 0.2)` and then drops the column.

## API changes

- Migration adds the ratio, typography, and image-metadata columns; expands the position check to
  nine values; sets the opacity default to 0.35; adds range checks.
- `WatermarkDto` exposes the new fields plus `imageUrlExpiresAt`.
- `CreateWatermarkRequest` / `UpdateWatermarkRequest` accept the new fields; update accepts `type`
  so a preset can switch between image and text. Switching image → text clears and deletes the
  image; switching text → image requires an upload and clears the text.
- `WatermarkUploadDto` returns the decoded `width`/`height`.

## Verification

- Rust: `cargo fmt`, `cargo check --workspace`, `cargo test -p gallery` (validation and image
  dimension decoding), `cargo run -p api --bin openapi`.
- Web: `pnpm contract:sync`, `pnpm contract:generate`, `pnpm --filter app test`,
  `pnpm --filter app typecheck`, `pnpm --filter app lint`, `pnpm --filter app build`.
- The geometry tests assert the 600 px / 20% / 3:1 example (120 × 40 px in both orientations),
  margin reference, rotation clamping, repeat stepping, and the tile cap.
