---
title: SDF-016 Explorer view parity and Statistics card routing
type: issue
issue_id: SDF-016
status: in-progress
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T11:15:23
updated: 2026-06-07T08:11:13-05:00
labels:
  - ready-for-agent
  - needs-research
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/views
  - statistics/navigation
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-016 Explorer View Parity And Statistics Card Routing

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

After the Bases-parity table view is repaired, make view availability consistent across Data explorers
and turn Statistics cards into navigation shortcuts to the relevant Data surface.

This is intentionally tracked separately from the dock fix because it touches cross-page navigation,
view-mode availability, and the still-open table layout work.

## Acceptance Criteria

- [x] Start by resolving or explicitly depending on
      [[011-bases-parity-table-view-layout|SDF-011 Bases-parity table view layout]]; do not expand table
      view to more explorers while the current table presentation remains broken.
- [ ] Props, Tags, Files, and Content explorer surfaces expose table view only after the table renderer
      has acceptable Bases/core-class parity, column separation, resize affordances, and stable scroll.
      - [x] Props and Tags expose a generic node table renderer with Bases/core classes, stable column
            offsets, and virtualized visible rows.
      - [x] Files table and generic node tables expose working header resize handles that update absolute
            column offsets without replacing the virtualized row pipeline.
      - [ ] Content still needs its own Core Search-compatible table/list renderer before this parent
            criterion can close.
- [x] Files explorer exposes grid view in addition to tree and table once the grid interaction defects are
      resolved for file nodes.
- [x] View menu copy and icons make the difference between grid, table, tree, and future views explicit.
- [x] Page Statistics card clicks route to the matching Data explorer:
      - folders and files cards route to Data / Files.
      - props and values cards route to Data / Props.
      - tags card route to Data / Tags.
      - word count row routes to Data / Content.
- [x] Routing preserves the user's existing active filters/search where possible and does not clear state
      unless a card explicitly requests a new filter.
- [x] Clicking a Statistics card closes open islands and puts the Data page into a stable active tab state.
- [x] Add focused tests or source guards for the view-mode availability map and Statistics card-to-tab
      routing map.
- [x] `plugin-dev` smoke confirms each Statistics card navigates to the expected Data tab and the target
      explorer remains scrollable.

## Blocked By

- [[011-bases-parity-table-view-layout|SDF-011 Bases-parity table view layout]] for table view expansion.
- Files grid interaction defects were resolved in the 2026-06-07T08:11:13-05:00 cut for the stable Files
  surface; keep future work scoped to Content parity and filter performance unless new grid regressions
  are reported.

## Notes

The Statistics card routing is useful independently, but implementing it together with the view-parity
work keeps the Data surface navigation contract coherent: Statistics becomes a map into the same explorer
surfaces whose view modes are being normalized.

## Progress - 2026-06-07T08:11:13-05:00

Completed the requested resizable-table and working Files-grid subcut. SDF-016 remains in progress because
Content still needs Core Search-compatible table/list parity and the rapid-click filter FPS follow-up still
needs indexed or batched filter evaluation.

- Product change:
  - `logicTableLayout.ts` and `logicNodeTableLayout.ts` now accept per-column width overrides and clamp them
    to useful minimum widths.
  - Files table and generic node table headers now wire `.bases-table-header-resizer` handles to in-memory
    column widths; resizing updates Bases-style absolute offsets and visible virtual rows without replacing
    the table virtualization pipeline.
  - Files view modes now expose `Tree`, `Table`, and `Grid` as selectable. `Table` maps to the existing
    Bases-style Files table renderer, while `Grid` maps to a dedicated `FilesGridView`.
  - Added `viewFilesGrid.ts` plus `gridVirtualization.ts`: Files grid is row-virtualized, scrollable, uses
    file cards, preserves file click/open, context menu, drag payloads, active-file styling, visible-cell
    toggles, non-Markdown extension tags, queue badges, and Ctrl/Meta selection.
  - `explorerFiles.ts` now keeps `tableView` and `gridView` separate, routes auto-reveal to the correct
    renderer, and shares file click/cmenu/dnd behavior across tree, table, and grid.
- Tests/source guards:
  - `explorerViewModes.test.ts` now proves Files exposes selectable `tree/table/grid` and maps `table` to
    `table`, not the old internal `grid` alias.
  - `tableLayout.test.ts` and `nodeTableLayout.test.ts` cover resizable width overrides and min-width clamps.
  - `gridViewSource.test.ts` and `nodeTableViewSource.test.ts` guard the header resizer wiring.
  - `filesGridViewSource.test.ts` guards the dedicated Files grid renderer and virtual-grid dependency.
- Verification:
  - RED failed for locked Files grid, `table -> grid` mapping, missing `viewFilesGrid.ts`, and missing resize
    wiring/width overrides.
  - Focused GREEN passed: `6` unit files / `24` tests.
  - Svelte MCP official autofixer on `navbarFilters.svelte` reported `issues: []`; suggestions were only
    existing broad notes about `$effect`, `bind:this`, and mutable `Set`.
  - `pnpm run check` passed with `svelte-check` `0` errors / `0` warnings.
  - `pnpm run test:unit` passed: `37` files / `130` tests.
  - `pnpm run verify` passed end-to-end: `eslint .`, `svelte-check`, Prettier check, stylelint, production
    build plugin, unit suite, and scorecard `17` checks.
  - Earlier in the cut, `pnpm run build` passed and synced artifacts to
    `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.
  - `plugin-dev` reload/open passed after restarting a stuck CLI bridge. Final `dev:errors` returned
    `No errors captured`.
  - Runtime DOM smoke confirmed Files Grid with `22` virtualized cards, cards `draggable=true`, `data-path`
    present, grid scrollable, and no stale Files table root while Grid is active.
  - Runtime DOM smoke confirmed Files Table with `25` virtualized rows, a visible resizer, and column resize
    changing width from `300px` to `360px`.
  - Console capture was not available until debugger attachment; `dev:errors` was clean after the smoke.

## Progress - 2026-06-07T06:58:00-05:00

Completed the first recommended follow-up wave after cuts 1-3. SDF-016 remains in progress because the
newly requested resizable table and fully working Files grid are not part of this completed cut.

- Product change:
  - `filter-evaluator.ts` now evaluates `all` groups incrementally: each rule receives the candidate
    files that survived the previous rule instead of scanning the full vault for every child rule.
  - `filter-evaluator.ts` now caches metadata per file for the duration of a single evaluation, so sibling
    rules do not repeatedly call `metadataCache.getFileCache(file)` for the same path.
  - Minimal Data header now mirrors Core plugin DOM structure: `.nav-header > .nav-buttons-container >
    .clickable-icon.nav-action-button`. The previous structure placed `nav-buttons-container` on the
    Vaultman header itself, which could bypass theme rules such as Baseline's hover reveal behavior.
  - Minimal Data header no longer emits native `title` attributes on icon buttons; Obsidian-style
    `aria-label` remains.
  - When dock is disabled, the Data Tabs menu now lists `Files`, `Props`, `Tags`, `Content`, then
    `Statistics`, `Active filters`, and `Queue`.
  - Panel context menus now include `Clean selection` when active filters exist; it clears active filters.
  - DnD payloads now use active filters as the temporary multi-selection model. Dragging an active
    filtered node in Files/Props/Tags includes the matching same-surface active filters in
    `payload.selection`; dragging an unfiltered node remains a single-node payload.
- Tests/source guards:
  - `test/unit/filterEvaluator.test.ts` now proves `all` groups narrow candidates and perform no more than
    one metadata read per file during a multi-rule evaluation.
  - `test/unit/dragPayload.test.ts` covers active-filter-derived DnD selections.
  - `test/unit/contextMenuSource.test.ts` guards the global `filters.clear-selection` cmenu action.
  - `test/unit/navbarFiltersSource.test.ts` guards the Core-like `nav-header` / `nav-buttons-container`
    structure.
  - `test/unit/pageFiltersSource.test.ts` guards the dock-off Statistics action in the Data Tabs menu.
- Verification:
  - RED confirmed the old evaluator performed `300` metadata reads for `100` files and `3` `all` rules.
  - Focused unit gate passed: `5` files / `15` tests.
  - Svelte MCP CLI autofixer on `navbarFilters.svelte`, `pageFilters.svelte`, and `VaultmanFrame.svelte`
    reported no `issues`; it emitted only broad existing suggestions about `$effect`, `bind:this`,
    `Set`, and `Map`, then timed out after printing suggestions.
  - `pnpm run check` passed with `svelte-check` `0` errors / `0` warnings.
  - `pnpm run test:unit` passed: `36` files / `125` tests.
  - `pnpm run test:scorecard` passed: `17` checks.
  - `pnpm run build` passed and synced artifacts to
    `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.
  - `pnpm run format:check` and `pnpm run stylelint` passed.
  - Targeted ESLint over touched TS/test files passed. Full `pnpm run lint` / `eslint .` timed out without
    emitting diagnostics; treat this as an environment/tooling timeout to re-check in the next gate, not
    as a clean full-lint pass.
  - `plugin-dev` reload/open passed and final `dev:errors` returned `No errors captured`.
  - Runtime DOM smoke confirmed `vaultman-filters-header vaultman-filters-header--minimal nav-header`,
    a direct child `.nav-buttons-container`, no `title` attributes on header icon buttons, and Tabs menu
    items `Files`, `Props`, `Tags`, `Content`, `Statistics`, `Active filters`, `Queue`.
  - Runtime perf smoke before this cut reproduced `filter.applyFilters` pikes of `152.5ms`, `143.5ms`,
    `190.0ms`, `229.0ms`, `270.5ms`, `369.4ms`, `456.4ms`, and `490.2ms` over `8` sequential Props
    filter clicks.
  - Runtime perf smoke after this cut removed the large `300-490ms` pikes, but the sequence still measured
    around `70-113ms` per filter apply and about `12fps` during the burst. Remaining work should use a
    property/tag index or a deliberate filter-apply batching model; this cut improves the worst pikes but
    does not fully solve rapid-click FPS.
- Next SDF-016 subcut requested by dev:
  - Add resizable table columns.
  - Make Files grid view fully working before exposing it as a normal Files view.
  - Continue the remaining filter performance work with indexed rule evaluation or batching.

## Progress - 2026-06-07T04:07:46-05:00

Completed cuts 1, 2, and 3 as a release-facing interaction slice. SDF-016 remains in progress because
this does not close Content parity or Files grid parity.

- Cut 1 product change:
  - Added a `showDock` setting, default `false`, with Settings copy in English and Spanish.
  - When dock is disabled, Data's native Tabs menu appends `Active filters` and `Queue` after a
    separator; Statistics is not exposed through that fallback menu.
  - Queue and Filters launchers now debounce double-click behavior so a quick double-click clears the
    relevant list instead of toggling islands open/closed.
  - Queue indicators now surface warning state when any staged operation crosses the existing bulk-risk
    threshold; tooltip copy reports pending count plus warning count.
  - Minimal View menu hides disabled `Drag & Drop list` and `Cards` entries to reduce non-functional
    visual noise.
- Cut 2 product change:
  - Added `src/utils/dragPayload.ts` with a stable `application/x-vaultman-node` JSON payload plus
    `text/plain` fallback.
  - Tree, generic node table, and Files table/grid renderers now accept row drag-start callbacks without
    rebuilding the virtualization pipeline.
  - Files nodes emit file/folder path payloads.
  - Tag nodes emit tag-path payloads.
  - Property nodes emit property payloads; property-value nodes emit `property-value` payloads and mark
    `mode=value-only` when the parent property filter is already active.
- Cut 3 product change:
  - Added `src/utils/basesMultiSelectOperations.ts` as a defensive Core Bases multi-select adapter.
  - The adapter listens on `activeDocument`, detects selected Bases rows, resolves selected files, and
    adds Vaultman batch operations for add property, rename files, move files, and delete files.
  - If the native Bases context menu is open, Vaultman items are injected into that menu; otherwise a
    fallback Obsidian `Menu` opens at the context-menu event.
- Focused tests/source guards:
  - `test/unit/settingsDefaults.test.ts`
  - `test/unit/fabIndicator.test.ts`
  - `test/unit/dragPayload.test.ts`
  - `test/unit/cut123Source.test.ts`
- Verification:
  - Svelte MCP autofixer on `navbarPillFab.svelte`: no issues; only non-blocking `bind:this`
    suggestions.
  - Targeted unit gate passed: `4` files / `15` tests.
  - `pnpm run verify` passed: lint, `svelte-check`, format check, stylelint, production build,
    `35` unit files / `119` tests, and scorecard regression scan `17` checks.
  - `pnpm run build` passed and synced artifacts to
    `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.
  - `obsidian vault=plugin-dev plugin:reload id=vaultman` passed after clearing old errors; final
    `dev:errors` returned `No errors captured`.
  - Runtime DOM smoke confirmed `showDock=false`, no `.vaultman-bottom-nav`, Data header labels
    `Tabs: Files`, `View mode`, `Sort`, `Search`, `Auto-reveal current file`, `Expand all`, and Tabs menu
    items `Files`, `Props`, `Tags`, `Content`, `Active filters`, `Queue`.
  - Runtime DOM smoke confirmed visible explorer rows render `draggable="true"`.

## Progress - 2026-06-06T19:40:28-05:00

SDF-016d completed a second scroll-rendering cut focused on row reuse and row-content signatures. SDF-016
remains in progress because this improves the existing Tree/Table renderers but still does not complete
Content parity, Files grid, or DnD view behavior.

- Product change:
  - `UnifiedTreeView`, `GridView`, and `NodeTableView` no longer clear the whole visible-window body on
    every virtual scroll render. Each renderer keeps a `rowEls` map, removes only stale rows that leave
    the projected viewport, and reuses row shell elements for rows that remain visible.
  - Each renderer now computes a `rowSignature` from visible row content and state. If a row keeps the
    same id/content/classes/badges/visible-cell state, the renderer updates position and handlers but
    skips rebuilding child DOM.
  - Row-level click/context-menu handlers were switched to direct handler assignment on reused rows so
    repeated renders do not accumulate duplicate row listeners.
- Focused RED/GREEN source guards:
  `test/unit/viewTreeSource.test.ts`, `test/unit/gridViewSource.test.ts`, and
  `test/unit/nodeTableViewSource.test.ts`.
- Verification:
  - RED confirmed the renderers still lacked row-shell maps, stale-row cleanup guards, and
    `rowSignature`-based skip logic.
  - Focused gate passed: `5` unit files / `13` tests including table/tree virtualization guards.
  - `pnpm run check`, `pnpm run lint`, `pnpm run format:check`, and `pnpm run stylelint` passed.
  - `pnpm run build` passed and synced artifacts to
    `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.
  - `plugin-dev` reload via JS `disablePlugin/enablePlugin` passed and reopened Vaultman.
  - Runtime synchronous DOM smoke confirmed rendered virtual rows carry `data-render-signature`
    (`66/66` rows in the active visible window) and `obsidian vault=plugin-dev dev:errors` returned
    `No errors captured`.
  - Full unit gate passed: `33` unit files / `111` tests. Scorecard regression scan passed `17` checks.
- Runtime perf evidence and limitation:
  - Before adding row signatures, the row-shell reuse version measured Files Tree `tree.window` mostly
    around `9-16ms` with one `23.2ms` spike, and Files Table `files.table.window` mostly around `9-16ms`
    with one `25.2ms` spike. Props Table still had a `63.4ms` `node.table.window` spike, which motivated
    the signature skip pass.
  - After the final signature build/reload, CLI scripts that depended on timers/RAF did not resolve
    reliably, despite synchronous evals working. Treat post-signature numeric perf as not freshly
    measured in this cut. The next perf cut should use a more reliable sampling harness or visible HUD
    interaction rather than relying on timed CLI promises.

## Progress - 2026-06-06T18:44:22-05:00

SDF-016c completed a targeted table/tree lifecycle and scroll scheduling cut. SDF-016 remains
in progress because this fixes a severe scroll/root-state regression but does not complete Content
parity, Files grid, or DnD view behavior.

- Root cause confirmed in `plugin-dev`: after switching Files Table -> Tree, the active
  `.vaultman-files-tab-content` could keep the stale `vaultman-files-table-root` class. That table root
  layout compressed the tree virtual spacer: the inline tree spacer height was large, but computed
  height collapsed to about one viewport, producing the "bottom only reaches part of the list" symptom.
- Product change:
  - `GridView.destroy()` now removes the scroll listener, cancels pending scheduled renders, removes
    `vaultman-files-table-root`, empties the container, and clears stale table refs.
  - `FilesExplorerPanel._mountView()` and `onunload()` now destroy the Files table view before mounting
    another view or unloading the panel.
  - Files table and generic node table scroll handlers now sync the header immediately but coalesce
    virtual-window DOM rebuilds through `window.requestAnimationFrame(run)` plus a short timeout fallback.
  - `viewGrid.ts` records `files.table.window`; `viewNodeTable.ts` records `node.table.window`, matching
    the existing `tree.window` performance evidence pattern.
- Focused RED/GREEN source guards:
  `test/unit/gridViewSource.test.ts`, `test/unit/nodeTableViewSource.test.ts`, and
  `test/unit/explorerFilesSource.test.ts`.
- Verification:
  - RED confirmed missing Files table `destroy()`, missing node/table RAF scheduling, and missing
    `this.gridView?.destroy()` in Files explorer lifecycle.
  - Focused gate passed: `5` unit files / `8` tests including table/tree virtualization guards.
  - `pnpm run check`, `pnpm run lint`, `pnpm run format:check`, and `pnpm run stylelint` passed.
  - `pnpm run build` passed and synced artifacts to
    `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.
  - Runtime DOM smoke after Files Table -> Tree confirmed
    `vaultman-files-tab-content vaultman-tree-virtual-viewport`, no stale
    `vaultman-files-table-root`, and matching inline/computed tree spacer height.
  - Runtime expanded-files smoke confirmed `scrollHeight=301887`, `computedHeight=301887px`, and only
    virtual visible rows in DOM, so the large file tree can scroll to the end again.
  - Runtime Files Table smoke confirmed `vaultman-files-table-root` without
    `vaultman-tree-virtual-viewport`, `scrollHeight=333570`, and about `25` DOM rows.
  - Runtime perf smoke on Files Table recorded `files.table.window` samples mostly around `13-23ms`
    with one `34.6ms` spike; sampler reported `fps=40`, `7` long tasks, `716ms` long-task time.
  - Runtime perf smoke on expanded Files Tree still shows remaining optimization work:
    `tree.window` samples around `17-27ms`, sampler `fps=16`, `7` long tasks, `1164ms` long-task time.
    This cut fixes broken scroll/lifecycle; it does not fully solve explorer scroll jank.
  - Runtime Props Table smoke recorded `node.table.window` samples around `14-30ms` over `258` rows.
  - Final `obsidian vault=plugin-dev dev:errors` returned `No errors captured`. Console capture was not
    available because the debugger was not attached.
- DnD follow-up research captured with `obsidian-cli`:
  - Core Files nodes expose `tree-item-self nav-folder-title/nav-file-title ...`, `draggable="true"`,
    and `data-path` on both folders and files.
  - Visible Core Tag pane nodes expose `tree-item-self tag-pane-tag is-clickable` and
    `tag-pane-tag-count tree-item-flair`; this DOM snapshot did not expose `draggable` on tag rows.
  - Next slice should implement Vaultman node DnD deliberately instead of treating tag/prop DnD as a
    blind copy of Files. Files should carry path payloads; Tags should carry tag payloads; Props values
    should stage prop+value when the prop is not already active, or value-only when the prop filter is
    already active.

## Progress - 2026-06-06T17:39:16-05:00

SDF-016b completed the generic table slice for Props and Tags only. SDF-016 remains in progress because
Content table parity and Files grid parity are still intentionally deferred.

- Product change: `logicNodeTableLayout.ts` defines stable Bases-style column offsets for generic node
  tables; `viewNodeTable.ts` renders `bases-thead`, `bases-table-container`, `bases-table`,
  `bases-tbody`, `bases-tr`, and `bases-td` rows over the existing visible tree projection.
- Props and Tags explorers now accept `table` as a real view mode. Tree/Grid teardown is explicit, table
  rows preserve node click/context-menu/filter behavior, and the Count/Type/Icon/Text cells respect the
  existing visible-cell toggles.
- `logicExplorerViewModes.ts` now exposes Props/Tags `Tree`, `Grid`, and `Table` as selectable while
  keeping `Drag & Drop list` and `Cards` disabled. Files remains `Tree`/`Table` selectable with internal
  Files table renderer mapping unchanged; Content still exposes no view modes.
- `pageFilters.svelte` now mounts an externally activated Data tab even when the user arrived through
  Statistics card routing instead of the local tab switcher. The implementation avoids adding a new
  Svelte `$effect`; active panes render when `visitedTabs[tab] || filtersActiveTab === tab`, and local
  tab switching marks both the current and target tab as visited.
- Focused tests/source guards updated:
  `test/unit/explorerViewModes.test.ts`, `test/unit/nodeTableLayout.test.ts`, and
  `test/unit/pageFiltersSource.test.ts`.
- Verification:
  - RED/GREEN source guard confirmed the external-routing mount regression.
  - Focused gate passed: `4` unit files / `16` tests.
  - Svelte MCP autofixer reported no issues on `pageFilters.svelte`; remaining suggestions are the
    pre-existing Content search effect structure.
  - `pnpm run check`, `pnpm run stylelint`, and targeted Prettier check passed after formatting the new
    test.
  - `pnpm run build` synced artifacts to `plugin-dev`.
  - `obsidian vault=plugin-dev plugin:reload id=vaultman`, `command id=vaultman:open`, and initial
    `dev:errors` passed.
  - Runtime smoke routed from Statistics to Properties and Tags, opened the View menu, selected `Table`,
    and confirmed `.vaultman-node-table-root` inside the active pane with headers at `0/34/334` and
    visible rows for both surfaces.
  - A transient Obsidian `e.isShown is not a function` error was isolated to the smoke script's direct
    `.click()` on native menu items. After clearing the buffer and re-running with real `MouseEvent`
    dispatches, final `dev:errors` and captured console errors were clean.
  - Full `pnpm run verify` passed: lint, `svelte-check`, format check, stylelint, production build,
    `30` unit files / `100` tests, and scorecard regression scan `17` checks.

Remaining work for completing SDF-016:

- Implement Content explorer table/list parity against Core Search result semantics instead of adding
  another capped ad-hoc list.
- Implement the separate Files grid view only after file-grid selection, context menu,
  badges/decorations, and file affordances are fixed.

## Progress — 2026-06-06T16:07:29-05:00

SDF-016a completed the routing and view-mode-contract slice without claiming the generic table/grid work
as done.

- Product change: Statistics cards now emit `StatisticsDataTab` navigation
  through `logicStatisticsNavigation.ts`; `VaultmanFrame` closes open islands, switches to Data, and sets
  the requested Data tab without clearing filters/search.
- `pageStatistics.svelte` makes folders/files/props/values/tags cards clickable and makes the Word Count
  meta row route to Content.
- `logicExplorerViewModes.ts` centralizes view availability. Current runtime contract:
  - Files: `Tree` and `Table` selectable; `Grid`, `Drag & Drop list`, and `Cards` visible but disabled.
    The repaired Files table still maps to the existing internal `GridView` renderer for now.
  - Props and Tags: `Tree` and `Grid` selectable; generic `Table`, `Drag & Drop list`, and `Cards`
    visible but disabled.
  - Content: no explorer view modes exposed yet.
- Focused tests added:
  `test/unit/statisticsNavigation.test.ts` and `test/unit/explorerViewModes.test.ts`.
- Verification:
  - `pnpm run verify` passed: lint, `svelte-check`, format check, stylelint, production build,
    `29` unit files / `96` tests, and scorecard regression scan `17` checks.
  - `pnpm run build` synced artifacts to `plugin-dev`.
  - `obsidian vault=plugin-dev plugin:reload id=vaultman`, `command id=vaultman:open`, and
    `dev:errors` passed.
  - Runtime smoke clicked Folders, Files, Properties, Values, Tags, and Word Count; each landed on
    `Tabs: Files`, `Tabs: Files`, `Tabs: Props`, `Tabs: Props`, `Tabs: Tags`, and `Tabs: Content`
    respectively, with Data active and `islandOpen=false`.
  - Runtime smoke confirmed Files View menu shows `Tree`, `Table`, disabled `Grid`, disabled
    `Drag & Drop list`, and disabled `Cards`; Props/Tags show `Tree`, `Grid`, disabled `Table`,
    disabled `Drag & Drop list`, and disabled `Cards`.
  - Selecting Files `Table` rendered `.vaultman-files-table-root` with scrollWidth `612`, scrollable
    body, and header offsets `0/300/411`.

Remaining work for completing SDF-016:

- Implement a real generic table view for Props, Tags, and Content or split that into a dedicated
  follow-up if the renderer architecture needs a larger pass.
- Implement the separate Files grid view only after file-grid selection, context menu,
  badges/decorations, and file affordances are fixed.
