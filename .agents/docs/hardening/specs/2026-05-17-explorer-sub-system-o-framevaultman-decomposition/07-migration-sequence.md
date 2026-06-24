---
title: Migration sequence (5 commits)
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|O frameVaultman decomposition]]"
created: 2026-05-17T00:00:00
updated: 2026-05-17T00:00:00
tags:
  - agent/spec
  - explorer/frame
  - explorer/refactor
---

# Migration Sequence (5 Commits)

Each commit is **independently revertible**. Each commit follows TDD:
failing test → implementation → green test. Each commit ends with a
green `pnpm verify` and a successful live smoke against `plugin-dev`
(`obsidian dev:errors vault=plugin-dev` returning `No errors captured.`).

## Pre-step 0 — Baseline capture

Before C1, capture:

1. **DOM snapshot of frame in three states.** New test
   `test/component/frame/frameVaultmanBaseline.test.ts`. Mount the
   frame at `activePage='ops'`, capture rendered DOM. Mount at
   `activePage='filters'`, capture. Mount at `activePage='statistics'`,
   capture. Save snapshots in `test/__snapshots__/`. These become the
   regression guard for C3 + C4.
2. **Live smoke baseline log.** Reload `plugin-dev`, navigate
   `ops → filters → statistics → ops`, toggle dock drawer, execute
   `vaultman:open-diff`, run scope/active-filters/search/move
   popups (basic smoke), record `dev:errors` output (expected:
   `No errors captured.`).
3. **LOC baseline.** `wc -l src/components/frame/frameVaultman.svelte`
   → expected 866 (or close). Record in plan as starting point.

No code changes in pre-step 0; pure capture. Optional: commit the
baseline test in its own micro-commit to keep C1 clean.

## Commit 1 — `feat(O): extract FrameNavigationService`

### TDD

New test file `test/component/frame/frameNavigationService.test.ts`:

- Constructor with mock deps (plugin, overlays).
- `navigateTo(page)`:
  - Same page → no overlay/popup changes, no transform call.
  - Different page → calls `overlays.closeQueueIsland()`,
    `overlays.closeFiltersIsland()`, conditional `overlays.closePopup()`,
    sets `activePage`, calls `viewport.applyPageTransform(true)`.
  - Leaving 'filters' clears `filtersBaseChooseMode`.
- **`openDiffIntent()` — order assertion:** mock `overlays` and
  `viewport` to record call order. Assert sequence:
  `closeQueueIsland → closeFiltersIsland → [closePopup if open] →
   activePage='ops' → toolsActiveTab='file_diff' → applyPageTransform(true)`.
- `enterBasesImport()`: `filtersBaseChooseMode=true`,
  `filtersActiveTab='files'`, activePage='filters' if not already,
  applyPageTransform(true).
- `exitBasesImport()`: `filtersBaseChooseMode=false`.
- `openStatsNote()`: opens modal (mocked), on selection sets
  `statsPreviewFile` + `activePage='statistics'`, applyPageTransform.
- `showStatsPage()`: clears `statsPreviewFile`.
- `selectSurfaceItem(content, id)`:
  - `content='filter-tabs'`, detached → calls `plugin.spawnTabLeaf(tabId)`.
  - `content='filter-tabs'`, not detached → sets `filtersActiveTab=id`,
    navigateTo('filters') if not active.
  - `content='frame-pages'` → navigateTo(id).
- Surface derivations: `itemsForSurface`, `activeForSurface`,
  `dockItems`, `topTabItems`, `dockUsesFramePages`.
- `attachViewport` / `attachNavReorder`: late-bound deps.
- `nav.viewport` / `nav.navReorder` getters throw if not attached.
- T4 bindable: assigning `nav.toolsActiveTab = 'file_diff'`
  reflects in subsequent getter reads.

### Implementation

1. Create `src/components/frame/frameNavigation.svelte.ts` with
   the full class per shard 03 contract.
2. **POC bind: verification.** Before the full refactor, write a
   minimal test that confirms `bind:value={instance.field}` works
   for a getter/setter pair on a runes class. If it doesn't, switch
   the strategy to explicit prop + callback (documented in shard 09
   risks).
3. Refactor `frameVaultman.svelte`:
   - Add imports.
   - Construct overlays (no changes to its constructor signature
     other than `onImportBases: () => nav.enterBasesImport()`).
   - Construct `nav` with the getter-injections per shard 03.
   - Construct `viewport`, call `nav.attachViewport(viewport)`.
   - Construct `navReorder`, call `nav.attachNavReorder(navReorder)`.
   - Call `setContext(FRAME_NAVIGATION_KEY, nav)`.
   - Replace the inline `openDiffView` + its `$effect` with a
     single 3-line `$effect` that registers
     `plugin.openDiffViewHook = () => nav.openDiffIntent()` (with
     identity-check cleanup).
   - Replace every read of `activePage`, `pageOrder`, `pageIndex`,
     `toolsActiveTab`, `statsPreviewFile`, `filtersBaseChooseMode`,
     `filtersActiveTab` with `nav.X`.
   - Replace `bind:activeTab={toolsActiveTab}` with
     `bind:activeTab={nav.toolsActiveTab}` (or callback fallback).
   - Delete the moved functions: `initFrameState`, `navigateTo`,
     `enterBasesImportMode`, `exitBasesImportMode`, `openStatsNote`,
     `showStatsPage`, `openDiffView`, `itemsForSurface`,
     `activeForSurface`, `externalIdsForSurface`,
     `detachedTabIdForSurfaceItem`, `tabIdForSurfaceItem`,
     `selectSurfaceItem`.
   - Delete the moved derivations: `framePageTabs`, `filterTabItems`
     (or proxy to nav), `topTabItems`, `topTabActive`,
     `topExternalTabIds`, `dockItems`, `dockActive`,
     `dockExternalTabIds`, `dockUsesFramePages`,
     `filterTabsExternallyMounted`, `pageFabs`, `leftFab`, `rightFab`,
     `layoutSettings`.
   - Delete the moved $effects: `pageIndex → viewport.applyPageTransform`
     and `pageOrder validity check`.

### Verification

- `pnpm tsc --noEmit` clean.
- `pnpm test test/component/frame/frameNavigationService.test.ts` green.
- `pnpm verify` (full suite + lint).
- Baseline DOM snapshot test still green (frame's rendered DOM should
  not change at this step — only internal wiring changed).
- Live smoke per the pre-step 0 baseline.

### LOC delta

frameVaultman.svelte: 866 → ~720 (≈ -146 LOC).
New: frameNavigation.svelte.ts: 0 → ~150 LOC.

## Commit 2 — `feat(O): extract FramePopupsState`

### TDD

New test file `test/component/frame/framePopupsState.test.ts`:

- Constructor with mock deps (plugin, overlays, onStatsDirty callback).
- `setScope(v)`: normalizes value, mutates
  `plugin.settings.explorerOperationScope`, calls saveSettings,
  closes popup.
- `setFiltersOperationScope(v)`: same as setScope but no
  popup close.
- `refreshActiveFiltersPopup()`: reads
  `plugin.filterService.activeFilter`, exposes rules.
- `toggleFilterRule(rule)`: calls
  `plugin.filterService.toggleFilterRule(rule.node.id)`, refreshes.
- `deleteFilterRule(rule)`: calls
  `plugin.filterService.removeNode(rule.node, rule.parent)`,
  refreshes, fires `onStatsDirty`.
- `searchName`/`searchFolder` get/set: bindable reactivity.
- `moveTargetFiles`/`moveTargetFolder` get/set: bindable.
- `movePreviews` derived from `createMovePreviews(files, folder)`.
- `queueMoves()`: builds changes via `createMoveChanges`, calls
  `plugin.queueService.addBatch`, closes popup.
- `attachFolderSuggest(el)`: constructs `FolderSuggest`, returns
  `{ destroy() }` per Svelte action contract.

### Implementation

1. Create `src/components/frame/framePopups.svelte.ts` per shard 04.
2. Refactor `frameVaultman.svelte`:
   - Add imports.
   - Construct `popups = new FramePopupsState(plugin, overlays, () => updateStats())`.
   - Call `setContext(FRAME_POPUPS_KEY, popups)`.
   - Replace `<PopupOverlay>` props with `popups.X` getters and
     `(args) => popups.method(args)` callbacks (per shard 04
     example).
   - Update the active-filters popup refresh $effect to call
     `popups.refreshActiveFiltersPopup()` instead of inline.
   - Update the search routing $effect to read
     `popups.searchName` / `popups.searchFolder` instead of inline
     state.
   - Delete the moved declarations: `scopeOptions`, `setScope`,
     `setFiltersOperationScope`, `activeFilterRules`,
     `refreshActiveFiltersPopup`, `toggleFilterRule`,
     `deleteFilterRule`, `searchName`, `searchFolder`,
     `moveTargetFiles`, `moveTargetFolder`, `movePreviews`,
     `queueMoves`, `attachFolderSuggest`.

### Verification

- `pnpm test test/component/frame/framePopupsState.test.ts` green.
- `pnpm verify`.
- Baseline DOM snapshot still green.
- Live smoke: open each of 4 popups, exercise actions, verify
  identical behavior.

### LOC delta

frameVaultman.svelte: ~720 → ~640 (≈ -80 LOC).
New: framePopups.svelte.ts: 0 → ~120 LOC.

## Commit 3 — `feat(O): extract FrameNavbarShell`

### TDD

New test file `test/component/frame/FrameNavbarShell.test.ts`:

- Mount with nav mock in context, overlays mock prop, minimal other props.
- Renders `<NavbarTabs>` when `nav.topTabItems.length > 0`.
- Renders `<NavbarDock>` with `nav.dockItems` / `nav.dockActive`.
- Renders island backdrop with correct `is-open` class derived from
  `overlays.isIslandOpen`.
- Click on dock item dispatches
  `nav.selectSurfaceItem(layoutSettings.dock.content, id)`.
- Reorder gating: `nav.dockUsesFramePages=true` enables
  `onItemPointerDown` etc.; `false` disables.
- **DOM byte-equivalence test:** import the baseline snapshot from
  pre-step 0; mount frame post-C3 with same inputs; assert the
  rendered navbar region matches the baseline byte-for-byte (or
  documents the intended diff if a wrapper element was added).

### Implementation

1. Create `src/components/frame/FrameNavbarShell.svelte` per shard 05.
2. Add `drawerOpen` $state to `FrameNavReorderController` (new
   public getter/setter pair). Update tests for the controller to
   cover `drawerOpen`.
3. Refactor `frameVaultman.svelte`:
   - Delete the `frameIslandAndDock` snippet entirely.
   - Replace the two `{@render frameIslandAndDock()}` sites with
     a single `<FrameNavbarShell ... />` mount AFTER the dashboard
     / pages-strip conditional.
   - Move the top `NavbarTabs` conditional render into the shell.
   - Remove the top-level `NavbarTabs` mount from the frame template.
   - Delete `dockDrawerOpen` $state from frame.

### Verification

- `pnpm test test/component/frame/FrameNavbarShell.test.ts` green.
- Baseline DOM snapshot for navbar region passes (byte-equivalent
  or documented diff).
- `pnpm verify`.
- Live smoke: toggle dock drawer, reorder pages, navigate dock
  items, navigate top tabs, verify identical behavior.

### LOC delta

frameVaultman.svelte: ~640 → ~480 (≈ -160 LOC).
New: FrameNavbarShell.svelte: 0 → ~170 LOC.

## Commit 4 — `feat(O): extract FrameDashboardShell`

### TDD

New test file `test/component/frame/FrameDashboardShell.test.ts`:

- Mount with nav mock in context, 24 props.
- `dashboardEnabled=true` → renders `Dashboard3Column` with the 3
  snippets.
- `dashboardEnabled=false` → renders nothing.
- Each of the 3 snippets renders its expected content
  (dashboardFilters: filter buttons; dashboardExplorer: per-page
  component; dashboardAddons: AddonsMarkdownPane).
- bind:s from FiltersPage propagate back (smoke test with a
  mock FiltersPage that writes `filtersActiveTab`).
- **DOM byte-equivalence test:** capture pre-C4 baseline DOM for
  dashboardEnabled=true with a representative state; assert post-C4
  matches.

### Implementation

1. Create `src/components/frame/FrameDashboardShell.svelte` per
   shard 06.
2. Refactor `frameVaultman.svelte`:
   - Move the three snippets (`dashboardFilters`, `dashboardExplorer`,
     `dashboardAddons`) **out** of frame and into the shell.
   - Replace the `{#if dashboardEnabled}` branch of the main
     template with `<FrameDashboardShell ... />` mount, passing
     `dashboardEnabled` as a prop.
   - Keep `frameViewportWidth`, `measuredViewportKind`,
     `dashboardViewportKind`, `dashboardEnabled`,
     `bindDashboardMeasurement`, `measureFrameWidth`,
     `inferFrameViewportKind` in frame (per shard 06 decision).
   - The pages-strip `{:else}` branch stays inline in frame.

### Verification

- `pnpm test test/component/frame/FrameDashboardShell.test.ts` green.
- Baseline DOM snapshot for dashboard mode passes.
- `pnpm verify`.
- Live smoke: switch between dashboard and pages-strip viewport
  modes (resize Obsidian window to trigger threshold), verify
  identical behavior in both.

### LOC delta

frameVaultman.svelte: ~480 → ~370 (≈ -110 LOC).
New: FrameDashboardShell.svelte: 0 → ~115 LOC.

## Commit 5 — `refactor(O): frame cleanup`

### Audit

1. Re-read the frame top to bottom. Identify:
   - Functions with no remaining callers → delete.
   - $state declarations with no remaining readers → delete.
   - Imports of types/services no longer referenced → delete.
   - Comments referencing removed code → remove.
2. Confirm the final LOC: `wc -l src/components/frame/frameVaultman.svelte`.
   Target: ≤ ~360 LOC.
3. Audit `src/components/frame/` for any new dead helper (in
   `frameOverlays`, `frameNavReorder`, etc.). Should be none — O
   only adds new files, doesn't delete existing ones.
4. Run `git grep` for moved-and-deleted symbols
   (`openDiffView`, `navigateTo` inside frame namespace,
   `setScope` inside frame, etc.) and confirm no stale references
   in tests or other components.

### Verification

- `pnpm verify` complete (unit + component + lint).
- All baseline DOM snapshots still green.
- Live smoke complete (every navigation path, every popup, T3 hook,
  dev:errors).
- Visual smoke checklist:
  - Navigate ops → filters → statistics → ops.
  - Execute `vaultman:open-diff` command (T3).
  - Open + close each of 4 popups.
  - Toggle dock drawer.
  - Reorder dock pages.
  - Bases import mode entry / exit.
  - Faint mode in pop-out scenarios (window focus binding).
  - `obsidian dev:errors vault=plugin-dev` → `No errors captured.`

### LOC delta

frameVaultman.svelte: ~370 → ~350 (≈ -20 LOC of cleanup).
Final target met.

## Per-commit rollback

Each commit is its own merge unit. If C3 regresses something not
caught by tests:

- Revert C3 only. C1 + C2 stay landed (FrameNavigationService and
  FramePopupsState are healthy).
- Re-investigate, address, re-land C3.

If C1 regresses something deeper:

- Revert C1 (and C2, C3, C4 since they depend on it).
- This is the bigger reversal, but each subsequent commit only
  builds on C1's API surface — the API contract is finalized in
  C1.

## Commit message templates

```text
feat(O): extract FrameNavigationService

- Move activePage / pageOrder / toolsActiveTab / statsPreviewFile /
  filtersBaseChooseMode + navigation methods (navigateTo,
  enterBasesImport, exitBasesImport, openStatsNote, showStatsPage)
  + T3 openDiffIntent + surface derivations + selectSurfaceItem
  into src/components/frame/frameNavigation.svelte.ts.
- Frame now sets FRAME_NAVIGATION_KEY context. Future shells
  consume via getContext.
- T4 toolsActiveTab is now bindable via nav.toolsActiveTab
  getter/setter pair.
- T3 plugin.openDiffViewHook registration is now a 3-line $effect
  registering () => nav.openDiffIntent().
- frameVaultman.svelte: 866 → ~720 LOC.

Tests: test/component/frame/frameNavigationService.test.ts
       (constructor, all methods, side-effect order for T3,
        surface derivations).
Smoke: pages navigation, vaultman:open-diff command, bases-import
       toggle, dev:errors clean.
```

```text
feat(O): extract FramePopupsState

- Move scope / active-filters / search / move popup state +
  mutations into src/components/frame/framePopups.svelte.ts.
- Frame now sets FRAME_POPUPS_KEY context.
- PopupOverlay threading updated to read from popups.X
  (same prop signatures on PopupOverlay; only source changes).
- frameVaultman.svelte: ~720 → ~640 LOC.

Tests: test/component/frame/framePopupsState.test.ts
       (all 4 popup concerns, state mutations, callbacks).
Smoke: scope / active-filters / search / move popups exercised.
```

```text
feat(O): extract FrameNavbarShell

- Move frameIslandAndDock snippet content + top NavbarTabs render
  + island backdrop + PopupIsland + NavbarDock mount into
  src/components/frame/FrameNavbarShell.svelte.
- Shell consumes FRAME_NAVIGATION_KEY via getContext.
- dockDrawerOpen moved to FrameNavReorderController.drawerOpen.
- Single shell mount in frame after the dashboard/pages-strip
  conditional (replaces two {@render frameIslandAndDock()} sites).
- frameVaultman.svelte: ~640 → ~480 LOC.

Tests: test/component/frame/FrameNavbarShell.test.ts
       (renders, dispatches, DOM byte-equivalence vs baseline).
Smoke: dock drawer toggle, page reorder, dock + top-tab navigation.
```

```text
feat(O): extract FrameDashboardShell

- Move dashboardFilters / dashboardExplorer / dashboardAddons
  snippets + Dashboard3Column mount into
  src/components/frame/FrameDashboardShell.svelte.
- Shell consumes FRAME_NAVIGATION_KEY via getContext.
- dashboardEnabled derivation and viewport measurement stay in
  frame (passed to shell as prop) to preserve ResizeObserver
  binding on .vm-view.
- frameVaultman.svelte: ~480 → ~370 LOC.

Tests: test/component/frame/FrameDashboardShell.test.ts
       (renders 3 snippets, byte-equivalent baseline).
Smoke: dashboard mode + pages-strip mode, threshold-cross resize.
```

```text
refactor(O): frame cleanup

- Audit frameVaultman.svelte for orphaned functions / state /
  imports / comments after the 4 extractions; delete.
- Final LOC: ~350 (target met).
- Baseline DOM snapshots green; live smoke clean; dev:errors
  reports No errors captured.

Closes Sub-system O.
```
