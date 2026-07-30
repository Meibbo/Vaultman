---
title: Explorer variable scroll repair
type: implementation-record
status: active
parent: "[[docs/work/hardening/index|Hardening]]"
created: 2026-05-16T12:52:54-05:00
updated: 2026-05-20T20:33:33
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

This pass implements the first repair slice from the Notebook Navigator scroll forensics and multiview virtualization research:

- keep TanStack Virtual as the default renderer;
- remove all-row fallback paths from variable-height views;
- replace scroll-time O(total rows) offset walks with a shared prefix index;
- make fallback rendering derive from current `scrollTop` and viewport height;
- prove deep fallback jumps render bounded rows around the target.

The code pass touches `table`, `grid`, and `cards`. `tree` and `list` were used as live acceptance controls because they are visible Explorer modes and part of the user-facing blank-screen report.

A follow-up jank pass on the same record addresses the remaining user-facing tirones in variable-height views: visible-row measurement was cheap in raw PerfMeter timings, but applying row-height corrections through the virtualizer during active scroll caused scroll-height and anchor movement. Table and Grid now defer row-height measurement/resizing until a short scroll-idle window.

Tree large-scroll follow-up:
[[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/2026-05-20-tree-large-scroll-follow-up|2026-05-20 tree large-scroll follow-up]].

## Implementation

- `src/services/serviceExplorerScrollGeometry.ts`
  - Extended `createExplorerVariableGeometry()` with an eager size array plus Fenwick prefix tree.
  - Added `totalSize()`, `indexForOffset()`, and `visibleRange()`.
  - Kept `measure(index, size)` incremental through prefix deltas.

- `src/components/views/ViewNodeTable.svelte`
  - Replaced deep row-top loops with `tableGeometry.topForIndex()`.
  - Uses TanStack virtual row `start`/`size` on the normal path.
  - Uses `visibleRange(scrollTop, viewportHeight, overscan)` only when TanStack returns no rows.
  - Added lazy row id lookup for `scrollTarget`.
  - Preserved bounded fallback measuring for visible table rows.
  - Removed measured-row state from the virtualizer configuration effect so row measurement no longer re-runs `setOptions()`.
  - Added a 96 ms scroll-idle gate: while the user is actively scrolling, Table keeps stable estimates and defers visible-row height measurement plus `resizeItem()`/remeasure work until idle.
  - Table fallback rendering now uses the base row estimate rather than measuring text during active scroll.

- `src/components/views/ViewNodeGrid.svelte`
  - Replaced `gridRowTop()` loop with shared geometry.
  - Added fallback scroll state and `visibleRange()` fallback rows.
  - Added lazy recursive node-id-to-row lookup for `scrollTarget`.
  - Kept total height on the virtualizer unless the virtualizer reports zero.
  - Removed measured-row state from the virtualizer configuration effect so tile measurement no longer re-runs `setOptions()`.
  - Added the same 96 ms scroll-idle gate for grid row text measurement and virtualizer `resizeItem()`/remeasure work.

- `src/components/views/ViewNodeCards.svelte`
  - Replaced all-row fallback render with bounded `visibleRange()` rows.
  - Replaced deep `slice(0, rowIndex).reduce(...)` scroll target math with `cardGeometry.topForIndex()`.
  - Added lazy card-row id lookup for `scrollTarget`.
  - Initialized `columnCount` from the fallback width so target consumption happens against the same layout used before first resize metrics arrive.

## Tests Added

- `test/unit/services/serviceExplorerScrollGeometry.test.ts`
  - `finds deep variable-height visible ranges without rescanning estimates`
  - `updates variable-height visible ranges from measured row corrections`

- `test/component/viewNodeVariableScrollFallback.test.ts`
  - Table fallback renders bounded rows around a deep target when TanStack returns no virtual rows.
  - Cards fallback renders bounded rows around a deep target and does not render the entire dataset.

- `test/component/viewNodeScrollJank.test.ts`
  - Table and Grid do not reconfigure the virtualizer when visible row/tile measurements change.
  - Table and Grid defer measurement changes while scroll is active, then apply them after the idle window.

- `test/component/ViewNodeScrollJankHarness.svelte`
  - Test-only harness for forcing Table/Grid measurement input changes while a synthetic scroll is active.

## Verification

Focused tests:

- `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewNodeScrollJank.test.ts --fileParallelism=false` passed, 1 file / 4 tests.
- `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewNodeScrollJank.test.ts test/component/viewNodeDynamicGeometry.test.ts test/component/viewNodeVariableScrollFallback.test.ts test/component/viewNodeTableHeightmap.test.ts --fileParallelism=false` passed, 4 files / 12 tests.
- `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceExplorerScrollGeometry.test.ts` passed, 1 file / 7 tests.
- `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewNodeVariableScrollFallback.test.ts --fileParallelism=false` passed, 1 file / 2 tests.
- `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewNodeDynamicGeometry.test.ts --fileParallelism=false` passed, 1 file / 3 tests.
- `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewNodeTableHeightmap.test.ts --fileParallelism=false` passed, 1 file / 3 tests.
- `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewNodeCards.test.ts --fileParallelism=false` passed, 1 file / 6 tests.
- `pnpm check` passed with 0 errors / 0 warnings.
- `pnpm run build` passed and synced build artifacts to the repo, `dist/build`, `plugin-dev`, and the stress vault.
- `git diff --check` passed with LF-to-CRLF working-copy warnings only.

Live `plugin-dev` smoke:

All runs used `node scripts/run-explorer-scroll-smoke.mjs --mode=smoke --view=<mode> --jumps=100 --no-build --no-reload --no-open --no-overlay` after the current build had already been synced and the target view was selected via the live View Mode menu.

| View | Result | Blank frames | Blank >100 ms | Blank >250 ms | Max blank | Max event-loop delay | Dev errors |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Tree | PASS | 0 | 0 | 0 | 0 ms | 108 ms | none |
| List | PASS | 0 | 0 | 0 | 0 ms | 258 ms | none |
| Table | PASS | 0 | 0 | 0 | 0 ms | 1312 ms | none |
| Grid | PASS | 0 | 0 | 0 | 0 ms | 600 ms | none |
| Cards | PASS | 0 | 0 | 0 | 0 ms | 24 ms | none |

Fresh zero-delay smoke after the scroll-idle jank pass used:

`node scripts/run-explorer-scroll-smoke.mjs --mode=smoke --view=<mode> --jumps=100 --visual-delay-ms=0 --no-build --no-reload --no-open --no-overlay`

The target views were selected through the live View Mode menu and the plugin was reloaded immediately before the run. `visual-delay-ms=0` avoids Electron timer-throttling noise from the visible demo delay and better isolates the actual jump/render path.

| View | Result | Blank frames | Blank >100 ms | Blank >250 ms | Max blank | Max event-loop delay | Dev errors |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Table | PASS | 0 | 0 | 0 | 0 ms | 29 ms | none |
| Grid | PASS | 0 | 0 | 0 | 0 ms | 58 ms | none |
| List | PASS | 0 | 0 | 0 | 0 ms | 37 ms | none |

Runner-level view switching + percentile/histogram + vault selection pass on 2026-05-20:

- `scripts/run-explorer-scroll-smoke.mjs` now switches the already-open Vaultman Explorer to the requested `--view` by opening the live View Mode menu through `openViewMenuHook`, clicking the matching mode button, and waiting for the expected scroll target selector.
- The same runner now accepts `--vault=<name>` and routes every Obsidian CLI command through that explicit vault argument. The default remains `plugin-dev`, but the next 50k/100k pass can target a registered stress vault without changing the script.
- `src/dev/perfProbe.ts` now reports event-loop delay percentiles (`p50/p75/p95/p99`) and a fixed histogram (`<=16ms`, `<=33ms`, `<=50ms`, `<=100ms`, `>100ms`) for each burst report.
- TDD evidence:
  - RED: `explorerScrollSmokeScript.test.ts` failed on missing `ensureScrollTargetOpen`; `perfProbeDom.test.ts` failed on missing delay percentile fields.
  - RED follow-up: `explorerScrollSmokeScript.test.ts` failed on missing `--vault=VAULT` runner support.
  - GREEN: `pnpm vitest run test/component/perfProbeDom.test.ts test/unit/dev/perfProbe.test.ts test/unit/scripts/explorerScrollSmokeScript.test.ts` passed, 3 files / 32 tests.
- Build/quality evidence:
  - `pnpm run build` passed and synced artifacts to repo root, `dist/build`, `plugin-dev`, and the stress vault.
  - `pnpm run check` passed with 0 errors / 0 warnings.
  - `pnpm run lint` passed with 0 warnings / 0 errors.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
  - Fresh follow-up after `--vault` support: `pnpm vitest run test/component/perfProbeDom.test.ts test/unit/dev/perfProbe.test.ts test/unit/scripts/explorerScrollSmokeScript.test.ts` passed (3 files / 32 tests); `pnpm run check`, `pnpm run lint`, `pnpm run build`, and `git diff --check` passed. `git diff --check` emitted only the existing LF-to-CRLF working-copy warnings.
- Live `plugin-dev` explicit runner-switch matrix used:
  `node scripts/run-explorer-scroll-smoke.mjs --view=<mode> --jumps=50 --visual-delay-ms=0 --no-build --no-overlay`.

| View | Result | Blank frames | Blank >100 ms | Blank >250 ms | Max blank | Max delay | p95 delay | p99 delay | Delay histogram | Dev errors |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Tree | PASS | 0 | 0 | 0 | 0 ms | 1051 ms | 90 ms | 1051 ms | `<=16:0, <=33:3, <=50:33, <=100:12, >100:2` | none |
| List | PASS | 0 | 0 | 0 | 0 ms | 43 ms | 10 ms | 43 ms | `<=16:49, <=33:0, <=50:1, <=100:0, >100:0` | none |
| Table | PASS | 0 | 0 | 0 | 0 ms | 26 ms | 23 ms | 26 ms | `<=16:39, <=33:11, <=50:0, <=100:0, >100:0` | none |
| Grid | PASS | 0 | 0 | 0 | 0 ms | 24 ms | 20 ms | 24 ms | `<=16:45, <=33:5, <=50:0, <=100:0, >100:0` | none |
| Cards | PASS | 0 | 0 | 0 | 0 ms | 18 ms | 10 ms | 18 ms | `<=16:49, <=33:1, <=50:0, <=100:0, >100:0` | none |

Stress-vault follow-up on 2026-05-20:
[[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/2026-05-20-stress-vault-matrix|2026-05-20 stress-vault scroll matrix]].

- Fixed a harness/probe blind spot before trusting the large-vault numbers:
  inactive Explorer tab containers can remain mounted, so the runner now defaults to `--surface=files` and the probe prefers active-tab scroll containers.
- 50k Tree/List/Table Files matrix completed with zero blank frames and no Obsidian dev errors, but event-loop pressure persists at large scale.
- 50k Grid/Cards runs were only collapsed-topology measurements; Grid `Expand all` at 50k did not return within about 90 seconds.
- 100k corpus generation completed locally, but live Obsidian/CLI readiness blocked the matrix: basic `stress-vault` eval did not return within 5 minutes after earlier reload/index polling had already timed out. Obsidian was recovered by removing the stress-vault `open` flag and validating `plugin-dev` eval.
- Fresh local gate after the harness correction passed: focused Vitest 3 files / 33 tests, `pnpm run check`, `pnpm run lint`, `pnpm run build`, and `git diff --check`.

## Residuals

- The blank-screen symptom did not reproduce in the live burst harness for the five selectable modes above.
- The valid 50k Files matrix did not reproduce blank frames, but it did show sustained event-loop delay in Tree/List and max-only Table outliers.
- Grid/Cards still do not have a valid expanded large-row matrix; the 50k runs stayed on collapsed topology rows, and Grid `Expand all` did not return within about 90 seconds.
- The first failed `list` smoke in this session was caused by an intentionally invalid eval selector used while discovering the view-switch path. The buffer was cleared with `obsidian dev:errors clear vault=plugin-dev`; subsequent list/table/grid/cards/tree runs ended with `No errors captured.`
- The first fresh `table` smoke in the jank pass failed because the requested Table target was not currently open. The View Mode menu was then used to switch to Table before rerunning the smoke successfully.
- Scroll intent/revision queue hardening and media descriptor stress remain future acceptance items from the forensics matrix.

## Next

1. Add targeted marks around Tree visible-row work, List row projection, and Grid expansion/render readiness. The valid 50k Files matrix showed sustained Tree/List event-loop pressure, while Grid/Cards still need an expanded-row harness.
2. Split the 100k work into a launch/index readiness gate before retrying scroll bursts; the current 100k failure is an Obsidian CLI/runtime readiness timeout, not a completed renderer matrix.
3. Do not declare full Notebook Navigator-level 50k/100k parity until 100k readiness and expanded Grid/Cards large-row coverage are both proven.
