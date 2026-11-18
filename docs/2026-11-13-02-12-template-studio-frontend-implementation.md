# Template Studio — Frontend Implementation (Phases 1–2)

> **Status:** Implemented; build-green
> **Owner:** Frontend
> **Date:** 2026-11-13
> **Plan:** [Template Studio frontend plan](./2026-11-13-01-48-template-studio-frontend-plan.md)
> **Related:** [Generators & certificates contract](./2026-11-10-19-17-api-contract-generators-certificates.md)

This note records what shipped for the Template Studio frontend, where it lives, and what the next
phase must pick up.

---

## 1. What works

- **Draft library** at `/events/[eventId]/template-studio`:
  - create (name, scope, A5/A4/A3/custom, portrait/landscape, mm/px),
  - open, duplicate, delete, export native JSON, import native JSON,
  - search and scope filter, local-only notice, empty/filtered-empty states.
- **Canvas editor** at `/events/[eventId]/template-studio/[draftId]`:
  - A5/A4/A3/custom canvas, orientation, unit readout, background colour,
  - add text and PNG/JPEG/WebP images, import sanitized SVG (groups flattened),
  - select/move/resize/rotate/delete, duplicate, lock/unlock, layer reorder/rename/visibility,
  - X/Y/W/H, rotation, opacity fields; alignment relative to canvas or selection,
  - undo/redo with gesture and field coalescing, keyboard shortcuts, zoom/pan/fit,
  - font picker (system, event fonts by family name, uploaded fonts), font upload via FontFace,
  - data panel with the 12 placeholder tokens, insert-at-caret, replace-text, editable sample
    values, unknown-token validation, and a read-only sample-data preview,
  - autosave to IndexedDB (debounced, with thumbnails), export/import JSON, unsaved-changes guard,
  - mobile fallback that does not mount Fabric.
- **Entry points:** Documents → Template Studio in the event navigation, plus “Template Studio”
  buttons on Bib generator and Certificates.

Nothing is written to the API. Drafts are local to the browser and are not generator templates yet;
both the library and editor say so.

---

## 2. Key files

```
apps/app/features/template-studio/
  model/        units, canvas presets, zod document schema, defaults, geometry,
                placeholder catalog/engine, preview overrides, object patches
  store/        zustand store factory + context, history stack, selectors
  engine/       Fabric engine, native<->Fabric mapper, sanitized SVG importer,
                image importer, FontFace registry, engine context
  repository/   TemplateRepository, IndexedDB + in-memory implementations, JSON transfer
  hooks/        autosave, editor shortcuts, navigation guard
  components/   library, route loader, three-pane editor, panels, inspectors, dialogs
apps/app/app/(organizer)/events/[eventId]/template-studio/{page,[draftId]/page}.tsx
packages/api-client/src/query-keys.ts        added eventFonts(eventId)
apps/app/lib/navigation.ts                   added Template Studio
```

New dependencies in `apps/app`: `fabric@6.9.1`, `zustand@5.1.0`, `idb-keyval@6.3.0`,
`dompurify@^3.4.0`. New primitives in `packages/ui`: popover, scroll-area, slider, toggle,
toggle-group (added with the shadcn CLI). `pnpm-workspace.yaml` now sets `canvas: false` because the
editor is browser-only.

---

## 3. Architecture notes for maintainers

- **Document is the source of truth.** The Fabric canvas is a projection. Canvas gestures emit
  intents (`selectionChanged`, `objectsCommitted`, `textChanged`, `editingChanged`); only store
  actions change the document. `applyScene` diffs by object id, skips the object currently being
  text-edited, and only reorders when the z-order actually changed.
- **History is scene-only** (`canvas` + `objects`). Images/fonts are shared by reference between
  snapshots. Text editing is one entry via a begin/commit transaction; slider/field edits coalesce
  by key for one second.
- **Geometry is stored in millimetres** and font sizes in points. The editor renders at 96 DPI
  (`mm * 96 / 25.4`). Fabric objects use centre origins; effective sizes are read back and scale is
  reset in the document.
- **Preview never mutates the document.** It substitutes text through an engine override map and
  clears selection; exiting preview restores the raw text. Example values stay editable during
  preview and are saved with the draft (they are not written into the design).
- **Fabric is client-only.** `canvas-stage` is imported with `next/dynamic` + `ssr: false`, and the
  SVG importer (which also imports Fabric) is loaded on demand from the dialog. Do not add a static
  `fabric` import to any module reachable from the route’s server render.

---

## 4. Verification

```bash
pnpm --filter app typecheck   # clean
pnpm --filter app lint        # clean
pnpm --filter app build       # exit 0; both routes appear in the build output
```

A temporary Node smoke test (compiled with `tsc`, removed afterwards) exercised units/presets,
placeholder parsing/substitution (including injection), rotated-bounds alignment, the Zod document
round-trip, store add/update/undo/redo/remove, and the history begin/commit transaction. All passed.

The local API was also exercised with the seeded owner account: login, `GET /v1/events/{id}`,
`GET /v1/me/access?eventId=` (the owner has `event:generators:manage`), and
`GET /v1/events/{id}/fonts` all returned `200`. The built app served the new routes with `200` and no
server error; the Fabric editor itself still needs a browser pass because it is client-only.

Manual checks still worth running in a browser (the API must be available for the event shell):

1. Create A4 portrait and A3 landscape drafts; verify sizes and px readouts.
2. Import an SVG with text, rect, nested group, and an embedded image; confirm objects are editable
   and the report lists dropped/approximated features.
3. Upload a font, apply it, reload the draft, confirm the font still renders.
4. Drag/resize/rotate, lock, reorder, align; confirm one gesture is one undo step.
5. Insert `{FULL_NAME}` at the caret, edit example values in preview, exit and confirm tokens are
   restored; enter `{NOPE}` and confirm it is flagged but preserved.
6. Reload to confirm autosave; export JSON, delete, re-import, and reopen.
7. Confirm React StrictMode mounts the Fabric canvas once (no duplicate canvases).
8. Confirm the feature is hidden without `event:generators:manage`.

---

## 5. SVG import scaling fix (2026-11-13)

An SVG with a physical page (`width="210mm" height="148mm"`) and a large `viewBox`
(≈20986 × 14790) imported as an oversized path. Two causes:

- **Strokes ignored the transform.** Fabric's `applyViewboxTransform` wraps content in a group with
  scale ≈ 0.0378 (210 mm at 96 DPI). Object boxes were read through `calcTransformMatrix()`, but
  `stroke-width="118.89"` was stored without that scale: 31.44 mm instead of 1.19 mm. With the
  editor's `strokeUniform: true`, a 10 mm path rendered with a ~31 mm stroke.
- **Content was fitted, not the page.** `fitToCanvas` scaled/centred the artwork bounds, losing the
  element's position on its page.

Fix in `engine/svg-importer.ts`:

- Imported stroke widths are multiplied by the decomposed element scale (geometric mean of
  `scaleX`/`scaleY`), with a warning when a non-uniform scale makes the stroke approximate.
- The SVG page from Fabric's normalized `options.width/height` is placed 1:1 on the canvas (centred,
  scaled down only when it exceeds the canvas), and objects keep their page-relative positions.
- `Match canvas to the SVG page` in the import dialog resizes an empty draft to that page size.

Headless verification (Fabric + jsdom, temporary harness) against `test svg (1).svg`:

| Canvas | Page | Path | Stroke | Position |
| --- | --- | --- | --- | --- |
| A5 landscape 210×148 | 210×148 mm | 11.08 × 11.08 mm | 1.19 mm | x 188.33, y 91.88 |
| A4 portrait 210×297 | 210×148 mm | 11.08 × 11.08 mm | 1.19 mm | x 188.33, y 166.38 (74.5 mm offset) |
| A5 portrait 148×210 | 210×148 mm | 7.81 × 7.81 mm | 0.84 mm | x 132.73 (0.705 scale) |

---

## 6. Deferred (next phase)

- Server persistence and versioning; the current API still accepts only SVG or its restricted
  `rect|text|image` JSON with `{{camelCase}}` variables.
- Compiled-SVG generation (`design.svg`) and validation.
- QR code and barcode placeholder elements.
- Template assets/fonts in storage (presigned uploads, stable references, signed font URLs).
- Backend placeholder catalog expansion to the 12 UI tokens.
- In-app Back/Forward blocking (only `beforeunload` and autosave flush are covered).
- Image replace/crop, nested group editing, and vector pen tools.
