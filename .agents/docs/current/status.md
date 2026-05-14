---
title: Current status
type: agent-status
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: "docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-status.md"
created: 2026-05-04T01:36:20
updated: 2026-05-14T23:59:00
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
- Obsidian CLI runtime tests and live smokes target `plugin-dev` explicitly.

## Current Route

- Latest request handled: implemented runtime data-plane follow-ups for Files:
  provider snapshots publish through `panelExplorer`, expansion republishes,
  and `ViewTree` can render from snapshot-backed `rowInputs`.
- Latest local changes are uncommitted and unpushed on
  `codex/edp-final-stabilization`.
- Research source:
  [[docs/work/hardening/research/2026-05-14-explorer-data-plane-scroll-research|Explorer data-plane and jump-scroll research]].
- Previous request handled: ran the EDP final stabilization gate in isolated
  branch `codex/edp-final-stabilization` without using `sandbox` or pushing.
- Integration source record:
  [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/06-parallel-branch-integration|Parallel branch integration handoff]].
- Final stabilization source record:
  [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/07-final-stabilization|EDP final stabilization]].
- Active initiative: [[docs/work/hardening/index|Hardening]].
- Active spec:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|Explorer Data Plane Structural Taxonomy]].
- Canonical integration head: `5508168` on `claude/explorer`.
- Final stabilization branch: `codex/edp-final-stabilization`.
- Merged branches:
  `codex/edp-010-selection-cleanup`, `codex/t3-open-diff-command`,
  `codex/t4-fnr-vmpopover`, and `codex/t4-addons-dashboard`.
- EDP-010 is completed and integrated:
  [[docs/work/hardening/issues/explorer-data-plane/010-selection-mirror-cleanup|EDP-010 Selection mirror cleanup]].
- T3 open-diff command residual is integrated:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/06-t3-open-diff-command-residual|T3 open diff command residual]].
- T4 FnR `vmPopover` and dashboard/add-ons follow-ups are integrated in the
  T4 source record:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/04-thread-ecosystem-interception|T4 Ecosystem and Interception]].

## Verification Snapshot

- Parallel integration base guard passed:
  `git merge-base --is-ancestor 03326b8 claude/explorer`.
- Parallel integration merge commits:
  `ca20fbe` EDP-010, `2b0f5f7` T3 open-diff, `bc5a151` T4 FnR, and
  `d4c4225` T4 dashboard/add-ons.
- Final stabilization focused gates passed: EDP unit 15 files / 140 tests,
  EDP component 16 files / 138 tests, T3/T4 unit 8 files / 87 tests, and
  T3/T4 component 11 files / 38 tests.
- Full suites passed: `pnpm run test:unit` 129 files / 802 tests and
  `pnpm run test:component` 68 files / 330 tests.
- `pnpm run lint:full`, `pnpm run check`, `pnpm run build:plugin`, and
  `git diff --check` passed.
- Live `plugin-dev` smoke passed: reload, `vaultman:open`,
  `vaultman:open-diff`, FnR command, DOM evals, and `dev:errors`.
- Detailed verification commands are in
  [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/07-final-stabilization#Verification|EDP final stabilization verification]].
- Latest data-plane follow-up verification passed: component focused 5 files /
  72 tests, unit focused 4 files / 49 tests, `check`, `lint:full`,
  `build:plugin`, and `git diff --check`.

## Known Residuals

- Explorer data-plane residual: Files tree now has snapshot-backed rows, but
  far jump-scroll still needs a live benchmark plus variable-height row
  geometry for table/grid/cards.
- The known performance-threshold residuals are resolved by final
  stabilization: `test/unit/performance/stress.test.ts` and
  `test/component/viewTableStress.test.ts` passed under full suites.
- Remaining T4 follow-ups: frame-level native-click wiring, real
  adopted-block queue staging, Quick Switcher, and FAB polish.
- `node .agents/tools/pkm-ai/check-doc-health.mjs` still has existing
  glossary, parent-shape, and large plan/spec residuals.

## Next Action

- Add the deep jump-scroll benchmark/gate, then add variable-height row
  geometry for table/grid/cards before considering persistent storage.
