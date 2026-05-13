---
title: Current handoff
type: agent-handoff
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: "docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-handoff.md"
created: 2026-05-04T01:36:20
updated: 2026-05-13T15:58:56
tags:
  - agent/current
created_by: dec
updated_by: codex
---

# Current Handoff

Compact handoff after archiving the oversized current handoff:
[[docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-handoff|2026-05-11 handoff archive]].
Older route history remains in
[[docs/archive/pkm-ai/active-docs/2026-05-10T093000-current-handoff|2026-05-10 handoff archive]].

## Resume Point

- Latest request handled: completed EDP-010 selection mirror cleanup locally on
  `codex/edp-010-selection-cleanup`.
- Latest source record:
  [[docs/work/hardening/issues/explorer-data-plane/009-adapter-row-contract-follow-up|EDP-009 adapter row contract follow-up]].
- Current hardening status: Wave 2 vertical specs are captured, Wave 3 was
  revalidated against Wave 2, Wave 4 implementation specs are drafted, and
  Wave 5 comparison/issue candidates are drafted. Cached explorer images now
  have a separate media/derived-content cache DB follow-up; structural
  snapshots remain memory-first. Local issues now live at
  [[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]].
- Claude Wave A/B handoff:
  [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/01-wave-a-b-claude-handoff|Wave A/B Claude handoff]].
- Codex Wave C continuation:
  [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/03-edp-002-wave-c-codex-continuation|EDP-002 Wave C Codex continuation]].
- Wave 3 reconciliation worktree:
  `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\edp-wave3-reconcile`
  on branch `codex/edp-wave3-reconcile`, based on `claude/explorer`.
- Reconciled and marked completed: [[docs/work/hardening/issues/explorer-data-plane/003-files-panel-snapshot-compatibility-revisioned-reveal|EDP-003]],
  [[docs/work/hardening/issues/explorer-data-plane/004-batched-files-overlay-layers-viewservice|EDP-004]],
  and [[docs/work/hardening/issues/explorer-data-plane/007-explorer-media-cache-database|EDP-007]].
- EDP-005 reconciliation is integrated in the current `claude/explorer` head;
  it ports valid perf probes from `sandbox` while preserving `ExplorerDataPlaneService`.
- EDP-001 tracker approval/supersession gate is completed; the
  [[docs/work/hardening/plans/2026-05-04-serviceviews-implementation/index|serviceViews implementation plan]]
  is historical and not executable as the current data-plane plan.
- Parallel dispatch router:
  [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/04-parallel-agent-dispatch-index|EDP parallel agent dispatch index]].
  Wave 1 was EDP-003, EDP-004, and EDP-007; all three are now integrated.
- Worker contract:
  [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/05-worker-operating-contract|EDP worker operating contract]]
  defines exact worktree/branch setup, ownership, verification, and handoff for
  remaining EDP agents.
- EDP-006 Tags and Props adapters are integrated in `claude/explorer`.
- EDP-008 is integrated in `claude/explorer`:
  [[docs/work/hardening/issues/explorer-data-plane/008-overlay-projection-extraction|EDP-008 Overlay projection extraction]].
  New pure seams: `src/services/serviceOverlayProjection.ts`,
  `src/services/serviceQueuePresentation.ts`, and
  `src/services/serviceActiveFilterPresentation.ts`. Tags/Props snapshot
  adapter internals were not changed.
- EDP-009 G0 is integrated in `claude/explorer`:
  `serviceExplorerRowInput`, focused contract tests, and the row-input
  vocabulary decision record. No view components were migrated.
- EDP-009 is complete in `claude/explorer`: G0-G3 are integrated; merge
  `ec20ec8` removes SVAR code paths plus `@svar-ui` package imports. Full notes live in
  [[docs/work/hardening/issues/explorer-data-plane/009-adapter-row-contract-follow-up|EDP-009]].
- EDP-010 is complete on worker branch:
  [[docs/work/hardening/issues/explorer-data-plane/010-selection-mirror-cleanup|EDP-010]]
  removes independent `ViewService` selection/focus state, exposes
  `NodeSelectionService` as the authority/read adapter, and keeps legacy
  `ViewService` mutators only as deprecated delegates.
- Sticky tree rows are integrated in the `claude/explorer` base; detailed
  preservation prompt:
  [[docs/work/polish/plans/2026-05-12-sticky-tree-rows-nav-offset|Sticky tree rows nav offset handoff]].
- Older Polish/T3/T4 route details remain in the archived current docs and
  linked vertical-thread source records.
- `OperationQueueService.transactions` was intentionally kept. It is still read
  by `viewDiff.svelte`, queue badges, queue details, execution, and list
  surfaces. Future removal is gated on migrating those readers to `chains`.

## Preserve

- Do not reintroduce direct VFS mutation: no `vfs.fm =`, `vfs.body =`,
  `vfs.ops.push`, or direct `op.apply(vfs)` mutation paths.
- `applyUpdates` must re-read the current transaction head before staging ops;
  this preserves concurrent body-loading `add()` calls that share the same
  lock.
- `removeOp` must replay filtered ops from initial state through pure
  `apply()` calls.
- `applyOpsToRawContent` must replay pure ops into replacement snapshots for
  frontmatter-only transactions committed against fresh file content.
- Stale broad-unit expectations were fixed in tests only:
  `serviceBadge` now expects `node-note`, and `explorerTags` enables matched
  filter decorations in the test fixture that asserts active-filter state.
- Previous vertical-thread completions and verification details live in the
  archived handoff plus the active vertical thread source records.
- T4 `buildMoveBlockOps()` is currently a pure helper contract only. Do not
  treat real adopted-block DnD as fully wired until queue staging across the
  source and target VFS chains is implemented and tested.
- Obsidian CLI runtime tests and live smokes must pass `vault=plugin-dev`.
  Never rely on the most recently focused vault for tests; the repository vault
  `vaultman` is not the smoke target unless the user explicitly asks.
- EDP-006 E1 preserve point: Tags structural snapshots use
  `buildExplorerSnapshot()` with `#tag/path` domain keys and only
  `tagsRevision` as a structural revision. Queue/filter revisions stay
  decorative; shared data-plane contracts, Props files, and panel/view behavior
  were not changed.
- EDP-006 E2 preserve point: Props structural snapshots use `indexProps` /
  `IPropsIndex` as the structural source, not `PropertyIndexService`; snapshots
  keep property/value domain keys, property casing, object-value strings, and
  only `propsRevision` as a structural revision.

## Fresh Verification

- EDP-002 focused gates pass in `claude/explorer`: `logicExplorerSnapshot`,
  `serviceExplorerDataPlane`, and `explorerFiles` unit tests passed 3 files /
  39 tests; `panelExplorerSelection` and `pageFiltersChooseMode` component
  tests passed 2 files / 46 tests.
- Static/build gates pass: `pnpm run check`, `pnpm run lint`,
  `pnpm run build:plugin`, and `git diff --check`.
- EDP-003/004/007 reconciliation focused gates pass in
  `codex/edp-wave3-reconcile`: 3 unit files / 48 tests and 2 component files
  / 42 tests.
- Reconciliation static/build gates pass: `pnpm run lint:full`,
  `pnpm run check`, `pnpm run build:plugin`, and `git diff --check`.
- EDP-005 reconciliation focused gates pass in `claude/explorer`:
  3 unit files / 36 tests and 2 component files / 16 tests.
- EDP-005 static/build gates pass: `pnpm run lint:full`, `pnpm run check`,
  and `pnpm run build:plugin`.
- EDP-006 E0 gates passed: RED snapshot test failed on missing projection
  metadata; focused unit passed 2 files / 17 tests, sticky component gate
  passed 4 files / 39 tests, and `lint:full`, `check`, `build:plugin`, and
  `git diff --check` passed.
- EDP-006 E1 Tags gates passed: RED snapshot tests failed 4/4 on missing
  `getSnapshot()`/`getStructuralTree()`; focused Tags unit passed 2 files / 14
  tests; sticky component gate passed 4 files / 39 tests after an isolated
  timeout rerun; `lint:full`, `check`, `build:plugin`, and
  `git diff --check` passed.
- EDP-006 E2 Props gates passed: RED failed on missing Props
  snapshot/structural methods; focused Props unit passed 1 file / 20 tests,
  sticky component gate passed 4 files / 39 tests, and `lint:full`, `check`,
  `build:plugin`, and `git diff --check` passed.
- EDP-006 combined integration gates passed in `claude/explorer`: focused unit
  5 files / 51 tests, sticky component 4 files / 39 tests, `lint:full`,
  `check`, `build:plugin`, and `git diff --check`.
- EDP-008 gates passed in `codex/edp-008-overlay`: focused EDP-008 unit
  3 files / 10 tests, existing overlay/badge/queue/filter/provider unit
  9 files / 105 tests, queue popup component 1 file / 4 tests, EDP-006
  regression unit 5 files / 51 tests, sticky component 4 files / 39 tests,
  `lint:full`, `check`, `build:plugin`, and `git diff --check`.
- EDP-008 integration gates passed on `claude/explorer` after merge commit
  `10855e5`: focused overlay unit 4 files / 27 tests, EDP-006 regression unit
  5 files / 51 tests, sticky component 4 files / 39 tests, `lint:full`,
  `check`, and `build:plugin`.
- EDP-009 G0 and merged `claude/explorer` gates passed; details remain in the
  EDP-009 issue and row-input decision records.
- EDP-009 G1/G2 branch gates passed; RED/GREEN detail and clean-base timing
  residuals are in
  [[docs/work/hardening/issues/explorer-data-plane/009-adapter-row-contract-follow-up#verification|EDP-009 verification]].
- EDP-009 G1/G2 integration gates passed on `claude/explorer` after merge
  commits `8eb5742` and `895090a`: focused unit 7 files / 54 tests, combined
  component 14 files / 121 tests after one timeout-only rerun, sticky
  component 4 files / 39 tests, `lint:full`, `check`, `build:plugin`, and
  `git diff --check`.
- EDP-009 G3 cleanup/integration gates passed on `claude/explorer` after
  merge `ec20ec8`: RED guard failed before fix; frozen install, unit 9/64,
  adjacent component 3/55, EDP component 14/121, sticky 4/39, static/build,
  and `git diff --check` passed.
- EDP-010 gates passed on `codex/edp-010-selection-cleanup`: RED service and
  panel bridge tests failed for the intended mirror-divergence reasons; GREEN
  unit 5/51, panel bridge 1/39, adjacent selection component 6/56, sticky
  4/39, `lint:full`, `check`, `build:plugin`, and `git diff --check`.
- EDP-001 is closed: local tracker approval is recorded, `completed` label
  vocabulary exists, and stale `serviceViews` selection ownership wording is
  superseded by `NodeSelectionService`.
- Full `pnpm run test:unit` is blocked by `test/unit/performance/stress.test.ts`
  timing at ~242ms against a 200ms threshold.
- Full `pnpm run test:component` is blocked by `test/component/viewTableStress.test.ts`
  timing at ~3.37s against a 3.0s threshold in isolated rerun.
- Explorer Wave A/B handoff: plan index and Claude handoff were created under
  `docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/`;
  the handoff is 199 lines, trailing whitespace scan found no matches, and
  targeted `git diff --check` exited 0 with only CRLF conversion warnings.
- `node .agents/tools/pkm-ai/check-doc-health.mjs` still fails 11 existing
  residuals: glossary warnings, parent-shape issues, and large plan/spec line
  limits outside the new Wave 2 shards.
- Earlier T3/T4/full-suite verification remains preserved in the archived
  current handoff and linked source records.

## Residuals

- Known performance-threshold residuals are deferred to final stabilization;
  do not relax thresholds in EDP slices.
- `vaultman:open-diff` is not registered in live `plugin-dev`.
- T4 follow-ups remain: native-click wiring, FnR `vmPopover`, dashboard/add-ons,
  real adopted-block move staging, Quick Switcher, and FAB polish.
- `node .agents/tools/pkm-ai/check-doc-health.mjs` still fails on existing
  glossary, parent-shape, and large plan/spec line-limit residuals.
- Do not move AI files to `main`.
- Do not base table work on old `viewTable.svelte`; use TanStack source records.

## Next Action

- Next EDP route: integrate EDP-010 or run the final stabilization gate.
- Continue T4 follow-ups or next vertical-thread slice.
- For T3, register or expose a real diff-open path before the live Diff Navbar smoke.
- Remove `OperationQueueService.transactions` only after all readers migrate to immutable `chains`.
