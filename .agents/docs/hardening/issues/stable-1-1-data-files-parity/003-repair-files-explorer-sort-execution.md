---
title: SDF-003 Repair Files explorer sort execution
type: issue
issue_id: SDF-003
status: completed
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T07:53:25
updated: 2026-06-06T13:55:00
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/files
  - explorer/sort
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-003 Repair Files Explorer Sort Execution

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Repair Files explorer sort controls so every exposed sort option changes the rendered order in every
supported Files view without breaking virtualization or scroll.

## Acceptance Criteria

- [x] Files sort options apply to the supported stable Files views: tree and the table-backed grid view.
- [x] Sort state is retained when switching away from and back to Files.
- [x] Sort changes do not reset scroll more than required by a legitimate re-order.
- [x] Sort changes do not duplicate rows or break the virtual viewport.
- [x] Focused tests cover Files sort comparator behavior and selected UI state.
- [x] `plugin-dev` smoke verifies the native Sort menu exposes the repaired Files sort options after switching to Files.

## Blocked By

None - can start immediately.

## Verification

- Focused RED/GREEN tests:
  `pnpm exec vitest run --config vitest.unit.config.mts test/unit/explorerSort.test.ts test/unit/filesLogic.test.ts test/unit/statisticsCacheService.test.ts test/unit/sortUiSource.test.ts test/unit/explorerSetterSource.test.ts test/unit/statisticsScope.test.ts`
  passed (`6` files / `22` tests).
- `pnpm run check` passed with `0` Svelte diagnostics.
- `pnpm run verify` passed (`24` unit files / `79` tests; scorecard `17` checks).
- Build synced to `plugin-dev`; plugin reload/open passed; `dev:errors` returned `No errors captured`.
- DOM smoke switched Data Tabs from Content to Files and confirmed the Sort menu labels:
  `Name`, `Count`, `Extension`, `Modified time`, `Created time`, and `Path`, with no ambiguous `Date` item.

## Completion Notes

- Root cause: `FilesExplorerPanel` sorted files, then `FilesLogic.buildFileTree()` sorted every sibling group by label again. That erased caller-provided sort order in tree mode.
- Fix: `buildFileTree()` now keeps folders first while preserving the caller-provided file order inside each sibling group.
- Stable currently exposes Files `tree` and table-backed `grid`; there is no separate Files `list` enum in this stream.
