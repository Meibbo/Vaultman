---
title: SDF-006 Zero-result filters warning indicator
type: issue
issue_id: SDF-006
status: completed
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T07:53:25
updated: 2026-06-06T13:20:45
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - filters
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-006 Zero-Result Filters Warning Indicator

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Change the Filters FAB indicator so active filters that return zero files show `lucide-warning`
instead of a numeric badge.

## Acceptance Criteria

- [x] When active filters return one or more files, the FAB badge keeps the normal count behavior.
- [x] When active filters return zero files, the FAB indicator shows a rendered Lucide warning icon.
- [x] The warning indicator is reactive to filter add/remove, Files search-derived filters, and filter clearing.
- [x] The warning state is accessible by label and does not use misleading accent styling.
- [x] Focused tests cover zero-result and nonzero-result transitions.

## Blocked By

None - can start immediately.

## Verification

- `pnpm exec vitest run --config vitest.unit.config.mts test/unit/fabIndicator.test.ts test/unit/navbarPillFabSource.test.ts test/unit/navbarFiltersSource.test.ts`
  passed 3 files / 9 tests.
- `pnpm run verify` passed with 21 unit files / 72 tests and scorecard 17 checks.
- Build synced to `plugin-dev` with `node scripts/sync-test-build.mjs`; `plugin:reload` and `vaultman:open`
  passed.
- Runtime smoke applied a Files search-derived impossible filter and confirmed:
  - `filtered: 0`;
  - `.vaultman-fab-badge--warning` exists;
  - warning badge contains a real SVG (`lucide-alert-triangle`);
  - filter FAB aria label is `Active filters return no files`;
  - clearing filters restored the full `plugin-dev` file count.
- Final `obsidian vault=plugin-dev dev:errors` returned `No errors captured`.

## Notes

The original issue wording used `lucide-warning`; Obsidian did not render that icon name in the
runtime smoke, leaving an empty badge. The implementation uses the valid Lucide/Obsidian warning icon
`lucide-alert-triangle` so the indicator is visible.
