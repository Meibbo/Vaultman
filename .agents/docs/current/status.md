---
title: Current status
type: agent-status
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: "docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-status.md"
created: 2026-05-04T01:36:20
updated: 2026-05-13T08:08:29
tags:
  - agent/current
created_by: dec
updated_by: codex
---

# Current Status

Compact route index after archiving the oversized current status:
[[docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-status|2026-05-11 status archive]].
Older route history remains in
[[docs/archive/pkm-ai/active-docs/2026-05-10T093000-current-status|2026-05-10 status archive]].

## Active Rules

- `main` must contain zero AI workflow files.
- Active detail belongs in source records, not this index.
- Do not revert or overwrite unrelated user/agent changes.
- Timestamps use `YYYY-MM-DDTHH:mm:ss`; `parent` uses one wikilink.
- Obsidian CLI runtime tests and live smokes target `plugin-dev` explicitly;
  do not let the CLI default to the focused repository vault `vaultman`.

## Current Route

- Latest user request handled: implemented EDP-009 G1 tree/grid row contract
  on `codex/edp-009-tree-grid`.
- Active initiative: [[docs/work/hardening/index|Hardening]].
- Active spec:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|Explorer Data Plane Structural Taxonomy]].
- Latest source records:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/18-wave-5-plan-comparison-reconciliation|Wave 5 plan comparison and reconciliation]]
  through
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/19-wave-5-issue-prd-candidates|Wave 5 issue and PRD candidates]].
- Wave 2 status: vertical specs captured in shards 06 through 12.
- Wave 3 status: Notebook Navigator research was revalidated against Wave 2;
  media cache DB addendum accepted for cached explorer images.
- Wave 4 status: implementation specs drafted in shards 13 through 17. No code
  or tracker issues were created. Slice F now covers media cache DB and
  file/node-level media subscriptions.
- Wave 5 status: plan/PRD comparison and issue candidates drafted in shards 18
  and 19. Candidate issue 7 now covers the Explorer media cache database.
  Local Markdown issues are published at
  [[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]].
- Next planning handoff:
  [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/01-wave-a-b-claude-handoff|Wave A/B Claude handoff]].
- Wave C continuation record:
  [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/03-edp-002-wave-c-codex-continuation|EDP-002 Wave C Codex continuation]].
- Wave 3 reconciliation worktree:
  `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\edp-wave3-reconcile`
  on branch `codex/edp-wave3-reconcile`, based on `claude/explorer`.
- Reconciled issues: [[docs/work/hardening/issues/explorer-data-plane/003-files-panel-snapshot-compatibility-revisioned-reveal|EDP-003]],
  [[docs/work/hardening/issues/explorer-data-plane/004-batched-files-overlay-layers-viewservice|EDP-004]],
  and [[docs/work/hardening/issues/explorer-data-plane/007-explorer-media-cache-database|EDP-007]]
  are marked completed in the local tracker.
- EDP-005 reconciliation is integrated in the current `claude/explorer` head.
  It ports the valid perf probe intent
  from the accidental `sandbox` implementation while rejecting stale panel
  snapshot rebuilding and sticky-row changes.
- EDP-001 tracker approval/supersession gate is completed; the old
  [[docs/work/hardening/plans/2026-05-04-serviceviews-implementation/index|serviceViews implementation plan]]
  is historical and not executable as the current data-plane plan.
- Parallel dispatch router:
  [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/04-parallel-agent-dispatch-index|EDP parallel agent dispatch index]].
  Wave 1 was EDP-003, EDP-004, and EDP-007; all three are now integrated.
- Worker contract:
  [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/05-worker-operating-contract|EDP worker operating contract]]
  defines base branch, worktree naming, ownership boundaries, verification,
  and handoff for all remaining EDP workers.
- EDP-006 Tags and Props adapters are integrated in `claude/explorer`.
- EDP-008 is integrated in `claude/explorer`:
  [[docs/work/hardening/issues/explorer-data-plane/008-overlay-projection-extraction|EDP-008 Overlay projection extraction]].
  It extracts queue/filter overlay layers to `serviceOverlayProjection`, moves
  queue popup presentation to `serviceQueuePresentation`, and moves
  active-filter labels/details/reorder boundaries to
  `serviceActiveFilterPresentation`.
- EDP-009 G0 row-input vocabulary is recorded at
  [[docs/work/hardening/issues/explorer-data-plane/009-row-input-vocabulary-decision|EDP-009 row-input vocabulary decision]].
  It adds `serviceExplorerRowInput`, is integrated in `claude/explorer`, and
  leaves component migrations to G1/G2.
- EDP-009 G1 tree/grid row contract is implemented on branch
  `codex/edp-009-tree-grid`: tree/grid accept optional `ExplorerRowInput`
  rows through adapter-local compatibility bridges, preserve virtualizer
  locality, semantic callback ids, sticky/reveal behavior, grid selection,
  hover badges, and manual DnD. Table/cards/SVAR were not touched.
- Sticky tree rows are integrated in the `claude/explorer` base; source
  record and preservation prompt:
  [[docs/work/polish/plans/2026-05-12-sticky-tree-rows-nav-offset|Sticky tree rows nav offset handoff]].
- Previous Polish/T3/T4 route details remain in the archived current docs and
  linked vertical-thread source records.
- Earlier detachable, Cut 1.5, Dock Toolbar, and PKM-AI history is preserved
  in the archived current docs linked above.

## Verification Snapshot

- EDP-002 Wave C focused gates passed in `claude/explorer`: 3 unit files / 39
  tests and 2 component files / 46 tests. `pnpm run check`,
  `pnpm run lint`, `pnpm run build:plugin`, and `git diff --check` passed.
  Full details and blockers are in
  [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/03-edp-002-wave-c-codex-continuation|EDP-002 Wave C Codex continuation]].
- EDP-003/004/007 reconciliation focused gates passed in
  `codex/edp-wave3-reconcile`: 3 unit files / 48 tests and 2 component files
  / 42 tests. `pnpm run lint:full`, `pnpm run check`,
  `pnpm run build:plugin`, and `git diff --check` passed.
- EDP-005 reconciliation focused gates passed in `claude/explorer`:
  3 unit files / 36 tests and 2 component files / 16 tests.
  `pnpm run lint:full`, `pnpm run check`, and `pnpm run build:plugin` passed.
- EDP-006 E0 gates passed: RED snapshot test failed on missing projection
  metadata; focused unit passed 2 files / 17 tests, sticky component gate
  passed 4 files / 39 tests, and `lint:full`, `check`, `build:plugin`, and
  `git diff --check` passed.
- EDP-006 E1 Tags gates passed: RED snapshot tests failed 4/4 on missing
  Tags adapter methods; focused Tags unit passed 2 files / 14 tests; sticky
  component gate passed 4 files / 39 tests after one isolated timeout rerun;
  `lint:full`, `check`, `build:plugin`, and `git diff --check` passed.
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
- EDP-009 G0 gates passed in `codex/edp-009-row-contract`: focused contract 1
  file / 6 tests, relevant unit 6 files / 47 tests, component 14 files / 117
  tests, sticky component 4 files / 39 tests, `lint:full`, `check`,
  `build:plugin`, and `git diff --check`.
- EDP-009 G0 integration gates passed on `claude/explorer` after merge commit
  `071e490`: focused contract 1 file / 6 tests, relevant unit 6 files / 47
  tests, sticky component 4 files / 39 tests, `lint:full`, `check`,
  `build:plugin`, and `git diff --check`.
- EDP-009 G1 gates passed in `codex/edp-009-tree-grid`: RED row-input
  component gate failed for missing `rowInputs` support; focused row-input
  component gate passed 2 files / 8 tests; focused unit gate passed 9 files /
  58 tests; relevant tree/grid component gate passed 18 files / 145 tests;
  grid-only dynamic geometry rerun passed 1 test; sticky component gate passed
  4 files / 40 tests; final `lint:full`, `check`, `build:plugin`, and
  `git diff --check` passed. One unrelated table dynamic-geometry test timed
  out once in a mixed file rerun and was not changed.
- EDP-001 documentation gate is closed: the local issue tracker is approved,
  `completed` label vocabulary is recorded, and stale `serviceViews` selection
  ownership wording is superseded by `NodeSelectionService`.
- Explorer Wave A/B handoff: plan index and Claude handoff were created under
  `docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/`;
  the handoff is 199 lines, trailing whitespace scan found no matches, and
  targeted `git diff --check` exited 0 with only CRLF conversion warnings.
- `node .agents/tools/pkm-ai/check-doc-health.mjs` still fails 11 existing
  residuals: glossary warnings, parent-shape issues, and large plan/spec line
  limits outside the new Wave 2 shards.
- Earlier T3/T4/full-suite verification remains preserved in the archived
  current docs and linked source records.

## Known Residuals

- Full-suite stabilization still has existing performance-threshold gates:
  `test/unit/performance/stress.test.ts` measured ~242ms against a 200ms
  threshold, and `test/component/viewTableStress.test.ts` measured ~3.37s
  against a 3.0s threshold in isolated rerun. Defer these to the final
  stabilization gate unless a focused slice introduces a new regression.
- `vaultman:open-diff` is absent from the live `plugin-dev` command list.
- T4 still has integration follow-ups: frame-level native-click wiring,
  Find/Replace island migration to `vmPopover`, dashboard/add-ons wiring in
  `frameVaultman.svelte`, real queue staging for adopted-block moves, Quick
  Switcher, and FAB orbiting-ink polish.
- `OperationQueueService.transactions` remains by design as the compatibility
  read surface until queue/diff/details readers migrate to `chains`.
- `node .agents/tools/pkm-ai/check-doc-health.mjs` still fails on existing
  glossary, parent-shape, and large plan/spec line-limit residuals. Current
  status/handoff were archived and compacted in this session.

## Next Action

- Next EDP route: continue EDP-009 G2 table/cards from the G0 row contract.
  SVAR deletion waits until row-contract finalization; do not
  preserve a SVAR compatibility bridge.
- Continue with the remaining T4 integration follow-ups or the next
  vertical-thread slice from the active plan.
- For T3 follow-up, register or expose a real diff-open path, then rerun the
  Diff Navbar live smoke.
- Only remove `OperationQueueService.transactions` after all current readers
  use immutable `chains`.
