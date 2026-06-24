---
title: View adapters and hit targets
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-06-node-selection-service/index|node-selection-service]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T07:05:00
tags:
  - agent/spec
  - explorer/views
  - ui/layout
---

# View Adapters And Hit Targets

## Tree Adapter

`viewTree.svelte` should become a rendering and gesture adapter:

- receive `selectedIds`, `focusedId`, `activeId`, and handlers from
  `panelExplorer.svelte`;
- report row-slot click intent;
- report label/action click intent;
- report chevron toggle intent;
- report context menu intent;
- report row keydown intent;
- report box target ids;
- render visual state and ARIA state.

It should not own selection policy.

## Tree Slot Layout

The virtual row should have two layers:

- an outer slot that fills the whole virtual row height and full available
  width;
- an inner visual surface that can keep the 1px optical gap, radius, Liquid
  Glass-like highlight, badges, and indentation.

Clicks on the outer slot select the row. This removes dead zones without making
the visual row look cramped.

If the current row already fills the slot, tests should still assert that a
click at the top, middle, and lower part of a virtual slot selects the same
node. That guards against row-height and CSS-var regressions.

## Rectangle Selection

The selection rectangle should not depend exclusively on DOM intersection with
visible row surfaces if visual gaps can create false misses.

Preferred implementation:

- convert rectangle top/bottom into virtual scroll coordinates;
- compute start/end slot indexes from `rowHeight`;
- map indexes to flattened visible ordered ids;
- optionally filter by horizontal overlap if future tree indentation needs it.

This makes the virtualizer the authority for row slots and preserves reliable
selection even when the visual surface has margin, radius, or hover effects.

## Document Events

Use Svelte top-level document/window event handling, not manual unmanaged
listeners, for:

- outside click clear;
- Escape clear.

`viewTree.svelte` or `panelExplorer.svelte` can host the handlers. The preferred
site is `panelExplorer.svelte`, because it knows provider id and can avoid
clearing unrelated explorers.

## Viewgrid Adapter

`viewGrid.svelte` should become a generic node grid, not the current file-table
view.

The safest implementation path is:

1. Create a generic node-grid adapter (`ViewNodeGrid.svelte`) or refactor
   `ViewGrid.svelte` behind tests so it accepts `TreeNode[]`.
2. Wire `panelExplorer.svelte` grid mode to provider nodes, not `TFile[]`.
3. Keep old file-specific grid behavior only behind a clearly named
   compatibility component if a workflow would otherwise be lost.
4. Make the final `grid` mode mean node/tile grid, never table/details view.

Inputs should mirror the tree where possible:

- `nodes: TreeNode[]` or a pre-flattened `ViewNodeGridItem[]`;
- `selectedIds`;
- `focusedId`;
- `activeId`;
- `onTileClick`;
- `onTileAction`;
- `onBoxSelect`;
- `onContextMenu`;
- `onTileKeydown`;
- `icon`.

The first grid does not need masonry, table cells, or inline editing. It needs:

- responsive tile layout;
- full tile hit targets;
- icon/label/count/badges;
- same selection modifiers as tree;
- same outside/Escape clearing through the parent adapter;
- context menu with selected nodes.

## Current File Grid Debt

The existing `viewGrid.svelte`:

- takes files instead of nodes;
- takes Obsidian `App`;
- computes prop counts directly;
- duplicates selection state and drag-box state;
- uses `role="grid"` but behaves like a file row table/list.

Do not build the new viewgrid by extending this table-like shape. Either replace
the file with a generic node grid once tests protect file workflows, or move the
old implementation to a file-list/table name as a temporary compatibility
adapter.

Use `.vm-node-grid-*` styles for the new grid surface. Keep `.vm-files-*` for
the old file-list compatibility path if it survives the transition.
