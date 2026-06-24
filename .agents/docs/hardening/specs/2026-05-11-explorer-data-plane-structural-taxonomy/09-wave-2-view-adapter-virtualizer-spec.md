---
title: Wave 2 view adapter and virtualizer spec
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T19:31:39
updated: 2026-05-11T19:31:39
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - virtualizer
created_by: codex
updated_by: codex
---

# Wave 2 View Adapter And Virtualizer Spec

## Evidence Read

- Source: `viewTree.svelte`, `ViewNodeGrid.svelte`, `ViewNodeTable.svelte`,
  `ViewNodeCards.svelte`, `viewList.svelte`, `ViewSvarFileManager.svelte`,
  `viewOutlineExplorer.svelte`, `serviceVirtualizer.svelte.ts`,
  `serviceViewSize.ts`, `serviceViewTableAdapter.ts`,
  `serviceNodeRowMeasure.ts`, `serviceNodeRowStyle.ts`,
  `serviceNodeCardLayout.ts`, `serviceNodeCardStyle.ts`, `typeViews.ts`,
  `typeNode.ts`, `utilViewLayers.ts`, `serviceViews.svelte.ts`,
  `serviceScroll.ts`, `serviceMouse.ts`, `nodeBadgeHelpers.ts`, and
  `serviceBadge.ts`.
- Tests: requested `viewTree*`, `viewNode*`, `viewList`,
  `viewSvarFileManager`, `virtualizerItemKeys`, `serviceVirtualizer`,
  `nodeVirtualPositioning`, and `serviceViewTableAdapter`.
- Svelte autofixer was run by the recon pass on the seven target components
  and returned no issues or suggestions.

## Current Responsibilities

`viewList` is closest to the target adapter model. It consumes
`ExplorerRenderModel`, renders `ViewRow` layers/actions, and forwards semantic
actions or reorder requests.

`viewTree`, `ViewNodeGrid`, `ViewNodeTable`, and `ViewNodeCards` still own
adapter-local data work: flattening/chunking, virtual row keys, scroll reveal
lookup, dynamic measurement, badge rendering, selection classes, and gesture
routing.

`ViewSvarFileManager` is a special compatibility bridge. It maps `TreeNode`
directly to SVAR data and still performs Obsidian file rename/delete side
effects. It should not define the clean adapter boundary.

`serviceVirtualizer.svelte.ts` is a minimal fixed-height virtualizer and tree
flattener, but most production adapters use TanStack virtualizer directly.

`typeViews.ts` already defines the target render contract:
`ExplorerRenderModel`, `ViewRow`, `ViewLayers`, `ViewAction`, selection/focus,
sort/search, and virtualization state. `utilViewLayers.ts` is the explicit
compatibility seam from `ViewLayers` back to legacy `TreeNode.badges`,
highlights, and state classes.

## Data Flow

Legacy path:

```text
provider TreeNode[]
  -> TreeNode meta/badges/highlights/classes
  -> adapter-local projection
  -> tree flatten or grid/card chunking or table row conversion
  -> adapter-local virtualizer/window/reveal
  -> DOM rows/cards/table cells
  -> callbacks by node id
```

Partial target path:

```text
source nodes + operations + filters + revisions
  -> ViewService.getModel
  -> ExplorerRenderModel rows/layers/actions
  -> viewList adapter
  -> semantic callbacks
```

The mismatch is that `ViewService` and `ViewLayers` exist, but
tree/grid/table/cards mostly bypass them or convert only partially through
`serviceViewTableAdapter`.

## Target Seams

- Snapshot-to-row projection: structural snapshots should precompute visible
  row ids, depth, hierarchy flags, lookup maps, and stable order before
  adapters receive data.
- Virtualizer adapter seam: each surface can keep its virtualizer and
  measurement strategy, but row lookup, reveal, and item key inputs should come
  from stable snapshot maps.
- Layer bridge seam: keep `ViewLayers` as canonical. Use `utilViewLayers.ts` as
  the legacy adapter until `TreeNode.badges/highlights/cls` shrink.
- Measurement seam: keep `NodeRowMeasureService`, row/card style resolvers, and
  card layout services outside the structural data plane.
- Event seam: preserve adapter callbacks by semantic id. Existing tests protect
  delegated clicks, context menus, keyboard routing, badge isolation, and
  selection granularity.

## Risks

- Moving flattening/chunking too early can break row identity, scroll reveal,
  and selection preservation.
- Decorative invalidation remains mixed into structural nodes through badges,
  classes, and highlights.
- Table/card/grid measurement depends on rendered CSS snapshots; this must stay
  in adapter or layout services, not the data plane.
- `TreeNode` carries structural, semantic, decorative, and provider-meta work.
- `ViewNodeTable` consumes `ViewRow`, but `nodeRowsFromTree` still introspects
  provider-specific `TreeNode.meta`.
- Grid/cards/table duplicate virtualizer setup, fallback rows, scroll reveal,
  key composition, dynamic height bookkeeping, and DOM measurement scheduling.

## Test Gates

- Snapshot unit tests for visible row order, node-id lookup, parent/child
  relations, provider keys, revision metadata, and stale reveal rejection.
- Adapter projection tests where tree/grid/table/cards consume
  snapshot-backed rows or compatibility rows and preserve existing DOM/callback
  behavior.
- Layer bridge tests from `ViewLayers` to legacy `TreeNode` badges, highlights,
  classes, inherited badges, and queue removal ids.
- Performance gates around flattening, model/layer creation counts,
  virtualizer key stability, and reveal lookup cost before and after migration.
- Compatibility gate that SVAR remains an adapter with side effects, not a
  model for the clean data-plane contract.

