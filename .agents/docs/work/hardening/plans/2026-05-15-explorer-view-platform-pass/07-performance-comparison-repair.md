---
title: Explorer platform performance comparison repair
type: implementation-record
status: complete
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|explorer-view-platform-pass-plan]]"
created: 2026-05-16T06:20:10-05:00
updated: 2026-05-16T06:20:10-05:00
tags:
  - agent/implementation
  - initiative/hardening
  - explorer/views
  - performance
  - notebook-navigator
created_by: codex
updated_by: codex
---

# Explorer Platform Performance Comparison Repair

## Trigger

The Explorer View Platform pass was previously closed against internal focused
tests and live perf-probe smokes. User review rejected that closure because:

- Markmap still appeared in the view menu.
- The performance gate did not run Notebook Navigator's local tests or compare
  Notebook Navigator and Vaultman with a comparable 50K-node bridge.
- The pass therefore did not prove the agreed acceptance target: Vaultman's
  explorer projection must be superior to the Notebook Navigator baseline for
  the comparable 50K operation.

## Root Causes

- The existing Vaultman `explorerPlatformSynthetic` test characterized 50K and
  100K dataset shape, lookup maps, and descriptor-only media records, but it did
  not assert timing or compare against Notebook Navigator.
- The live perf probe was a Vaultman-only smoke and could not prove relative
  performance.
- `createExplorerProjection` allocated more than the comparable Notebook
  Navigator list-builder path: eager `rows`, `visibleIds`, `idToIndex`,
  `indexToId` as a full `Map`, and composed row keys for every row.
- `rowInputsFromProjection` rebuilt a row map each time instead of reading
  projection rows directly.
- `overlayViewMenu.svelte` hard-coded the Markmap button instead of deriving
  selectable modes from the platform-view contract.

## Repairs

- Added `test/unit/performance/explorerNotebookNavigatorComparison.test.ts`.
  It imports Notebook Navigator source from
  `C:\Users\vic_A\Desktop\notebook-navigator`, runs the original tree/list
  builders against 50K synthetic sources, and asserts Vaultman 50K projection is
  faster than the Notebook Navigator list bridge.
- Ran Notebook Navigator's original relevant tests with Node 24.15.0 after
  `npm ci` in `C:\Users\vic_A\Desktop\notebook-navigator`:
  `treeFlattener`, `listItems`, `useListPaneScroll`, and
  `useNavigationPaneTreeSections`.
- Optimized `src/services/serviceExplorerProjection.ts`:
  - `indexToId` is now a readonly map view over `visibleIds`, avoiding a second
    50K-entry `Map`.
  - projection arrays are pre-sized without lint-disallowed `new Array`.
  - empty media projections reuse an empty readonly map.
  - row keys use the stable row id instead of a per-row composed
    `provider:view:id` string.
  - `rowInputsFromProjection` maps rows directly and no longer builds a
    temporary `rowsById` map.
- Updated `src/components/layout/overlays/overlayViewMenu.svelte` to derive
  selectable view buttons from `EXPLORER_PLATFORM_VIEW_MODES`, which excludes
  deferred Markmap/Map modes.
- Updated component and service tests to enforce these contracts.

## Red-Green Evidence

- First Notebook Navigator bridge failure:
  - Notebook Navigator list bridge median: `42.8168 ms`.
  - Vaultman projection median: `53.4340 ms`.
  - Gate failed because Vaultman was slower.
- First projection allocation repair improved Vaultman to `44.8279 ms`, but the
  gate still failed against Notebook Navigator `43.4483 ms`.
- Final repair passed with logged medians:
  - Notebook Navigator list bridge: `61.1534 ms`.
  - Vaultman projection: `26.9575 ms`.
  - Notebook Navigator reveal lookups: `0.7050 ms`.
  - Vaultman reveal lookups: `0.1517 ms`.
  - Notebook Navigator folder-tree builder characterization: `120.1231 ms`.
- Markmap menu test failed before the UI fix because
  `.vm-squircle[aria-label="Markmap"]` was present; after the fix, the test
  passes and the live menu exposes only Tree, List, Table, Grid, and Cards.

## Verification

- Notebook Navigator original focused tests:
  - `npm test -- tests/utils/treeFlattener.test.ts tests/hooks/listPaneData/listItems.test.ts tests/hooks/useListPaneScroll.test.ts tests/hooks/useNavigationPaneTreeSections.test.ts`
  - Passed: 4 files / 19 tests.
- Svelte autofixer on `overlayViewMenu.svelte`:
  - Passed: no issues or suggestions.
- Focused Vaultman gates:
  - Unit performance/projection/media/layers/view-contract gates passed:
    7 files / 20 tests.
  - Projection bridge and service tests passed:
    2 files / 5 tests.
  - Affected component gates passed:
    9 files / 71 tests.
- `pnpm run check`:
  - Passed: 0 errors / 0 warnings.
- `pnpm run build`:
  - Passed and synced build artifacts to `plugin-dev`.
- `pnpm run verify`:
  - Passed.
  - Unit: 136 files / 824 tests.
  - Component: 69 files / 372 tests.
  - Lint: 8 pre-existing warnings, 0 errors.
- Live `plugin-dev` smoke:
  - `obsidian plugin:enable id=vaultman vault=plugin-dev`: enabled.
  - `obsidian plugin:reload id=vaultman vault=plugin-dev`: reloaded.
  - `obsidian command id=vaultman:open-view-menu vault=plugin-dev`: executed
    after opening a main Vaultman frame.
  - DOM eval in `plugin-dev`: view menu labels are
    `["Tree","List","Table","Grid","Cards"]`, `hasMarkmap=false`.
  - `obsidian dev:errors vault=plugin-dev`: `No errors captured.`

## Residuals

- The comparison bridge depends on the local Notebook Navigator checkout at
  `C:\Users\vic_A\Desktop\notebook-navigator`, matching the agreed local test
  source for this iteration.
- `openMode=sidebar` did not create a visible `vm-frame` leaf in the current
  `plugin-dev` layout during smoke. The final live DOM smoke used
  `plugin.openView('main')` to mount the frame before running
  `vaultman:open-view-menu`.
