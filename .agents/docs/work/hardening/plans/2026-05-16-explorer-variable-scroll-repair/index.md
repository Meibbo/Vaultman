---
title: Explorer variable scroll repair
type: implementation-record
status: active
parent: "[[docs/work/hardening/index|Hardening]]"
created: 2026-05-16T12:52:54-05:00
updated: 2026-05-16T14:27:20-05:00
tags:
  - agent/plan
  - explorer/performance
  - explorer/scroll
  - explorer/virtualization
  - plugin-dev
created_by: codex
updated_by: codex
---

# Explorer Variable Scroll Repair

## Scope

This pass implements the first repair slice from the Notebook Navigator scroll
forensics and multiview virtualization research:

- keep TanStack Virtual as the default renderer;
- remove all-row fallback paths from variable-height views;
- replace scroll-time O(total rows) offset walks with a shared prefix index;
- make fallback rendering derive from current `scrollTop` and viewport height;
- prove deep fallback jumps render bounded rows around the target.

The code pass touches `table`, `grid`, and `cards`. `tree` and `list` were used
as live acceptance controls because they are visible Explorer modes and part of
the user-facing blank-screen report.

A follow-up jank pass on the same record addresses the remaining user-facing
tirones in variable-height views: visible-row measurement was cheap in raw
PerfMeter timings, but applying row-height corrections through the virtualizer
during active scroll caused scroll-height and anchor movement. Table and Grid
now defer row-height measurement/resizing until a short scroll-idle window.

Tree large-scroll follow-up:
[[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/2026-05-20-tree-large-scroll-follow-up|2026-05-20 tree large-scroll follow-up]].

## Implementation

- `src/services/serviceExplorerScrollGeometry.ts`
  - Extended `createExplorerVariableGeometry()` with an eager size array plus
    Fenwick prefix tree.
  - Added `totalSize()`, `indexForOffset()`, and `visibleRange()`.
  - Kept `measure(index, size)` incremental through prefix deltas.

- `src/components/views/ViewNodeTable.svelte`
  - Replaced deep row-top loops with `tableGeometry.topForIndex()`.
  - Uses TanStack virtual row `start`/`size` on the normal path.
  - Uses `visibleRange(scrollTop, viewportHeight, overscan)` only when TanStack
    returns no rows.
  - Added lazy row id lookup for `scrollTarget`.
  - Preserved bounded fallback measuring for visible table rows.
  - Removed measured-row state from the virtualizer configuration effect so
    row measurement no longer re-runs `setOptions()`.
  - Added a 96 ms scroll-idle gate: while the user is actively scrolling, Table
    keeps stable estimates and defers visible-row height measurement plus
    `resizeItem()`/remeasure work until idle.
  - Table fallback rendering now uses the base row estimate rather than measuring
    text during active scroll.

- `src/components/views/ViewNodeGrid.svelte`
  - Replaced `gridRowTop()` loop with shared geometry.
  - Added fallback scroll state and `visibleRange()` fallback rows.
  - Added lazy recursive node-id-to-row lookup for `scrollTarget`.
  - Kept total height on the virtualizer unless the virtualizer reports zero.
  - Removed measured-row state from the virtualizer configuration effect so
    tile measurement no longer re-runs `setOptions()`.
  - Added the same 96 ms scroll-idle gate for grid row text measurement and
    virtualizer `resizeItem()`/remeasure work.

- `src/components/views/ViewNodeCards.svelte`
  - Replaced all-row fallback render with bounded `visibleRange()` rows.
  - Replaced deep `slice(0, rowIndex).reduce(...)` scroll target math with
    `cardGeometry.topForIndex()`.
  - Added lazy card-row id lookup for `scrollTarget`.
  - Initialized `columnCount` from the fallback width so target consumption
    happens against the same layout used before first resize metrics arrive.

## Tests Added

- `test/unit/services/serviceExplorerScrollGeometry.test.ts`
  - `finds deep variable-height visible ranges without rescanning estimates`
  - `updates variable-height visible ranges from measured row corrections`

- `test/component/viewNodeVariableScrollFallback.test.ts`
  - Table fallback renders bounded rows around a deep target when TanStack
    returns no virtual rows.
  - Cards fallback renders bounded rows around a deep target and does not
    render the entire dataset.

- `test/component/viewNodeScrollJank.test.ts`
  - Table and Grid do not reconfigure the virtualizer when visible row/tile
    measurements change.
  - Table and Grid defer measurement changes while scroll is active, then apply
    them after the idle window.

- `test/component/ViewNodeScrollJankHarness.svelte`
  - Test-only harness for forcing Table/Grid measurement input changes while a
    synthetic scroll is active.

## Verification

Focused tests:

- `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewNodeScrollJank.test.ts --fileParallelism=false`
  passed, 1 file / 4 tests.
- `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewNodeScrollJank.test.ts test/component/viewNodeDynamicGeometry.test.ts test/component/viewNodeVariableScrollFallback.test.ts test/component/viewNodeTableHeightmap.test.ts --fileParallelism=false`
  passed, 4 files / 12 tests.
- `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceExplorerScrollGeometry.test.ts`
  passed, 1 file / 7 tests.
- `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewNodeVariableScrollFallback.test.ts --fileParallelism=false`
  passed, 1 file / 2 tests.
- `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewNodeDynamicGeometry.test.ts --fileParallelism=false`
  passed, 1 file / 3 tests.
- `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewNodeTableHeightmap.test.ts --fileParallelism=false`
  passed, 1 file / 3 tests.
- `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewNodeCards.test.ts --fileParallelism=false`
  passed, 1 file / 6 tests.
- `pnpm check` passed with 0 errors / 0 warnings.
- `pnpm run build` passed and synced build artifacts to the repo, `dist/build`,
  `plugin-dev`, and the stress vault.
- `git diff --check` passed with LF-to-CRLF working-copy warnings only.

Live `plugin-dev` smoke:

All runs used `node scripts/run-explorer-scroll-smoke.mjs --mode=smoke
--view=<mode> --jumps=100 --no-build --no-reload --no-open --no-overlay` after
the current build had already been synced and the target view was selected via
the live View Mode menu.

| View | Result | Blank frames | Blank >100 ms | Blank >250 ms | Max blank | Max event-loop delay | Dev errors |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Tree | PASS | 0 | 0 | 0 | 0 ms | 108 ms | none |
| List | PASS | 0 | 0 | 0 | 0 ms | 258 ms | none |
| Table | PASS | 0 | 0 | 0 | 0 ms | 1312 ms | none |
| Grid | PASS | 0 | 0 | 0 | 0 ms | 600 ms | none |
| Cards | PASS | 0 | 0 | 0 | 0 ms | 24 ms | none |

Fresh zero-delay smoke after the scroll-idle jank pass used:

`node scripts/run-explorer-scroll-smoke.mjs --mode=smoke --view=<mode> --jumps=100 --visual-delay-ms=0 --no-build --no-reload --no-open --no-overlay`

The target views were selected through the live View Mode menu and the plugin
was reloaded immediately before the run. `visual-delay-ms=0` avoids Electron
timer-throttling noise from the visible demo delay and better isolates the
actual jump/render path.

| View | Result | Blank frames | Blank >100 ms | Blank >250 ms | Max blank | Max event-loop delay | Dev errors |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Table | PASS | 0 | 0 | 0 | 0 ms | 29 ms | none |
| Grid | PASS | 0 | 0 | 0 | 0 ms | 58 ms | none |
| List | PASS | 0 | 0 | 0 | 0 ms | 37 ms | none |

## Residuals

- The blank-screen symptom did not reproduce in the live burst harness for the
  five selectable modes above.
- The fresh zero-delay smoke no longer reproduces the large Table/List spikes.
  Grid still has a moderate 58 ms peak and should get a percentile/histogram
  runner before any claim of full smoothness.
- The first failed `list` smoke in this session was caused by an intentionally
  invalid eval selector used while discovering the view-switch path. The buffer
  was cleared with `obsidian dev:errors clear vault=plugin-dev`; subsequent
  list/table/grid/cards/tree runs ended with `No errors captured.`
- The first fresh `table` smoke in the jank pass failed because the requested
  Table target was not currently open. The View Mode menu was then used to
  switch to Table before rerunning the smoke successfully.
- Scroll intent/revision queue hardening and media descriptor stress remain
  future acceptance items from the forensics matrix.

## Next

1. Add live runner support for selecting a view mode by argument so future
   multiview smoke runs do not need manual View Mode menu eval clicks.
2. Add percentile/histogram reporting to the scroll burst report; max-only is
   too sensitive to unrelated Electron pauses.
3. Re-run Grid with targeted marks around visible tile rendering, field
   projection, and row measuring if the 58 ms peak persists under histogram
   reporting.
4. Run the same matrix against a confirmed 50k/100k synthetic dataset before
   declaring full Notebook Navigator-level parity.
