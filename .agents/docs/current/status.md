---
title: Current status
type: agent-status
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: "docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-status.md"
created: 2026-05-04T01:36:20
updated: 2026-05-15T18:00:10.0199112-05:00
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

- Latest request handled: captured post-0-H Explorer performance and view
  architecture research after the user reported general provider/view issues,
  10K files/tree regressions, Markmap freezes, view feature drift, and requested
  online research for infinite-canvas style solutions. Follow-up design now
  captures Pretext/TanStack/render-tag roles and the invariant that every
  Explorer node must be able to expose at least one representative image/media
  descriptor, with exact native Obsidian Bases parity deferred. Latest scope
  correction: image visibility belongs to the view menu `btnMultiSelection`
  control outside the native Obsidian preset, and Map/ViewNodeMap is deferred
  out of the next selectable view release. Latest decision: image/media is
  disabled by default in every view because nodes already have icons. Latest
  action: converted the accepted brainstorm into the Explorer View Platform
  pass spec with 10K/50K/100K gates and real `viewTree` migration, then wrote
  the implementation plan.
- New source record:
  [[docs/work/hardening/research/2026-05-15-explorer-view-platform-infinite-canvas/index|Explorer view platform and infinite canvas research]].
- Active Explorer platform spec:
  [[docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass spec]].
- Active Explorer platform plan:
  [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]].
- Previous 0-H audit work second-pass audited the completed implementation
  against its spec/plan, recorded findings in the 0-H audit addendum, and reran
  focused gates plus `pnpm verify`.
- 0-H commits: `481820c` baseline coverage, `65e963f` TanStack list
  virtualizer, `b90098b` `ViewNodeList` rename, `b1dc7c8` widget row-input
  consumers, `e2bf5e5` panel list mode, `3a2603e` dead virtualizer cleanup,
  `d057b8c` stress/perf verification, `dad8198` view-menu list exposure, and
  `bc199c7` plugin/snippet list activation.
- Source plan:
  [[docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/index|Explorer 0-H virtualizer + list mode plan]].
- Verification record:
  [[docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/perf-baseline|0-H perf baseline and post-migration measurement]].
- Audit addendum:
  [[docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/audit-2026-05-15|Explorer 0-H audit addendum]].
- Active initiative: [[docs/work/hardening/index|Hardening]].
- Active spec:
  [[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/index|Explorer 0-H virtualizer + list mode spec]].
- Canonical product/test verification head: `bc199c7` on `claude/explorer`.
- Working tree has active documentation changes for the Explorer platform
  research/status/handoff; canonical product/test verification head remains
  `bc199c7`.
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
- Audit focused gates passed after `dad8198`/`bc199c7`: provider unit tests
  2 files / 9 tests, menu/panel component tests 2 files / 49 tests,
  `pnpm check` with 0 errors / 0 warnings, and `pnpm run build`.
- Post-audit live Obsidian CLI perfProbe ran in `plugin-dev`: `tree-scroll`
  16.00 ms, `operation-badges` 85.50 ms, `filter-select` 2521.20 ms,
  `filters-search` 657.50 ms. `dev:errors` reported no captured errors after
  cleanup.
- Latest build synced artifacts to
  `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.
- Additional focused gates passed: `ViewNodeList` 18 tests,
  `reactiveExplorers` 17 tests, panel list-mode focused 3 files / 73 tests,
  `pnpm check`, and `perfProbeDom` 1 file / 4 tests.
- Lint still reports 8 existing warnings and 0 errors; none were introduced
  by the 0-H files.
- Historical EDP final stabilization details remain in
  [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/07-final-stabilization#Verification|EDP final stabilization verification]].

## Known Residuals

- Explorer view platform residual: providers and views still lack a shared
  projection, feature contract, scroll/geometry coordinator, decoration module,
  and view lifecycle for heavy/canvas-like surfaces.
- Explorer media residual: node media must become a platform capability, not a
  Cards-only improvement. Projection, feature contracts, geometry, render
  anatomy, lifecycle, and the view menu `btnMultiSelection` controls all need a
  primary media slot. The slot defaults off in every view.
- Map/ViewNodeMap is deferred: current `ViewMarkmap.svelte` recursively mounts
  a full DOM tree and can freeze the app on large trees, so the next release
  should not expose Map as a selectable view option.
- View parity residuals remain: badges, selection box, keyboard/selection
  semantics, context menus, and hover badge behavior are not harmonized across
  tree/list/table/grid/cards.
- Tree visual recovery is now in scope for the platform pass: fix tree box
  selection, selected grey highlight, filtered accent-left-border plus existing
  translucent accent background, selected+filtered composition, right-aligned
  file extensions, and hidden `.md` extension.
- Explorer 0-H now has a post-audit live Obsidian CLI perfProbe wall-clock
  snapshot, but still has no pre-migration live baseline, jank-frame counts, or
  heap metrics. The API does not currently emit jank/heap fields.
- Audit residuals are documented in the 0-H audit addendum: ARIA row ids are
  derived directly from semantic row ids, initial listbox ArrowDown can skip
  the first row with no prior focus, spec/plan drift around `measureElement`,
  absent provider `capabilities.canReorder`, literal DOM snapshots not being
  committed, and future action-button propagation risk.
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

- Review the Explorer View Platform pass implementation plan, then execute it
  from feedback loops first: synthetic 10K/50K/100K datasets, scenario-specific
  perfProbe metrics, view feature parity tests, tree visual contract tests, view
  menu element-toggle/preset tests, media descriptor/geometry/lifecycle tests,
  and 10K/50K tree/list scroll tests before product rewrites. Keep
  Map/ViewNodeMap in a separate future iteration.
