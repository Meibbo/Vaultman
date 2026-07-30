---
title: 04 — dnd-kit (official @dnd-kit/svelte) — corrected API + virtualization + foreign drops
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/index|Frontend Stack Deep Research]]"
created: 2026-06-15T00:00:00
updated: 2026-06-15T00:00:00
created_by: opus-4-8
updated_by: opus-4-8
tags:
  - agent/research
  - explorer/dnd
  - axons
---

# 04 — dnd-kit (`@dnd-kit/svelte` 0.4.0)

## Corrected API (web-verified — the research agent mixed in React-isms)

The dev's link (dndkit.com/svelte) is the **official, first-party Svelte 5 support** of dnd-kit, package `@dnd-kit/svelte` (which we already have at 0.4.0). The real API (verified at dndkit.com/svelte/quickstart):

```svelte
<script>
  import { DragDropProvider, createDraggable, createDroppable } from '@dnd-kit/svelte';
  const draggable = createDraggable({ id: 'a' });
  const droppable = createDroppable({ id: 'zone' });
  function onDragEnd(event) { /* event.operation.source / .target */ }
</script>
<DragDropProvider {onDragEnd}>
  <button {@attach draggable.attach}>drag me</button>
  <div {@attach droppable.attach}>drop here</div>
</DragDropProvider>
```

- Context = **`DragDropProvider`** (NOT React's `DndContext`).
- Primitives = **`createDraggable` / `createDroppable` / `createSortable`** attached via Svelte 5 **`{@attach x.attach}`** (NOT React's `useDraggable` hooks).
- Reactive state via runes; `DragOverlay` component for the drag preview; sensors/modifiers come from the **vanilla dnd-kit** core (the docs explicitly defer to vanilla docs for plugins/modifiers/sensors).
- Event handlers on the provider: `onDragEnd` (and start/over by the same pattern).

So Agent 4's report had the right primitives (createDraggable/Droppable/Sortable, DragOverlay) but invented React-style `DndContext`/`useDraggable`/event shapes — **use the `{@attach}` + `DragDropProvider` form above.**

## D-FE-2 — package reconciliation (open)

Prior R-DND-C ([[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/dnd-library-findings|dnd-library-findings]]) selected the HanielU `dnd-kit-svelte` community port. But dndkit.com now ships **official `@dnd-kit/svelte`**, and our `package.json` already depends on `@dnd-kit/svelte@^0.4.0` (not the HanielU package). **The official first-party port likely supersedes the HanielU selection.** `flag`: confirm which package our `serviceDndSvelteAdapter.ts` actually imports + maintenance status before locking S-10.

## DnD × virtualization (the hard combo)

Rows mount/unmount as you scroll → a draggable can unmount mid-drag. Pattern:
- **Keep drag state in an external reactive service**, not tied to the mounted row (we have `serviceDnd.ts` / `serviceDndSvelteAdapter.ts` — the `DndService` holds `draggedId`/source so it survives unmount).
- **Cache droppable rects** (ResizeObserver) so collision detection runs on snapshots, not live DOM queries.
- **Auto-scroll near edges** via a modifier wired to the virtualizer's `scrollToIndex`/scroll offset, so off-screen drop targets become reachable.

## Foreign / cross-surface drops (PlatformAdapter seam)

dnd-kit operates on Svelte DOM; Obsidian's editor (CodeMirror) + workspace leaves live outside. Pattern (matches `obsidian-dnd-findings`): drag serializes payload into `dataTransfer`; foreign drop handlers read it.
- Editor: `registerEditorExtension(EditorView.domEventHandlers({dragover, drop}))` → `posAtCoords` → caret.
- Workspace: `monkey-around` `Workspace.onDragLeaf` to intercept leaf drops.
- Both deserialize `dataTransfer` → route through `InteractionPolicy(source, target)` → operation.
- **Load all monkey-patches in `onLayoutReady()`**, never `onload()` (plugin-fragility rule). We have `serviceManualDnd.ts` (workspace manual drag + `dataTransfer` serialization) + `serviceDndAliasAware.ts`.

## Fit + accessibility

Maps cleanly to our axons: `createDraggable.data` = `PanelHandle.produceDragPayload()`; `createDroppable.data` = `DndDropTarget.accepts()`; `onDragEnd` = where `InteractionPolicy` runs. Collision strategies (closestCenter/ rectIntersection/pointerWithin/custom) + modifiers (restrict/snap/custom) + sensors (pointer/keyboard/touch).
A11y: ARIA `roledescription`, live-region announcements, keyboard pick/move/cancel — customize announcements to say node type + operation. Touch: pointer sensor with `activationConstraint:{delay,tolerance}` for mobile.

## Citations

- https://dndkit.com/svelte/quickstart/ (+ sensors/modifiers/sortable/overlay) — WebFetch-verified API.
- github.com/hanielu/dnd-kit-svelte (the older community port — reconcile vs official).
- In-repo: serviceDnd.ts, serviceDndSvelteAdapter.ts, serviceDndAliasAware.ts, serviceManualDnd.ts;
  [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/obsidian-dnd-findings|obsidian-dnd-findings]].
</content>
