---
title: 0-H perfProbe baseline and live snapshot
type: verification-record
status: active
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/index|0-H virtualizer + list mode plan]]"
created: 2026-05-15T04:26:25.6569760-05:00
updated: 2026-05-15T07:56:18.5576161-05:00
tags:
  - agent/verification
  - explorer/performance
  - explorer/views
---

# 0-H PerfProbe Baseline And Live Snapshot

Captured: 2026-05-15T04:26:25.6569760-05:00 Branch: `claude/explorer` Head: `e8795a1` Workspace: `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\jovial-wilson-f81c67`

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

## Post-Migration Measurement

Captured: 2026-05-15T05:54:46.3976156-05:00 Branch: `claude/explorer` Head: `3a2603e` after Task 5 Workspace: `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\jovial-wilson-f81c67`

Command:

```powershell
Measure-Command { pnpm exec vitest run --project component --config vitest.config.ts test/component/perfProbeDom.test.ts --fileParallelism=false | Out-Host }
```

Result: 1 component test file / 4 tests passed. The same limitation from the pre-migration baseline still applies: the local jsdom harness verifies all four scenario runners and counters, but it does not emit per-scenario wall-clock, jank-frame, or heap metrics.

| Scenario | Wall clock (ms) | Delta vs baseline | Jank frames | Delta vs baseline | Status |
|---|---:|---:|---:|---:|---|
| `tree-scroll` | unavailable | unavailable | unavailable | unavailable | Smoke PASS via `perfProbeDom.test.ts`; per-scenario metric unavailable. |
| `operation-badges` | unavailable | unavailable | unavailable | unavailable | Smoke PASS via `perfProbeDom.test.ts`; per-scenario metric unavailable. |
| `filter-select` | unavailable | unavailable | unavailable | unavailable | Smoke PASS via `perfProbeDom.test.ts`; per-scenario metric unavailable. |
| `filters-search` | unavailable | unavailable | unavailable | unavailable | Smoke PASS via `perfProbeDom.test.ts`; per-scenario metric unavailable. |

Aggregate local smoke rerun:

| Harness | Vitest Duration | Test Body Duration | Shell Wall Clock | Delta vs Baseline | Notes |
|---|---:|---:|---:|---|---|
| `test/component/perfProbeDom.test.ts` | 12.79s | 1.07s | 18.758s | Vitest: -5.7%; shell: -18.2%; test body: +39.1% | These are aggregate jsdom harness timings with transform/import/environment overhead, not per-scenario runtime benchmarks. The +39.1% test-body delta is not used as the 0-H threshold because Task 0 did not produce per-scenario baseline numbers and this harness does not isolate scenario runtime. |

Additional Task 6 verification added:

- `test/component/ViewNodeList.test.ts`: large-list stress at 1k, 10k, and 50k rows confirms rendered DOM rows remain below 50.
- `test/component/ViewNodeList.test.ts`: cross-theme smoke covers `vm-theme-default`, `vm-theme-native`, `vm-theme-polish`, `vm-theme-glass`, and `vm-theme-custom` with a jsdom `getBoundingClientRect` shim.
- `test/component/reactiveExplorers.test.ts`: queue stress covers 1000 queued operations and confirms rendered list rows remain below 50.
- `test/component/reactiveExplorers.test.ts`: `FoulDetectionService.checkDomMimicry` leaves queue rendering clean under `vm-mode-thin` + `vm-id-native`.

## Post-Audit Live Obsidian PerfProbe Snapshot

Captured: 2026-05-15T07:56:18.5576161-05:00 Branch: `claude/explorer` Head: `e24d773` before this documentation update Vault: `plugin-dev` Workspace: `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\jovial-wilson-f81c67`

The earlier 0-H pass incorrectly stopped at the jsdom smoke harness. The Obsidian CLI can run the plugin's global perf probe inside `plugin-dev` after the plugin is enabled and reloaded.

Preparation commands:

```powershell
obsidian vault=plugin-dev plugin:enable id=vaultman filter=community
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev dev:errors clear
obsidian vault=plugin-dev dev:errors
obsidian vault=plugin-dev eval code="typeof window.__vaultmanPerfProbe"
obsidian vault=plugin-dev command id=vaultman:open
```

Preparation results:

- `plugin:enable`: `Enabled: vaultman`
- `plugin:reload`: `Reloaded: vaultman`
- `dev:errors` after clear: `No errors captured.`
- `typeof window.__vaultmanPerfProbe`: `object`
- `vaultman:open`: `Executed: vaultman:open`

Scenario command:

```powershell
obsidian vault=plugin-dev eval code="(async () => { const p = window.__vaultmanPerfProbe; const scenarios = [['tree-scroll',{steps:8}], ['operation-badges',{}], ['filter-select',{}], ['filters-search',{query:'status'}]]; const out = []; for (const [name, options] of scenarios) { const r = await p.run(name, options); out.push({ scenario: name, durationMs: +(r.endedAt - r.startedAt).toFixed(2), counters: r.counters, timings: r.timings }); } return out; })()"
```

Live results:

| Scenario | Wall clock (ms) | Jank frames | Max heap | Key counters/timings |
|---|---:|---:|---:|---|
| `tree-scroll` | 16.00 | unavailable | unavailable | `viewTree.scroll`: 9 counts, 2313 total rows, 567 total visible rows. |
| `operation-badges` | 85.50 | unavailable | unavailable | Scenario counter emitted; no badge timing emitted in this run. |
| `filter-select` | 2521.20 | unavailable | unavailable | `filterService.computeFiltered`: 25.10 ms for 11143 files; `panelExplorer.refresh.total`: 851.30 ms; `explorerProps.decorateTree`: 847.30 ms; `viewService.getModel`: 24385 calls / 732.00 ms total; `panelExplorer.bubbleHiddenTreeBadges`: 222.60 ms. |
| `filters-search` | 657.50 | unavailable | unavailable | `panelExplorer.refresh.total`: 30.30 ms; `explorerProps.filterTree`: 26.70 ms; `panelExplorer.bubbleHiddenTreeBadges`: 192.30 ms total across 2 calls; `viewTree.scroll`: 1 count / 22 rows. |

Cleanup after the scenario run:

```powershell
obsidian vault=plugin-dev eval code="app.plugins.plugins.vaultman.filterService.clearFilters(); app.plugins.plugins.vaultman.filterService.clearSearchFilter?.('all'); 'cleared'"
obsidian vault=plugin-dev dev:errors
```

Cleanup results:

- Filter/search cleanup: `cleared`
- `dev:errors`: `No errors captured.`

Remaining limitation:

- This live CLI run provides real Obsidian wall-clock deltas from `startedAt`/`endedAt`.
- It still does not provide jank-frame counts or heap usage because the current `PerfProbeSnapshot` shape has no fields for those metrics.
- There is no pre-migration live Obsidian snapshot for `e8795a1`, so this post-audit live run cannot prove a numeric before/after threshold. It does, however, replace the earlier incorrect assumption that Obsidian CLI could not run the probe.
