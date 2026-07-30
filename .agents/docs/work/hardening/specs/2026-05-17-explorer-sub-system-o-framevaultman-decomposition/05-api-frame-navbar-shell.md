---
title: FrameNavbarShell API contract
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

# `FrameNavbarShell` API Contract

## File

`src/components/frame/FrameNavbarShell.svelte`

Shell component that wraps `NavbarTabs` (conditional, top) + island backdrop + `PopupIsland` + `NavbarDock` (unconditional, bottom). Responsible for rendering the navigation surfaces of the frame; not responsible for any state ownership.

## Context consumption

```ts
import { getContext } from 'svelte';
import { FRAME_NAVIGATION_KEY, type FrameNavigationService }
  from './frameNavigation.svelte';

const nav = getContext<FrameNavigationService>(FRAME_NAVIGATION_KEY);
```

Throws (via Svelte's getContext) if the key was not setContext-ed by an ancestor. In practice this is a programmer error: the only expected mount path is from `frameVaultman.svelte` which always calls `setContext(FRAME_NAVIGATION_KEY, nav)` early in its script body.

## Props

```ts
let {
  // Plugin reference (used for islandDismissOnOutsideClick,
  // overlayState, mouseGestures.fab settings)
  plugin,

  // Cross-shell counters (NOT in nav — bound from FiltersPage)
  filterRuleCount,
  queuedCount,

  // Layout (passed from frame because layoutSettings is a derivation
  // shared with frame's other render-time branches; threading vs
  // re-deriving in shell is a wash — pass for clarity)
  layoutSettings,

  // FAB resolution (computed in nav via nav.leftFab / nav.rightFab,
  // but pass as props for cleaner shell signature)
  leftFab,
  rightFab,

  // Overlays controller (used for island backdrop class + click handlers)
  overlays,
}: {
  plugin: VaultmanPlugin;
  filterRuleCount: number;
  queuedCount: number;
  layoutSettings: LayoutSettings;
  leftFab: FabDef | null;
  rightFab: FabDef | null;
  overlays: FrameOverlayController;
} = $props();
```

**Total: 7 props.** Compact relative to today's inline 25+ inline derivations because most navigation state flows through the context-shared `nav` service. Each prop is a genuinely distinct concern:

- `plugin` is exposed for settings reads (`islandDismissOnOutsideClick`, `mouseGestures.fab`) + `overlayState`. Could be folded into `nav.plugin` but doing so muddies the navigation service's role.
- `filterRuleCount` / `queuedCount` are cross-shell counters bound from FiltersPage, kept inline in frame per shard 03 rationale.
- `layoutSettings` / `leftFab` / `rightFab` are derived in `nav` but passed as props for explicit signature clarity (and to insulate the shell from changes to `nav`'s internal derivation names).
- `overlays` is passed because the shell's island backdrop binds to `overlays.isIslandOpen` and click handlers call `overlays.closeQueueIsland()` / `overlays.closeFiltersIsland()`.

## Render tree

```svelte
<script lang="ts">
  // imports + getContext + $props as above
</script>

<!-- Top tabs render condition stays inside the shell -->
{#if nav.topTabItems.length > 0}
  <NavbarTabs
    tabs={nav.topTabItems}
    active={nav.topTabActive}
    externalTabIds={nav.topExternalTabIds}
    showLabels={layoutSettings.tabs.labels.visible}
    labelPosition={layoutSettings.tabs.labels.position}
    onSelect={(id) => nav.selectSurfaceItem(layoutSettings.tabs.content, id)}
  />
{/if}

<!-- Island backdrop -->
<div
  class="vm-island-backdrop vm-glass"
  class:is-open={overlays.isIslandOpen}
  class:is-dismissable={plugin.settings.islandDismissOnOutsideClick}
  onclick={...} onkeydown={...} role="button" tabindex="-1"
  aria-label="Close island"
></div>

<PopupIsland overlayState={plugin.overlayState} />

<NavbarDock
  items={nav.dockItems}
  active={nav.dockActive}
  externalTabIds={nav.dockExternalTabIds}
  showLabels={layoutSettings.dock.labels.visible}
  labelPosition={layoutSettings.dock.labels.position}
  presentationMode={layoutSettings.dock.presentation.mode}
  drawerDirection={layoutSettings.dock.presentation.drawerDirection}
  bind:drawerOpen={nav.navReorder.drawerOpen}
  {leftFab}
  {rightFab}
  navCollapsed={nav.navReorder.navCollapsed}
  isIslandOpen={overlays.isIslandOpen}
  isReordering={nav.dockUsesFramePages ? nav.navReorder.isReordering : false}
  reorderTargetIdx={nav.dockUsesFramePages ? nav.navReorder.reorderTargetIdx : -1}
  bind:dockEl={nav.navReorder.pillEl}
  {filterRuleCount}
  {queuedCount}
  bindNav={nav.navReorder.bindNav}
  onCollapsedNavClick={nav.navReorder.onCollapsedNavClick}
  onItemPointerDown={nav.dockUsesFramePages ? nav.navReorder.onNavIconPointerDown : undefined}
  onDockPointerMove={nav.dockUsesFramePages ? nav.navReorder.onPillPointerMove : undefined}
  onDockPointerUp={nav.dockUsesFramePages ? nav.navReorder.onPillPointerUp : undefined}
  exitReorder={nav.navReorder.exitReorder}
  onSelect={(id) => nav.selectSurfaceItem(layoutSettings.dock.content, id)}
  mouseGestureConfig={plugin.settings?.mouseGestures?.fab}
/>
```

**Note on `dockDrawerOpen`:** today the frame has `let dockDrawerOpen = $state(false)` and binds it into NavbarDock.
In O, this state moves into `FrameNavReorderController` (which already owns reorder-related state) so the shell binds to `nav.navReorder.drawerOpen`. This is a minor change to `FrameNavReorderController` (adding `drawerOpen` $state + getter/ setter), justified by colocation with related reorder/dock state.

**Alternative:** keep `dockDrawerOpen` in frame, pass as prop.
Adds prop count by 1.

**Recommendation:** move to `FrameNavReorderController`. The reorder controller already owns dock-element-related state (`pillEl`, `navCollapsed`, `isReordering`); `drawerOpen` is a natural addition.

## Behavior preservation

The shell's render output is **byte-equivalent** to the existing `frameIslandAndDock` snippet content (lines 705-760 of `frameVaultman.svelte`) plus the top-`NavbarTabs` conditional (lines 765-774). Verification:

- DOM snapshot test: mount frame pre-extraction in a representative state (e.g., dockUsesFramePages=true, layoutSettings with both top tabs visible, 3-page order), capture DOM. Mount frame post-extraction in the same state, assert equality.
- Visual smoke: live `plugin-dev` reload, toggle dock drawer, reorder dock pages, navigate top tabs — verify identical behavior.

## Future preset wiring (out of O scope)

Sub-system 6 (Layout extension) will wire `preset.dock.visible` and `preset.tabs.visible`. The natural insertion point is **inside the shell**: wrap `<NavbarTabs>` in `{#if nav.tabsVisible}` and wrap the `<NavbarDock>` block in `{#if nav.dockVisible}`. The `nav` service derives `tabsVisible` / `dockVisible` from `plugin.themeService.activePreset.dock.visible` / `tabs.visible`.

Sub-system 7 (Toolbar contract) will wire `preset.toolbar.buttons`.
The natural insertion point is **inside NavbarDock** (downstream), but the source of the button list flows through the shell. The shell may need a `toolbarButtons` prop or pull from `nav.toolbarButtons`.

O leaves these seams in place but does **not** wire them. The shell's prop signature is fixed for O; future sub-systems add props as they need them.

## Removed from frame after Commit 3

- The `frameIslandAndDock` snippet (deleted entirely; rendered via `<FrameNavbarShell ... />` instead).
- The top `NavbarTabs` conditional render (moves into shell).
- The `dockDrawerOpen` $state (moves into `FrameNavReorderController`).

## What stays in frame for the shell mount

```svelte
<!-- in frameVaultman.svelte main template -->
{#if dashboardEnabled}
  <FrameDashboardShell {plugin} ... />
{:else}
  <div class="vm-pages-viewport" use:viewport.bindViewport>
    <!-- pages strip — inline render, see shard 06 for why this stays in frame -->
  </div>
{/if}

<FrameNavbarShell
  {plugin}
  {filterRuleCount}
  {queuedCount}
  layoutSettings={nav.layoutSettings}
  leftFab={nav.leftFab}
  rightFab={nav.rightFab}
  {overlays}
/>
```

The shell mount is unconditional (both dashboard and pages-strip modes render the navbar). Two mount sites today (line 786 inside dashboard branch and line 841 inside pages branch) become one mount site outside the conditional after Commit 3.
