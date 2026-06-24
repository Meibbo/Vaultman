---
title: Grid hierarchy and File Explorer-style navigation
type: implementation-plan
status: completed
parent: "[[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/index|node-expansion-keyboard-grid]]"
created: 2026-05-07T00:00:00
updated: 2026-05-07T02:25:00
tags:
  - agent/plan
  - explorer/grid
  - ui/navigation
created_by: antigravity
updated_by: codex
---

# Grid Hierarchy And File Explorer-Style Navigation

## Purpose

Replace the current flattened grid hierarchy with a real parent/child model.
Default mode should behave like Windows File Explorer folder navigation. Inline
grid expansion remains a setting-controlled alternative.

## Files

- Modify: `src/components/views/ViewNodeGrid.svelte`
- Modify: `src/components/containers/panelExplorer.svelte`
- Create or modify: `src/components/layout/GridNavigationToolbar.svelte`
- Modify: `src/components/layout/navbarExplorer.svelte`
- Modify: `src/components/layout/overlays/overlayViewMenu.svelte` if grid toolbar
  replaces current grid-specific header actions.
- Modify settings: `src/types/typeSettings.ts`
- Modify settings UI: `src/components/settings/SettingsUI.svelte`
- Modify i18n: `src/index/i18n/en.ts`
- Modify i18n: `src/index/i18n/es.ts`
- Modify styles: `src/styles/data/_grid.scss`
- Test: `test/component/viewGridSelection.test.ts`
- Test: `test/component/panelExplorerSelection.test.ts`
- Test settings: `test/component/settingsUI.test.ts`

## Default Grid Mode: Folder Navigation

This mode should be default.

- Add setting: `gridHierarchyMode?: 'folder' | 'inline'`.
- Default value: `'folder'`.
- Parent nodes act as folders.
- Grid shows only the current folder/page children, not all descendants.
- Root grid page shows root nodes.
- Activating a parent node changes the current grid page to its children.
- Activating a leaf node keeps current provider primary action semantics.
- Breadcrumb path represents the current grid location.
- Back and Forward travel through grid navigation history.
- Up goes to parent location.
- Refresh re-reads provider tree without changing location if the location still
  exists; if not, fall back to the nearest existing ancestor, then root.
- Search should either:
  - search within the current grid location, or
  - clearly switch to existing global explorer search.
  Use the current search behavior initially unless product review chooses local
  grid search.

## Grid Navigation Toolbar

Model the toolbar after Windows 11 File Explorer, adapted to Vaultman.

Research anchors:

- Microsoft Support describes the Windows 11 File Explorer toolbar as the top
  area under tabs with Back, Forward, Up, Refresh, and Search controls.
- Microsoft Learn `BreadcrumbBar` guidance supports showing the current
  location as the final crumb and letting users jump to ancestors.
- Microsoft Win32 Explorer docs describe the Address Bar as a breadcrumb control
  and the listview as the selection/activation surface.

Vaultman toolbar content:

- Back button, disabled when no previous grid location exists.
- Forward button, disabled when no forward grid location exists.
- Up button, disabled at root.
- Breadcrumb bar:
  - Root crumb uses current explorer label or active tab label.
  - Each parent crumb is clickable.
  - Current crumb is shown last and does not navigate when clicked.
  - If width is tight, collapse left crumbs into an ellipsis/flyout in a later
    polish cut; do not block first implementation on ellipsis.
- Refresh button.
- Search remains available through the existing NavbarExplorer search unless the
  toolbar fully replaces it in grid mode. If the toolbar replaces it, include the
  search field in the new toolbar.

## Optional Grid Mode: Inline Expansion

This mode is behind `gridHierarchyMode: 'inline'`.

- Grid root page still starts with root nodes.
- Child nodes are hidden until their parent tile is expanded.
- Parent tiles show a chevron.
- Pressing chevron toggles inline expansion without activating/selecting the
  parent tile.
- Expanded parent tile spans the full grid row horizontally.
- Expanded tile contains a nested child grid.
- Child grid has margin/indentation and a subtle boundary so it is visually
  differentiated from sibling parent tiles.
- Inline expansion must preserve tile selection, context menu, primary action,
  and rectangle selection.
- Inline expansion uses variable-height virtual rows in `ViewNodeGrid.svelte`.
  Rectangle selection reads mounted tile DOM rectangles so expanded child tiles
  participate in selection geometry instead of relying on flat index math.

## Grid Keyboard Semantics

Default folder-navigation mode:

- Arrow keys move tile focus within the current grid page.
- `Enter` opens parent folders or activates leaf nodes.
- `Alt+Left` goes Back.
- `Alt+Right` goes Forward.
- `Backspace` or `Alt+Up` goes Up.
- Plain `ArrowLeft` and `ArrowRight` should keep grid/tile navigation behavior,
  not tree parent/child behavior, because the grid is spatial.

Inline expansion mode:

- Arrow keys move tile focus spatially.
- `ArrowRight` on a collapsed parent expands inline.
- `ArrowLeft` on an expanded parent collapses inline.
- `ArrowLeft` inside an expanded child grid may move to the parent tile only if
  it does not conflict with normal spatial navigation; this needs a focused UX
  check before implementation.

## TDD Steps

- [x] Add a panel/grid component test showing current grid no longer flattens
  descendants in folder mode: root shows parent; child is hidden until parent is
  opened.

- [x] Add a grid test that clicking/pressing a parent label navigates into that
  parent and renders only its children.

- [x] Add a toolbar test for Back, Forward, Up, and breadcrumb ancestor click.

- [x] Add a grid test proving leaf activation still calls provider primary
  action rather than changing grid location.

- [x] Add a grid keyboard test for `Enter`, `Alt+Left`, `Alt+Right`, and
  `Backspace`/`Alt+Up`.

- [x] Add a settings UI test that `gridHierarchyMode` is loaded from settings,
  defaults to folder mode, persists on change, and does not autosave during
  mount.

- [x] Implement a small grid navigation state in `panelExplorer.svelte`:
  `currentGridParentId`, `gridBackStack`, `gridForwardStack`, and derived
  `currentGridNodes`.

- [x] Reusable tree path helpers stayed local because `panelExplorer.svelte`
  remained readable enough for this cut:
  `findNodePath(nodes, id)`, `childrenForLocation(nodes, parentId)`,
  `parentIdFor(nodes, id)`.

- [x] Create `GridNavigationToolbar.svelte` after the tests define its public
  props.

- [x] Implement inline expansion after folder-navigation mode passes and
  settings are in place: the setting option is enabled, runtime `inline`
  resolves to inline mode, parent chevrons toggle without selection/activation,
  children render inside nested grids, and rectangle selection includes expanded
  child tiles.

## Acceptance

- Default grid no longer shows all descendants at once.
- Parent grid tiles behave like folders.
- Toolbar gives Back, Forward, Up, Refresh, and breadcrumb navigation.
- Existing selection service still owns selected/focused tile state.
- Optional inline expansion mode is present in settings and implemented with
  nested child grids.
