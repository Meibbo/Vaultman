---
title: FrameDashboardShell API contract
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

# `FrameDashboardShell` API Contract

## File

`src/components/frame/FrameDashboardShell.svelte`

Shell component that wraps `Dashboard3Column` and owns the three dashboard snippets (filters, explorer, addons) + dashboard viewport measurement. Conditional on `dashboardEnabled` — when disabled, the shell renders nothing (frame chooses to render the pages-strip branch instead).

## Context consumption

```ts
import { getContext } from 'svelte';
import { FRAME_NAVIGATION_KEY, type FrameNavigationService }
  from './frameNavigation.svelte';

const nav = getContext<FrameNavigationService>(FRAME_NAVIGATION_KEY);
```

## Props

The dashboard shell has a larger prop signature than the navbar shell because the dashboardExplorer snippet renders OperationsPage / StatisticsPage / FiltersPage with their full bind: surfaces.
Most of these props are pass-through to FiltersPage and cannot move into `nav` because `FiltersPage` writes back (via `bind:`).

```ts
let {
  plugin,
  icon,                     // Svelte action wrapping setIcon

  // Filters page state hub (12 bound state pieces)
  filtersActiveTab,
  filtersSearchByTab,
  filtersSearchCategory,
  filtersFnRState,
  filtersOperationScope,
  tagsExplorer,
  propExplorer,
  fileList,
  selectedCount,
  selectedFilePaths,
  filtersSortBy,
  filtersSortDir,
  filtersSortTarget,
  filtersViewMode,
  addMode,
  addOpCount,

  // Filters tab list (rendered as the dashboardFilters snippet button strip)
  filterTabItems,

  // Detached tabs state (passed to OperationsPage detachment check)
  detachedTabs,

  // Addons
  addonsIslandService,
  addonsQuickSwitcherApp,
  renderAddonsStats,         // () => string

  // Callbacks (frame-owned mutations)
  onShowStats,               // () => void; called when stats note close
  onOperationScopeChange,    // (value: OperationScope) => void
}: {
  plugin: VaultmanPlugin;
  icon: (el: HTMLElement, name: string) => { update(n: string): void };
  filtersActiveTab: FiltersTab;
  filtersSearchByTab: FiltersSearchState;
  filtersSearchCategory: Record<FiltersTab, number>;
  filtersFnRState: FnRState;
  filtersOperationScope: OperationScope;
  tagsExplorer: explorerTags | undefined;
  propExplorer: explorerProps | undefined;
  fileList: explorerFiles | undefined;
  selectedCount: number;
  selectedFilePaths: Set<string>;
  filtersSortBy: string;
  filtersSortDir: 'asc' | 'desc';
  filtersSortTarget: ExplorerSortTarget;
  filtersViewMode: unknown;
  addMode: boolean;
  addOpCount: number;
  filterTabItems: SurfaceNavItem[];
  detachedTabs: LeafDetachState;
  addonsIslandService: AddonsIslandService;
  addonsQuickSwitcherApp: AddonsQuickSwitcherApp;
  renderAddonsStats: () => string;
  onShowStats: () => void;
  onOperationScopeChange: (value: OperationScope) => void;
} = $props();
```

**Total: 23 props.** This is large but unavoidable — every prop threads through to FiltersPage (16) or OperationsPage (1) or StatisticsPage (2) or one of the dashboardFilters / dashboardAddons snippets (4). Reducing this list would require modifying FiltersPage's prop surface (out of scope).

The 12 filtersX state pieces are bindable in both directions (`bind:filtersX={filtersX}` in the shell, propagating to frame).

## Internal state

Owned by the shell, not exposed to frame:

```ts
let frameViewportWidth = $state(0);
let measuredViewportKind = $state<LayoutViewportKind>('main-leaf');
```

Plus the derived value:

```ts
const dashboardEnabled = $derived(
  resolveDashboardEnabled({
    width: frameViewportWidth,
    kind: forcedViewportKind ?? measuredViewportKind,
    mode: plugin.themeService.mode,
  }),
);
```

**Decision:** does `dashboardEnabled` move to the shell or stay in frame? The shell renders nothing when `dashboardEnabled` is false, so the shell itself can compute it internally. But the frame needs to know `dashboardEnabled` to choose between rendering the shell or the pages-strip branch.

**Resolution:** the shell renders **always** but its template is conditional internally:

```svelte
{#if dashboardEnabled}
  <div class="vm-pages-viewport vm-dashboard-viewport">
    <Dashboard3Column ... />
  </div>
{/if}
```

But that means the shell is mounted permanently and its `bindDashboardMeasurement` ResizeObserver runs always — which is what happens today (frame's `use:bindDashboardMeasurement` is on `.vm-view`, the outer container). The shell is `<div class="vm-view ...">` itself? No — `vm-view` stays in frame as the outer container of both branches. The shell binds ResizeObserver to its own outer wrapper.

**Final shape:** shell renders a wrapper div with `use:bindDashboardMeasurement` regardless of `dashboardEnabled`, inside which the Dashboard3Column conditionally renders:

```svelte
<div class="vm-dashboard-shell" use:bindDashboardMeasurement>
  {#if dashboardEnabled}
    <div class="vm-pages-viewport vm-dashboard-viewport">
      <Dashboard3Column
        themeService={plugin.themeService}
        enabled={dashboardEnabled}
        filters={dashboardFilters}
        explorer={dashboardExplorer}
        addons={dashboardAddons}
      />
    </div>
  {:else}
    <!-- Frame renders the pages-strip branch as a sibling of this shell -->
    <!-- (shell collapses to nothing visible in non-dashboard mode) -->
  {/if}
</div>
```

**Problem with this shape:** the shell wrapper div always renders, which adds a wrapper element to the DOM in non-dashboard mode and breaks visual parity.

**Better shape:** the shell **only mounts when dashboardEnabled is likely true**, and the dashboardEnabled derivation moves to frame. But then the shell's internal `frameViewportWidth` / `measuredViewportKind` measurement is lost on unmount.

**Best shape:** the ResizeObserver binding stays in **frame** (measures `.vm-view`, same as today). Frame owns `frameViewportWidth` / `measuredViewportKind` / `dashboardEnabled`. Shell takes `dashboardEnabled` as a prop and renders nothing if false.
`bindDashboardMeasurement` stays in frame.

**Recommendation:** the last shape — `bindDashboardMeasurement` and its three state declarations stay in **frame**, NOT in the shell.
The shell receives `dashboardEnabled` as a 24th prop:

```ts
// In FrameDashboardShell props
dashboardEnabled: boolean;
```

This means `FrameDashboardShell` is **strictly a render concern**:
given the inputs, render the dashboard 3-column or render nothing.
The ResizeObserver and viewport-kind detection stay in frame.

**Revised prop count:** 24 props on the shell.

**Trade-off:** the shell becomes "just a snippet host" without the measurement responsibility. The dashboardEnabled derivation stays in frame. This is **less ambitious** than the original brainstorm recommendation but **safer for visual parity** (ResizeObserver binding does not change wrapper).

## Render tree

```svelte
<script lang="ts">
  // imports + getContext + $props as above
</script>

{#snippet dashboardFilters()}
  <nav class="vm-dashboard-filter-list" aria-label={translate('nav.filters')}>
    {#each filterTabItems as tab (tab.id)}
      <button
        type="button"
        class="vm-dashboard-filter-button"
        class:is-active={filtersActiveTab === tab.id}
        class:is-faint={tab.faint}
        disabled={tab.disabled}
        onclick={() => nav.selectSurfaceItem('filter-tabs', tab.id)}
      >
        <span class="vm-dashboard-filter-icon" use:icon={tab.icon}></span>
        <span>{tab.label}</span>
      </button>
    {/each}
  </nav>
{/snippet}

{#snippet dashboardExplorer()}
  <div class="vm-page vm-dashboard-active-page" data-page={nav.activePage}>
    {#key nav.pageRenderKey}
      {#if nav.activePage === 'ops'}
        {#if detachedTabs['page-tools'] === true}
          <div class="vm-page-external" data-vm-tab-id="page-tools">Detached to workspace</div>
        {:else}
          <OperationsPage {plugin} {icon} bind:activeTab={nav.toolsActiveTab} />
        {/if}
      {:else if nav.activePage === 'statistics'}
        <StatisticsPage {plugin} previewFile={nav.statsPreviewFile} onShowStats={onShowStats} />
      {:else if nav.activePage === 'filters'}
        <FiltersPage
          {plugin}
          bind:filtersActiveTab
          bind:filtersSearchByTab
          bind:filtersSearchCategory
          bind:filtersFnRState
          bind:filtersOperationScope
          {onOperationScopeChange}
          bind:tagsExplorer
          bind:propExplorer
          bind:fileList
          bind:selectedCount
          bind:selectedFilePaths
          bind:filtersSortBy
          bind:filtersSortDir
          bind:filtersSortTarget
          bind:filtersViewMode
          bind:filtersBaseChooseMode={nav.filtersBaseChooseMode}
          bind:addMode
          showTabs={false}
          {addOpCount}
        />
      {/if}
    {/key}
  </div>
{/snippet}

{#snippet dashboardAddons()}
  <AddonsMarkdownPane
    service={addonsIslandService}
    statsRenderer={renderAddonsStats}
    app={addonsQuickSwitcherApp}
  />
{/snippet}

{#if dashboardEnabled}
  <div class="vm-pages-viewport vm-dashboard-viewport">
    <Dashboard3Column
      themeService={plugin.themeService}
      enabled={dashboardEnabled}
      filters={dashboardFilters}
      explorer={dashboardExplorer}
      addons={dashboardAddons}
    />
  </div>
{/if}
```

`nav.activePage`, `nav.pageRenderKey`, `nav.statsPreviewFile`, `nav.toolsActiveTab`, `nav.filtersBaseChooseMode` come from context. Everything else is passed as a prop.

## Removed from frame after Commit 4

- The three snippets (`dashboardFilters`, `dashboardExplorer`, `dashboardAddons`) — moved entirely into the shell.
- The dashboard branch of the main template (the `{#if dashboardEnabled}` block containing `Dashboard3Column`) — replaced with `<FrameDashboardShell ... />` mount.

## What stays in frame

- `let frameViewportWidth = $state(0)`
- `let measuredViewportKind = $state<LayoutViewportKind>('main-leaf')`
- `const dashboardViewportKind = $derived(forcedViewportKind ?? measuredViewportKind)`
- `const dashboardEnabled = $derived(resolveDashboardEnabled(...))`
- `bindDashboardMeasurement` function (with `measureFrameWidth` and `inferFrameViewportKind` helpers)
- `use:bindDashboardMeasurement` action on the `.vm-view` outer div
- The pages-strip `{:else}` branch — stays inline in frame because it shares `viewport.bindViewport` with the rest of the layout and renders the same OperationsPage / StatisticsPage / FiltersPage components with the same `bind:` surfaces as the dashboard branch. Extracting it would duplicate the snippets at no gain.

## Why the pages-strip branch stays inline

The non-dashboard branch (`<div class="vm-pages-viewport" use:viewport.bindViewport>`) iterates `pageOrder` and renders the same per-page component selection (OperationsPage / StatisticsPage / FiltersPage). Extracting it to a `FramePagesShell.svelte` would:

- Duplicate the prop surface of `FrameDashboardShell` (same 23 props).
- Add a new component file with little behavioral distinction — the only difference from the dashboard shell is the wrapper (`vm-pages-viewport` with `use:viewport.bindViewport` and `use:viewport.bindContainer` + the `vm-page-container` slide strip) vs the dashboard's `Dashboard3Column`.
- Provide no future preset insertion point — no preset field governs the pages-strip layout (presets affect dashboard vs pages choice, but not pages-strip internals).

**Decision:** the pages-strip branch is the **frame's residual render**, not a shell extraction. Pre-extraction lines 789-839 of `frameVaultman.svelte` stay essentially as-is, with the inline `<OperationsPage bind:activeTab={toolsActiveTab}>` reading from `nav.toolsActiveTab` instead and similar nav-sourced substitutions.
