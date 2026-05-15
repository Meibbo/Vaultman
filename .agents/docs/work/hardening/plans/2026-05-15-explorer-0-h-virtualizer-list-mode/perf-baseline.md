---
title: 0-H pre-migration perfProbe baseline
type: verification-record
status: active
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/index|0-H virtualizer + list mode plan]]"
created: 2026-05-15T04:26:25.6569760-05:00
updated: 2026-05-15T04:26:25.6569760-05:00
tags:
  - agent/verification
  - explorer/performance
  - explorer/views
---

# 0-H Pre-Migration PerfProbe Baseline

Captured: 2026-05-15T04:26:25.6569760-05:00
Branch: `claude/explorer`
Head: `e8795a1`
Workspace: `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\jovial-wilson-f81c67`

## Coverage Audit

Audited files:

- `test/component/viewList.test.ts`
- `test/component/reactiveExplorers.test.ts`

Current widget-consumer coverage:

| Surface | Existing coverage | Notes |
|---|---|---|
| List row rendering | `test/component/viewList.test.ts:71` | Asserts labels, details, badges, and row action dispatch through `ViewList`. |
| List action dispatch | `test/component/viewList.test.ts:71`, `test/component/viewList.test.ts:96` | Covers normal row action and queue-child inline cancel action. |
| List reorder | `test/component/viewList.test.ts:124` | Covers drag/drop reorder request from `ViewList`. |
| Queue rendering through `ViewList` | `test/component/reactiveExplorers.test.ts:300`, `test/component/reactiveExplorers.test.ts:339` | Covers queue index refresh and parent/child row DOM. |
| Queue action dispatch through `ViewList` | `test/component/reactiveExplorers.test.ts:339` | Clicks queue child inline cancel and asserts `queueService.remove('op-1')`. |
| Active filters rendering through `ViewList` | `test/component/reactiveExplorers.test.ts:420` | Covers active filter index refresh and rendered label. |
| Active filters action dispatch through `ViewList` | `test/component/reactiveExplorers.test.ts:455` | Added during Task 0 after red/green check; clicks row remove action and asserts `filterService.removeNode(rule)`. |
| Active filters reorder | `test/component/reactiveExplorers.test.ts:489` | Covers list drag/drop reorder inside the same parent and `setFilter` dispatch. |

## Commands Attempted

| Command | Exit | Result |
|---|---:|---|
| `git branch --show-current` | 0 | `claude/explorer` |
| `git rev-parse --short HEAD` | 0 | `e8795a1` |
| `git status --short` | 0 | Existing unrelated `M .vscode/settings.json` only before Task 0 edits. |
| `rg -n "perfProbe\|performanceProbe\|probe" .` | 0 | Located `src/dev/perfProbe.ts`, `test/component/perfProbeDom.test.ts`, unit probe tests, and instrumentation call sites. |
| `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewList.test.ts test/component/reactiveExplorers.test.ts --fileParallelism=false` | 0 | Pre-edit focused coverage check: 2 files / 17 tests passed. |
| `pnpm exec vitest run --project component --config vitest.config.ts test/component/reactiveExplorers.test.ts --fileParallelism=false` | 1 | Red phase for added active-filter row-action test: 14 passed / 1 failed because the test initially targeted `aria-label="Remove"` instead of the rendered `Remove filter` action. |
| `pnpm exec vitest run --project component --config vitest.config.ts test/component/reactiveExplorers.test.ts --fileParallelism=false` | 0 | Green phase after correcting the test selector: 1 file / 15 tests passed. |
| `pnpm exec vitest run --project component --config vitest.config.ts test/component/perfProbeDom.test.ts --fileParallelism=false` | 0 | Local jsdom perfProbe scenario harness: 1 file / 4 tests passed. |
| `Measure-Command { pnpm exec vitest run --project component --config vitest.config.ts test/component/perfProbeDom.test.ts --fileParallelism=false \| Out-Host }` | 0 | Local jsdom perfProbe scenario harness: 1 file / 4 tests passed; Vitest duration 13.56s, test body duration 769ms, shell wall clock 22.917s. |

## Pre-Migration Measurement

The available local scenario harness is `test/component/perfProbeDom.test.ts`. It runs all four `PerfScenarioName` values from `src/dev/perfProbe.ts`:

- `tree-scroll`
- `operation-badges`
- `filter-select`
- `filters-search`

The local harness is a jsdom component/unit-style smoke, not a representative Obsidian/browser runtime benchmark. It verifies scenario invocation and active-probe counters, but it does not emit per-scenario wall-clock timing, jank-frame counts, or heap usage.

| Scenario | Wall clock (ms) | Jank frames | Max heap | Notes |
|---|---:|---:|---:|---|
| `tree-scroll` | unavailable | unavailable | unavailable | Locally runnable via `perfProbeDom.test.ts`; scenario counter and `viewTree.scroll` counter asserted. Per-scenario duration, jank, and heap are not emitted by the current probe API/test harness. |
| `operation-badges` | unavailable | unavailable | unavailable | Locally runnable via `perfProbeDom.test.ts`; scenario counter and click behavior asserted. Per-scenario duration, jank, and heap are not emitted. |
| `filter-select` | unavailable | unavailable | unavailable | Locally runnable via `perfProbeDom.test.ts`; scenario counter and click behavior asserted. Per-scenario duration, jank, and heap are not emitted. |
| `filters-search` | unavailable | unavailable | unavailable | Locally runnable via `perfProbeDom.test.ts`; scenario counter and input behavior asserted. Per-scenario duration, jank, and heap are not emitted. |

Aggregate local smoke numbers from the rerun:

| Harness | Vitest Duration | Test Body Duration | Shell Wall Clock | Notes |
|---|---:|---:|---:|---|
| `test/component/perfProbeDom.test.ts` | 13.56s | 769ms | 22.917s | Includes transform/import/environment overhead; not a per-scenario runtime benchmark. |

## Unavailable Metrics

- No full Obsidian/browser perfProbe runtime was run in this environment. Task 0 found the plugin installs a global perf probe in `src/main.ts`, but there is no local command that launches a representative Obsidian vault and prints the four scenario metrics.
- The current `PerfProbeSnapshot` shape in `src/dev/perfProbe.ts` contains counters and instrumented timings; it does not contain jank-frame counts or heap usage.
- The jsdom scenario tests do not print per-scenario `endedAt - startedAt` values. Numeric per-scenario wall-clock baselines require either extending the harness to report those values or running an external browser/Obsidian perf driver that already records them.
