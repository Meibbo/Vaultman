---
title: DnD Library Findings (Svelte 5, dnd-kit-equivalent recon)
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
---

# DnD Library Findings

Read-only recon (R-DND-C, 2026-05-27) for the Selection/Dnd scope-generic axons locked in the model.
Feeds — when paired with R-DND-A (Obsidian DnD internals + hover-editor pattern, still running) — the full DnD synthesis + the PlatformAdapter design for foreign-target drops. Library lock parked as S-10 in `pending-decisions` until the dev confirms after both research threads land.

## 1. Library pick — `dnd-kit-svelte` (HanielU)

Community Svelte port of the React `dnd-kit` with full feature parity. Source:
[github.com/hanielu/dnd-kit-svelte](https://github.com/hanielu/dnd-kit-svelte) · demo:
[dnd-kit-svelte.vercel.app](https://dnd-kit-svelte.vercel.app/). ~329 ⭐, 18 releases (v0.1.6 Feb 2026), active maintenance. **Svelte 5 compatible** (works with runes via function-reactive `.current` getters and the `{@attach}` directive).

### Alternatives weighed (and why rejected)

| Candidate | Reject reason |
|---|---|
| `svelte-dnd-action` (isaacHagoel, ~2.1k ⭐) | action-based; **no collision-detection system, no modifiers, no plugin surface** — does not scale to nested predicate trees + workspace tile DnD |
| `@thisux/sveltednd` | Svelte-5 runes-first but **nascent (v0.1.1)**; HTML5 Drag API only (no Pointer sensor); limited modifier depth |
| `@dnd-kit/svelte` (official thin adapter) | exists but less mature/maintained than the HanielU port |
| `@neodrag/svelte` | simpler API; good for one-off draggables; **not a full DnD framework** — keep as a fallback for touch-only contexts |

## 2. API surface

### Provider + context

- **`DndContext`** — wraps draggables/droppables; manages collision, autoscroll, drag overlay.
  Props: `collisionDetection` (default `rectIntersection`), `autoScroll`, `sensors[]`, `modifiers[]`, `accessibility`, `onDragStart` / `onDragOver` / `onDragEnd` / `onDragCancel`. Multiple nested `DndContext` supported with `id` isolation.

### Primitives

- **`createDraggable(id, options)`** — exposes `draggableNode`, `isDragging`, `isOverlay`, `listeners`, `attributes`, `transform`. Options: `disabled`, `handle`, `data` (payload), `attributes`.
- **`createDroppable(id, options)`** — exposes `dropZoneNode`, `isOver`, `listeners`, `attributes`.
  Options: `disabled`, `data` (match logic), `type` (collision filter).
- **`createSortable(id, options)`** — draggable + droppable for reorderable lists. Options: `index`, `animateLayoutChanges`, `transition`. Handles `onOver` / `onMove` / `onActivate` internally.
- **`DragOverlay`** component — renders the drag preview above DOM, prevents reflow. Props:
  `dropAnimation`, `modifiers`, `zIndex`, `style` callback.

### Sensors

- **Pointer** (default) — unifies mouse + touch via `pointerdown`/`move`/`up`.
  `activationConstraint: { distance, delay, tolerance }`.
- **Keyboard** (default) — Space/Enter pick, arrows move, Escape cancel; screen-reader announcements via ARIA live regions.
- **Touch** — explicit touch sensor (subsumed by Pointer on modern browsers); `activationConstraint` for long-press (delay + tolerance).
- **Custom sensors** — extend `Sensor` abstract class; `bind()` to call `manager.actions.setDragSource()` / `start()` / `move()` / `end()` / `cancel()`. Used for VM's future `InputBindingNode` adapter.

### Modifiers

`restrictToVerticalAxis` · `restrictToHorizontalAxis` · `restrictToWindowEdges` · `snapToGrid(size, { round? })` · `snapToGuidelines`. Custom: pass `(movementDelta, args) => adjustedDelta` to `DndContext.modifiers[]`, evaluated per frame.

### Collision detection

`rectIntersection` (default, AABB overlap) · `closestCenter` (distance to center; best for grids and recursive trees) · `pointerWithin` (cursor in bounds) · `custom (args) => Collision[]`. Droppable zones declare `data: { sortableContext: { items, strategy } }` for context-aware drops.

### Accessibility

ARIA auto-management (`aria-roledescription`, `aria-describedby`, `aria-live="polite"` announcements via the `Announcements` API). Keyboard defaults match dnd-kit React. Customizable via `DndContext.accessibility.announcements`.

### Extension surface

Plugins via custom `Transform` implementations · sortable strategies (`AnimateLayoutChanges` CSS-transition vs transform; custom `SortingStrategy`) · nested-context isolation by `id`.

## 3. VM integration patterns (concrete maps to locked model)

### A. Node-level DnD with `InteractionPolicy` enforcement

```svelte
<DndContext
  sensors={[pointerSensor({ activationConstraint: { delay: 200, tolerance: 5 } }), keyboardSensor()]}
  modifiers={[restrictToWindowEdges]}
  onDragEnd={(e) => {
    const { active, over } = e;
    const sourcePayload = active.data?.sourcePayload;       // produced by PanelHandle.produceDragPayload()
    const target        = over?.data?.target;               // PanelHandle | editor-drop | leaf-drop
    const op            = InteractionPolicy(sourcePayload, target); // stateless (locked)
    if (op === 'reject') return;
    commit(op);                                              // → OperationNode → preview → execute
  }}
>
  <!-- source Panel -->
  <PanelWithDraggables />
  <!-- target Panels + editor-drop droppable + leaf-drop droppable -->
  <DragOverlay modifiers={[restrictToWindowEdges]} />
</DndContext>
```

The `data.sourcePayload` produced by `PanelHandle.produceDragPayload()` (locked) and the `data.target` declared by each droppable (`PanelHandle` · editor-drop caret · leaf-drop) feed the stateless `InteractionPolicy(sourcePayload, target) → Operation | reject` (LOCKED). One pipeline.

### B. FilterGroup predicate-tree DnD (recursive reparenting)

```svelte
<DndContext collisionDetection={closestCenter}>
  <PredicateGroup group={root} />
  <DragOverlay />
</DndContext>

<!-- PredicateGroup.svelte (recursive) -->
{@attach createSortable(group.id, { index: indexOf(group), handle: '.drag-handle' })}
<ul>
  {#each group.rows as r, i (r.id)}
    <li {@attach createSortable(r.id, { index: i })}>{r.label}</li>
  {/each}
  {#each group.subgroups as sg (sg.id)}
    <svelte:self group={sg} />
  {/each}
</ul>
```

`closestCenter` picks the target group + insertion index automatically — matches the proto's `stack-island.jsx` reparenting model + the locked recursive FilterGroup (predicate tree, Bases-shaped).
`createSortable` animates reordering within and across groups.

### C. Scene tile-tree DnD at workspace scope

```svelte
<DndContext id="workspace" collisionDetection={closestCenter}>
  <SceneTileTree split={root}>
    <!-- leaf tiles are draggable; drag out → re-insert at split parent -->
    {@attach createDraggable(tile.id, { data: { tileId: tile.id, kind: 'tile' } })}
    <!-- insertion zones between tiles -->
    {@attach createDroppable(`split-after-${i}`, { data: { splitIndex: i } })}
  </SceneTileTree>
</DndContext>
```

Matches the locked Scene tile-tree model (recursive h/v splits inside one surface; tiles host a Panel or a `ForeignEmbed`). Nested `DndContext` allowed but a single root context suffices for our tree depth.

### D. Foreign-target drops via PlatformAdapter (ADR 0004)

**Honest gap:** `dnd-kit-svelte` drop targets are DOM elements *inside* the Svelte tree. Obsidian's `EditorView` (CodeMirror 6) and other plugins' leaves are EXTERNAL to ours. The pattern:

```svelte
<script>
  import { registerEditorDrop, registerLeafDrop } from './platform-adapter';
  onMount(() => {
    registerEditorDrop((payload, caret) => { /* insert at caret via CM6 transaction */ });
    registerLeafDrop((leafType, payload) => { /* dispatch through Mediator */ });
  });
</script>
<DndContext onDragEnd={({ active, over }) => {
  if (over?.id === 'editor-drop') window.dispatchEvent(new CustomEvent('vm:editor-drop', { detail: active.data }));
  if (over?.id?.startsWith('leaf-drop:')) window.dispatchEvent(new CustomEvent('vm:leaf-drop', { detail: { leafType: over.data?.leafType, payload: active.data } }));
}}>
  …
</DndContext>
```

This is exactly the PlatformAdapter shape from ADR 0004 — one adapter per foreign-target class, probe
+ fallback + `serviceUnload` revert. R-DND-A's hover-editor `WorkspaceLeaf`-patch findings should inform the final adapter shape.

### E. Mobile / touch

`activationConstraint: { delay: 200, tolerance: 5 }` on the Pointer sensor prevents accidental drag during scroll. For true long-press-to-drag UX on mobile, either a **custom Touch sensor (~150 LOC)** or a **`@neodrag/svelte` fallback** for touch-only contexts. Confirms the locked input-router model: each input device feeds the same dispatch via its own sensor.

## 4. Gaps + workarounds

| Gap | Workaround |
|---|---|
| Foreign-target drops (editor / other leaves) | PlatformAdapter + manual event forwarding (ADR 0004) |
| Long-press-to-drag on mobile | custom Touch sensor (~150 LOC) or `@neodrag/svelte` fallback |
| Undo/redo integration | wire `onDragEnd` → push to operation queue (we already have this via OperationNode pipeline) |
| Snap-to-grid with visual grid lines | `snapToGrid` modifier + own CSS grid overlay in `DragOverlay` |
| Native OS drag preview (desktop) | `DragOverlay` + custom CSS transform (React-only native preview is not portable) |
| Auto-scroll beyond viewport | custom modifier extending the autoscroll region |
| Collision detection for irregular shapes | custom collision algorithm (~500 LOC) |

None block MVP.

## 5. Implications + open decisions

- **PROPOSED library lock**: `dnd-kit-svelte` (HanielU port). Parked as **S-10** in `pending-decisions` awaiting (a) R-DND-A's Obsidian/hover-editor findings to confirm the foreign-drop adapter shape and (b) the dev's explicit lock.
- Selection / Dnd scope-generic axons → one `DndContext` per scope (panel · workspace). The recursive FilterGroup / tile-tree / foreign-drop patterns above all coexist under that model.
- The `InteractionPolicy` (locked, stateless) becomes the `onDragEnd` callback's body — clean fit.
- The locked `PanelHandle.produceDragPayload()` / `acceptsDrop(intent)` map directly to `createDraggable.data.sourcePayload` / `createDroppable.data.target`.
- Mobile is solvable with `activationConstraint`; revisit if real-device testing surfaces issues.
- Add `dnd-kit-svelte` to `tooling-libraries.md` as the **selected** target (was "candidate").

## Sources

- github.com/hanielu/dnd-kit-svelte (port) · dnd-kit-svelte.vercel.app (demo) · dndkit.com (React docs, semantics map) · docs.dndkit.com/guides/accessibility · github.com/isaacHagoel/svelte-dnd-action (alternative weighed) · github.com/thisuxhq/sveltednd (alternative weighed) · github.com/PuruVJ/neodrag (fallback option).

## Status

R-DND-C complete. Pairs with R-DND-A (Obsidian internals + hover-editor, still running) for the full DnD synthesis. Library lock = PROPOSED → S-10 in `pending-decisions`.
