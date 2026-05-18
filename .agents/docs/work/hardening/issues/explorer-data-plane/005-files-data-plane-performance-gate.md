---
title: EDP-005 Files data-plane performance gate
type: issue
issue_id: EDP-005
status: completed
issue_kind: AFK
parent: "[[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]]"
created: 2026-05-11T20:55:00
updated: 2026-05-12T22:30:00
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - explorer/views
blocked_by:
  - "[[002-files-snapshot-data-plane-foundation|EDP-002]]"
  - "[[003-files-panel-snapshot-compatibility-revisioned-reveal|EDP-003]]"
  - "[[004-batched-files-overlay-layers-viewservice|EDP-004]]"
created_by: codex
updated_by: codex
---

# EDP-005 Files Data-Plane Performance Gate

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices|Wave 4 follow-up slices]]

## What To Build

Add a performance gate that measures the Files data-plane path and proves
whether queue/filter-only changes avoid structural snapshot rebuilds.

## Acceptance Criteria

- [x] Perf probe records snapshot creation, lookup-map creation, layer
      batching, reveal lookup, and total panel refresh cost.
- [x] Before/after record shows whether queue/filter-only changes avoid
      structural rebuilds.
- [x] Existing performance baseline is updated or linked with the new data.

## 2026-05-12 Reconciliation Note

The first EDP-005 worker accidentally implemented in the root `sandbox`
worktree. Its intent was valid, but the patch was not applied literally because
it mixed EDP-005 probes with stale pre-reconciliation code:

- It reintroduced local snapshot rebuilding in `panelExplorer.svelte`, which
  conflicts with EDP-003's `ExplorerDataPlaneService` contract.
- It carried unrelated sticky-row changes in `viewTree.svelte`.
- It dropped `propsRevision` from Files structural revisions/cache keys.

The reconciled implementation was rebuilt on `claude/explorer` and integrated
as the EDP-005 perf-probe commit.
It keeps the current data-plane contracts and adds
only perf instrumentation:

- `explorerDataPlane.snapshot.create`
- `explorerDataPlane.snapshot.lookupMaps`
- `explorerDataPlane.layers.batch`
- `explorerDataPlane.reveal.lookup`
- `panelExplorer.refresh.total`
- `explorerDataPlane.files.structure.rebuild`
- `explorerDataPlane.files.structure.cacheHit`

Queue-only overlay refresh evidence is covered by the Files provider gate: the
first tree read records a structural rebuild, then changing only
`operationsIndex.nodes` and `operationsIndex.revision` records a structural
cache hit while layers rebuild through the batched layer path.

The existing baseline is linked and extended in
[[docs/work/hardening/research/2026-05-05-performance-baseline/index#edp-005-files-data-plane-gate|Performance baseline - EDP-005 Files Data-Plane Gate]].

## Blocked By

- [[002-files-snapshot-data-plane-foundation|EDP-002]]
- [[003-files-panel-snapshot-compatibility-revisioned-reveal|EDP-003]]
- [[004-batched-files-overlay-layers-viewservice|EDP-004]]

## Verification

- RED unit gate failed as expected before instrumentation:
  `logicExplorerSnapshot.test.ts`, `serviceExplorerLayers.test.ts`, and
  `explorerFiles.test.ts` failed on missing EDP-005 probe labels.
- RED component gate failed as expected before instrumentation:
  `panelExplorerEmpty.test.ts` and `viewTreeScrollFallback.test.ts` failed on
  missing refresh/reveal probe labels.
- Focused unit GREEN:
  `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/logic/logicExplorerSnapshot.test.ts test/unit/services/serviceExplorerLayers.test.ts test/unit/components/explorerFiles.test.ts`
  passed 3 files / 36 tests.
- Focused component GREEN:
  `pnpm exec vitest run --project component --config vitest.config.ts test/component/panelExplorerEmpty.test.ts test/component/viewTreeScrollFallback.test.ts --fileParallelism=false`
  passed 2 files / 16 tests.
- Svelte autofixer returned `issues: []` for `panelExplorer.svelte` and
  `viewTree.svelte`; it reported existing broad `$effect`/`bind:this`
  suggestions only.
- `pnpm run lint:full`: passed.
- `pnpm run check`: passed with 0 errors / 0 warnings.
- `pnpm run build:plugin`: passed.
