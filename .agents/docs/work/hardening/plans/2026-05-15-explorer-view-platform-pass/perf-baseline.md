---
title: Explorer View Platform perf baseline
type: verification-record
status: active
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]]"
created: 2026-05-16T04:46:13.9320138-05:00
updated: 2026-05-16T04:46:13.9320138-05:00
tags:
  - agent/verification
  - explorer/performance
created_by: codex
updated_by: codex
---

# Explorer View Platform Perf Baseline

## Task 17 Focused Gates

Recorded on `2026-05-16T04:46:13.9320138-05:00` in worktree
`C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\jovial-wilson-f81c67`
on branch `claude/explorer`.

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

- `10_000` mixed files rows: `nodes`, `rowInputs`, `idToIndex`, media
  descriptors, filtered ids, and selected ids are generated deterministically.
- `50_000` mixed files rows: direct `idToIndex` and `indexToId` maps contain
  `50_000` entries, row ids are unique, and media descriptors remain
  descriptor-only.
- `100_000` flat files rows: proof dataset builds `100_000` nodes,
  `100_000` row inputs, and `100_000` lookup entries without decoded media
  blobs.
- Media hidden path: the baseline asserts no blob requests while the media
  element is not visible.

## PerfProbe Snapshot Fields

Task 17 is a focused local gate, not the live Obsidian perf probe. The component
gate still exercises the revision-aware reveal path with an active `PerfProbe`.

Covered in the focused gate:

- `timings["explorerDataPlane.reveal.lookup"].count > 0`.
- `timings["explorerDataPlane.reveal.lookup"].totalRows > 0`.
- The deterministic reveal harness uses `100` tree rows for that lookup path.

Fields reserved for Task 19 live Obsidian scenarios:

- `scenario`: scenario name returned by `window.__vaultmanPerfProbe.run(...)`.
- `startedAt` and `endedAt`.
- `counters["scenario.<name>"]` with `count`, `totalNodes`, `totalRows`,
  `totalVisibleRows`, and `totalFiles`.
- `timings["scenario.<name>.duration"]` with `count`, `totalMs`, `maxMs`,
  `totalNodes`, `totalRows`, `totalVisibleRows`, and `totalFiles`.
- `longFrameCount`, `maxLongFrameMs`, and `heapDeltaBytes` when available from
  the live runtime.

Task 19 should append the live snapshots for:

- `files-list-10k-scroll-jump`
- `files-tree-10k-scroll-jump`
- `files-tree-50k-scroll-jump`
- `projection-50k-build-or-refresh`
- `projection-100k-proof`
- `tree-box-selection`
- `tree-filtered-highlight`
- `node-media-hidden-cost`
