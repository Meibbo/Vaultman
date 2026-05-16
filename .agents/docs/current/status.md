---
title: Current status
type: agent-status
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: "docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-status.md"
created: 2026-05-04T01:36:20
updated: 2026-05-16T02:39:59.6920129-05:00
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
- Current user instruction for Explorer platform execution: no subagents unless
  explicitly requested; use TDD; start feedback loops/harness/probes first.

## Current Route

- Active initiative: [[docs/work/hardening/index|Hardening]].
- Active Explorer platform research:
  [[docs/work/hardening/research/2026-05-15-explorer-view-platform-infinite-canvas/index|Explorer view platform and infinite canvas research]].
- Active Explorer platform spec:
  [[docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass spec]].
- Active Explorer platform plan:
  [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]].
- Latest implementation slice: executed Tasks 1-7 of the Explorer View
  Platform pass on `claude/explorer`, starting with feedback loops/probes and
  then adding projection, feature/menu, media field, and scroll geometry
  contracts.
- Latest Explorer platform commits:
  - `883cb0a` `test: add explorer synthetic dataset harness`
  - `c813daf` `test: add explorer platform perf scenarios`
  - `1372853` `test: characterize explorer platform scale gates`
  - `75d0af8` `feat: add explorer projection contract`
  - `7f6dcb8` `feat: add explorer view feature contract`
  - `b83c47c` `feat: add explorer node media field toggle`
  - `abe6766` `feat: add explorer scroll geometry coordinator`
- Note: `9df9e50` (`plans: theme wiring for future theme builder`) is present
  in the branch history between this session's commits and was not part of the
  Explorer platform task slice.
- Current working tree still has unrelated/user changes in `README.md`,
  `manifest.json`, and `package.json`. Do not include or revert them unless the
  user explicitly asks.
- Previous Explorer 0-H implementation/audit remains completed; key records:
  [[docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/index|Explorer 0-H plan]],
  [[docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/perf-baseline|0-H perf baseline]],
  and
  [[docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/audit-2026-05-15|0-H audit addendum]].

## Verification Snapshot

- Task 1 red/green:
  `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/performance/explorerPlatformSynthetic.test.ts --fileParallelism=false`
  failed first because `test/support/explorerSyntheticDataset.ts` did not
  exist, then passed with 10K/50K/100K cases.
- Task 2 focused gate passed:
  `pnpm exec vitest run --project unit --project component --config vitest.config.ts test/unit/dev/perfProbe.test.ts test/component/perfProbeDom.test.ts --fileParallelism=false`
  = 2 files / 14 tests.
- Task 4 focused gate passed:
  `test/unit/services/serviceExplorerProjection.test.ts`,
  `test/unit/services/serviceExplorerRowInput.test.ts`, and
  `test/unit/performance/explorerPlatformSynthetic.test.ts` = 3 files / 14
  tests; `pnpm exec tsc -noEmit -skipLibCheck` passed.
- Task 5 focused gate passed:
  `test/unit/services/serviceExplorerViewContract.test.ts` = 1 file / 2 tests;
  `pnpm exec tsc -noEmit -skipLibCheck` passed.
- Task 6 focused gate passed:
  `test/unit/services/serviceNodeFieldVisibility.test.ts` and
  `test/component/overlayViewMenu.test.ts` = 2 files / 14 tests; `pnpm check`
  found 0 errors / 0 warnings. Svelte autofixer on
  `overlayViewMenu.svelte`: `issues: []`.
- Task 7 focused gate passed:
  `pnpm exec vitest run --project unit --project component --config vitest.config.ts test/unit/services/serviceExplorerScrollGeometry.test.ts test/component/viewTreeScrollFallback.test.ts test/component/ViewNodeList.test.ts --fileParallelism=false`
  = 3 files / 26 tests; `pnpm check` found 0 errors / 0 warnings.
- Fresh combined checkpoint before the Task 7 handoff:
  8 touched test files / 44 tests passed after Tasks 1-6, and Task 7 focused
  tests passed after the final `viewTree` type fix.

## Known Residuals

- Task 8 is next: batched decoration layer in
  `src/services/serviceExplorerLayers.ts` plus
  `test/unit/services/serviceExplorerLayersBatch.test.ts`.
- Task 9 remains: media descriptor hidden-cost path in
  `serviceExplorerMediaCache`, `serviceExplorerProjection`, and a new media
  descriptor unit test.
- Real `viewTree` platform migration is not complete. Current tree/list changes
  only introduced the scroll geometry coordinator path; visual remake is still
  out of scope except the accepted tree fixes later in the plan.
- Tree visual recovery is still pending: selection box, selected grey,
  filtered accent-left-border plus translucent accent background,
  selected+filtered composition, right-aligned file extensions, and hidden
  `.md`.
- Map/ViewNodeMap remains deferred and must not be exposed as a selectable
  next-release view.
- Live `plugin-dev` 10K/50K/100K perfProbe runs are still pending for later
  integration tasks.
- Existing doc-health residuals remain outside this integration: glossary
  warnings, parent-shape issues, and large plan/spec line limits.

## Next Action

- Continue from Task 8 in
  [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/03-scroll-geometry-decoration-media|Scroll, geometry, decoration, and media layers]].
- Use TDD: write the failing batched layer tests first, then implement the
  revision-keyed layer builder and `perfProbe` timing
  `explorer.layers.build`.
