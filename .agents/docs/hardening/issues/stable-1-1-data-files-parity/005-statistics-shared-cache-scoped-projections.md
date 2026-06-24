---
title: SDF-005 Statistics shared cache with scoped projections
type: issue
issue_id: SDF-005
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
  - statistics/cache
blocked_by:
  - "[[004-split-date-sort-created-modified-cache|SDF-004]]"
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-005 Statistics Shared Cache With Scoped Projections

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Make Statistics use one shared per-file information source and project it through three scopes:
all eligible files, currently filtered files, and the focused editor file.

## Acceptance Criteria

- [x] `All files`, `Filtered files`, and `Selected file` consume the same underlying file-level statistics cache.
- [x] `All files` scopes to all eligible vault markdown files.
- [x] `Filtered files` scopes to the exact markdown files returned by active filters.
- [x] `Selected file` scopes only to the file in the currently focused editor, not a remembered explorer selection or stale active file.
- [x] With no active filters, `All files` and `Filtered files` show the same file-level values and folder projection.
- [x] Live updates write to the shared cache and are reflected when switching scopes without recalculating from zero.
- [x] Scope changes never replace last-good values with partial counters while reconciliation is still running.

## Blocked By

- [[004-split-date-sort-created-modified-cache|SDF-004]]

## Verification

- Focused RED/GREEN tests:
  `pnpm exec vitest run --config vitest.unit.config.mts test/unit/explorerSort.test.ts test/unit/filesLogic.test.ts test/unit/statisticsCacheService.test.ts test/unit/sortUiSource.test.ts test/unit/explorerSetterSource.test.ts test/unit/statisticsScope.test.ts`
  passed (`6` files / `22` tests).
- `pnpm run check` passed with `0` Svelte diagnostics.
- `pnpm run verify` passed (`24` unit files / `79` tests; scorecard `17` checks).
- Build synced to `plugin-dev`; plugin reload/open passed; final `dev:errors` returned `No errors captured`.
- Runtime smoke cleared filters and verified `filteredCount` equals markdown count (`11068`), opened a
  sample markdown file, confirmed the active file path matched that sample, computed a selected-file
  snapshot with `files=1`, and confirmed `statisticsCache.getFileTimes()` returns matching `ctime` and
  `mtime`.

## Completion Notes

- Added `logicStatisticsScope.ts` so scope selection is a pure, testable projection:
  `vault -> markdownFiles`, `filtered -> filterService.filteredFiles`, and
  `selected -> workspace.getActiveFile()`.
- Folder count now projects from the files in the current scope instead of making `vault` count all
  folders while `filtered` counted only folders represented by files. This removes the no-filter
  mismatch between `All files` and `Filtered files`.
- `pageStatistics.svelte` now listens to `workspace.on('file-open')` so selected-file statistics
  update when the focused editor changes.
