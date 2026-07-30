---
title: Architecture
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

# Architecture

## Module layout post-O

```text
src/components/frame/
├── frameVaultman.svelte             (~350 LOC; top-level orchestration only)
│
├── frameNavigation.svelte.ts        (~150 LOC; new in O)
│   ├── FRAME_NAVIGATION_KEY = Symbol('frame.navigation')
│   └── class FrameNavigationService { ... }
│
├── framePopups.svelte.ts            (~120 LOC; new in O)
│   ├── FRAME_POPUPS_KEY = Symbol('frame.popups')
│   └── class FramePopupsState { ... }
│
├── FrameNavbarShell.svelte          (~170 LOC; new in O)
│   └── consumes FRAME_NAVIGATION_KEY via getContext
│
├── FrameDashboardShell.svelte       (~115 LOC; new in O)
│   └── consumes FRAME_NAVIGATION_KEY via getContext
│
├── frameViewport.ts                 (~50 LOC; unchanged)
├── frameNavReorder.svelte.ts        (~129 LOC; unchanged)
├── frameOverlays.svelte.ts          (~141 LOC; unchanged)
├── framePages.ts                    (~117 LOC; unchanged)
├── frameMoves.ts                    (~34 LOC; unchanged)
├── frameActiveFilters.ts            (~71 LOC; unchanged)
├── frameFiltersSearch.ts            (~81 LOC; unchanged)
├── frameSearchSources.ts            (~43 LOC; unchanged)
└── DetachedTabHost.svelte           (~115 LOC; unchanged)
```

## State-crossing principle — Context API with Symbol keys

O introduces `setContext` / `getContext` as a new pattern in `src/components/`. Each runes service exports its Symbol key alongside the class. Frame instantiates the service and calls `setContext`.
Shells call `getContext` at script-top.

### Why context (Option C+ from the brainstorm)

The frame's component tree will grow. Future sub-systems anticipate:

- **Theme Builder** (backlog #10) — mutates presets that the navigation service derives from.
- **Big Picture mode** — a new dashboard layout sibling that consumes the same navigation state as the standard shell.
- **Stacked tabs** (top + bottom navbars simultaneously) — two `FrameNavbarShell` instances must auto-sync on `activeTab` and `dockItems`. With context, both consume the same instance automatically. With props, the instance has to be re-threaded.
- **Cross-frame DOM-drag compatibility with Obsidian tabs** — multiple consumers of the navigation state (drop indicators, tab content host, dock).

A flat props pattern (the original Option A) is simpler today (4 shells, plain tree) but pays plumbing tax for each new consumer. Context pays the "new pattern" cost once in O and amortizes across every future frame sub-system.

### Why Symbol keys instead of string keys

```ts
// frameNavigation.svelte.ts
export const FRAME_NAVIGATION_KEY = Symbol('frame.navigation');
```

Symbol keys:

- Cannot collide accidentally with another module's string key.
- Carry their typed declaration alongside the class — discovery is "look at the file that exports the key."
- Pair with the generic `setContext<T>(key, value)` / `getContext<T>(key)` for type-safe access (Svelte 5 supports this; consumers must explicitly type the generic).

### Frame-level instantiation + registration

```svelte
<!-- frameVaultman.svelte -->
<script lang="ts">
  import { setContext, onMount } from 'svelte';
  import { FrameViewportController } from './frameViewport';
  import { FrameNavReorderController } from './frameNavReorder.svelte';
  import { FrameOverlayController, installFrameOverlayCommandHooks }
    from './frameOverlays.svelte';
  import { FrameNavigationService, FRAME_NAVIGATION_KEY }
    from './frameNavigation.svelte';
  import { FramePopupsState, FRAME_POPUPS_KEY }
    from './framePopups.svelte';

  // Existing controllers (unchanged construction)
  const overlays = new FrameOverlayController(
    plugin,
    ExplorerQueueComp,
    ExplorerActiveFiltersComp,
    { onImportBases: () => nav.enterBasesImport() },
  );
  // viewport requires a getter for pageIndex; pass () => nav.pageIndex
  // (constructed after nav). Order: nav first, then viewport, then
  // navReorder.

  // New services
  const nav = new FrameNavigationService(plugin, overlays);
  const viewport = new FrameViewportController(() => nav.pageIndex);
  nav.attachViewport(viewport); // late-binding for nav.viewport getter

  const navReorder = new FrameNavReorderController({
    getPageOrder: () => nav.pageOrder,
    setPageOrder: (order) => nav.setPageOrder(order),
    incrementRenderKey: () => nav.bumpRenderKey(),
    saveOrder: (order) => { plugin.settings.pageOrder = order; void plugin.saveSettings(); },
  });
  nav.attachNavReorder(navReorder);

  const popups = new FramePopupsState(plugin, overlays);

  setContext(FRAME_NAVIGATION_KEY, nav);
  setContext(FRAME_POPUPS_KEY, popups);

  // T3 hook registration — $effect that captures the closure for
  // identity-based cleanup so we never stomp a later registration.
  $effect(() => {
    const hook = () => nav.openDiffIntent();
    plugin.openDiffViewHook = hook;
    return () => {
      if (plugin.openDiffViewHook === hook) {
        plugin.openDiffViewHook = null;
      }
    };
  });
</script>
```

The construction order is **navigation → viewport → navReorder → popups** because `viewport` needs `nav.pageIndex` as a getter and `navReorder` needs `nav.pageOrder` accessors. `nav.attachViewport()` and `nav.attachNavReorder()` are late-binding setters that wire the references back into the service so `nav.viewport` and `nav.navReorder` are available.

### Shell-level consumption

```svelte
<!-- FrameNavbarShell.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  import { FRAME_NAVIGATION_KEY, type FrameNavigationService }
    from './frameNavigation.svelte';

  const nav = getContext<FrameNavigationService>(FRAME_NAVIGATION_KEY);

  let {
    filterRuleCount, queuedCount,
    layoutSettings, leftFab, rightFab,
    overlays,
  } = $props();
</script>

<NavbarDock
  items={nav.dockItems}
  active={nav.dockActive}
  externalTabIds={nav.dockExternalTabIds}
  ...
/>
```

Shells access `nav.X` and `popups.X` directly in templates and script bodies. Reactivity flows through the runes-backed getters exposed by the service classes.

## T3 + T4 routing

### T3 — `plugin.openDiffViewHook`

```text
External caller                          Frame                              Service
────────────────                         ─────                              ───────
plugin.openDiffViewHook()      ──────▶   $effect-registered closure  ─────▶ nav.openDiffIntent()
                                                                              ├─ overlays.closeQueueIsland()
                                                                              ├─ overlays.closeFiltersIsland()
                                                                              ├─ if (overlays.popupOpen) overlays.closePopup()
                                                                              ├─ this.#activePage = 'ops'
                                                                              ├─ this.#toolsActiveTab = 'file_diff'
                                                                              └─ viewport.applyPageTransform(true)
```

Behavior is bit-for-bit equivalent to today's inline `openDiffView()`. The only structural change is the home of the function (service method) and the registration site (single 3-line `$effect` in frame instead of inline function + registration `$effect`).

When the future in-editor diff renderer sub-system ships, it replaces the slot with its own implementation:

```ts
// future: in-editor diff sub-system
plugin.openDiffViewHook = () => openInEditorDiffPreview(currentFile);
// nav.openDiffIntent() becomes orphaned or a fallback
```

O does not anticipate this — the slot pattern is already the abstraction.

### T4 — `OperationsPage` `bind:activeTab`

```svelte
<!-- frameVaultman.svelte (both render sites: pages-strip + dashboard) -->
<OperationsPage {plugin} {icon} bind:activeTab={nav.toolsActiveTab} />
```

`nav.toolsActiveTab` is exposed as both a getter and a setter on `FrameNavigationService` so Svelte 5's `bind:` directive treats it as a writable reactive expression. If a project-level constraint prevents `bind:` from binding to a class getter/setter pair (verified in Commit 1; see risks shard), the fallback is the explicit prop + callback pair:

```svelte
<OperationsPage
  {plugin} {icon}
  activeTab={nav.toolsActiveTab}
  onActiveTabChange={(v) => (nav.toolsActiveTab = v)}
/>
```

The fallback requires no change to `OperationsPage` (it already accepts both `activeTab` prop and `onActiveTabChange` callback in Svelte 5 bind: desugar).

## Render tree post-O

```text
frameVaultman.svelte
└── <div class="vm-view {elasticRootClasses}"
         use:navReorder.bindViewRoot
         use:bindDashboardMeasurement>  [stays in frame, ~5 LOC]
    │
    ├── (conditional) <NavbarTabs ... />     [stays in frame top-level when topTabItems.length > 0]
    │   note: NavbarTabs rendering decision could move into FrameNavbarShell;
    │   trade-off discussed in shard 05.
    │
    ├── <FrameDashboardShell ... />          [if dashboardEnabled]
    │   └── <Dashboard3Column ... />
    │       ├── {#snippet dashboardFilters}
    │       ├── {#snippet dashboardExplorer}
    │       │   └── <OperationsPage bind:activeTab={nav.toolsActiveTab}> [T4 site #1]
    │       └── {#snippet dashboardAddons}
    │
    ├── (else) <div class="vm-pages-viewport">  [stays in frame]
    │   └── {#each pageOrder as pageId}
    │       └── (per page) <OperationsPage bind:activeTab={nav.toolsActiveTab}> [T4 site #2]
    │                       or <StatisticsPage> or <FiltersPage>
    │
    └── <FrameNavbarShell ... />              [unconditional, all viewport modes]
        ├── <div class="vm-island-backdrop vm-glass" ...>
        ├── <PopupIsland overlayState={plugin.overlayState}>
        └── <NavbarDock ... />

<PopupOverlay {plugin} ...popupsBoundFromPopupsService />  [sibling of vm-view, stays in frame]
```

## Net diff summary

| Concern | Before | After |
|---|---|---|
| `frameVaultman.svelte` LOC | 866 | ~350 |
| New service files | 0 | 2 (`frameNavigation.svelte.ts`, `framePopups.svelte.ts`) |
| New shell components | 0 | 2 (`FrameNavbarShell.svelte`, `FrameDashboardShell.svelte`) |
| Context API usage in `src/` | 0 | 2 (`FRAME_NAVIGATION_KEY`, `FRAME_POPUPS_KEY`) |
| `themeService.rootClasses` consumer site | frameVaultman | frameVaultman (unchanged) |
| `plugin.openDiffViewHook` consumer | inline `openDiffView` in frame | `() => nav.openDiffIntent()` registered from frame |
| T4 `toolsActiveTab` owner | frame `$state` | `nav.toolsActiveTab` (getter/setter) |
| Stats counters | frame `$state` | frame `$state` (unchanged) |
| Window focus listeners | frame `onMount` | frame `onMount` (unchanged) |

## Design constraints applied per Ousterhout

The post-0-H architecture handoff prescribes "deep modules with small interfaces." O honors this:

- **`FrameNavigationService`** is a deep module: rich internal state (5+ `$state`, 8+ derived getters, 7+ intent methods, 6+ surface derivations) behind a small interface (~25 public members). External consumers (shells, frame, OperationsPage via bind:) interact with it through that small surface.
- **`FramePopupsState`** is a deep module: 4 popup concerns internally; ~14 public members.
- **`FrameNavbarShell`** is a deep component: NavbarDock + NavbarTabs + island backdrop + PopupIsland behind a ~7-prop interface (filterRuleCount, queuedCount, layoutSettings, leftFab, rightFab, overlays, navReorder).
- **`FrameDashboardShell`** is a deep component: viewport measurement + Dashboard3Column + 3 snippets behind a ~20-prop interface (because filters page state has 12 fields to thread).

No module crosses 200 LOC as a single-concern file. If any exceeds 200 LOC during implementation, audit for further extraction.
