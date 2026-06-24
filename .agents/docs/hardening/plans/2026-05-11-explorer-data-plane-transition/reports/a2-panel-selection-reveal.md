---
title: Scout A2 Panel selection and reveal
type: scout-report
status: draft
parent: "[[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/01-wave-a-b-claude-handoff|wave-a-b-claude-handoff]]"
created: 2026-05-12T02:48:19
updated: 2026-05-12T02:48:19
tags:
  - agent/scout
  - initiative/hardening
  - explorer/views
  - scout-report
created_by: claude
updated_by: claude
---

# Scout A2 - Panel selection and reveal integration

## Files Read

- `src/components/containers/panelExplorer.svelte`
- `src/components/views/viewTree.svelte`
- `src/services/serviceScroll.ts`
- `src/services/serviceSelection.svelte.ts` (confirmed: this is the canonical
  file; handoff referenced a stale `serviceNodeSelection*` name)
- `src/types/typeSelection.ts`
- `src/providers/explorerFiles.ts` (only line 29-30 for id confirmation)
- `test/component/panelExplorerSelection.test.ts`
- `test/component/viewTreeScrollFallback.test.ts`
- `test/component/viewTreeSelection.test.ts` (header only)
- Spec/issue/handoff: shard 14, EDP-002, 01-wave-a-b-claude-handoff.md

Provider id confirmed: `explorerFiles.id = 'files'`
(`src/providers/explorerFiles.ts:30`). `panelExplorer` already branches on
`provider.id === 'files'` at `src/components/containers/panelExplorer.svelte:649`.

## Recursive scans in panelExplorer.svelte

All scans listed below traverse the live `TreeNode<TMeta>[]` `nodes` state.
They are the candidate sites the EDP-002 plan can swap to snapshot map lookups
for Files while keeping the same function signatures as a generic fallback.

| Location | Purpose | Current strategy | Snapshot map replacement |
|---|---|---|---|
| `panelExplorer.svelte:581-590` `findNodeById` | Look up a node by id for click/contextmenu/keyboard/badge/path lookups | DFS over `nodes`, recursing into `node.children` | `snapshot.byId.get(id)?.node` |
| `panelExplorer.svelte:778-787` `parentIdFor` | ArrowLeft parent resolution from a child id | DFS scanning `node.children` for a matching child | `snapshot.byId.get(id)?.parentId` |
| `panelExplorer.svelte:789-798` `findNodePath` | Grid breadcrumb path + grid-up navigation | DFS returning ancestor chain | Walk `parentId` from `snapshot.byId.get(id)` up to null; resolves to `ExplorerSnapshotRow[]` ancestor list |
| `panelExplorer.svelte:800-807` `childrenForGridLocation` | Grid folder mode children of `currentGridParentId` | `findNodeById` + spread of `node.children` | `snapshot.byId.get(parentId).childrenIds.map((id) => snapshot.byId.get(id).node)`; root case still uses `nodes` |
| `panelExplorer.svelte:737-749` `collectExpandableNodeIds` | Drive expand-all/collapse-all and toggle summary | Walks tree, pushes ids with children | Iterate `snapshot.rows`; collect rows where `childrenIds.length > 0` |
| `panelExplorer.svelte:766-776` `collectAllHierarchyIds` | Markmap "all ids regardless of expansion" | DFS push all ids | `snapshot.rows.map((row) => row.id)` (same order, structural) |
| `panelExplorer.svelte:751-764` `collectVisibleHierarchyIds` | Inline-grid visible ids relative to `gridExpandedIds` | DFS that respects an `expanded` set | Hybrid: snapshot still needs `expandedIds` input. Use `idToIndex` + `byId` to walk children. Or rebuild snapshot per expansion (spec shard 14 lists "expansion-visible tree shape" as a structural invalidator). Recommended: keep as-is for first slice (no behavior change required). |
| `panelExplorer.svelte:171-191` `activeOpsByNode` derivation | Build badge kind map from tree walk | Recursive `walk` over `nodes` | `snapshot.rows.forEach` reading `row.node.badges`. Same per-row work, no recursion. |
| `panelExplorer.svelte:674-691` `visibleNodeIds` (tree branch) | Build ordered id list for selection range/box | Walks `nodes`, pushes ids, recurses when `expandedIds.has(id)` | Same hybrid: depends on `expandedIds`. Either keep recursive `walk` or, after expansion-aware snapshot in a later slice, read `snapshot.visibleIds`. For EDP-002 first slice, snapshot already exposes `visibleIds` keyed to "current expansion" so the tree branch can be `return [...snapshot.visibleIds]`. |
| `panelExplorer.svelte:826-841` `applyManualTreeReorder` | Manual DnD recursive reorder | Recursive tree reconstruction | Out of EDP-002 scope (mutates tree shape); keep current implementation but lookup roots via `idToIndex` to short-circuit the "not in this subtree" walk |
| `panelExplorer.svelte:809-819` `selectedNodesForContext` | Map selected ids back to nodes for context menu | `findNodeById` per id | `snapshot.byId.get(id)?.node` per id |
| `panelExplorer.svelte:648-657` `syncFileSelectionFromNodes` | Files-only TFile mapping | `findNodeById` per id | `snapshot.byId.get(id)?.node` per id |
| `panelExplorer.svelte:243-247` prune effect | Drop selection ids no longer visible | Calls `visibleNodeIds()` then `selectionService.prune` | Pass `snapshot.visibleIds` directly (already a `readonly string[]`) |

Reveal entry point: `panelExplorer.svelte:858-860` `revealNode(id)` stores
`{ id, serial }` in `scrollTarget`. Consumed by ViewTree/Grid/Cards/Table.
Today the id alone is the contract.

## viewTree.svelte scroll-target resolution

Current flow (lines `viewTree.svelte:200-275`):

1. `flatArray = flattenMeasured(nodes, expandedIds)`
   (`viewTree.svelte:200`, builder at `viewTree.svelte:477-489`). This DFS
   produces `FlatNode[]` in display order.
2. `$effect(() => { ... scrollRowIntoView(index) })` at
   `viewTree.svelte:243-248` reacts to `scrollTarget`. It calls
   `flatArray.findIndex((item) => item.node.id === target.id)` - a linear scan
   across the adapter-local flat list.
3. `scrollRowIntoView` at `viewTree.svelte:258-275` uses
   `scrollFixedIndexIntoView` from `serviceScroll.ts:97-111` to compute
   `nextTop` and call `$rowVirtualizer.scrollToIndex` plus a manual
   `outerEl.scrollTop` write.

Interaction with reveal targets:

- `panelExplorer` emits a generic `{ id }` reveal target. `viewTree` is
  responsible for resolving id -> index. That `findIndex` is the only
  adapter-local scan; `flatArray` is already memoized by the `$derived`.
- The proposed Files snapshot owns `idToIndex` which mirrors exactly this
  lookup. However the adapter's `flatArray` order is the **expansion-aware**
  flat order computed inside the view, not the structural snapshot order. As
  long as the snapshot's `visibleIds` matches `flatArray` order for Files, the
  view could swap the scan for `snapshot.idToIndex.get(id)`.
- Recommendation for this slice: **leave `viewTree.svelte:243-248` as-is**.
  The scan is over the flat array (not the recursive tree), it is O(N) once
  per reveal, and EDP-002 explicitly preserves the `TreeNode[]` compatibility
  bridge. Swapping it requires the view to receive the snapshot or the panel
  to pre-resolve to an index, which is broader than EDP-002. Defer to
  EDP-009 (adapter row contract migration).

The other views' scroll-target paths
(`ViewNodeTable.svelte:235`, `ViewNodeGrid.svelte:333`,
`ViewNodeCards.svelte:162`) follow the same pattern: linear `findIndex` on
adapter-local rows. Same defer recommendation.

## serviceSelection.svelte.ts contracts touched

`src/services/serviceSelection.svelte.ts` already uses `orderedIds: readonly
string[]` as the canonical "id source" for every range, prune, box, and move
operation. No API surface change is needed for EDP-002. The plan only needs
to feed it `snapshot.visibleIds` instead of the recursive `visibleNodeIds()`
walk.

APIs requiring a stable id source (declared in
`src/types/typeSelection.ts:19-48`):

- `selectPointer(explorerId, orderedIds, targetId, modifiers?)` - used at
  `panelExplorer.svelte:335, 411, 479, 532, 875`
- `selectBox(explorerId, orderedIds, targetIds, modifiers?)` - used at
  `panelExplorer.svelte:622, 630`
- `moveFocus(explorerId, orderedIds, direction, modifiers?)` - used at
  `panelExplorer.svelte:437`
- `toggleFocused(explorerId, orderedIds, modifiers?)` - used at
  `panelExplorer.svelte:448`
- `prune(explorerId, orderedIds)` - used at `panelExplorer.svelte:245`

All five accept any `readonly string[]`. Substituting `snapshot.visibleIds`
is a drop-in for the Files branch; non-Files providers keep passing the
current `visibleNodeIds()` walk.

## Proposed revisioned reveal target interface

```ts
// New type in src/types/typeExplorerDataPlane.ts (Wave 4 file).
export interface ExplorerRevealTarget {
  /** Provider key for routing reveal across explorer adapters. */
  providerKey: string;
  /** Explorer instance id (`provider.id`) so multi-panel hosts disambiguate. */
  explorerId: string;
  /**
   * Snapshot structural revision the target was resolved against. The view
   * must drop the target if `snapshot.structureRevision !== structureRevision`
   * to avoid scrolling to a stale index.
   */
  structureRevision: number;
  /**
   * Discriminated id source. Exactly one must be set. Providers without a
   * snapshot (Tags, Props, Plugins, Snippets, Bases) keep using `{ id }`.
   * Files reveal can use any variant; the snapshot resolves via `byId`,
   * `pathToId`, or `folderPathToId`.
   */
  id?: string;
  path?: string;
  folderPath?: string;
  /** Monotonic serial preserved from the existing contract for retrigger. */
  serial: number;
}
```

Rationale:

- `serial` keeps the current "re-fire the same id" semantic
  (`panelExplorer.svelte:103-104, 859`).
- `structureRevision` lets the view abort cleanly when a reveal arrives after
  the snapshot has already been replaced, preventing a scroll to a row that
  no longer exists at that index.
- `path` and `folderPath` are pre-baked for the spec's Files-only entry
  points (search reveals, external "go to file" commands). For EDP-002 first
  slice the panel can keep emitting `{ id, serial }` and only the type is
  reserved; the resolution helper lands in EDP-009.
- The view contract becomes "resolve to row via snapshot or fall back to id
  scan" - both shapes coexist behind a single optional `revealTarget` prop.

## Compatibility fallback for non-snapshot providers

Exact branching point: `panelExplorer.svelte:281-303` `refreshData` and the
`visibleNodeIds()` builder at `panelExplorer.svelte:674-691`. Both are the
single ingress for tree-shaped data.

Proposed branching pattern (no edit performed; product code is read-only in
this scout):

```ts
// Conceptual shape inside panelExplorer.svelte.
const snapshot = $derived.by(() => {
  if (provider.id !== 'files') return null;
  // ExplorerDataPlane service exposes a snapshot per explorerId.
  return plugin.explorerDataPlaneService?.snapshot(provider.id) ?? null;
});

function lookupById(id: string): TreeNode<TMeta> | undefined {
  if (snapshot) return snapshot.byId.get(id)?.node as TreeNode<TMeta> | undefined;
  return findNodeById(nodes, id);
}
```

Each scan listed in the table above wraps `if (snapshot) ... else ...`.
Tags, Props, Plugins, Snippets, and Bases keep the existing recursive helpers
because:

1. Their providers (`explorerTags`, `explorerProps`, `explorerPlugins`,
   `explorerSnippets`, `explorerContent`, `explorerOutline`) do not yet
   expose a structural source method per shard-14 plan.
2. The `explorerDataPlaneService?.snapshot(provider.id)` call returns
   `undefined` for unregistered explorer ids, so the fallback path activates
   automatically without a feature flag.
3. The existing `provider.id !== 'files'` check at
   `panelExplorer.svelte:649` (file-TFile sync) is already the precedent;
   the same id-string gate keeps the slice tight.

## Tests that must remain green

All Vitest specs under `test/component/` exercising the panel selection or
the tree adapter rendering:

- `test/component/panelExplorerSelection.test.ts` - primary surface; covers
  click, label-click, double-click, alt/middle delete, outside-click clear,
  Escape clear, grid tile select, grid hierarchy navigation, table/cards
  selection, context-menu same-type selection, hover badge same-type
  selection, ArrowLeft/Right tree expansion, ArrowLeft parent jump,
  PageDown/PageUp focus and scroll, expand-all/collapse-all commands,
  expansion summary callback.
- `test/component/panelExplorerBadgeCollision.test.ts` - badge contradiction
  warning path.
- `test/component/panelExplorerCrear.test.ts` - panel creation flow.
- `test/component/panelExplorerDeleteConflict.test.ts` - delete badge
  routing via queue service.
- `test/component/panelExplorerEmpty.test.ts` - empty/fallback state
  rendering.
- `test/component/viewTreeScrollFallback.test.ts` - fallback virtual rows
  around scrollTop; not affected by snapshot wiring.
- `test/component/viewTreeSelection.test.ts` - selection gestures at the
  view layer.
- `test/component/viewTreeAdoptedNodes.test.ts` - adopted child rendering
  (snapshot must preserve adopted children in `rows`).
- `test/component/viewTreeDecorations.test.ts` - decoration overlays.
- `test/component/viewTreeHoverBadges.test.ts` - hover badge wiring.

All test factories already construct minimal `TreeNode[]` arrays. None mock
`plugin.explorerDataPlaneService`, so when the service is absent the panel
falls through to the recursive helpers and the suite continues to pass
without modification. The EDP-002 plan should add a new
`test/component/panelExplorerSelection.test.ts` extension (per shard 14 "Test
Gates") covering: "Files panel prune uses snapshot.visibleIds" and "Files
panel selection range uses snapshot order".

## Risks and Open Questions

1. `visibleNodeIds()` for tree mode is **expansion-aware**. Spec shard 14
   lists "expansion-visible tree shape" as a structural invalidator. If the
   snapshot rebuilds on every expand/collapse, the Files panel can rely
   solely on `snapshot.visibleIds`. Confirm the data-plane service's
   rebuild policy before swapping the walk.
2. `viewTree`/`ViewNodeTable`/`ViewNodeGrid`/`ViewNodeCards` all keep their
   own `flatArray.findIndex` for reveal. EDP-002 cannot remove these without
   passing the snapshot to the views, which the spec defers (compatibility
   bridge keeps `TreeNode[]` in/out). Confirm this is acceptable for the
   first slice.
3. `applyManualTreeReorder` (`panelExplorer.svelte:826-841`) mutates the
   reactive `nodes` state directly. After a manual DnD the local `nodes`
   diverges from the snapshot until the provider republishes. Plan must
   either: (a) keep the recursive fallback for the duration of DnD, or
   (b) republish the snapshot synchronously after `applyManualNodeReorder`.
4. `currentGridParentId` validation effect at
   `panelExplorer.svelte:249-256` and `panelExplorer.svelte:728-735` calls
   `findNodeById` post-refresh. If snapshot publish is async vs `refreshData`,
   the validation needs to read the latest snapshot, not stale `nodes`.
5. The `fallbackSelectionService` at `panelExplorer.svelte:110-114` exists
   for tests that omit `plugin.selectionService`. Snapshot wiring must
   keep the same plugin-vs-fallback resolution: `selectionService` is the
   `INodeSelectionService`, not the data-plane service.
6. Should `revealNode` accept the richer `ExplorerRevealTarget` shape now
   or stay on `{ id, serial }` until EDP-009? Recommend: keep shape change
   internal to types only in EDP-002; defer panel-side adoption.
7. `selectionKey` (`panelExplorer.svelte:659-666`) and
   `lastCommittedSelectionKey` (line 167) deduplicate `viewService.select`
   bursts. This is independent of snapshot wiring.

## Proposed exact files and tests the plan should touch

Product files (edit):

- `src/components/containers/panelExplorer.svelte` - swap helper internals to
  snapshot lookup for Files; keep recursive fallback for other providers.
  Touchpoints: lines 110-114, 145, 171-191, 243-247, 249-256, 281-303,
  581-590, 648-657, 674-691, 728-735, 737-776, 778-798, 800-807, 809-819,
  826-841, 858-860.
- `src/components/views/viewTree.svelte` - **no edit in EDP-002**. Reserve
  the prop name `revealTarget` and types for EDP-009 follow-up.
- `src/services/serviceSelection.svelte.ts` - **no edit**. APIs accept the
  new id source unchanged.
- `src/services/serviceScroll.ts` - **no edit**. Index-based helpers stay.

Type files (edit / add):

- `src/types/typeExplorerDataPlane.ts` (per shard 14) - add
  `ExplorerRevealTarget` next to `ExplorerSnapshot` (this report's section 4).
- `src/types/typeSelection.ts` - **no edit**.

New tests:

- Extend `test/component/panelExplorerSelection.test.ts` with at least three
  cases mounting a Files-shaped provider plus a stub
  `plugin.explorerDataPlaneService.snapshot('files')` returning a hand-built
  snapshot with `visibleIds`, `byId`, `idToIndex`:
  - "Files panel prune uses snapshot.visibleIds"
  - "Files panel selection range uses snapshot.visibleIds order"
  - "Files panel falls back to recursive walk when service is absent"
- Optional: a smoke test that asserts `viewService.select` is called once
  per selected id when snapshot is wired, mirroring existing assertions.

Tests that must NOT change (regression gates):

- All `test/component/panelExplorer*.test.ts` files listed above.
- All `test/component/viewTree*.test.ts` files listed above.
- `test/component/viewTreeScrollFallback.test.ts` for adapter-local reveal
  behavior.

Report path: `.agents/docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/reports/a2-panel-selection-reveal.md`
