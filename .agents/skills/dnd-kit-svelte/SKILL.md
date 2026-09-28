---
name: dnd-kit-svelte
description: Design or debug sortable drag-and-drop interactions in Svelte with current dnd-kit patterns, including collision targeting, live reordering, insertion indicators, and cancellation.
---

# dnd-kit Svelte

Use the current official [Svelte quickstart](https://dndkit.com/svelte/quickstart/), [createSortable reference](https://dndkit.com/svelte/primitives/create-sortable/), [DragDropProvider reference](https://dndkit.com/svelte/components/drag-drop-provider/), and [collision guide](https://dndkit.com/react/guides/collision-detection/) as API sources. Recheck them before adding a dependency. Do not confuse `@dnd-kit/svelte` with legacy `@dnd-kit/sortable` or third-party Svelte ports.

For a new sortable list, put `DragDropProvider` around keyed child item components. Call `createSortable` inside each stable child, with reactive `id` and `index` getters; calling it inline in `{#each}` recreates sortable instances on reorder and breaks transitions. Snapshot the original order on drag start, update visual order on `onDragOver`, and restore the snapshot when drag end is canceled. The provider's default sensors include pointer and keyboard.

For an existing native-DnD list, apply the same interaction model without assuming a library migration is needed. Derive the target from a consistent pointer/geometry coordinate system. A horizontal list has insertion boundaries `0..N`, including after the last item: resolve the hovered target's left versus right half (or closest boundary) rather than always inserting before it. Derive preview order from the drag-start snapshot and candidate slot, not from repeated mutations of the preview. The indicator belongs on the resolved boundary. Clear hover, preview, active decoration, and ghost on drop, cancellation, escape, or leaving the allowed region.

`pointerIntersection` selects a rectangle under the pointer; `pointerDistance` follows the pointer near targets; `closestCenter` can provide a fallback outside targets. For custom insertion slots, choose the target then resolve its left/right boundary. Test first-to-last, last-to-first, both halves, varied widths, after-last, cancel, and cleanup. Also verify the browser behavior for user-facing gestures.
