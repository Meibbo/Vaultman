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

## Next Agent Plan: Remaining Four Cuts

Use this as the next resume plan. The intermediate `@dnd-kit/svelte` migration and the ViewTree hover/click regression correction are already applied locally. Do not redo them. Before each cut, inspect the current diff because parts of Cut 4 and Cut 5 were already implemented in the continuation log below; preserve those implementations and complete only the missing behavior.

For shorthand dispatch such as `ejecuta ola 1 agente b`, use [[dispatch-shortcuts|Dock Toolbar Parallel Dispatch Shortcuts]].

### Intermediate Cut 1.5: Node Surface Theme, Queue Badges, And Scroll

Before resuming Cut 2, execute the sharded plan:
[[docs/work/polish/plans/2026-05-10-dock-toolbar-groups-virtualizer/cut-1-5-node-surface-theme-scroll/index|Cut 1.5 Node Surface Theme And Scroll Plan]].

This captures the latest product request as separate facets: matched active-filter node decoration default-off with a Settings opt-in, hover-primary visual removal, generic queue-badge removal across explorer views, Props search labels/default, `serviceScroll` for ViewTree lag, `serviceTheme` and node background/border settings, scrollable compact controls, and Queue explorer parent/child presentation cleanup.

### Cut 2: Settings And Row Layout Completion

Goal: stabilize visible UI interaction regressions before touching heavier virtualization work.

- Re-run and extend Settings UI tests around toggles, dock drawer options, faint accent focus, and layout settings.
- Confirm dock active state becomes neutral when changing page/context so the previous dock tab is not visually active after leaving that surface.
- Complete minimum-width tree row layout: toggle slot is now reserved; next agent should verify icon hiding/showing, indentation lines, badges, and counters at narrow frame widths with a regression test.
- Finish badge/counter row overlay behavior: counters keep reserved width when enabled, badges reveal on hover or active operations without permanently truncating labels.
- Confirm folder-open icon behavior across all tree-like explorers, not just the tested `ViewTree` path.

Suggested verification:

- `pnpm exec vp test run --project component --config vitest.config.ts test/component/settingsUI.test.ts test/component/navbarDock.test.ts test/component/viewTreeSelection.test.ts test/component/viewTreeDecorations.test.ts --fileParallelism=false`
- Add or update a narrow-width tree row regression test before production edits.
- `pnpm run check`

### Cut 3: Virtualizer, Pretext, And Tab Latency

Goal: reduce clipped rendering and tab-switch latency without adding broad recomputation.

- Audit `ViewNodeGrid.svelte`, `ViewNodeTable.svelte`, `viewTree.svelte`, `viewList.svelte`, and page-tools explorers for virtualization assumptions.
- Apply Pretext/service text measurement only where dynamic content can vary row/card dimensions; avoid global measurement on every tab switch.
- Cache measurements by explorer id, revision, visible fields, view mode, and available width.
- Increase overscan only where scroll clipping is reproducible; prefer measured fallback before simply rendering too many nodes.
- Profile or instrument tab switches, especially Props and Files, then remove temporary instrumentation before handoff.

Suggested verification:

- Focused component tests for affected explorers and tab switching.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/pageToolsSnippets.test.ts test/component/pageToolsPlugins.test.ts test/component/reactiveExplorers.test.ts --fileParallelism=false`
- `pnpm run check`

### Cut 4: Manual DnD, Groups, And Queue Operations

Goal: complete real DnD behavior on the new `@dnd-kit/svelte` adapter and finish logical group operations.

- Replace any remaining native row drag/drop paths with the `serviceDnd` + `serviceDndSvelteAdapter` semantic contract where it is practical.
- Wire `DragDropProvider`, `createDraggable`, and `createDroppable` in the first real node surface, with a focused test for semantic drag source, target, and drop result.
- Keep selection-box drag and manual DnD mutually non-interfering; the ViewTree fix now captures pointer only after selection threshold.
- Complete filter logic group operations if anything remains: reorder inside parent, group color accent row state, and queue explorer group rows by operation type.
- Add queue explorer groups for each action operation type and ensure group headers are non-removable while child operations remain removable.

Suggested verification:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts test/unit/services/serviceGroups.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewList.test.ts test/component/reactiveExplorers.test.ts test/component/pageFiltersChooseMode.test.ts --fileParallelism=false`
- `pnpm run check`

### Cut 5: Node Notes And Mouse Action Polish

Goal: finish the node-note surface and command priority polish after layout and DnD are stable.

- Verify the fifth node-note hover badge appears in every relevant node explorer, respects primary mouse action settings, and shows accent color when it is the primary action.
- Complete Settings option for node `serviceMouse` command mapping across primary, secondary, and tertiary actions.
- Ensure default primary action is add-to-filters and the filter badge accent hover state reflects that default.
- Confirm create/open node-note behavior uses clean label titles while preserving prefixed aliases for tags/properties/plugins/values.
- Add focused tests for mouse action priority changing badge order/color and for node-note open/create commands from hover badge and configured primary action.

Suggested verification:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceMouse.test.ts test/unit/services/serviceNodeBinding.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeHoverBadges.test.ts test/component/settingsUI.test.ts --fileParallelism=false`
- `pnpm run check`

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

## 2026-05-10 Intermediate Cut: DnD Kit Migration And Row Affordances

Implemented before continuing to Cut 2:

- Migrated `serviceDndSvelteAdapter` from `@thisux/sveltednd` option/callback shapes to `@dnd-kit/svelte` input and provider handler shapes.
- Added `createDndKitDraggableInput`, `createDndKitDroppableInput`, and `createDndKitProviderHandlers` while preserving the existing semantic `DndService` snapshot/result contract.
- Removed the old `@thisux/sveltednd` dependency and kept only `@dnd-kit/svelte@0.4.0` for the DnD Svelte integration.
- Corrected virtual tree affordance layout so toggle/icon slots are natural flex children only when a row actually has a parent toggle or icon.
- Added `has-toggle` and `has-icon` row-surface classes for regression coverage and future styling hooks.
- Centered compact Toolbar icons with explicit inline-flex alignment and normalized SVG display.

Fresh verification:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts test/unit/styles/treeAffordanceSpacing.test.ts test/unit/styles/toolbarIconCentering.test.ts --fileParallelism=false`: 4 files, 14 tests passed.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/toolbarMenuPlacement.test.ts test/component/viewTreeSelection.test.ts --fileParallelism=false`: 2 files, 21 tests passed.
- `pnpm run check`: `svelte-check found 0 errors and 0 warnings`.
- Svelte autofixer reported no issues for `viewTree.svelte`.

### Regression Correction: ViewTree Hover, Click Feel, And Toggle Slot

Follow-up correction after manual UI feedback:

- Restored a reserved toggle slot for leaf rows using a non-interactive `.vm-tree-toggle.is-placeholder`, keeping labels aligned without treating the row as a parent.
- Added virtual-tree indentation guide pseudo-elements for depth rows and expanded parent nodes; these are `pointer-events: none`.
- Restored explicit hover background/color feedback for virtual tree rows.
- Changed box-selection pointer capture so `ViewTree` captures only after pointer movement crosses the selection threshold, instead of on every `pointerdown`; this avoids interfering with normal click/hover movement and reduces unnecessary input work.

Fresh verification:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts test/unit/styles/treeAffordanceSpacing.test.ts test/unit/styles/toolbarIconCentering.test.ts --fileParallelism=false`: 4 files, 15 tests passed.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts test/component/viewTreeHoverBadges.test.ts test/component/viewTreeDecorations.test.ts --fileParallelism=false`: 3 files, 30 tests passed.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/toolbarMenuPlacement.test.ts --fileParallelism=false`: 1 file, 3 tests passed.
- `pnpm run check`: `svelte-check found 0 errors and 0 warnings`.
