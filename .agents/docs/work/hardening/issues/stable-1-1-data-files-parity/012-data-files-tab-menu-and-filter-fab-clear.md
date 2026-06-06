---
title: SDF-012 Data Files tab menu and active-filter quick clear
type: issue
issue_id: SDF-012
status: done
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T09:32:37
updated: 2026-06-06T09:32:37
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/files
  - explorer/navigation
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-012 Data Files Tab Menu And Active-Filter Quick Clear

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Move the Files surface out of the bottom dock and into the Data filters header tab menu as the first
tab, add a quick double-click clear gesture on the active-filters FAB, and align the current visible
header/statistics polish with the release-facing stable UX contract.

## Acceptance Criteria

- [x] Bottom dock shows Data and Statistics only; Files is no longer its own dock page.
- [x] Data header Tabs menu shows Files first, then Props, Tags, and Content.
- [x] Files uses the existing `FilesExplorerPanel`/`FilesTab` implementation after the move; no new
      render or virtualization pipeline is introduced.
- [x] Existing legacy `pageOrder` settings containing `ops` migrate to the two-page dock.
- [x] Double-clicking the active-filters FAB clears all active filters and removes the badge.
- [x] Filters header has `8px` padding.
- [x] Statistics scope pills use scope-specific color variables aligned with the stats grid palette.

## Closeout - 2026-06-06

- Implemented in product worktree `hotfix/1.0.2-css-scorecard`.
- Added `src/logic/logicNavigation.ts` with `resolveDockPageOrder()` and focused unit coverage for
  legacy `ops` page-order migration.
- Changed `DEFAULT_SETTINGS.pageOrder` to `['filters', 'statistics']`; `VaultmanFrame.svelte`
  normalizes old settings and renders only Data and Statistics pages in the dock.
- Moved `FilesTab` into `pageFilters.svelte` and made it the first Data tab/menu option. The
  existing `FilesExplorerPanel` remains the mounted implementation, preserving the current explorer
  render path.
- Updated `navbarTabs.svelte` and Spanish i18n so Files appears in both minimal menu and non-minimal
  tabbar surfaces.
- Added optional `FabDef.doubleClickAction` and wired the Data active-filters FAB to
  `filterService.clearFilters()`.
- Updated `.vaultman-filters-header` / `.vaultman-filters-header--minimal` to `8px` padding.
- Added `--scope-color` per Statistics scope pill using blue, green, and orange palette variables.

## Verification

- RED: focused tests initially failed because default `pageOrder` still included `ops` and
  `logicNavigation` did not exist.
- GREEN focused gate:
  `pnpm exec vitest run --config vitest.unit.config.mts test/unit/settingsDefaults.test.ts test/unit/navigationPages.test.ts`
  passed.
- `npx @sveltejs/mcp svelte-autofixer` ran on touched Svelte files. It reported no Svelte issues;
  some invocations timed out after printing results and only listed pre-existing suggestions about
  effect usage/attachments.
- `pnpm run check`: pass, `svelte-check found 0 errors and 0 warnings`.
- `pnpm run format:check`: pass after targeted Prettier on `VaultmanFrame.svelte` and
  `pageStatistics.svelte`.
- `pnpm run stylelint`: pass.
- `pnpm run test:unit`: pass, `15` files / `49` tests.
- `pnpm run verify`: pass; lint, check, format, stylelint, build plugin, unit tests, and scorecard
  regression scan all passed.
- Final sync: `node scripts/sync-test-build.mjs`.
- `obsidian vault=plugin-dev plugin:reload id=vaultman`: pass.
- Fresh `obsidian vault=plugin-dev dev:errors`: `No errors captured`.
- DOM smoke: dock labels were `Data` and `Statistics`; Data was active; Files content was visible
  inside Data; filter header computed padding was `8px` on all sides and `justify-content:center`.
- DOM smoke: Tabs menu order was `Files`, `Props`, `Tags`, `Content`; Files was checked.
- DOM smoke: after adding a file-name filter through `setFileSearchRule`, the active-filters FAB
  badge showed `1`; dispatching `dblclick` cleared active rules to `0`, removed the badge, and left
  all `11115` files visible.
- DOM smoke: Statistics scope pills exposed `--scope-color` values for vault/filtered/selected and
  the active pill used the blue stats-grid palette.
