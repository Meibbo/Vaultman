---
title: Explorer data-plane and jump-scroll research
type: research
status: done
parent: "[[docs/work/hardening/index|Hardening]]"
created: 2026-05-14
updated: 2026-05-14
tags:
  - agent/research
  - vaultman/explorer
  - vaultman/performance
  - vaultman/data-plane
created_by: codex
updated_by: codex
---

# Explorer Data-Plane And Jump-Scroll Research

## Executive Answer

The current Explorer is only partway through the promised data-plane transition.

- Yes: the branch has stable IDs, snapshot types, lookup maps, structural provider methods, ID-based selection, Files structural cache, batched Files decoration, and TanStack virtualizers with stable item keys.
- No: normal product runtime is not yet a fully snapshot-driven Explorer where many atomic node changes update rows without rebuilding the view input.
  `panelExplorer` still refreshes by calling `provider.getTree()` and assigning a new `nodes` array for tree/grid/cards/table/markmap modes.
- No: the May 11 data-plane slice did not include a persistent database or IndexedDB cache. The PRD explicitly scoped persistent storage out of the first slice.

This matches the user's symptom: continuous scroll can improve because the DOM window is virtualized, while jumping beyond already measured/projected regions can still be slow because ID lookup, row index, pixel offset, variable row height, and projection arrays are not all O(1) or snapshot-backed yet.

## Planned Versus Implemented

The PRD asked for an incremental in-memory data plane that owns structural snapshots, stable row identity, lookup maps, projections, and revision metadata;
lets `ViewService` process rows in batches; splits structural invalidation from decoration; starts with Files; and explicitly does not introduce IndexedDB in the first slice.

The EDP-002 implementation plan was narrower still: memory-only snapshots, no DB/disk, per-explorer subscribers only, and no auto-republish from index subscriptions in that slice.

Relevant sources:

- `docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index.md` lines 45-55, 115-150, and 190.
- `docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/02-edp-002-files-snapshot-data-plane-implementation-plan.md` lines 22-24, 49-50, 64-73, and 873.

## Runtime Evidence

| Surface | Evidence | Implication |
| --- | --- | --- |
| Data-plane service | `src/main.ts:186` instantiates `ExplorerDataPlaneService`; `src/services/serviceExplorerDataPlane.svelte.ts` stores in-memory snapshots and stamps revisions. | The service exists, but it is not persistence and not row-level subscription. |
| Product publish | `rg` found no product `explorerDataPlaneService.publish(...)` for Explorer snapshots; publish calls appear in tests and media cache. | The snapshot path is testable but not clearly active in normal runtime. |
| Panel input | `panelExplorer.svelte:314-341` assigns `nodes = readProviderTree()`, and `readProviderTree()` calls `provider.getTree()`. | View input still rebuilds provider trees. |
| Snapshot read | `panelExplorer.svelte:185-187`, `214-217`, `706-714`, and `1040-1057` subscribe/read snapshot lookup maps when present. | Snapshot lookup is optional/fallback, not authoritative. |
| Files provider | `explorerFiles.ts:49`, `134-165`, `175-187`, and `228-247` implement structural cache plus batched layer decoration. | Files has real improvement, but decorated tree rebuild remains the panel input. |
| Tags/Props | `explorerTags.ts:196` and `explorerProps.ts:294` still call `viewService.getModel(...)` per node. | Tags/Props lag behind Files' batched layer path. |
| Tree view | `viewTree.svelte:241-244` derives tree rows, flattened rows, and row inputs; `315-342` resolves reveal and calls `scrollToIndex()`. | DOM rows are virtualized, but logical flattening still depends on view input. |
| Table | `ViewNodeTable.svelte:243`, `155-158`, and `464-466` use `findIndex`, full reductions, and row-top loops. | Far jumps can still pay O(n) work. |
| Grid | `ViewNodeGrid.svelte:358`, `464`, `801`, `814`, and `851-859` show similar index/height walk paths. | Dynamic grid jumps need a row geometry index. |
| Cards | `ViewNodeCards.svelte:175`, `147-150`, and `246` use `findIndex` and prefix reductions. | Card far jumps are also not constant-time. |

## Library Findings

Installed versions in `package.json`:

- `@tanstack/svelte-virtual`: `3.13.24`
- `@tanstack/table-core`: `8.21.3`
- `svelte`: `^5.55.1`
- `@chenglou/pretext`: `^0.0.6`

TanStack Virtual is the right library for the existing approach, but it only virtualizes the rendered window. It does not make upstream data projection, row lookup, or row-height math cheap by itself. Official docs emphasize good `estimateSize` for dynamic rows, durable `getItemKey`, deliberate `scrollToIndex`, `getTotalSize`, `measureElement`, `resizeItem`, overscan tuning, and scroll-position adjustment when dynamic item sizes differ from estimates.

Svelte 5 helps when we feed it stable references and revisioned inputs.
Official docs note `$derived` is push-pull and skips downstream updates when a derived value is referentially identical; `$effect` should not synchronize state; `SvelteMap`/`SvelteSet` are reactive containers, but their values are not deeply reactive.

Pretext and Vaultman's `NodeRowMeasureService` are useful for estimating row heights before DOM measurement. They need to feed a revisioned height/index cache to help cold far jumps.

Official sources:

- https://tanstack.com/virtual/latest/docs/introduction
- https://tanstack.com/virtual/latest/docs/framework/svelte/svelte-virtual
- https://tanstack.com/virtual/latest/docs/api/virtualizer
- https://tanstack.com/virtual/latest/docs/api/virtual-item
- https://svelte.dev/docs/svelte/$derived
- https://svelte.dev/docs/svelte/$effect
- https://svelte.dev/docs/svelte/svelte-reactivity

## Beta 15 Baseline

The tag `1.0.0-beta.15` exists. The claim that beta 15 felt better should be treated as a valid regression hypothesis, not as proven by current tests.
Current performance tests cover 10k index/search/model budgets and large table mount. They do not yet measure "jump to row 9000 by ID and avoid blank window" inside the live plugin surface.

## Recommended Next Work

1. Add a reproducible jump-scroll benchmark first.
   Tree: reveal/jump to a deep ID with and without snapshot maps. Table/Grid/ Cards: cold and warm jump to a deep row. Assert target visible, bounded DOM row count, no blank window, and stable elapsed time on the user's PC.
2. Make Files snapshot publication real in product runtime.
   Publish `provider.getSnapshot(expandedIds)` on structural/projection changes. Add a test proving normal `PanelExplorer` runtime receives a snapshot without a test-only injected publish.
3. Feed snapshot-backed rows into `ViewTree`.
   Build `rowInputs` from `ExplorerSnapshot.visibleIds` and `byId`; skip full flattening when snapshot rows and expansion revision are current; reject stale `idToIndex` by checking `structureRevision`.
4. Add a variable-height row geometry index.
   Table/Grid/Cards should not calculate deep offsets with `slice(0, rowIndex).reduce(...)` or loops from `0` to `rowIndex` on every jump. Use a prefix-sum/Fenwick-style service or revisioned cumulative-height cache for row index -> pixel offset and total height.
5. Promote height estimates to a revisioned cache.
   Key by view mode, node ID, content/style revision, width bucket, and font metrics. Feed TanStack estimates from Pretext/text measurement for unmeasured rows. Use either `measureElement()` or controlled `resizeItem()` per item set, not both for the same indexes.
6. Bring Tags/Props to the Files layer model.
   Batch `ViewService.getModel(...)`, publish structural snapshots, and keep decoration-only revisions out of structural snapshots.
7. Treat persistent storage as a later PRD.
   It may help startup/content search, but the current slice explicitly scoped it out. Add Dexie/IndexedDB only after the in-memory data plane and jump-scroll gates prove startup/projection rebuild remains dominant.

## Minimum Acceptance Gates

- Unit: snapshot publisher creates current `visibleIds`, `idToIndex`, and `byId` under expand/collapse, sort/search/filter, create/rename/delete.
- Unit: variable-height geometry index returns correct offsets after measured and estimated row updates.
- Component: Tree reveal uses snapshot index and does not scan flattened rows for current snapshots.
- Component: Table/Grid/Cards cold jump to a deep target under a 10k-row fixture without blank rows or more than visible window plus overscan.
- Live smoke: `plugin-dev` or generated 10k+ vault on the user's PC with cold jump, warm jump, fast wheel scroll, and deep resize samples.

## 2026-05-14 Follow-Up Implementation

First runtime slice completed in `codex/edp-final-stabilization`:

- `ExplorerProvider` now exposes optional `getSnapshot(expandedIds)`.
- `explorerFiles.getSnapshot()` builds a real Files structural snapshot.
- `panelExplorer` publishes Files provider snapshots into `ExplorerDataPlaneService` and republishes when expansion/projection inputs change.
- `panelExplorerSelection` now gates initial publish and expansion-driven republish.

Verified focused gates: `panelExplorerSelection` 41 tests, Files/data-plane/ snapshot unit tests 43 tests, ViewTree row/reveal focused tests 11 tests, and `pnpm run check` with 0 errors/warnings.

Second runtime slice completed in the same branch:

- `panelExplorer` derives `ViewTree` `rowInputs` from the published Files snapshot and hydrates them with current decorated nodes when available.
- Files tree rendering no longer depends only on the provider tree once a snapshot is published.
- Focused gate added: `panelExplorerSelection` covers snapshot-only tree rendering; ViewTree row/reveal focused tests pass with 30 tests.

## Bottom Line

The branch contains the beginning of the correct architecture, not the complete performance end-state. The highest-leverage next step is not swapping virtualization libraries. It is making the in-memory data plane active in runtime, feeding virtualizers snapshot-backed rows, and adding a row geometry index for variable-height far jumps.
