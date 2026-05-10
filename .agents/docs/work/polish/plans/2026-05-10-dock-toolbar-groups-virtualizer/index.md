# Dock, Toolbar, Groups, Virtualizer Implementation Plan

> **For agentic workers:** Use TDD for behavior changes. Preserve user worktree changes. Do not commit unless explicitly requested.

**Goal:** Complete the dock/FAB/toolbar migration and address the linked settings, virtualizer, filter/queue group, badge, and node-note regressions.

**Architecture:** Split the work into five verified cuts. First remove the legacy navbar pill/FAB duplication by extracting a primitive FAB and making the dock own only dock behavior. Then stabilize settings and row layout. Then address virtualizer/text measurement latency, then logical groups, then node-note naming.

**Tech Stack:** Svelte 5 runes, SCSS modules, Vitest component/unit tests, existing Vaultman service patterns.

---

## Cut 1: Navigation Primitive And Toolbar

- Create `src/components/primitives/PrimitiveFab.svelte`.
- Move queue/filter badge display and mouse gesture handling out of `navbarDock.svelte`.
- Replace `navbarPillFab.svelte` tests with `navbarDock`/`PrimitiveFab` tests.
- Delete `src/components/layout/navbarPillFab.svelte` once no imports remain.
- Add dock drawer settings to `serviceLayout` and `typeSettings`.
- Rename `navbarExplorer.svelte` to `Toolbar.svelte`; update imports/tests.
- Convert search into a toolbar button that opens the existing FnR/search island at the top.
- Move auto expand/collapse from sort popup into toolbar.

## Cut 2: Settings And Row Layout Bugs

- Fix settings toggle persistence so toggles do not break the Settings UI.
- Ensure dock active state is neutral when the dock surface no longer owns the current active item.
- Change tree row icon/toggle layout so toggle and icon do not consume unnecessary horizontal width.
- Add a regression test for minimum-width tree rows.
- Make selection and badges overlay the row except for the explicit counter space.
- Add opened folder icon for expanded folder nodes.

## Cut 3: Virtualizer And Text Measurement

- Increase conservative overscan where scrolling currently clips.
- Apply `serviceTextMeasure`/pretext to all dynamic explorer views that can vary row height.
- Cache measurement per explorer revision and layout width.
- Reduce tab switch latency by avoiding expensive recomputation when only the active tab changes.

## Cut 4: Groups For Filters And Queue

- Create `src/services/serviceGroups.ts`.
- Make active filter groups visible and reorderable by DnD inside their parent.
- Fix Add logic group so it creates a visible logical group without freezing.
- Add grouped queue explorer rows by operation type.
- Keep evaluator semantics compatible with existing `and/or/not` filter groups.

## Cut 5: Node Notes Naming

- Change new node-note file names/titles to use the clean node label.
- Keep prefixed tokens only in frontmatter aliases.
- Add unit tests for prop/tag/plugin/value naming.

## Verification

- Run focused unit/component tests after each cut.
- Run `pnpm run check`.
- Run `pnpm run lint`.
- Run `pnpm run build:plugin` or `pnpm run build` and report any Obsidian reload issue separately.

## 2026-05-10 Continuation Log

Implemented in this continuation:

- Added `serviceGroups` for visible logic-group creation, same-parent filter reorder, and queue grouping by operation action.
- Changed `indexActiveFilters` so user logic groups are visible rows instead of invisible containers.
- Wired Active Filters list DnD to reorder rules/groups within the same parent.
- Grouped Queue island rows by action with non-removable group headers.
- Changed node-note creation to use the clean node label as note basename while keeping prefixed aliases.
- Added persisted `faintAccentsWhenWorkspaceFocused` setting, body class, and CSS token fade while `.workspace` has focus.
- Fixed the PageFilters test fixture to match the real `FilterService.filteredFiles` no-filter contract.

Fresh verification:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceGroups.test.ts test/unit/services/serviceActiveFiltersIndex.test.ts test/unit/services/serviceNodeBinding.test.ts test/unit/styles/faintAccentFocus.test.ts --fileParallelism=false`: 4 files, 28 tests passed.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewList.test.ts test/component/reactiveExplorers.test.ts test/component/settingsUI.test.ts test/component/pageToolsSnippets.test.ts test/component/pageToolsPlugins.test.ts test/component/overlaySortMenu.test.ts test/component/pageFiltersChooseMode.test.ts --fileParallelism=false`: 7 files, 41 tests passed.
- `pnpm run check`: `svelte-check found 0 errors and 0 warnings`.
- Svelte autofixer reported no issues for `viewList.svelte`, `explorerActiveFilters.svelte`, `explorerQueue.svelte`, and `SettingsUI.svelte`.
