---
title: Current status
type: agent-status
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: "docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-status.md"
created: 2026-05-04T01:36:20
updated: 2026-05-15T06:05:15.3529322-05:00
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

- Latest request handled: implemented Explorer 0-H virtualizer + list mode on
  canonical branch `claude/explorer` without subagents after the user
  redirected the session.
- 0-H commits: `481820c` baseline coverage, `65e963f` TanStack list
  virtualizer, `b90098b` `ViewNodeList` rename, `b1dc7c8` widget row-input
  consumers, `e2bf5e5` panel list mode, `3a2603e` dead virtualizer cleanup,
  and `d057b8c` stress/perf verification.
- Source plan:
  [[docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/index|Explorer 0-H virtualizer + list mode plan]].
- Verification record:
  [[docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/perf-baseline|0-H perf baseline and post-migration measurement]].
- Active initiative: [[docs/work/hardening/index|Hardening]].
- Active spec:
  [[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/index|Explorer 0-H virtualizer + list mode spec]].
- Canonical product/test verification head: `d057b8c` on `claude/explorer`;
  the current-doc refresh commit sits on top.
- Unrelated working-tree residue remains from before this implementation:
  `.vscode/settings.json` and untracked `docs/superpowers/`.
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

- Task 5 full gate passed before cleanup commit:
  `pnpm verify` = lint/check/build/unit/component, 129 unit files / 797 tests
  and 68 component files / 344 tests.
- Task 6 full gate passed before verification commit:
  `pnpm verify` = lint/check/build/unit/component, 129 unit files / 797 tests
  and 68 component files / 354 tests.
- Additional focused gates passed: `ViewNodeList` 18 tests,
  `reactiveExplorers` 17 tests, panel list-mode focused 3 files / 73 tests,
  `pnpm check`, and `perfProbeDom` 1 file / 4 tests.
- Lint still reports 8 existing warnings and 0 errors; none were introduced
  by the 0-H files.
- Historical EDP final stabilization details remain in
  [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/07-final-stabilization#Verification|EDP final stabilization verification]].

## Known Residuals

- Explorer 0-H is complete locally, but no live Obsidian/browser perfProbe
  run emitted per-scenario wall-clock, jank-frame, or heap metrics. The local
  jsdom harness is documented in the 0-H perf record.
- Broader explorer data-plane residual remains: far jump-scroll still needs a
  live benchmark plus variable-height row geometry for table/grid/cards.
- The known performance-threshold residuals are resolved by final
  stabilization: `test/unit/performance/stress.test.ts` and
  `test/component/viewTableStress.test.ts` passed under full suites.
- Remaining T4 follow-ups: frame-level native-click wiring, real
  adopted-block queue staging, Quick Switcher, and FAB polish.
- `node .agents/tools/pkm-ai/check-doc-health.mjs` still has existing
  glossary, parent-shape, and large plan/spec residuals.

## Next Action

- Decide whether to push/open a PR for current `claude/explorer` HEAD or run a
  live Obsidian perfProbe first; then continue with the deep jump-scroll
  benchmark and variable-height row geometry work.
