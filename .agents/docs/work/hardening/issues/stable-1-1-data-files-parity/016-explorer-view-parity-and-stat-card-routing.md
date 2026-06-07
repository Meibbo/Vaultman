---
title: SDF-016 Explorer view parity and Statistics card routing
type: issue
issue_id: SDF-016
status: in-progress
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T11:15:23
updated: 2026-06-06T19:40:28-05:00
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
      - [ ] Content still needs its own Core Search-compatible table/list renderer before this parent
            criterion can close.
- [ ] Files explorer exposes grid view in addition to tree and table once the grid interaction defects are
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
- Files grid interaction defects already reported by the user: grid view must support selection, context
  menu, badges/decorations, and file-specific affordances before becoming a normal Files view.

## Notes

The Statistics card routing is useful independently, but implementing it together with the view-parity
work keeps the Data surface navigation contract coherent: Statistics becomes a map into the same explorer
surfaces whose view modes are being normalized.

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
