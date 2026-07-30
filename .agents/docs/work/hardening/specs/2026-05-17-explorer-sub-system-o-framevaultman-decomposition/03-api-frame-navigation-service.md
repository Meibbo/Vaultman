---
title: FrameNavigationService API contract
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

# `FrameNavigationService` API Contract

## File

`src/components/frame/frameNavigation.svelte.ts`

Exports a Symbol context key and a runes class. No default export.
Naming follows the no-`service` prefix precedent of `frameOverlays.svelte.ts`, `frameNavReorder.svelte.ts`, and `frameViewport.ts`.

## Symbol context key

```ts
export const FRAME_NAVIGATION_KEY: unique symbol = Symbol('frame.navigation');
```

Consumers always import the key from the same module that exports the class so the type and key stay co-located.

## Constructor signature

```ts
export class FrameNavigationService {
  constructor(plugin: VaultmanPlugin, overlays: FrameOverlayController);
}
```

- `plugin` — the `VaultmanPlugin` instance. Used for `plugin.settings.pageOrder`, `plugin.settings.explorerOperationScope`, `plugin.saveSettings()`, `plugin.app` (file-suggest modal).
- `overlays` — existing `FrameOverlayController`. The service calls `overlays.closeQueueIsland()`, `closeFiltersIsland()`, `closePopup()`, and reads `overlays.popupOpen` / `overlays.activePopup`.

**Late-bound dependencies:**

```ts
attachViewport(viewport: FrameViewportController): void;
attachNavReorder(navReorder: FrameNavReorderController): void;
```

`viewport` and `navReorder` cannot be constructor-injected because they need `() => nav.pageIndex` and `() => nav.pageOrder` getters respectively (circular instantiation). Frame calls `attachViewport` / `attachNavReorder` immediately after their construction, before `setContext`.

## Public reactive state

All public state is exposed via getters over private `$state` fields. Where bindable, a matching setter exists.

```ts
// Page navigation
get activePage(): string;
get pageOrder(): readonly string[];
setPageOrder(order: readonly string[]): void;  // called by navReorder
get pageIndex(): number;                        // $derived from pageOrder.indexOf(activePage)
get pageRenderKey(): number;                    // increments on each reorder
bumpRenderKey(): void;                          // called by navReorder

// T4 — bindable to OperationsPage.activeTab
get toolsActiveTab(): string;
set toolsActiveTab(v: string);

// Stats preview
get statsPreviewFile(): TFile | null;

// Bases import mode
get filtersBaseChooseMode(): boolean;

// Filters tab (bindable to FiltersPage.filtersActiveTab)
get filtersActiveTab(): FiltersTab;
set filtersActiveTab(v: FiltersTab);

// Late-bound dep accessors
get viewport(): FrameViewportController;        // throws if not attached
get navReorder(): FrameNavReorderController;    // throws if not attached
```

## Public surface derivations

These are `$derived` values, exposed as getters. They consume `plugin.settings.layout` via `resolveLayoutSettings()` and the detached-tabs state via `plugin.leafDetachService`.

```ts
get layoutSettings(): LayoutSettings;            // resolveLayoutSettings(plugin.settings.layout)
get filterTabsExternallyMounted(): boolean;
get framePageTabs(): SurfaceNavItem[];
get filterTabItems(): SurfaceNavItem[];

get topTabItems(): SurfaceNavItem[];             // itemsForSurface(layoutSettings.tabs.content)
get topTabActive(): string;                      // activeForSurface(layoutSettings.tabs.content)
get topExternalTabIds(): string[];

get dockItems(): SurfaceNavItem[];               // itemsForSurface(layoutSettings.dock.content)
get dockActive(): string;
get dockExternalTabIds(): string[];
get dockUsesFramePages(): boolean;               // layoutSettings.dock.content === 'frame-pages'

get detachedTabs(): LeafDetachState;             // proxies plugin.leafDetachService state
```

Helper functions used internally by the derivations (private to the class):

```ts
#itemsForSurface(content: LayoutSurfaceContent): SurfaceNavItem[];
#activeForSurface(content: LayoutSurfaceContent): string;
#externalIdsForSurface(content: LayoutSurfaceContent): string[];
#detachedTabIdForSurfaceItem(content: LayoutSurfaceContent, id: string): TabId | null;
#tabIdForSurfaceItem(content: LayoutSurfaceContent, id: string): TabId | null;
```

Surface-item construction also requires `selectedCount` for the "stats has selection dot" derivation. Two options:

1. **Inject as a getter** — `constructor(plugin, overlays, getSelectedCount: () => number)`.
2. **Accept on the call site** — pass `selectedCount` as a parameter to `dockItems`/`topTabItems` getters or to `itemsForSurface`.

**Decision:** option 1 (constructor injection of `getSelectedCount`).
Cleaner — the derivations stay self-contained and reactivity flows correctly because Svelte 5 tracks the getter call.

```ts
constructor(
  plugin: VaultmanPlugin,
  overlays: FrameOverlayController,
  getSelectedCount: () => number,
);
```

## Public intent methods

T3 and T4 intents plus navigation primitives. All methods return `void` unless specified.

```ts
// Primary navigation
navigateTo(page: string): void;
//   - closes queue/filters islands if page changes
//   - clears filtersBaseChooseMode if leaving filters
//   - sets activePage
//   - calls viewport.applyPageTransform(true)

// T3 — diff hook implementation
openDiffIntent(): void;
//   1. overlays.closeQueueIsland()
//   2. overlays.closeFiltersIsland()
//   3. if (overlays.popupOpen) overlays.closePopup()
//   4. this.#activePage = 'ops'
//   5. this.#toolsActiveTab = 'file_diff'
//   6. viewport.applyPageTransform(true)
// Order is asserted bit-for-bit by frameNavigationService.test.ts.

// Bases import
enterBasesImport(): void;
//   - filtersBaseChooseMode = true
//   - filtersActiveTab = 'files'
//   - if (activePage !== 'filters') activePage = 'filters'
//   - viewport.applyPageTransform(true)

exitBasesImport(): void;
//   - filtersBaseChooseMode = false

// Stats
openStatsNote(): void;
//   - opens openVaultmanFileSuggestModal(plugin.app, file => { ... })
//   - on selection: statsPreviewFile = file; activePage = 'statistics';
//     viewport.applyPageTransform(true)

showStatsPage(): void;
//   - statsPreviewFile = null

// Surface item selection (delegated from dock/tabs onSelect)
selectSurfaceItem(content: LayoutSurfaceContent, id: string): void;
//   - if detachedTabIdForSurfaceItem returns an id: void plugin.spawnTabLeaf(id); return
//   - if content === 'filter-tabs': filtersActiveTab = id; if (activePage !== 'filters') navigateTo('filters')
//   - if content === 'frame-pages': navigateTo(id)
```

## Reactive `$effect` for filters search routing

The big switch that routes `filtersSearchByTab[filtersActiveTab]` to the right provider lives **inside the service**, not in frame. The service exposes its filter-search state as `filtersSearchByTab` and declares an internal effect that dispatches `setSearchTerm` / `setSearchFilter` / `setQuery` to `propExplorer` / `tagsExplorer` / `fileList` / `plugin.contentIndex` based on tab + category.

Because these consumers (`propExplorer`, `tagsExplorer`, `fileList`) are bound from `FiltersPage` and live as $state on **the frame** (they're `$state<explorerFiles | undefined>` etc., set via `bind:` from FiltersPage), the service needs accessors:

```ts
// Constructor adds optional accessors for the explorer instances
constructor(
  plugin: VaultmanPlugin,
  overlays: FrameOverlayController,
  getSelectedCount: () => number,
  getFileList: () => explorerFiles | undefined,
  getPropExplorer: () => explorerProps | undefined,
  getTagsExplorer: () => explorerTags | undefined,
);
```

The internal `$effect` reads these via the getters. Reactivity:
Svelte 5 tracks calls into `getFileList()` etc., so when frame's `fileList` $state changes (bind from FiltersPage), the effect re-fires.

**Alternative:** keep the filters-search routing $effect in **frame** (where the explorer instances live) and don't move it to the service. This is simpler and avoids passing 3 getters into the constructor. Decision deferred to implementation; both shapes satisfy the spec. The plan-time decision should weigh keeping the service constructor minimal vs colocating effect with state.

**Recommendation:** keep the filters-search routing $effect inline in frame. It crosses too many bind-down values (`fileList`/`propExplorer`/`tagsExplorer`/`plugin.contentIndex`) to be cleanly extracted without restructuring FiltersPage — violates the no-downstream-changes rule.

## Construction order in frame

```ts
// 1. overlays first (it's a dep of nav)
const overlays = new FrameOverlayController(
  plugin, ExplorerQueueComp, ExplorerActiveFiltersComp,
  { onImportBases: () => nav.enterBasesImport() }, // forward ref OK; called later
);

// 2. nav with getters that close over not-yet-declared frame state
const nav = new FrameNavigationService(
  plugin, overlays,
  () => selectedCount,
  () => fileList,
  () => propExplorer,
  () => tagsExplorer,
);

// 3. viewport (needs nav.pageIndex)
const viewport = new FrameViewportController(() => nav.pageIndex);
nav.attachViewport(viewport);

// 4. navReorder (needs nav.pageOrder)
const navReorder = new FrameNavReorderController({
  getPageOrder: () => nav.pageOrder,
  setPageOrder: (order) => nav.setPageOrder(order),
  incrementRenderKey: () => nav.bumpRenderKey(),
  saveOrder: (order) => {
    plugin.settings.pageOrder = order;
    void plugin.saveSettings();
  },
});
nav.attachNavReorder(navReorder);

// 5. setContext
setContext(FRAME_NAVIGATION_KEY, nav);
```

The forward reference in `overlays`' `onImportBases` closure is safe because the closure is called only after `nav` is instantiated (when the user clicks the bases-import action), well after the frame's script body executes.

## Removed from frame

Items moved into `FrameNavigationService` or its derivations, deleted from `frameVaultman.svelte` after Commit 1:

- `let pageOrder = $state(...)` declaration
- `let pageRenderKey = $state(0)`
- `let filtersBaseChooseMode = $state(false)`
- `let statsPreviewFile = $state<TFile | null>(null)`
- `let activePage = $state<string>(...)`
- `let toolsActiveTab = $state('layout')`
- `let pageIndex = $derived(...)`
- `let filtersActiveTab = $state<FiltersTab>('props')`
- `initFrameState()` and `initialFrameState` (folded into constructor)
- `navigateTo` function
- `enterBasesImportMode` / `exitBasesImportMode` functions
- `openStatsNote` / `showStatsPage` functions
- `openDiffView` function and its registration `$effect`
- `itemsForSurface` / `activeForSurface` / `externalIdsForSurface` / `detachedTabIdForSurfaceItem` / `tabIdForSurfaceItem` / `selectSurfaceItem`
- `framePageTabs` / `filterTabItems` / `topTabItems` / `topTabActive` / `topExternalTabIds` / `dockItems` / `dockActive` / `dockExternalTabIds` / `dockUsesFramePages` / `filterTabsExternallyMounted` derivations
- `layoutSettings` derivation (now `nav.layoutSettings`)
- `pageFabs` / `leftFab` / `rightFab` derivations move into nav as `nav.pageFabs` / `nav.leftFab` / `nav.rightFab` (they depend on activePage which is now on nav)
- Two `$effect`s tied to navigation: `pageIndex → viewport.applyPageTransform` and `pageOrder validity check`; both move inside the service.

## What stays in frame

- `let detachedTabs` (subscribed in onMount; bound through to nav via `getDetachedTabs` getter passed into constructor — but actually `plugin.leafDetachService` is on the plugin so nav can read it directly; the `detachedTabs` frame state is redundant once nav proxies `plugin.leafDetachService.getState()`).
- `selectedCount` / `queuedCount` / `filterRuleCount` / `addOpCount`
  + `updateStats()` + `renderAddonsStats()` (stats counters — see motivation in index for why they don't move).
- `let searchName` / `let searchFolder` (moved to FramePopupsState in Commit 2, not C1).
- All popup state (moves in C2).
- Window focus binding (`onWindowFocus`, `onWindowBlur`, second `onMount`).
- `elasticRootClasses` derivation.
- The filters search routing `$effect` (per recommendation above).
- The active-filters popup refresh `$effect` (3-line proxy to `popups.refreshActiveFiltersPopup` after Commit 2).
- The `bindDashboardMeasurement` action and viewport derivations (move to `FrameDashboardShell` in Commit 4).
- The `icon` action (frame-local helper).
- Lifecycle `onMount` #1 (subscriptions to filter/queue/leafDetach/ metadataCache — these touch many cross-cutting concerns and are the frame's lifecycle responsibility).
