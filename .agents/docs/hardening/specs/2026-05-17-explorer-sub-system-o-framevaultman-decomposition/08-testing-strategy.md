---
title: Testing strategy
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|O frameVaultman decomposition]]"
created: 2026-05-17T00:00:00
updated: 2026-05-17T00:00:00
tags:
  - agent/spec
  - explorer/frame
  - explorer/testing
---

# Testing Strategy

The strategy is **layered**. Each layer corresponds to a class of
guarantee the change must provide: per-module correctness, frame
integration correctness, end-to-end behavioral correctness, and
visual / functional equivalence.

## Layer 1 — Unit + component tests per new module

Written TDD per commit. Tests precede implementation; tests fail
first, pass after impl.

### `frameNavigationService.test.ts` (Commit 1)

Path: `test/component/frame/frameNavigationService.test.ts`

- Construction with mock deps (plugin, overlays, getSelectedCount,
  getFileList, getPropExplorer, getTagsExplorer).
- `attachViewport` / `attachNavReorder` late-binding:
  - Before attach: `nav.viewport` and `nav.navReorder` throw.
  - After attach: getters return the attached instance.
- State reactivity:
  - Set `nav.toolsActiveTab = 'X'`; read back returns 'X'.
  - Set `nav.filtersActiveTab = 'files'`; read back returns 'files'.
  - `nav.pageIndex` updates when `setPageOrder` changes order.
- Methods (each with a focused test):
  - `navigateTo` — same vs different page branches.
  - **`openDiffIntent` — strict side-effect order assertion.**
    Mock both `overlays` and `viewport`; record method-call order;
    assert exact sequence. This is the T3 contract.
  - `enterBasesImport` / `exitBasesImport`.
  - `openStatsNote` (with `openVaultmanFileSuggestModal` mocked).
  - `showStatsPage`.
  - `selectSurfaceItem` — three branches (detached → spawnTabLeaf,
    filter-tabs → filtersActiveTab change, frame-pages → navigateTo).
- Surface derivations:
  - `itemsForSurface('frame-pages')` returns framePageTabs with
    `dot` field set when `getSelectedCount() > 0` and item is
    `statistics`.
  - `itemsForSurface('filter-tabs')` returns filterTabItems with
    `disabled` + `faint` set when `filtersBaseChooseMode &&
    item !== 'files'`.
  - `dockUsesFramePages` derives from `layoutSettings.dock.content`.
  - `topTabActive` returns `filtersActiveTab` only when
    `activePage === 'filters'` and surface is filter-tabs.
- Edge cases:
  - `pageOrder` change to one not containing `activePage`: the
    `$effect` resets `activePage` to `pageOrder[0] ?? 'ops'`.
  - `viewport.applyPageTransform` called on every page change
    (reactive `$effect` on `pageIndex`).

### `framePopupsState.test.ts` (Commit 2)

Path: `test/component/frame/framePopupsState.test.ts`

- Construction with mock deps (plugin, overlays, onStatsDirty).
- Scope:
  - `setScope('selected')` normalizes, writes
    `plugin.settings.explorerOperationScope`, calls saveSettings,
    closes popup.
  - `setFiltersOperationScope(v)` writes scope WITHOUT popup close.
  - `scopeOptions` is a frozen array; mutation attempts fail.
- Active filters:
  - `refreshActiveFiltersPopup()` reads
    `plugin.filterService.activeFilter`, populates
    `activeFilterRules` via `collectActiveFilterRules`.
  - `toggleFilterRule(rule)` calls
    `plugin.filterService.toggleFilterRule(rule.node.id)` when
    `rule.node.id` is truthy; then refreshes.
  - `deleteFilterRule(rule)` calls
    `plugin.filterService.removeNode`, refreshes, fires
    `onStatsDirty`.
  - No-op when `rule.node.id` is falsy in toggle.
- Search:
  - `searchName` / `searchFolder` get/set bindable reactivity.
- Move:
  - `moveTargetFiles` / `moveTargetFolder` bindable.
  - `movePreviews` derived from `createMovePreviews(files, folder)`;
    re-derives on input change.
  - `queueMoves()` builds changes via `createMoveChanges`, calls
    `plugin.queueService.addBatch`, closes popup.
- `attachFolderSuggest(el)`:
  - Constructs `FolderSuggest` with a callback that updates both
    `moveTargetFolder` and the input element's value.
  - Returns `{ destroy() }`; `destroy()` calls `suggest.close()`.

### `FrameNavbarShell.test.ts` (Commit 3)

Path: `test/component/frame/FrameNavbarShell.test.ts`

- Setup: helper that constructs a `MockFrameNavigationService` and
  injects via `setContext` on the test container.
- Renders `<NavbarTabs>` iff `nav.topTabItems.length > 0`.
- Renders `<NavbarDock>` unconditionally with correct
  `items` / `active` / `externalTabIds`.
- Renders island backdrop:
  - `class:is-open` reflects `overlays.isIslandOpen`.
  - `class:is-dismissable` reflects
    `plugin.settings.islandDismissOnOutsideClick`.
- Click on `.vm-island-backdrop` when dismissable:
  - calls `overlays.closeQueueIsland()` + `overlays.closeFiltersIsland()`.
- Keydown on `.vm-island-backdrop` (Escape or Enter) when dismissable:
  - same as click.
- NavbarDock prop wiring:
  - `nav.dockUsesFramePages=true` enables reorder callbacks
    (`onItemPointerDown` not undefined, etc.).
  - `nav.dockUsesFramePages=false` disables (undefined).
- NavbarDock `onSelect` callback calls
  `nav.selectSurfaceItem(layoutSettings.dock.content, id)`.
- Snapshot test: mount shell with a representative nav state,
  capture DOM, compare to the baseline navbar region from
  pre-step 0.

### `FrameDashboardShell.test.ts` (Commit 4)

Path: `test/component/frame/FrameDashboardShell.test.ts`

- Setup helper as above.
- `dashboardEnabled=false` → renders nothing (or comment marker;
  no visible DOM).
- `dashboardEnabled=true` → renders `Dashboard3Column` with the
  three snippets.
- Each snippet:
  - `dashboardFilters` renders `filterTabItems.length` buttons,
    each with `class:is-active` reflecting `filtersActiveTab`.
  - `dashboardExplorer` per `nav.activePage`:
    - 'ops' + not detached → OperationsPage with
      `bind:activeTab={nav.toolsActiveTab}`.
    - 'ops' + detached → `<div class="vm-page-external" ...>`.
    - 'statistics' → StatisticsPage with `previewFile` +
      `onShowStats`.
    - 'filters' → FiltersPage with all bind:s.
  - `dashboardAddons` renders AddonsMarkdownPane.
- bind: propagation:
  - Mock FiltersPage that writes `filtersActiveTab='files'` →
    parent (test container) observes the change via its bound
    state.
- Snapshot test: mount shell with a representative state for
  dashboardEnabled=true, capture DOM, compare to baseline
  dashboard region.

## Layer 2 — DOM baseline snapshots

Pre-step 0 captures the **whole-frame DOM** in three states:

```ts
// test/component/frame/frameVaultmanBaseline.test.ts
describe('frameVaultman baseline DOM', () => {
  it('renders ops state', () => {
    const { container } = render(FrameVaultman, {
      plugin: makeMockPlugin({ activePage: 'ops' }),
    });
    expect(container.innerHTML).toMatchSnapshot();
  });
  it('renders filters state', () => { /* ... */ });
  it('renders statistics state', () => { /* ... */ });
});
```

After each shell extraction (C3, C4), the baseline snapshots must
still match — unless a documented intentional diff was made (e.g.,
a wrapper element added to enable measurement). Intentional diffs
require:

1. A commit message note explaining the diff.
2. A regenerated snapshot.
3. Visual verification via live smoke.

## Layer 3 — T3 / T4 integration

Path: `test/component/frame/frameVaultmanIntents.test.ts`

- **T3 round-trip:** Mount the full frame. Call
  `plugin.openDiffViewHook()` (it should be a registered closure
  by this point). Assert:
  - `overlays.closeQueueIsland` was called.
  - `overlays.closeFiltersIsland` was called.
  - `overlays.closePopup` was called (only if popup was open).
  - `nav.activePage` is `'ops'`.
  - `nav.toolsActiveTab` is `'file_diff'`.
  - `viewport.applyPageTransform(true)` was called.
- **T4 bidirectional binding:** Mount frame. Render OperationsPage
  internally (via dashboardExplorer or pages-strip path). Simulate
  OperationsPage writing `activeTab='filters'` back to the
  binding. Assert `nav.toolsActiveTab === 'filters'`. Then set
  `nav.toolsActiveTab = 'file_diff'` from outside; assert
  OperationsPage receives 'file_diff' on next render.
- **Frame teardown removes T3 hook:** Mount + unmount. After
  unmount, `plugin.openDiffViewHook` is null (or distinct from
  the closure registered during mount).

## Layer 4 — Per-commit live smoke

After every commit (C1 through C5), execute the live smoke
checklist against `plugin-dev`:

```bash
obsidian plugin:reload id=vaultman vault=plugin-dev

# Navigate manually
obsidian command id=vaultman:open-view-menu vault=plugin-dev
# (verify pages visible in dock)

# T3
obsidian command id=vaultman:open-diff vault=plugin-dev
# (verify lands on ops page, file_diff sub-tab)

# Popups (mouse / keyboard interaction with plugin UI)
# (open each: scope, active filters, search, move; exercise actions)

# Dev errors
obsidian dev:errors vault=plugin-dev
# Expected: "No errors captured."
```

After C5, additional checks:

- Resize Obsidian window to cross the dashboard/pages-strip
  threshold; verify both modes work.
- Pop out the frame to a separate window (Obsidian core
  workspace feature); verify Faint Mode tracks active window
  (window focus binding still works).
- Pop the frame back into the main window; verify Faint Mode
  resets correctly.

## Layer 5 — Verification gates per commit

Each commit ends with all of these green:

- `pnpm tsc --noEmit` (typecheck clean).
- `pnpm verify` (full unit + component suite + lint).
- `git diff --check` (no trailing whitespace / merge markers).
- Baseline DOM snapshot tests green (or documented diff approved
  by user).
- Live smoke per Layer 4 with `dev:errors` clean.

## Test fixtures and helpers

### `makeMockPlugin(overrides?: Partial<MockPluginState>)`

A test helper that returns a minimal mock of `VaultmanPlugin` with
the surface needed by frame:

- `app` (with `vault`, `metadataCache`, `workspace`).
- `settings` (with all the fields the frame reads).
- `filterService` (stub with `subscribe`, `activeFilter`,
  `toggleFilterRule`, `removeNode`, `setSearchFilter`).
- `queueService` (stub with `logicalOpCount`, `isEmpty`,
  `listTransactions`, `addBatch`, `on`, `off`).
- `themeService` (stub with `rootClasses`, `mode`,
  `windowFocused`).
- `leafDetachService` (stub with `subscribe`, `getState`).
- `overlayState` (stub).
- `openDiffViewHook` (settable slot).
- `saveSettings` (jest.fn).
- `spawnTabLeaf` (jest.fn).
- `contentIndex` (stub with `setQuery`).

### `MockFrameNavigationService`

A test double for `FrameNavigationService` that:

- Exposes the same getters but backed by simple in-memory state.
- Records method-call order for assertion.
- Provides a `setActivePage(value)` helper for tests to set state
  without invoking method side-effects.

### `withContext(component, key, value)`

A test helper that wraps a component in a parent that calls
`setContext(key, value)` before rendering the component. Used by
shell tests to inject `nav` / `popups` without mounting the full
frame.

## TDD discipline

- **Pre-step 0:** capture baseline; no production code change.
- **C1 - C4:** test file precedes the implementation. The failing
  test asserts the desired API; the implementation makes it pass.
- **C5:** no new test (cleanup). The existing suite + baseline
  snapshots are the gate.

## What is NOT tested in O

- **Performance.** O is a pure structural refactor; no performance
  characteristic changes. The existing `perfProbe` scenarios
  (`tree-scroll`, `operation-badges`, `filter-select`,
  `filters-search`) continue to run as part of `pnpm verify` and
  guard against regression. No new perf scenarios are added.
- **Screenshot pixel-diff.** Out of scope. DOM snapshot is the
  visual guard.
- **Multi-window scenarios beyond Faint Mode binding.** The window
  focus listeners stay inline in frame; no behavioral change.
- **Cross-version compat.** Vaultman has no pre-O released
  version; clean break, no migration code.
