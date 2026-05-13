---
title: Current handoff
type: agent-handoff
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: "docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-handoff.md"
created: 2026-05-04T01:36:20
updated: 2026-05-13T02:11:50
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

- Latest request handled: started EDP-006 Agent E0 shared Tags/Props snapshot
  contract coordinator after sticky tree rows were integrated.
- Latest source records:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/18-wave-5-plan-comparison-reconciliation|Wave 5 plan comparison and reconciliation]]
  through
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/19-wave-5-issue-prd-candidates|Wave 5 issue and PRD candidates]].
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
- Current EDP-006 worktree is
  `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\edp-006-contract` on
  branch `codex/edp-006-contract`, based on `claude/explorer`.
- Sticky tree rows are integrated in the `claude/explorer` base; detailed
  preservation prompt:
  [[docs/work/polish/plans/2026-05-12-sticky-tree-rows-nav-offset|Sticky tree rows nav offset handoff]].
- Previous worktree route:
  `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\sleepy-engelbart-9e6dc6`
  on branch `claude/sleepy-engelbart-9e6dc6`.
- Previous polish source record:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/04-thread-ecosystem-interception#2026-05-11-t4-continuation-log|T4 continuation log]].
- Parallel dispatch router:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/05-t4-parallel-agent-dispatch|T4 Parallel Agent Dispatch]].
  Fresh agents should map `ola 1 agente N` and `ola 2 agente 1` through
  that document.
- Previous source record:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/03-thread-vfs-review#task-38--cutover-gate-remove-the-mutable-path|T3.8 immutable VFS cutover]].
- T3.8 completed the mutable VFS cutover scope:
  `typeOps` now exposes readonly pure op contracts, `serviceQueue` stages,
  hydrates, removes, commits, and replays by replacement state, `serviceDiff`
  consumes returned op states, and `serviceVfsChain` snapshots include the
  appended op history.
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
- EDP-001 is closed: local tracker approval is recorded, `completed` label
  vocabulary exists, and stale `serviceViews` selection ownership wording is
  superseded by `NodeSelectionService`.
- Full `pnpm run test:unit` is blocked by
  `test/unit/performance/stress.test.ts` timing at ~242ms against a 200ms
  threshold.
- Full `pnpm run test:component` is blocked by
  `test/component/viewTableStress.test.ts` timing at ~3.37s against a 3.0s
  threshold in isolated rerun.
- Explorer Wave A/B handoff: plan index and Claude handoff were created under
  `docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/`;
  the handoff is 199 lines, trailing whitespace scan found no matches, and
  targeted `git diff --check` exited 0 with only CRLF conversion warnings.
- `node .agents/tools/pkm-ai/check-doc-health.mjs` still fails 11 existing
  residuals: glossary warnings, parent-shape issues, and large plan/spec line
  limits outside the new Wave 2 shards.
- RED gate: `serviceDiff` and `serviceQueue` pure/immutable tests failed 3/38,
  then passed.
- T4 RED/GREEN: `serviceDndMoveBlock.test.ts` failed because
  `buildMoveBlockOps` was missing, then passed after adding the immutable
  helper.
- T4 component gate: 5 files / 9 tests passed for `vmDialog`, `vmPopover`,
  native click interception, `Dashboard3Column`, and `AddonsMarkdownPane`.
- Focused T4 unit: 8 files / 52 tests passed.
- Post-T3 lint continuation: removed unnecessary assertions in
  `serviceDndSvelteAdapter.ts`, `serviceFoulDetection.svelte.ts`, and
  `serviceNativeClickIntercept.ts`; added `uno.config.ts` to the ESLint
  project-service default set; migrated UnoCSS config and preflight tests from
  deprecated `presetUno` to `presetWind3`.
- UnoCSS preflight RED/GREEN: 1 file / 5 tests passed.
- Focused T4/config unit: 4 files / 20 tests passed.
- Focused unit: 10 files / 67 tests passed.
- Focused component: 2 files / 7 tests passed.
- Full unit: 117 files / 723 tests passed.
- Full component: 61 files / 290 tests passed.
- Svelte autofixer: `viewDiff.svelte` and `viewDiffNavbar.svelte` both
  returned `issues: []`, `suggestions: []`.
- Svelte autofixer: `serviceFoulDetection.svelte.ts` returned `issues: []`,
  `suggestions: []`.
- `pnpm run lint:full`: passed.
- `pnpm run check`: passed with 0 errors / 0 warnings.
- `pnpm run build:plugin`: passed.
- `git diff --check`: passed.
- Live smoke: `obsidian vault=plugin-dev plugin:reload id=vaultman` passed,
  `obsidian vault=plugin-dev command id=vaultman:open` passed, and
  `obsidian vault=plugin-dev dev:errors` reported no captured errors. T4
  dialog/dashboard evals returned `false` because no dialog was open and the
  dashboard surface was not active in the live view.

## Residuals

- Known performance-threshold residuals are deferred to the final stabilization
  gate unless a focused slice introduces a new regression. Do not relax
  thresholds inside functional EDP slices.
- `vaultman:open-diff` is not registered in the live `plugin-dev` command list;
  the Diff Navbar DOM probe returned `false` because no command opened the diff
  view.
- T4 integration follow-ups remain: frame-level native-click wiring,
  Find/Replace island migration to `vmPopover`, dashboard/add-ons wiring in
  `frameVaultman.svelte`, real adopted-block move staging into queue chains,
  Quick Switcher, and FAB orbiting-ink polish.
- `node .agents/tools/pkm-ai/check-doc-health.mjs` still fails on glossary,
  parent-shape, and large plan/spec line-limit residuals. Current
  status/handoff were archived and compacted here.
- Do not move AI files to `main`.
- Do not base table work on old `viewTable.svelte`; use the TanStack table
  source records if table work resumes.

## Next Action

- Current route: commit EDP-006 E0 shared contract, then dispatch E1/E2
  Tags/Props adapters from the E0 base.
- Continue with remaining T4 integration follow-ups or the next vertical-thread
  slice from
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/index|UI Modernization Vertical Threads]].
- For T3, register or expose a real diff-open path before rerunning the live
  Diff Navbar smoke.
- Remove `OperationQueueService.transactions` only after all readers migrate to
  immutable `chains`.
