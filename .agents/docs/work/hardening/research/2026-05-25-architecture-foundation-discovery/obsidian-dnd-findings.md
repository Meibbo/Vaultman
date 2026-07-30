---
title: Obsidian DnD Findings (public API + hover-editor pattern + reference plugins)
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/index|Architecture Foundation Discovery]]"
created: 2026-05-27T00:00:00
updated: 2026-05-27T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/research
  - initiative/hardening
  - explorer/dnd
  - explorer/platform-adapter
---

# Obsidian DnD Findings

Read-only recon (R-DND-A, 2026-05-27) — what Obsidian exposes publicly for DnD, what requires monkey-patching, the hover-editor reference pattern for floating tiles + `WorkspaceLeaf` wrapping, and the editor-drop pattern via CodeMirror 6. Pairs with `dnd-library-findings` (R-DND-C, `dnd-kit-svelte`) to unblock the **DnD library lock (S-10)** and inform the foreign-drop **PlatformAdapter** design (ADR 0004).

## 1. Public DnD API (documented / declared)

| API | Shape | Purpose | Where |
|---|---|---|---|
| `Workspace.onDragLeaf(event, leaf)` | `(MouseEvent, WorkspaceLeaf) => void` | initiate workspace-aware drag of a leaf | `obsidian.d.ts` |
| `Workspace.getDropLocation(event)` | `(MouseEvent) => { target: WorkspaceItem, sidedock: boolean }` | locate the workspace drop target during drag-over | `obsidian.d.ts` |
| `Workspace.recursiveGetTarget(event, parent)` | `(MouseEvent, WorkspaceParent) => WorkspaceItem` | traverse parent splits to find the drop zone | `obsidian.d.ts` |
| `WorkspaceLeaf.containerEl` | `HTMLDivElement` | the leaf's DOM element for event binding | `obsidian.d.ts` |

**No** `registerDragHandler` / `registerDragAndDropHandler` API. Plugins use **native HTML5 drag events** (`dragstart` / `dragover` / `drop` / `dragend`) on DOM, optionally with a third-party DnD lib.

## 2. Private internals (no public API → monkey-patch required)

| Concern | Reason private | How plugins do it |
|---|---|---|
| Tab reordering inside a tabbar | not exposed | monkey-patch `Workspace.prototype` + `WorkspaceLeaf.prototype` |
| Floating windows inside the workspace | not exposed | **hover-editor pattern** (this doc §3) — `monkey-around` + popover DOM + interact.js |
| Stacked-tabs DnD (Obsidian 0.16+) | internal DOM only | monkey-patch with 0.16+ internal knowledge |
| `WorkspaceParent.replaceChild` / `insertChild` / `removeChild` (split mutation) | private but stable | pane-relief calls them directly |
| Properties UI / metadata-entry DnD | no public API | likely full monkey-patch |

## 3. Hover-editor floating-window pattern (the reference for ForeignEmbed + tile-tree)

Repository: `github.com/nothingislost/obsidian-hover-editor`. Key files: `src/main.ts` (init + patching) · `src/popover.ts` (popover lifecycle + drag-resize).

**Building blocks:**

1. **`monkey-around`** library — safe prototype wrapping. Pattern:
   ```ts
   import { around } from "monkey-around";
   around(Workspace.prototype, {
     method(old) { return function (...args) { /* before */ const r = old.call(this, ...args); /* after */ return r; }; }
   });
   ```
   Targets: `Workspace`, `WorkspaceLeaf`, `ItemView`, `MarkdownPreviewView` (hover-editor patches all four).
2. **Popover injection** — `document.createDiv({ cls: "popover hover-popover" })`, wrap a real `WorkspaceLeaf` inside.
3. **`@nothingislost/interactjs`** (modified interact.js for Obsidian) for the floating window's drag + resize. Drag handle = `.popover-titlebar`; `.draggable({ allowFrom: ".popover-titlebar" })`.
   Resize via edge zones (`.top-left`, `.bottom-right`, `.right`, …) with modifiers for boundary constraints + aspect-ratio.
4. **Reflow on window resize**: `interact.reflow({ name: "drag", axis: "xy" })`.
5. **Drag-out to workspace**: header icons set `draggable="true"` + a custom `dragstart` listener that calls `this.app.workspace.onDragLeaf(e, this.leaf)` — re-uses the **public** API to drop the leaf back into a split.
6. **Race condition guard**: load all patches inside `onLayoutReady()` (NOT `onload`) to avoid racing Obsidian's internal layout init.

This is the literal template for our **`HoverFloatAdapter`** (PlatformAdapter, ADR 0004) and for the **`ForeignEmbedAdapter`** when we want to mount a foreign leaf inside our tile.

## 4. Foreign DnD into the editor (CodeMirror 6 path)

No standard "editor drop target" API. Plugins use:

```ts
plugin.registerEditorExtension(
  EditorView.domEventHandlers({
    drop:     (e, view) => { const pos = view.posAtCoords({ x: e.clientX, y: e.clientY }); /* dispatch transaction */ },
    dragover: (e, view) => { /* preview indicator */ }
  })
);
```

References:
- Kanban — `src/components/Editor/MarkdownEditor.tsx` (CodeMirror domEventHandlers).
- Excalidraw — `src/core/editor/EditorHandler.ts` (registers `EditorView` extensions for drop/paste).

Editor drops are **a separate Adapter** (`EditorSurfaceAdapter`, already in model 03 §"Foreign surfaces = PlatformAdapters") — wrap the `registerEditorExtension` + `domEventHandlers` + `posAtCoords` + `view.dispatch` calls in one place. The `InteractionPolicy` (LOCKED) routes node-drop intents to it.

## 5. Reference plugins — DnD models

- **Kanban** (`obsidian-kanban`) — custom **hitbox-based collision** (not native HTML5). Uses `box-intersect`; tracks `PointerEvent` (desktop + mobile unified); emits `DragEventData` with `dragEntity` + `primaryIntersection` + `scrollIntersections`. Source: `src/dnd/managers/DragManager.ts`.
  Useful reference for **per-Scene tile/row collision** when card sizes are irregular.
- **Hover-editor** — native HTML5 + `interact.js` + `monkey-around` for the floating window; calls public `onDragLeaf` for drag-out.
- **Pane-relief** — no custom drag; calls **public** `WorkspaceParent.insertChild` / `replaceChild` / `removeChild` for split mutation. Monkey-patches `Workspace.getFocusedContainer()` for multi-window.
- **Excalidraw** — custom canvas DnD inside the Excalidraw library; integrates to Obsidian via `EditorExtension` (drop/paste).

## 6. Mobile gotchas

- **No native `dragstart`** on touch — must use `pointerdown` / `pointermove` / `pointerup` via `PointerEvent`. Kanban uses raw `PointerEvent`; hover-editor uses `interact.js` which abstracts this.
- `Platform.isMobile` check is available but doesn't change DOM event names — only behavior.
- Long-press to drag = activation constraint pattern (delay + tolerance — see `dnd-library-findings` §3.E).

## 7. Monkey-patch best practices (carry into every PlatformAdapter)

- Use **`monkey-around`** (`npm: monkey-around`) — handles before/after wrapping + an `unpatch` return so `serviceUnload` can revert cleanly (ADR 0004 invariant).
- **Always load patches in `onLayoutReady()`** to avoid racing Obsidian's internal init.
- Wrap `prototype` methods, not instances, so all current + future objects are covered.
- Keep each adapter's patch surface MINIMAL and named — one fragile integration per file.

## 8. Synthesis with R-DND-C (dnd-kit-svelte)

The two recons fit cleanly. Concrete shape:

```text
                    DndContext (dnd-kit-svelte)
                   /         |             \
   createDraggable / createDroppable / createSortable
                   (per Panel, per Scene, per tile-tree)
                              |
                  onDragEnd → InteractionPolicy(source, target)
                              |
            ┌─────────────────┼──────────────────┐
            ▼                 ▼                  ▼
       PanelHandle      EditorSurfaceAdapter   HoverFloatAdapter
       (intra-VM)       (CodeMirror 6 +        (monkey-around +
                         posAtCoords)          popover + interact.js)
            ▼                 ▼                  ▼
       OperationNode     OperationNode      tile mount / move
       (preview→commit)  (preview→commit)
```

- Library: **`dnd-kit-svelte`** owns the source-side (drag), the simple drop-side (Svelte DOM), and sortables. Native HTML5 `dragstart` is what dnd-kit fires under the hood.
- **`onDragLeaf` / `getDropLocation`** (public Obsidian API) lets our draggables also re-enter Obsidian's workspace splits when the source is a leaf-class payload.
- Editor drops → **`EditorSurfaceAdapter`** wraps `registerEditorExtension` + `EditorView.domEventHandlers` + `posAtCoords` + `view.dispatch`.
- Floating tiles + cross-leaf hosting → **`HoverFloatAdapter`** = the hover-editor pattern (popover + interact.js + monkey-around). When we need to mount a foreign leaf inside our tile, we follow this exact template under `ForeignEmbedAdapter`.
- Tab / split / stacked-tabs reorder beyond what's public → **further monkey-patches**, each as its own PlatformAdapter file with a probe + `serviceUnload` revert.

## 9. Implications + open decisions

- **S-10 (DnD library lock)** now UNBLOCKED — the foreign-drop adapter shape is clear (hover-editor template + CodeMirror `domEventHandlers`). Recommend the dev confirm `dnd-kit-svelte`. Adapter surface decoupled from library choice.
- **NEW S-11 — adopt `monkey-around` lib + `interact.js` (or `@nothingislost/interactjs` fork)**.
  Battle-tested by hover-editor; cleanly composes with our locked PlatformAdapter + `serviceUnload` pattern. Recommendation: **yes** — `monkey-around` for prototype wrapping, plain `interact.js` for drag/resize (the `@nothingislost` fork is an Obsidian-specific patch we may want to mirror or upstream eventually).
- **PlatformAdapter Registry** scope concretized: `HoverFloatAdapter` · `ForeignEmbedAdapter` · `EditorSurfaceAdapter` · `HometabAdapter` · `BasesViewAdapter` (ADR 0009) — each follows the hover-editor / monkey-around / `onLayoutReady` pattern.
- **`onLayoutReady` patch timing** added to `operational-watch-list` §6 (foreign-plugin fragility).

## Sources

- hover-editor: `github.com/nothingislost/obsidian-hover-editor` (src/main.ts · src/popover.ts · src/types/obsidian.d.ts).
- kanban: `github.com/mgmeyers/obsidian-kanban` (src/dnd/managers/DragManager.ts · src/components/Editor/MarkdownEditor.tsx).
- pane-relief: `github.com/pjeby/pane-relief` (src/pane-relief.ts).
- excalidraw plugin: `github.com/zsviczian/obsidian-excalidraw-plugin` (src/core/editor/EditorHandler.ts).
- `monkey-around`: `github.com/pjeby/monkey-around`.
- interact.js: `interactjs.io`.

## Status

R-DND-A complete. With R-DND-C (`dnd-library-findings`), the DnD + PlatformAdapter design is fully grounded. **S-10 unblocked**; **S-11** new. Joint synthesis above.
