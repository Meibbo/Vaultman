---
title: Target Architecture
type: spec-shard
status: draft
parent: "[[index|V.D Tree Render Projection]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/view-decomposition
  - explorer/performance
---

# Target Architecture

## Current Architecture Problem

`viewTree.svelte` currently combines four responsibilities:

1. render shell: TanStack Virtual, DOM rows, sticky layer, selection box;
2. hierarchy projection: row inputs to flat rows, parent indices, ancestors,
   subtree ranges;
3. row decoration: badges, hover actions, fields, count visibility, highlight,
   warning, editing, icon choice;
4. scroll fallback: coverage validation, fallback rows, scroll target handling,
   sticky row calculation.

V.D should split responsibility 2 first. Responsibility 3 may move partially in
the same slice only where the projection contract naturally carries row facts.

## Target Data Flow

```text
Explorer provider snapshot
  -> TreeRenderProjectionBuilder
     - selects visible row ids
     - maps ids to ExplorerRowInput
     - computes flat row metadata
     - computes lookup maps
     - attaches stable render keys
  -> panelExplorer treeRenderProjection
  -> ViewHost
  -> viewTree render shell
```

The render shell still owns DOM event wiring and current visual markup. The data
plane owns visible ordering and hierarchy metadata.

## Tree Render Projection Boundaries

The new projection must be independent of Svelte runtime state. It should be a
plain TypeScript service under `src/services/` or `src/logic/`, with unit tests.

It may depend on:

- `ExplorerSnapshot`;
- `ExplorerRowInput`;
- `TreeNode` only through row conversion helpers;
- `expandedIds`;
- view provider id and revisions;
- feature masks only if the builder eventually precomputes decoration.

It must not depend on:

- DOM elements;
- TanStack Virtual;
- Svelte runes;
- Obsidian workspace state;
- CSS measurements;
- `viewTree.svelte` local state.

## Visible Row Rule

The projection builder must use visible order as its render input. For provider
snapshots, that means `snapshot.visibleIds` is the primary order source.

When no snapshot exists and the view receives local `nodes`, the fallback path
may still flatten `nodes` with `expandedIds`. That fallback must use the same
linear metadata algorithm as the snapshot path.

## Linear Metadata Rule

For each visible row, compute:

- `index`;
- `parentIndex`;
- `ancestorIndices`;
- `subtreeEndIndex`;
- `depth`;
- `hasChildren`;
- `isExpanded`;
- `rowInput`;
- `node`;
- `renderKey`.

`subtreeEndIndex` must not be computed with a nested forward scan. Use a stack:

1. Iterate visible rows from top to bottom.
2. While stack top depth is greater than or equal to current depth, close that
   stack entry with `currentIndex - 1`.
3. Current parent is the stack top after closing.
4. Current ancestors are parent ancestors plus parent index.
5. Push current row.
6. After the loop, close remaining stack entries with `lastIndex`.

This is `O(visibleRows * averageAncestorCopyCost)`. A future optimization can
store compact parent links instead of copied arrays, but copied arrays preserve
the current sticky-row API and keep this slice smaller.

## Row Decoration Rule

Initial V.D should precompute only row facts that are structural or cheap to
move safely:

- callback id;
- render key;
- depth;
- `hasChildren`;
- `isExpanded`;
- parent and ancestor indices;
- subtree end index;
- row/node pair.

Badge and field decoration can remain in `viewTree` for the first pass unless
instrumentation proves it dominates after structural projection moves out. The
spec permits moving badges/fields later, but it should not block the first
visible-row projection slice.

## Scroll Rule

The first V.D slice must preserve existing Tree scroll behavior:

- virtual rows still come from TanStack;
- fallback fixed rows remain until the stress matrix proves they can be reduced;
- sticky rows still use ancestor/subtree metadata;
- reveal lookup should use the projection's `idToIndex`.

Do not rewrite scroll orchestration in the same commit as the projection split.
Notebook Navigator's version-gated scroll model is a follow-up if Tree delay
remains high after visible projection.

