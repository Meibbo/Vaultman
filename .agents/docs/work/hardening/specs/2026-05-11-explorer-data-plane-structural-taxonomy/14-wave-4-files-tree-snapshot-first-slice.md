---
title: Wave 4 files tree snapshot first slice
type: implementation-spec
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T19:46:21
updated: 2026-05-11T19:46:21
tags:
  - agent/spec
  - initiative/hardening
  - explorer/files
  - implementation-spec
created_by: codex
updated_by: codex
---

# Wave 4 Files Tree Snapshot First Slice

## Goal

Introduce a Files-only structural snapshot boundary that can be generated from current Files data without changing user-visible explorer behavior.

## Source Inputs

From Wave 2:

- `createFilesIndex` already publishes source files with `nodes`, `flatIds`, `byId`, `revision`, and `subscribe`.
- `explorerFiles.getTree()` currently mixes source selection, hidden filtering, search, sort, folder tree construction, adopted children, and decoration.
- `panelExplorer` currently performs recursive id/path/order scans.
- `viewTree` currently flattens `TreeNode[]` and resolves scroll targets by scanning adapter-local rows.

## Target Contract

Create `src/types/typeExplorerDataPlane.ts` with contracts equivalent to:

```ts
export interface ExplorerSnapshotRow<TMeta = unknown> {
  id: string;
  label: string;
  depth: number;
  parentId: string | null;
  childrenIds: readonly string[];
  node: TreeNode<TMeta>;
  kind: 'file' | 'folder' | 'tag' | 'prop' | 'value' | 'unknown';
  domainKey?: string;
  path?: string;
}

export interface ExplorerSnapshot<TMeta = unknown> {
  explorerId: string;
  providerKey: string;
  revision: number;
  structureRevision: number;
  rows: readonly ExplorerSnapshotRow<TMeta>[];
  tree: readonly TreeNode<TMeta>[];
  visibleIds: readonly string[];
  byId: ReadonlyMap<string, ExplorerSnapshotRow<TMeta>>;
  idToIndex: ReadonlyMap<string, number>;
  pathToId: ReadonlyMap<string, string>;
  folderPathToId: ReadonlyMap<string, string>;
  sourceRevisions: ExplorerDataPlaneRevisions;
}
```

This contract is structural. It must not contain queue badges, active-filter badges, selection, hover, focus, dragging, or virtualizer state.

## File Responsibilities

`src/logic/logicExplorerSnapshot.ts`:

- Walk `TreeNode<TMeta>[]`.
- Build `rows`, `visibleIds`, `byId`, `idToIndex`, `pathToId`, `folderPathToId`, parent ids, and children ids.
- Preserve input `TreeNode` references unless a compatibility bridge must clone.
- Accept expansion state as an input and mark visible order deterministically.
- Return immutable arrays/maps by convention.

`src/services/serviceExplorerDataPlane.svelte.ts`:

- Hold current snapshots in `$state.raw` or immutable assignments.
- Increment `revision` only when a snapshot is replaced.
- Expose `snapshot(explorerId)`, `publish(explorerId, snapshot)`, `subscribe(explorerId, cb)`, and `clear(explorerId)`.
- Do not read Obsidian APIs directly in the first slice.

`src/providers/explorerFiles.ts`:

- Add an undecorated structural source method or data-plane adapter method.
- Reuse existing source/search/sort/hidden/adopted-child logic.
- Exclude `_decorateTree()` and queue/filter revisions from structural output.
- Keep `getTree()` and all action hooks working for compatibility.

## Migration Sequence

1. Add types and pure snapshot builder.
2. Add unit tests for a hand-built Files tree: folders, files, nested children, duplicate labels, hidden folder, adopted child, path lookup, folder lookup, parent links, and id-to-index order.
3. Add `ExplorerDataPlane` service tests for immutable publish, revision changes, snapshot lookup, and subscription firing.
4. Add Files provider structural adapter tests proving undecorated tree output matches current structural `getTree()` before decoration.
5. Wire `panelExplorer` behind a feature-free compatibility path:
   if the provider exposes a data-plane source, publish a snapshot and use its lookup maps; otherwise use current recursive helpers.
6. Keep rendered tree output equivalent by feeding the same `TreeNode` compatibility tree to existing views.

## Structural Invalidation

Files snapshot structure must rebuild when any of these change:

- files index revision;
- search name/folder query;
- sort key or direction;
- hidden-file visibility;
- expansion-visible tree shape;
- adopted-child structural source;
- Files provider mode that changes visible row set.

Queue revision and active-filter revision must not rebuild structural rows in this slice.

## Compatibility Bridge

The first slice may still pass `TreeNode[]` to `viewTree`, grid, table, and cards. The value of the slice is not removing `TreeNode`; it is proving that source structure and lookup maps can exist before decoration and panel scans.

Provider action hooks still receive `TreeNode` because context menus, queue actions, FnR handoff, rename, delete, file open, and set/filter hover actions expect provider-specific `meta`.

## Test Gates

- `test/unit/logic/logicExplorerSnapshot.test.ts`: rows, maps, parent/child links, visible ids, depth, lookup stability, and stale index absence.
- `test/unit/services/serviceExplorerDataPlane.test.ts`: publish, clear, subscribe, revision replacement, immutable snapshot read.
- `test/unit/components/explorerFiles.test.ts`: undecorated structural source parity and preservation of action hooks.
- `test/component/panelExplorerSelection.test.ts`: selection prune and range use snapshot visible order for Files.
- Existing Files provider and tree component tests keep passing.

## Acceptance

- Files can produce a structural snapshot before decorative layers.
- `panelExplorer` can use snapshot maps for Files without breaking other providers.
- `TreeNode` compatibility remains intact.
- No persistent storage, row subscriptions, or adapter rewrites are introduced.

