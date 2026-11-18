# Template Studio — Frontend Plan (Phases 1–2)

> **Status:** Phases 1–2 implemented; see [implementation note](./2026-11-13-02-12-template-studio-frontend-implementation.md)
> **Owner:** Frontend
> **Date:** 2026-11-13
> **Related:** [Generators & certificates contract](./2026-11-10-19-17-api-contract-generators-certificates.md) ·
> [Frontend architecture](./2026-11-10-07-26-frontend-architecture.md) ·
> [UI guidelines](./2026-11-10-07-26-frontend-ui-guidelines.md) ·
> [Route map](./2026-11-10-07-26-frontend-route-map.md)

This document is the implementation plan for the Template Studio frontend. It records the native
template JSON contract so the backend can align its renderer in the next phase. It is kept here for
the next implementation session.

---

## 1. Context

Organizers can already pick a generator template and run bib/certificate batches, but there is no
way to *create* a template. Templates today can only arrive as a sanitized SVG or the backend's
tiny `{ elements: [rect|text|image] }` JSON, and the backend renderer accepts only `{{camelCase}}`
variables from a fixed 12-name catalog. The Template Studio plan replaces that workflow with a
Fabric.js canvas editor whose source of truth is a rich native JSON document.

This pass builds the **frontend foundation first**:

- **Phase 1** — canvas, objects, text, fonts, layers, undo/redo, zoom/pan, alignment, lock.
- **Phase 2** — `{FULL_NAME}`-style placeholders, editable example data, live sample-data preview.

Server persistence, template versioning, the compiled-SVG compiler, QR/barcode elements, and the
generator-job integration are deliberately deferred. To keep the feature usable now, drafts are
stored locally (IndexedDB) and can be exported or imported as native JSON. The data layer sits
behind a repository interface so an API-backed implementation can be swapped in later without
touching the editor.

Known gaps while the backend catches up:

- Today's renderer understands only `{{bibNumber}}`-style variables and the restricted JSON layout.
  The native document is **not yet** consumable by it.
- There are no template asset or font upload endpoints; images and custom fonts are local-only and
  the UI must say so plainly.
- Local drafts are not generator templates. Generation keeps using templates saved through the API
  until the next phase wires them together.

---

## 2. Decisions

1. Scope = Phases 1–2, plus local draft plumbing so work is not lost.
2. Persistence = local drafts (IndexedDB) + native JSON export/import behind a
   `TemplateRepository` interface. No API save in this pass.
3. Placeholder syntax = `{FULL_NAME}`, `{FIRST_NAME}`, `{LAST_NAME}`, `{BIB}`, `{GENDER}`,
   `{COUNTRY}`, `{CATEGORY}`, `{DISTANCE}`, `{FINISH_TIME}`, `{OVERALL_RANK}`, `{GENDER_RANK}`,
   `{CATEGORY_RANK}`.
4. Custom fonts and images = local-only (FontFace API, data URLs), with an explicit UI note.
5. Fabric **6.9.1** is pinned for this pass. v7.4.0 is current but changes the default object origin
   to center and has unverified parser changes; revisit v7 as a separate upgrade.
6. Canonical document geometry is **millimetres**; the editor renders at 96 DPI. See §6.4.

---

## 3. Out of scope

QR/barcode elements, the compiled-SVG compiler, server save/open, versioning, draft/published
status, template duplication on the server, PDF/print output, and generator-job integration.

---

## 4. Where it lives

Organizer app (`apps/app`), event scope, inside the existing organizer shell (`WorkspaceShell`
already provides `RequireSession`, the event fetch, `AccessProvider`, and navigation).

| Route | Purpose |
| --- | --- |
| `/events/[eventId]/template-studio` | Local draft library; create, import, duplicate, delete, export |
| `/events/[eventId]/template-studio/[draftId]` | Template Studio editor |

- Both pages are client components gated by
  `<RequirePermission permission="event:generators:manage">`.
- Add a **Template Studio** item (`LayoutTemplate` icon) to the Documents group in
  `apps/app/lib/navigation.ts`, above Bib generator.
- Add a “Template Studio” link in the `PageHeader` actions of the Bib generator and Certificates
  pages. Use `Button nativeButton={false} render={<Link … />}` — this repo's Base UI `Button` has no
  `asChild`.
- The library preselects scope via `?scope=bib|certificate` from those links.
- The editor needs the full viewport: the page wrapper uses negative shell margins
  (`-m-4 md:-m-6`), `h-[calc(100svh-4rem)]`, and `overflow-hidden`.

---

## 5. Architecture

### 5.1 Ownership

| Layer | Owns | Never owns |
| --- | --- | --- |
| Store (zustand) | serializable `TemplateDocument`, selection, history, zoom %, preview/save state, panel state | Fabric objects, DOM, pixels |
| React | panels, selector subscriptions, ephemeral input strings | document or Fabric mutation |
| Engine (plain class) | canvas, viewport, direct manipulation, text caret, rendered projection | persistence, history, canonical geometry |

**The document is the source of truth; Fabric is a projection plus an input device.** Only store
actions mutate the document; only engine methods mutate Fabric. Canvas gestures produce *intents*.

Use zustand 5 with a **per-editor vanilla store** (`createStore`) provided through a React context —
not a module singleton, so two tabs/editors cannot share state. Selector subscriptions keep drag
ticks from re-rendering the whole editor, and `store.getState()` is callable from engine callbacks.

State shape:

```ts
type EditorState = {
  status: "loading" | "ready" | "error"
  document: TemplateDocument
  selectedIds: string[]
  preview: boolean
  zoom: number                 // display only; the engine owns the viewport
  save: { state: "saved" | "dirty" | "saving" | "error"; savedAt: string | null }
  ui: { leftTab: "add" | "layers" | "data"; dialog: string | null }
}
```

Actions: `loadDocument`, `updateCanvas`, `addObject`, `updateObject(id, patch, { history })`,
`updateMany`, `removeObjects`, `duplicateObjects`, `reorderObject`, `renameLayer`, `setVisible`,
`setLocked`, `setSelection`, `setExampleValue`, `addAsset`, `addFont`, `undo`, `redo`, `setPreview`,
`markSaving`/`markSaved`/`markSaveError`.

### 5.2 Engine ↔ store

Engine → store intents:

```ts
type EngineIntent =
  | { type: "selectionChanged"; ids: string[] }
  | { type: "transformCommitted"; updates: GeometryUpdate[] }   // one history entry
  | { type: "textChanged"; id: string; text: string; committed: boolean }
  | { type: "editingChanged"; id: string | null }
  | { type: "zoomChanged"; zoom: number }
  | { type: "cursorChanged"; objectId: string; start: number; end: number }
```

Loop prevention, all required:

1. Single writer per direction: intents never call engine methods; store actions never receive a
   `FabricObject`.
2. `isApplying` guard in the engine; Fabric event handlers early-return while it is set, cleared in a
   microtask after `requestRenderAll()`.
3. React bridge effect keyed on `document`/`selectedIds` calls `engine.applyScene(prev, next)`.
   `applyScene` **diffs by id and field** (added, removed, changed, z-order) and skips equal values,
   so a store update caused by a canvas gesture is a no-op on the second pass.
4. Programmatic selection is silent (`setSelection(ids, { silent: true })`), and the bridge skips the
   call when the id arrays already match.
5. Panel inputs keep local string state (caret stability) and commit on blur/Enter; sliders commit
   with coalesced history.

### 5.3 History

- Snapshots are **scene-only** (`{ canvas, objects }`). Assets/fonts are excluded so multi-megabyte
  data URLs are not duplicated per snapshot. Cap 50 entries.
- One entry per gesture: snapshot at `mouse:down`/`before:transform`, push on `object:modified`
  (multi-select transforms are one entry). Text: begin on first `text:changed`, commit on
  `editing:exited` or 800 ms idle. Panel fields coalesce by `objectId:field` within ~1 s.
- Add/delete/duplicate/reorder/align/token insert/canvas size take a synchronous snapshot before the
  mutation.
- Undo pops `past`, pushes the current scene into `future`, restores `canvas/objects`, then calls
  `engine.applyScene`. Filter selection to surviving ids. Do not restore zoom/pan.
- Disable document undo while previewing or while a Fabric text editor is open (Fabric handles
  in-text undo).

### 5.4 Units and geometry

- Canonical geometry is **mm**, font sizes in **pt**, rotation in **degrees**, `objects` ordered
  bottom → top.
- The editor renders at **96 DPI**: `px = mm * (96 / 25.4)` (`CSS_PX_PER_MM ≈ 3.7795`), so A4 is
  ~794 × 1123 px. 300 DPI is an export-time multiplier, never the editing canvas (A3 at 300 DPI
  would be ~3508 × 4961 px).
- `canvas.dpi` is metadata (default 96; presets may display 300) used only for `px` readouts and
  custom px input. Geometry never changes with the display unit.
- Fabric objects use `originX/originY: "center"` explicitly. Mapping:
  `left = (xMm + widthMm/2) * k`, `top = (yMm + heightMm/2) * k`.
- On `object:modified`, **bake scale into mm** (`widthMm = width * scaleX / k`) and reset
  `scaleX/scaleY` to 1. The document never carries scale; X/Y describe the top-left of the unrotated
  local box.
- Canvas presets: A5 `148×210`, A4 `210×297`, A3 `297×420` mm; custom clamped 10–2000 mm;
  orientation swaps the axes.

### 5.5 Canvas lifecycle and viewport

- Do not let React own the Fabric `<canvas>` element. `CanvasHost` renders an empty `<div ref>`;
  the engine creates the `<canvas>`, appends it, and constructs `new Canvas(el, { preserveObjectStacking: true, selection: true, renderOnAddRemove: false })`.
- `fabric` must only be imported from modules loaded with `next/dynamic` + `ssr: false` (or
  `await import()` in an effect). Its exports map `"."` to `"node": null`, so server evaluation
  fails by design. Import `type` only elsewhere.
- React 19 StrictMode double-invokes effects: keep `{ engine, disposed }` in a ref, dispose fully
  (`canvas.dispose()`, cancel RAF, abort image loads), then recreate on the second mount.
- Zoom/pan: CSS-scale the artboard canvas inside a scroll container (Fabric maps pointer coordinates
  through `getBoundingClientRect`), with space/middle-drag panning; limits 10–400 %, fit on load.
  If pointer accuracy under CSS scale proves unreliable, switch the same controller to
  `canvas.setZoom` + `viewportTransform` — isolated to `canvas-stage.tsx`.

---

## 6. Native document schema

`apps/app/features/template-studio/model/template-document.ts` — Zod schemas plus inferred types.

```ts
TemplateDocument {
  schemaVersion: 1
  id: string                      // uuid
  name: string                    // 1–120
  scope: "bib" | "certificate"
  eventId: string | null
  canvas: {
    preset: "a5" | "a4" | "a3" | "custom"
    unit: "mm" | "px"             // display preference only
    dpi: number                   // 72–600, default 96
    widthMm: number; heightMm: number
    background: string            // hex or "transparent"
  }
  objects: TemplateObject[]       // bottom → top
  exampleData: Partial<Record<PlaceholderKey, string>>
  assets: ImageAsset[]            // dataUrl, mime, widthPx/heightPx, bytes, name
  fonts: FontAsset[]              // family, format, weight, style, dataUrl, bytes
  createdAt: string; updatedAt: string
}
```

Object types: `text`, `image`, `rect`, `ellipse`, `line`, `path` (discriminated union). No `group`:
SVG groups are flattened with baked transforms (nested coordinate systems are not worth the undo
complexity).

All objects carry:

```ts
{ id, name, xMm, yMm, widthMm, heightMm, rotationDeg, opacity, visible, locked }
```

- **text** — `text` (raw, tokens inline), `fontFamily`, `fontSizePt`, `fontWeight` (100–900),
  `fontStyle`, `fill`, `textAlign`, `lineHeight`, `letterSpacingEm`, `underline`. Box width is
  editable; height is auto-computed by Textbox and read-only.
- **image** — `assetId`. Inserted at intrinsic aspect ratio; freeform resize (no crop/fit controls in
  Phase 1).
- **rect** — `fill`, `stroke`, `strokeWidthMm`, `radiusMm`.
- **ellipse** — `fill`, `stroke`, `strokeWidthMm`.
- **line** — `startMm`, `endMm`, `stroke`, `strokeWidthMm`.
- **path** — `pathData` (the original SVG `d` string), `fill`, `stroke`, `strokeWidthMm`.

Serialization uses an **explicit mapper** (`engine/fabric-mapper.ts`), never Fabric's `toObject()` /
`loadFromJSON()`, so the format is stable across Fabric upgrades. Store the original `d` in
`object.data` and reuse it; never regenerate path strings from Fabric's parsed commands. Use
`strokeUniform: true`.

Abridged example:

```jsonc
{
  "schemaVersion": 1,
  "id": "…", "name": "Finisher certificate", "scope": "certificate",
  "canvas": { "preset": "a4", "unit": "mm", "dpi": 96,
              "widthMm": 210, "heightMm": 297, "background": "#ffffff" },
  "objects": [
    { "id": "…", "type": "text", "name": "Participant name",
      "xMm": 20, "yMm": 120, "widthMm": 170, "heightMm": 24,
      "rotationDeg": 0, "opacity": 1, "visible": true, "locked": false,
      "text": "Congratulations, {FULL_NAME}!", "fontFamily": "Inter",
      "fontSizePt": 28, "fontWeight": 600, "fontStyle": "normal",
      "fill": "#111111", "textAlign": "center", "lineHeight": 1.2,
      "letterSpacingEm": 0, "underline": false }
  ],
  "exampleData": { "FULL_NAME": "Ayu Lestari" },
  "assets": [], "fonts": []
}
```

`fontSizePt` is converted to Fabric px with `ptToPx = pt * 96/72`; `letterSpacingEm` maps to
`charSpacing = em * 1000`.

---

## 7. SVG import

`engine/svg-importer.ts`:

1. Gate: SVG ≤ 2 MB and ≤ 20,000 DOM nodes; reject otherwise with a clear message.
2. Sanitize with `dompurify` (`USE_PROFILES: { svg: true, svgFilters: true }`); strip `<script>`,
   `<foreignObject>`, event attributes, and any `href`/`xlink:href` that is not a `data:` URI.
3. `loadSVGFromString(sanitized)` → `{ objects, options }`.
4. **Flatten groups recursively**: multiply parent/child matrices
   (`util.multiplyTransformMatrices`), decompose with `util.qrDecompose`, apply absolute
   left/top/angle/scale to each leaf. Isolate this helper and verify it first — it is the riskiest
   part of import.
5. Map leaves: `rect` → rect, `circle` → ellipse, `ellipse` → ellipse, `line` → line;
   `polyline`/`polygon`/`path` → path (keep the source `d`); `image` (data URI only) → image asset;
   `text`/`textbox` → text.
6. Scale the imported bounding box to fit the current canvas (contain, ~5 mm margin), assign new ids
   and names.
7. Unsupported features (masks, clip paths, filters, `<use>`/`<symbol>`, external fonts/images,
   `textPath`, some gradients) are approximated (first solid stop) or reported and dropped. Show an
   import report: imported, approximated, dropped.
8. Collect `font-family` values from imported text and register them in `doc.fonts` (font detection
   requirement); warn when a family cannot be loaded.

The original SVG file is never stored.

---

## 8. Fonts

- `GET /v1/events/{eventId}/fonts` supplies event font names. Add `queryKeys.eventFonts(eventId)` to
  `packages/api-client/src/query-keys.ts`. The API exposes no file URL, so these are listed by
  family name and fall back gracefully if the browser/server lacks them.
- Custom upload: read the file (≤ 2 MB, woff2/woff/ttf/otf), ask the user to confirm the family name
  (prefilled from the file name), register
  `new FontFace(family, url(dataUrl), { weight, style })`, `await face.load()`,
  `document.fonts.add(face)`, and store the data URL in `doc.fonts`.
- Load all draft fonts before the first scene apply. When a font is added mid-session, await it and
  re-render text. Awaiting avoids Fabric measuring with a fallback and text widths jumping.
- Surface a short note that the organizer is responsible for font licensing.

---

## 9. Placeholders

`model/placeholder-catalog.ts` + `model/placeholder-engine.ts`:

- Catalog entries: `key`, `label`, `description`, `sample`, `category` (identity/race/result),
  `maxLength`.
- `TOKEN_PATTERN = /\{([A-Z][A-Z0-9_]*)\}/g`.
- `parsePlaceholderText` → text/token segments; `extractPlaceholderKeys`;
  `validatePlaceholderText` → issues; `substitutePlaceholders(text, values, { unknown: "keep" })`.
- **One-pass substitution** via a replace callback; never re-scan substituted values, which prevents
  token injection from example data.
- Unknown tokens (`{FOO}`) are preserved in the design and preview (rendered literally) and reported
  as errors in the Data panel and on the layer row. They are not silently dropped.
- Literal-brace escaping is not supported in Phase 1 (documented limitation).
- Missing example values fall back to the catalog sample.

Editing:

- **Insert** at the caret while a text object is being edited
  (`insertChars(token, undefined, selectionStart, selectionEnd)`); otherwise append to the selected
  text. With nothing selected, offer “Add as new text”.
- **Replace text** assigns the token as the whole text; confirm when the text is non-empty.
- Example values are editable per token; “Reset to samples” restores defaults.

Preview:

- `engine.setPreview(overrides: Map<objectId, substitutedText> | null)` — the engine applies the
  substituted strings directly to Fabric text objects. `document` is never modified.
- While previewing: selection cleared, objects non-selectable, inspector/undo disabled, a banner
  explains sample data is shown. Exiting restores raw text from the document.
- This gives live preview while example values are edited.

---

## 10. Local drafts

- `repository/template-repository.ts` defines
  `TemplateRepository` (`list/get/create/save/delete/duplicate`), with an IndexedDB implementation
  (`idb-keyval`, keys scoped `racetify:template-studio:${eventId}:${draftId}`) and an in-memory
  fallback when IndexedDB is unavailable (private browsing).
- Autosave ~800 ms after a commit. Save a throttled PNG thumbnail
  (`canvas.toDataURL({ multiplier: 0.15 })`) for library cards.
- Export/import native JSON with `TemplateDocumentSchema.safeParse`; never cast. Unknown
  `schemaVersion` is rejected with a clear message. Import creates a new draft id.
- Request `navigator.storage.persist()`; check `estimate()`; cap a draft at ~25 MB; catch
  `QuotaExceededError` and offer JSON export.
- Local drafts are user-authored content, not API responses: this is the documented exception to the
  “no browser storage for authenticated data” rule. Server templates stay in TanStack Query.
- UI copy states: “Drafts are stored in this browser. They are not yet used by bib/certificate
  generation.”

---

## 11. Feature file tree

`apps/app/features/template-studio/`

```
index.ts                              public surface
model/
  template-document.ts                zod schema + inferred types
  template-defaults.ts                empty document, sample data, default text style
  canvas-presets.ts                   A5/A4/A3 sizes, orientation, px readout
  units.ts                            mm/px/pt conversions and formatters
  geometry.ts                         rotated AABB, alignment, nudge, duplicate offsets
  placeholder-catalog.ts              12 token definitions and samples
  placeholder-engine.ts               parse/validate/substitute
store/
  editor-store.ts                     zustand store factory + document commands
  editor-store-context.tsx            per-editor provider + typed hooks
  history-manager.ts                  scene snapshots, transactions, coalescing
  selectors.ts                        selection, layers, issues, dirty flag
engine/
  fabric-engine.ts                    canvas lifecycle, intents, preview, zoom, dispose
  fabric-mapper.ts                    native object <-> Fabric object mapping
  fabric-events.ts                    event wiring + applying guard
  svg-importer.ts                     sanitize, parse, flatten, map SVG
  image-importer.ts                   validate/downscale images to data URLs
  font-registry.ts                    FontFace loading and family registry
  types.ts                            EngineIntent, GeometryUpdate, ImportWarning
repository/
  template-repository.ts              interface + draft summary
  indexeddb-repository.ts             local drafts + quota handling
  in-memory-repository.ts             fallback
  json-transfer.ts                    export blob + validated import
hooks/
  use-template-draft.ts               load/save/delete through the repository
  use-autosave.ts                     debounced save and save-state transitions
  use-editor-shortcuts.ts             shortcuts with input/edit guards
  use-navigation-guard.ts             beforeunload + in-app back confirmation
lib/
  constants.ts                        size caps, history limits, delays
  id.ts                              crypto.randomUUID wrapper
  file-read.ts                        file -> data URL with size/MIME checks
  download.ts                         blob download helper
components/
  template-library-route.tsx          list route: drafts, new, import
  template-studio-route.tsx           editor route: load draft, providers, guard
  template-studio.tsx                 three-pane layout + responsive switch
  template-studio-top-bar.tsx         name, save state, undo/redo, preview, export
  template-studio-toolbar.tsx         add text/image, import SVG
  canvas-host.tsx                     client-only dynamic boundary for Fabric
  canvas-stage.tsx                    engine mount, zoom/pan, drag-drop
  layers-panel.tsx / layer-row.tsx    order, select, rename, visibility, lock
  inspector-panel.tsx                 design/data tabs and selection routing
  canvas-inspector.tsx                size, orientation, unit, background
  text-inspector.tsx                  typography + token actions
  transform-inspector.tsx             X/Y/W/H, rotation, opacity, lock, order
  shape-inspector.tsx                 fill/stroke/radius
  align-controls.tsx                  align relative to canvas/selection
  color-field.tsx                     swatch + hex + popover picker
  number-field.tsx                    numeric input committing on blur/Enter
  data-panel.tsx                      catalog, example values, issues, preview toggle
  font-picker.tsx / font-upload-dialog.tsx
  new-template-dialog.tsx             preset/custom size, orientation, unit, scope
  import-svg-dialog.tsx               file picker + options
  import-report-dialog.tsx            imported/approximated/dropped
  unsaved-changes-dialog.tsx
  editor-skeleton.tsx                 SSR-safe loading placeholder
  mobile-fallback.tsx                 small-screen message with preview/export
```

Route pages import only from `@/features/template-studio`.

---

## 12. UI layout and behaviour

```
┌ top bar: Back · Name · Saved locally · Undo/Redo · Preview · Export ──────────┐
├─────────────┬──────────────────────────────────────────┬──────────────────────┤
│ Add/Layers/ │  artboard on muted board                 │ Inspector            │
│ Data tabs   │  floating zoom + align controls          │ (contextual)         │
└─────────────┴──────────────────────────────────────────┴──────────────────────┘
```

- Keyboard: undo/redo, delete, duplicate, arrow nudge (Shift ×10), zoom, Escape to deselect,
  export. Ignore shortcuts in inputs/textarea/contenteditable and while a text editor is open.
- Below `md`: “Template Studio needs a larger screen” with preview/export links; do not mount Fabric.
- Icon-only controls get `aria-label`; layers are keyboard-navigable; errors are inline.
- Left panel 264 px, right panel 320 px; both collapse on narrower screens.
- The library shows a clear local-only notice and supports scope filtering, search, and an empty
  state with “Create your first template”.

---

## 13. Dependencies

```bash
pnpm --filter app add fabric@6.9.1 zustand@5.1.0 idb-keyval@6.3.0 dompurify@^3.4.0
pnpm dlx shadcn@latest add slider popover scroll-area toggle-group toggle -c apps/app
```

- `fabric` — client-only, ~300 KB, loaded only on the editor route.
- `zustand` — selector subscriptions; React 19 safe.
- `idb-keyval` — local drafts.
- `dompurify` — SVG sanitization before Fabric parsing.

Not added: `use-debounce` (small local hook), `nanoid` (`crypto.randomUUID`), `immer`, `@dnd-kit`
(layer reorder via buttons/menu).

Reuse existing primitives: button, input, label, select, tabs, dialog, alert-dialog, sheet,
dropdown-menu, tooltip, separator, card, alert, badge, progress, skeleton, field, textarea,
collapsible, checkbox, scroll-area (new), slider (new), popover (new), toggle-group (new), toggle
(new). Add missing primitives only via the shadcn CLI; never hand-write them.

Before coding, read the relevant guides in `apps/app/node_modules/next/dist/docs/` per `AGENTS.md`,
especially client-only/dynamic imports for Next 16.

---

## 14. Implementation order

1. **Foundations** — deps/primitives; units, schema, defaults, presets, geometry, placeholder
   catalog/engine; repository interface + IndexedDB; JSON transfer.
2. **Local drafts and library** — repository, library route, new-template dialog, import/export,
   nav item, entry links from Bib generator/Certificates.
3. **Canvas boot** — engine, mapper, events, store/context/history, canvas host/stage, add text and
   images, select/move/resize/rotate/delete, transform inspector, zoom/pan/fit.
4. **Editing systems** — layers, lock/visibility/rename/reorder, duplicate, alignment, undo/redo,
   shortcuts, text inspector, font picker, custom font upload, event fonts.
5. **Import** — sanitized SVG import, group flattening, report dialog, font detection.
6. **Placeholders** — Data panel, insert/replace, example values, validation, preview overrides.
7. **Polish** — autosave/thumbnails, unsaved guard, responsive fallback, accessibility pass, dated
   implementation notes in `docs/`.

---

## 15. Verification

```bash
pnpm --filter app typecheck
pnpm --filter app lint
pnpm --filter app build
```

Manual (`pnpm --filter app dev`, event → Documents → Template Studio):

1. Create A4 portrait and A3 landscape drafts; verify mm/px readouts and orientation.
2. Import a representative SVG (text, rect, path, nested group, embedded image); confirm flattened
   objects are editable and the report lists approximated/dropped features.
3. Add text, style it, upload a font, reload the draft, confirm the font still renders.
4. Move/resize/rotate, lock, reorder layers, align, undo/redo each action; one drag = one undo step.
5. Zoom/pan/fit; reload and confirm geometry is unchanged.
6. Insert `{FULL_NAME}` at the caret, edit example values, toggle preview and confirm substitution;
   confirm unknown `{NOPE}` is flagged and preserved; confirm exiting preview restores raw tokens.
7. Reload to confirm autosave restores the draft; export JSON, delete, import back, reopen.
8. Confirm editor mounts once under React StrictMode and that `fabric` appears only in client chunks
   (`pnpm --filter app build`, inspect `.next`).
9. Confirm the feature is hidden without `event:generators:manage`, and no server calls are made for
   draft save/open.

No Docker, migrations, or backend changes are needed for this pass.

---

## 16. Risks and limits

1. **Fabric v7 exists** — pinned 6.9.1; revisit v7 separately (origin default and parser changes).
2. **SVG import fidelity** — masks/filters/`<use>`/`textPath` cannot be preserved; flattening
   matrices is the riskiest helper. Cap size/node count.
3. **Rotation and scale** — always center origin, bake scale into mm, normalize rotation, clamp
   flipped dimensions. Never store Fabric matrices.
4. **Text auto-height** — never force height on Textbox; width only.
5. **Undo memory** — exclude data URLs; cap 50 entries; skip live drag ticks.
6. **Fabric text undo** — while editing, Ctrl/Cmd+Z belongs to Fabric; document undo applies only
   outside text editing.
7. **IndexedDB quota / private mode** — persist request, estimate check, 25 MB cap, in-memory
   fallback, export offer.
8. **Size caps** — image 5 MB (downscale >1.5 MB or >4096 px), SVG 2 MB, font 2 MB, JSON import
   50 MB, 1,000 objects, 20k SVG nodes.
9. **Font loading race** — await fonts before first apply; re-render after late loads.
10. **Unsaved guard** — `beforeunload` covers reload/close; in-app links can be intercepted; browser
    Back/Forward cannot be reliably blocked in the App Router. Autosave is the real safety net.
11. **Preview correctness** — never write substituted text into the document; one-pass substitution.
12. **Canvas size** — 10–2000 mm; never instantiate at 300 DPI.
13. **Multi-select** — show “Mixed”; edits apply to all selected in one history entry.
14. **Locked/hidden** — locked stays in layers and is unlockable there; hidden is skipped by
    alignment/export and cannot be selected on canvas.

---

## 17. Deferred integration notes (next phase)

- **Backend JSON schema.** `documents` parses only `{ background, elements[] }` with
  `rect|text|image`. The native document needs either a new `format` value, a versioned schema inside
  the existing `json` format, or storage of native JSON alongside the compiled SVG (`template.json`
  + `design.svg`). The 1 MB `template_content` limit forces image assets out of the JSON string.
- **Variables.** `renderer::VARIABLES` must grow to the 12 UI tokens (or gain a mapping table), and
  the substitution syntax must be decided before the compiler is written.
- **Fonts.** The renderer loads system fonts only; custom/event fonts must be fetched and registered
  per batch.
- **Assets.** Template-local image storage (presigned upload + stable references) is required before
  server save/compilation.
- **Preview.** `POST /generator-templates/{id}/preview` should accept the native format once
  supported; until then the studio's local preview is the only preview.
- **Wiring.** When the API repository lands, add `queryKeys.templateDrafts(eventId)` and wrap
  `list/get` in TanStack Query; the editor should not change.
