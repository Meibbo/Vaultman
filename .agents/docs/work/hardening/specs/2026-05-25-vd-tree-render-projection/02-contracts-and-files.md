---
title: Contracts And Files
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

# Contracts And Files

## New Service File

Create:

- `src/services/serviceTreeRenderProjection.ts`

Responsibility:

- define Tree render projection types;
- build projections from snapshot rows and visible ids;
- build fallback projections from tree nodes when no snapshot is present;
- compute hierarchy metadata with one linear pass;
- expose small helpers used by `viewTree.svelte` tests and component code.

## Candidate Types

```ts
import type { TreeNode } from '../types/typeNode';
import type { ExplorerSnapshot } from '../logic/logicExplorerSnapshot';
import type { ExplorerRowInput } from './serviceExplorerRowInput';

export interface TreeRenderRow<TMeta = unknown> {
  row: ExplorerRowInput<TMeta>;
  node: TreeNode<TMeta>;
  id: string;
  renderKey: string | number;
  index: number;
  depth: number;
  parentIndex: number | null;
  ancestorIndices: readonly number[];
  subtreeEndIndex: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

export interface TreeRenderProjection<TMeta = unknown> {
  providerId: string;
  sourceRevision: number;
  layoutRevision: number;
  rowsRevision: number;
  rows: readonly TreeRenderRow<TMeta>[];
  rowInputs: readonly ExplorerRowInput<TMeta>[];
  idToIndex: ReadonlyMap<string, number>;
  visibleIds: readonly string[];
  structuralRowCount: number;
  visibleRowCount: number;
}
```

The exact names may be adjusted to match existing service style, but the fields above are required. The important distinction is `structuralRowCount` versus `visibleRowCount`; every stress log must be able to show that Tree is using the visible count.

## Builder Inputs

```ts
export interface TreeRenderProjectionInput<TMeta = unknown> {
  providerId: string;
  rowInputs: readonly ExplorerRowInput<TMeta>[];
  visibleIds?: readonly string[];
  expandedIds: ReadonlySet<string>;
  sourceRevision: number;
  layoutRevision?: number;
}
```

Rules:

- If `visibleIds` is supplied, output rows must follow it exactly.
- If `visibleIds` is omitted, derive visible order from `rowInputs` and `expandedIds` without using nested subtree scans.
- Missing ids in `visibleIds` should be ignored only if the source row is absent from `rowInputs`; count the skip with a dev perf mark. Do not throw in production render.
- Duplicate ids should keep the first row and skip later duplicates. This preserves existing `Map` lookup semantics.

## Modified Files

Modify:

- `src/components/containers/panelExplorer.svelte`
- `src/components/explorer/ViewHost.svelte`
- `src/components/views/viewTree.svelte`

Optional test-only helpers may be added under:

- `test/unit/services/serviceTreeRenderProjection.test.ts`
- `test/component/views/viewTreeRenderProjection.test.ts`
- `test/component/containers/panelExplorerTreeProjection.test.ts`

## `panelExplorer.svelte` Contract Change

Current Tree path:

```text
filesSnapshot
  -> snapshot.rows.map(rowInputFromSnapshotRow)
  -> createExplorerProjection
  -> ViewHost rowInputs/projection
```

Target Tree path:

```text
filesSnapshot
  -> snapshot.rows.map(rowInputFromSnapshotRow)
  -> buildTreeRenderProjection({
       rowInputs,
       visibleIds: snapshot.visibleIds,
       expandedIds,
       sourceRevision: snapshot.structureRevision,
       layoutRevision: snapshot.revision
     })
  -> ViewHost treeRenderProjection
```

List should keep using `createExplorerProjection`. This spec is intentionally Tree-only.

## `ViewHost.svelte` Contract Change

Add an optional prop:

```ts
treeRenderProjection?: TreeRenderProjection<TMeta>;
```

Pass it only to `ViewTree`. Do not thread it to List/Grid/Cards/Table.

## `viewTree.svelte` Contract Change

Add prop:

```ts
renderProjection?: TreeRenderProjection<TMeta>;
```

Resolution order:

1. If `renderProjection` exists, use `renderProjection.rows`.
2. Else if `projection` exists, keep legacy `projectionRowInputs` path during migration.
3. Else use `nodes` fallback.

After tests pass and `panelExplorer` uses `renderProjection`, remove or mark the legacy `flatProjectionRows` path as obsolete in the same slice only if no tests or consumers still need it. The end-state required by this spec is that the Files Tree route no longer depends on `flatProjectionRows`.

## Perf Marks

Add marks:

- `treeRenderProjection.build.total`
- `treeRenderProjection.build.visibleRows`
- `treeRenderProjection.build.metadata`
- `panelExplorer.treeRenderProjection.rows`
- `viewTree.renderProjection.rows`

Preserve existing marks:

- `viewTree.flatten`
- `viewTree.scroll`
- `explorerDataPlane.reveal.lookup`

During migration, old and new marks may coexist. The implementation record must show which one is active in the Files Tree route.

