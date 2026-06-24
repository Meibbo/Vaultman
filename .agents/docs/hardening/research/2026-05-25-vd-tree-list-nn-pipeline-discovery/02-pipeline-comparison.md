---
title: Three-Way Pipeline Comparison
type: research-shard
status: active
parent: "[[index|V.D Tree/List/Notebook Navigator Pipeline Discovery]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/research
  - explorer/performance
  - explorer/view-decomposition
---

# Three-Way Pipeline Comparison

## Pipeline Shapes

### Notebook Navigator Navigation Pane

```text
file cache / services / settings / expansion
  -> useNavigationPaneSourceState
  -> useNavigationPaneTreeSections
  -> useNavigationPaneItemPipeline
  -> CombinedNavigationItem[] + pathToIndex
  -> useNavigationPaneScroll
  -> NavigationPaneLayout virtual rows
  -> memoized row components
```

The navigation pane keeps hierarchy upstream. By the time layout renders, rows
are just `items[index]` with item type, key, level, icon/color/count metadata,
and path/index maps.

### Notebook Navigator List Pane

```text
selection / search / settings / file cache
  -> useListPaneData
  -> buildListItems
  -> ListPaneItem[] + filePathToIndex
  -> useListPaneScroll
  -> ListPaneVirtualContent virtual rows
  -> memoized FileItem
```

The file row is visually heavy, but the data pipeline is staged. Headers,
spacers, file rows, collapsed groups, hidden state, search metadata, and file
indices are all modeled before render.

### Vaultman ViewNodeList

```text
panelExplorer listRowInputs / listProjection
  -> ViewNodeList effectiveRowInputs
  -> rowIdToIndex
  -> TanStack virtual rows
  -> simple row markup
```

`ViewNodeList` is a render adapter with a small amount of interaction logic.
It does not need to reconstruct hierarchy, sticky ancestors, or subtree ranges.

### Vaultman viewTree

```text
panelExplorer snapshot.rows / displayNodes / expandedIds
  -> treeRowInputs / treeProjection
  -> viewTree projectionRowInputs
  -> flatProjectionRows or flattenMeasured
  -> flatIdToIndex + stickyRows + fallback coverage
  -> TanStack virtual rows
  -> heavy treeRow snippet
```

This is the problematic shape. `viewTree` owns render, hierarchy flattening,
sticky metadata, fallback scroll state, row decorations, and multiple
interaction modes.

## Criteria Matrix

| Criterion | Notebook Navigator | Vaultman `ViewNodeList` | Vaultman `viewTree` |
|---|---|---|---|
| Final render input | `CombinedNavigationItem[]` / `ListPaneItem[]` | `ExplorerRowInput[]` | `TreeNode[]`, `ExplorerRowInput[]`, or `ExplorerProjection` |
| Visible-only flatten | Yes, expansion-gated | Already flat | Not guaranteed; Tree receives `snapshot.rows` |
| Hierarchy processing location | Hooks/utilities before render | None | Inside `viewTree.svelte` |
| Decoration location | Mostly pipeline + row-local memo | Row-local light helpers | Row snippet computes fields/badges/highlight/action state |
| Row isolation | `React.memo` row components | Keyed Svelte each in one component | One large Svelte snippet with many outer dependencies |
| Index map | `pathToIndex` / `filePathToIndex` built before scroll | `rowIdToIndex` built in view | `flatIdToIndex` built after local flatten |
| Scroll command timing | Intent queue + index version + late resolution | Focus reveal effect | `scrollTarget` effect + manual fallback state |
| Per-scroll reactive work | Bounded to virtualizer and sticky/header checks | Fallback scroll top state only | Fallback coverage + sticky rows + perf count |
| Primary risk | Complex hook dependency correctness | Small row feature drift | Render adapter remains data pipeline |

## Why Visual Complexity Is Not The Explanation

Notebook Navigator's file and navigation rows include combinations of:

- icons and custom icon resolution;
- colors and background colors;
- counts and progress;
- hidden/excluded/missing states;
- search highlights;
- tag and property pills;
- feature-image lifecycle in file rows;
- group headers and sticky group headers;
- shortcuts, recent notes, virtual folders, properties, and tags.

Despite that visual load, it keeps scroll performance because most expensive
row facts are either precomputed or scoped inside memoized row components. A
rendered row can still be heavy, but a scroll event does not force the view
component to rebuild tree topology.

## The `snapshot.rows` Gap

Vaultman's snapshot already records two concepts:

- `rows`: structural row records for the full tree traversal;
- `visibleIds`: the visible row order controlled by expanded ancestors.

The current Tree path maps `snapshot.rows` into `treeRowInputs`. That defeats
the visible-row contract. It asks `viewTree` to reconstruct visibility and
subtree state later. A V.D-compliant design should make visible row order a
data-plane output, not a view concern.

## Svelte-Specific Note

Official Svelte 5 guidance reinforces the direction:

- keyed `{#each}` blocks help update the right row identity;
- `$derived` is lazy and can skip downstream updates only when values remain
  referentially stable;
- `$effect` should not be used as a general state synchronization pipeline.

`viewTree.svelte` currently has many derived values and effects chained around
arrays, maps, and scroll state. Moving projection work out of the Svelte
component gives Svelte fewer large derived objects to invalidate.

