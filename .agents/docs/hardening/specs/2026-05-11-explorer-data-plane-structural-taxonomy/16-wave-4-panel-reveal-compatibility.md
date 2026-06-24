---
title: Wave 4 panel and reveal compatibility
type: implementation-spec
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T19:46:21
updated: 2026-05-11T19:46:21
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - scroll
  - selection
  - implementation-spec
created_by: codex
updated_by: codex
---

# Wave 4 Panel And Reveal Compatibility

## Goal

Let `panelExplorer` consume Files snapshots incrementally while preserving
existing provider actions, selection behavior, expansion behavior, and virtual
view adapters.

## Current Coupling To Reduce

`panelExplorer.svelte` currently owns:

- `refreshData()` and `provider.getTree()` orchestration;
- badge bubbling through `bubbleHiddenTreeBadges`;
- recursive `findNodeById`, `findNodePath`, and visible id scanning;
- selection prune/range order through `visibleNodeIds()`;
- `ViewService` selection mirror updates;
- `{ id, serial }` scroll targets sent to adapters;
- grid parent navigation and provider action dispatch.

Wave 4 should reduce recursive scans and stale reveal risk without trying to
turn `panelExplorer` into a thin shell in one slice.

## Reveal Target Contract

Extend the current target shape from `{ id, serial }` toward:

```ts
export interface ExplorerRevealTarget {
  id: string;
  serial: number;
  minSnapshotRevision: number;
  reason:
    | 'keyboard'
    | 'selection'
    | 'expansion'
    | 'command'
    | 'restore';
  align?: 'start' | 'center' | 'end' | 'auto';
}
```

Adapters must resolve `id -> index` late. If the adapter sees a target whose
`minSnapshotRevision` is newer than the row map it can prove, it must defer or
ignore rather than scroll to a stale index.

## Migration Sequence

1. Add `ExplorerRevealTarget` and snapshot readiness fields to the data-plane
   type file.
2. Teach `panelExplorer` to create reveal targets with current Files snapshot
   revision when a Files snapshot exists.
3. Keep old `{ id, serial }` support for providers without snapshots.
4. Add optional props to `viewTree.svelte`: `snapshotRevision`,
   `idToIndex`, and/or `resolveIndexById`.
5. In `viewTree`, prefer supplied lookup maps for reveal and fall back to
   current flattened row scan.
6. Later adapters can adopt the same contract after the tree proves it.

## Selection Projection

For Files snapshots:

- `selectionService.prune(provider.id, snapshot.visibleIds)` replaces panel
  recursive visible id construction.
- Pointer, range, box, and keyboard selection use snapshot visible order.
- `selectedNodes` for provider actions are resolved through `snapshot.byId`
  and then through the compatibility `TreeNode` carried by each row.
- `ViewService` selection mirroring remains until a later spec removes or
  replaces it with a read adapter over `NodeSelectionService`.

For non-snapshot providers, existing behavior remains unchanged.

## Expansion And Grid Navigation

Expansion should be passed as structural input to snapshot creation for Files.
The first slice can still keep expansion state in `panelExplorer`, but snapshot
visible order must be rebuilt from that expansion state before selection/range
or reveal decisions.

Grid navigation can continue to use `TreeNode` compatibility nodes. The
snapshot should add parent and path maps so `findNodePath()` and parent lookup
can migrate away from recursive scans later.

## Compatibility Rules

- Do not remove `findNodeById`, `findNodePath`, or `visibleNodeIds()` in the
  first patch. Route Files through snapshot maps and keep helpers as fallback.
- Do not remove `ViewService` selection mirror in this wave.
- Do not require grid/table/cards to consume snapshot rows directly yet.
- Do not change provider action signatures.
- Do not treat DnD local reorder as data-plane structure unless a later spec
  makes it durable.

## Test Gates

- Component test: Files selection prune uses snapshot visible order.
- Component test: range selection after expansion/search uses snapshot order.
- Component test: reveal target with stale revision does not scroll to the old
  index.
- Component test: reveal target with current revision scrolls to the expected
  tree row.
- Existing `panelExplorerSelection`, `viewTreeSelection`, and
  `viewTreeScrollFallback` tests remain green.
- Unit test: reveal target builder includes current snapshot revision and
  increments serial for repeated targets.

## Acceptance

- Files path can use snapshot maps while non-Files providers still use legacy
  recursive helpers.
- Reveal-by-id is revision-aware for tree view.
- Selection source of truth remains `NodeSelectionService`.
- Existing provider actions keep receiving `TreeNode`-compatible nodes.
- No adapter outside tree is forced to migrate in the first compatibility
  slice.

