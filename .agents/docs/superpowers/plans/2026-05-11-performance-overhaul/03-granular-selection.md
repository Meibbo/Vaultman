# Phase 3 - Granular Selection Reactivity

Parent: [[index|Vaultman Explorer Performance Overhaul Implementation Plan]]

## Files

- Modify: `src/types/typeSelection.ts`
- Modify: `src/services/serviceSelection.svelte.ts`
- Modify: `src/components/containers/panelExplorer.svelte`
- Modify: `src/components/views/ViewNodeTable.svelte`
- Modify: `src/components/views/ViewNodeGrid.svelte`
- Modify: `test/unit/services/serviceSelection.test.ts`
- Create: `test/component/viewNodeSelectionGranularity.test.ts`

## Tasks

- [x] **Step 1: Expose a reactive per-id selection map without removing snapshots.**

In `NodeSelectionSnapshot`, add `selected: ReadonlyMap<string, boolean>`. In `ExplorerSelectionState`, add `readonly selected = new SvelteMap<string, boolean>()`. Mutators must update both `ids` and `selected`: set `true` for added ids, delete keys for removed ids, and clear both maps on clear. `snapshotOf()` returns `{ ids: new Set(state.ids), selected: state.selected, ... }`.

- [x] **Step 2: Stop cloning selection for table/grid.**

In `panelExplorer.svelte`, keep `selectedNodeIds` only for APIs that need a frozen set (`selectedNodesForContext`, file sync, source tests). Add:

```ts
const selectedNodeMap = $derived(selectionSnapshot.selected);
```

Pass `selectedMap={selectedNodeMap}` to `ViewNodeTable` and `ViewNodeGrid`; keep `selectedIds` only for tree/cards until those views are migrated.

- [x] **Step 3: Consume `selectedMap.get(id)` inside table/grid row scopes.**

In both view components, add prop `selectedMap?: ReadonlyMap<string, boolean>`. Compute row/tile selection as `selectedMap?.get(id) ?? selectedIds?.has(id) ?? false`. This read happens inside the keyed row/tile block, so Svelte tracks the specific map key instead of the parent-created `Set` reference.

- [x] **Step 4: Time selection mutations.**

Wrap `selectPointer`, `selectBox`, `moveFocus`, `toggleFocused`, `clear`, and `prune` with `PerfMeter.time('explorer.selection.<method>', ..., 'service', { explorerId, selected: state.ids.size })`. Keep `snapshot()` untimed to avoid measurement overhead on read-only render paths.

- [x] **Step 5: Verify Phase 3.**

Run:
`pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceSelection.test.ts --fileParallelism=false`
Then:
`pnpm exec vp test run --project component --config vitest.config.ts test/component/viewNodeSelectionGranularity.test.ts test/component/panelExplorerSelection.test.ts --fileParallelism=false`
Expected: selecting one id only toggles that row/tile class and emits `explorer.selection.selectPointer` under 2 ms for 10,000 ordered ids.
