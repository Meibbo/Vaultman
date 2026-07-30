---
title: SDF-004 Split date sort into modified and created cache-backed sorts
type: issue
issue_id: SDF-004
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
  - explorer/sort
  - statistics/cache
blocked_by:
  - "[[003-repair-files-explorer-sort-execution|SDF-003]]"
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-004 Split Date Sort Into Modified And Created Cache-Backed Sorts

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Replace the ambiguous `date` sort with separate `modified time` and `created time` sorts across explorers, backed by the same IndexedDB/statistics cache strategy used for file-level statistics.

## Acceptance Criteria

- [x] The old single `date` sort is removed or migrated from user-facing sort menus.
- [x] Files, Props, Tags, and Content where applicable expose separate `modified time` and `created time` options.
- [x] Each date option has a distinct calendar-style icon.
- [x] Created/modified timestamps are cached per file as derived statistics data instead of recalculated through hot UI paths.
- [x] Existing settings/sort state migrates safely when it references the old `date` sort.
- [x] Sorting Props by the new date-derived sorts does not freeze the active filter section on the `plugin-dev` vault.

## Blocked By

- [[003-repair-files-explorer-sort-execution|SDF-003]]

## Verification

- Focused RED/GREEN tests:
  `pnpm exec vitest run --config vitest.unit.config.mts test/unit/explorerSort.test.ts test/unit/filesLogic.test.ts test/unit/statisticsCacheService.test.ts test/unit/sortUiSource.test.ts test/unit/explorerSetterSource.test.ts test/unit/statisticsScope.test.ts` passed (`6` files / `22` tests).
- `pnpm run check` passed with `0` Svelte diagnostics.
- `pnpm run verify` passed (`24` unit files / `79` tests; scorecard `17` checks).
- Svelte autofixer ran on `navbarFilters.svelte`, `popupSort.svelte`, and `pageStatistics.svelte`;
  it reported no issues, only existing effect/action suggestions.
- Build synced to `plugin-dev`; plugin reload/open passed; final `dev:errors` returned `No errors captured`.
- DOM smoke confirmed Files Sort menu has `Modified time` and `Created time` and no ambiguous `Date` sort.
- Props runtime smoke switched to Props and clicked both date-derived sorts:
  `Modified time` found and rendered in about `909 ms`; `Created time` found and rendered in about `241 ms`; `dev:errors` stayed clean.

## Completion Notes

- `normalizeExplorerSortBy('date')` migrates legacy state to `mtime`.
- `StatisticsCacheService` now persists `ctime` with `mtime`, `size`, word count, links, props, values, and tags in the per-file cache record.
- Props and Tags no longer compute date sort with nested `nodes x markdownFiles` loops. They build a per-render timestamp index using `statisticsCache.getFileTimes(file)` when available and `file.stat` as fallback.
- The `Modified time` smoke is not a freeze, but the measured first render is still a performance watch item if users report it as jank.
