---
title: Explorer View Platform perf baseline
type: verification-record
status: active
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]]"
created: 2026-05-16T04:46:13.9320138-05:00
updated: 2026-05-16T05:08:42.8385595-05:00
tags:
  - agent/verification
  - explorer/performance
created_by: codex
updated_by: codex
---

# Explorer View Platform Perf Baseline

## Task 17 Focused Gates

Recorded on `2026-05-16T04:46:13.9320138-05:00` in worktree `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\jovial-wilson-f81c67` on branch `claude/explorer`.

Latest implementation commit before this record:
`8056ef5` `refactor: add platform contracts to table grid cards`.

### Focused Unit Gate

Command:

```powershell
pnpm exec vitest run --project unit --config vitest.config.ts test/unit/performance/explorerPlatformSynthetic.test.ts test/unit/services/serviceExplorerProjection.test.ts test/unit/services/serviceExplorerViewContract.test.ts test/unit/services/serviceExplorerScrollGeometry.test.ts test/unit/services/serviceExplorerMediaDescriptor.test.ts --fileParallelism=false
```

Result: passed.

- Test files: 5 passed.
- Tests: 17 passed.
- Start: 04:43:29.
- Duration: 8.50s.

### Focused Component Gate

Command:

```powershell
pnpm exec vitest run --project component --config vitest.config.ts test/component/viewTreeVisualContract.test.ts test/component/viewTreeSelection.test.ts test/component/viewTreeScrollFallback.test.ts test/component/overlayViewMenu.test.ts test/component/ViewNodeList.test.ts --fileParallelism=false
```

Result: passed.

- Test files: 5 passed.
- Tests: 54 passed.
- Start: 04:43:57.
- Duration: 48.64s.

## Synthetic Dataset Baseline

The focused unit gate covers the deterministic synthetic platform dataset:

- `10_000` mixed files rows: `nodes`, `rowInputs`, `idToIndex`, media descriptors, filtered ids, and selected ids are generated deterministically.
- `50_000` mixed files rows: direct `idToIndex` and `indexToId` maps contain `50_000` entries, row ids are unique, and media descriptors remain descriptor-only.
- `100_000` flat files rows: proof dataset builds `100_000` nodes, `100_000` row inputs, and `100_000` lookup entries without decoded media blobs.
- Media hidden path: the baseline asserts no blob requests while the media element is not visible.

## PerfProbe Snapshot Fields

Task 17 is a focused local gate, not the live Obsidian perf probe. The component gate still exercises the revision-aware reveal path with an active `PerfProbe`.

Covered in the focused gate:

- `timings["explorerDataPlane.reveal.lookup"].count > 0`.
- `timings["explorerDataPlane.reveal.lookup"].totalRows > 0`.
- The deterministic reveal harness uses `100` tree rows for that lookup path.

Fields reserved for Task 19 live Obsidian scenarios:

- `scenario`: scenario name returned by `window.__vaultmanPerfProbe.run(...)`.
- `startedAt` and `endedAt`.
- `counters["scenario.<name>"]` with `count`, `totalNodes`, `totalRows`, `totalVisibleRows`, and `totalFiles`.
- `timings["scenario.<name>.duration"]` with `count`, `totalMs`, `maxMs`, `totalNodes`, `totalRows`, `totalVisibleRows`, and `totalFiles`.
- `longFrameCount`, `maxLongFrameMs`, and `heapDeltaBytes` when available from the live runtime.

Task 19 should append the live snapshots for:

- `files-list-10k-scroll-jump`
- `files-tree-10k-scroll-jump`
- `files-tree-50k-scroll-jump`
- `projection-50k-build-or-refresh`
- `projection-100k-proof`
- `tree-box-selection`
- `tree-filtered-highlight`
- `node-media-hidden-cost`

## Task 19 Live Obsidian PerfProbe

Recorded on `2026-05-16T05:08:42.8385595-05:00` against the explicit Obsidian CLI target `vault=plugin-dev`.

Target confirmation:

```powershell
obsidian eval code="app.vault.getName()" vault=plugin-dev
```

Result: `plugin-dev`.

Plugin reload:

```powershell
obsidian plugin:reload id=vaultman vault=plugin-dev
```

Result: `Reloaded: vaultman`.

Perf probe availability:

```powershell
obsidian eval code="typeof window.__vaultmanPerfProbe" vault=plugin-dev
```

Result: `object`.

UI command:

```powershell
obsidian command id=vaultman:open vault=plugin-dev
```

Result: `Executed: vaultman:open`.

### Scenario Snapshots

The scenarios were executed sequentially with:
`window.__vaultmanPerfProbe.run(name, { steps })`.

| Scenario | totalMs | maxMs | nodes | rows | visibleRows | files | longFrames | heapDelta |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `files-list-10k-scroll-jump` | 39.5 | 39.5 | 10,000 | 10,000 | 64 | 10,000 | n/a | n/a |
| `files-tree-10k-scroll-jump` | 21.3 | 21.3 | 10,000 | 10,000 | 64 | 10,000 | n/a | n/a |
| `files-tree-50k-scroll-jump` | 33.3 | 33.3 | 50,000 | 50,000 | 64 | 50,000 | n/a | n/a |
| `projection-50k-build-or-refresh` | 32.6 | 32.6 | 50,000 | 50,000 | 0 | 50,000 | n/a | n/a |
| `projection-100k-proof` | 33.8 | 33.8 | 100,000 | 100,000 | 0 | 100,000 | n/a | n/a |
| `tree-box-selection` | 33.7 | 33.7 | 0 | 0 | 0 | 0 | n/a | n/a |
| `tree-filtered-highlight` | 35.9 | 35.9 | 0 | 0 | 0 | 0 | n/a | n/a |
| `node-media-hidden-cost` | 29.1 | 29.1 | 10,000 | 10,000 | 0 | 10,000 | n/a | n/a |

Notes:

- `longFrameCount`, `maxLongFrameMs`, and `heapDeltaBytes` are currently not populated by the probe implementation and returned `null` for all live scenarios.
- `tree-filtered-highlight` also recorded `counters["scenario.tree-filtered-highlight.matches"].count = 1`.
- The live run used the current `plugin-dev` DOM after `vaultman:open`; probe scenario counters carry the intended synthetic scale metadata for the tested scenario names.

### Error Capture

Command:

```powershell
obsidian dev:errors vault=plugin-dev
```

Result: `No errors captured.`
