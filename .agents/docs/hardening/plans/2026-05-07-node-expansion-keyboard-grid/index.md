---
title: Node expansion, keyboard navigation, and hierarchical grid plan
type: implementation-plan-index
status: completed
parent: "[[docs/work/hardening/specs/2026-05-06-node-selection-service/index|node-selection-service]]"
created: 2026-05-07T00:00:00
updated: 2026-05-07T02:25:00
tags:
  - agent/plan
  - initiative/hardening
  - explorer/expansion
  - explorer/keyboard
  - explorer/grid
  - ui/interaction
created_by: antigravity
updated_by: codex
---

# Node Expansion, Keyboard Navigation, And Hierarchical Grid Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use test-driven-development for
> every behavior change. Use subagent-driven-development or executing-plans to
> implement this plan task-by-task. Steps use checkbox syntax in the shards for
> tracking.

**Goal:** make node expand/collapse reliable, add File Explorer-style keyboard
tree semantics, expose a generic expand/collapse-all toggle from sort view, and
plan the grid hierarchy model without losing the user's design details.

**Architecture:** keep `ViewTree` and `ViewNodeGrid` as intent-reporting view
adapters. Promote expansion state and commands out of local-only panel state
only where a cross-component control needs it. Implement the current tree bug
and keyboard semantics before changing grid hierarchy, then ship grid hierarchy
in two modes: default folder-navigation mode and optional inline expansion mode.

**Tech Stack:** TypeScript, Svelte 5 runes, `SvelteSet`, TanStack virtualizer,
Vitest unit and component tests, existing Obsidian DOM helpers, existing SCSS
partials, existing i18n maps.

## Captured User Requirements

- Investigate why expanding/collapsing a node may still not work.
- Test the user's hypothesis that the clickable area left of icons is being
  overlapped by the selection box, and that badges may also be involved.
- Preserve the fact that the selection box is suspected, even though current
  SCSS sets `.vm-selection-box { pointer-events: none; }`; this must be verified
  instead of assumed.
- Add missing tree keyboard navigation:
  - `ArrowLeft` on a child node moves directly to its parent node.
  - Pressing `ArrowLeft` again on that parent collapses the parent node.
  - `ArrowRight` expands a collapsed parent node.
- Add a sort-view toggle button for all expanded parent nodes:
  - When parent nodes are expanded, the button auto-collapses all of them.
  - Pressing it again expands all parent nodes.
  - This must be generic across explorer tabs, not hardcoded to files/tags/props.
- For grid, do not pretend the current grid already has parent/child behavior.
  Current `panelExplorer.svelte` flattens every tree node for grid mode.
- Grid default behavior should match Windows File Explorer:
  - Parent nodes act like folders.
  - Opening a parent changes the whole grid to that parent's child nodes.
  - Grid mode gets a navigation toolbar, replacing the current grid toolbar
    while grid view is active.
  - The toolbar should be modeled after current Windows 11 File Explorer.
- Grid optional behavior should be setting-controlled:
  - Child nodes are hidden like tree children.
  - Parent tiles have chevrons.
  - Pressing the chevron expands that tile fully across the row.
  - The expanded tile shows another grid of child nodes.
  - Child grid content gets margins/indentation so it is visually distinct from
    other parent nodes.

## Current Evidence

- `src/components/views/viewTree.svelte` owns the tree DOM, chevron, row click,
  badge click isolation, and rectangle selection overlay.
- `src/styles/explorer/_virtual-list.scss` defines `.vm-selection-box` with
  `z-index: 20` and `pointer-events: none`.
- `src/styles/explorer/_tree.scss` defines inherited child badge overlay with a
  right-side absolute pill and `z-index: 4`.
- `src/components/containers/panelExplorer.svelte` owns local
  `manualExpandedIds`, `manualCollapsedIds`, auto-expanded ids, and `toggleExpand`.
- `panelExplorer.svelte` currently sends `ViewNodeGrid` `gridNodes =
  flattenTreeNodes(nodes)`, so grid mode shows all descendants at once.
- `ViewNodeGrid.svelte` has no chevron, no hierarchy mode, no folder location,
  and no path navigation state.
- `overlaySortMenu.svelte` is the sort view surface, but it has no expansion
  props or commands today.
- `navbarExplorer.svelte` mounts `SortPopup` and is the likely prop bridge for a
  sort-view expansion toggle.
- `serviceViews.svelte.ts` already has a private expanded set and
  `toggleExpanded`, but lacks snapshot, expand all, collapse all, and explicit
  cross-component commands.

## Windows 11 File Explorer Research Anchors

- Microsoft Support says Windows 11 File Explorer has top toolbar navigation
  buttons such as Back, Forward, Up, Refresh, plus Search, and the content pane
  opens the selected folder/file with Enter:
  https://support.microsoft.com/en-us/windows/use-a-screen-reader-to-explore-and-navigate-file-explorer-in-windows-e7d3a548-87dd-459f-a991-9fde3f7ce927
- Microsoft Learn's `BreadcrumbBar` guidance says breadcrumbs are appropriate
  for many-level folder navigation, show current location as the last item, and
  let users jump back to ancestors:
  https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/breadcrumbbar
- Microsoft Win32 Explorer docs describe the Explorer address bar as a
  breadcrumb control whose buttons navigate to ancestors, and the listview as
  the area that supports selection and activation:
  https://learn.microsoft.com/en-us/windows/win32/shell/developing-with-windows-explorer

## Phase Order

1. [[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/01-tree-hit-target-diagnosis|Tree hit-target diagnosis and repair]]
2. [[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/02-tree-keyboard-expansion|Tree keyboard expansion semantics]]
3. [[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/03-sort-expansion-toggle|Sort-view expand/collapse-all toggle]]
4. [[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/04-grid-hierarchy-navigation|Grid hierarchy and File Explorer-style navigation]]
5. [[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/05-settings-styles-verification|Settings, styles, docs, and verification]]

## Recommended Cut

Ship in two vertical cuts:

1. **Tree reliability cut:** hit target diagnosis, tree keyboard semantics, and
   sort-view expand/collapse-all for the active explorer.
2. **Grid hierarchy cut:** default folder-navigation grid first, then optional
   inline expansion mode behind a setting.

This keeps the current suspected regression separate from the larger grid UX
change, while still preserving the full grid design in this plan.

## Implementation Status

- Tree reliability cut is implemented and verified: chevrons toggle in selected
  and active rows, selection rectangle completion does not swallow intentional
  chevron clicks, badge actions remain isolated, and `ViewTree` filters stale
  TanStack virtual rows before rendering.
- Tree keyboard semantics are implemented and verified: child `ArrowLeft` moves
  selection/focus to the parent, parent `ArrowLeft` collapses, collapsed parent
  `ArrowRight` expands, and leaf `ArrowRight` does not activate providers.
- Sort-view expand/collapse-all is implemented with a generic page-to-navbar
  command bridge and a `SortPopup` node expansion button.
- Default grid folder navigation is implemented: root shows parent tiles only,
  parent activation opens that folder's children, leaf activation still delegates
  to providers, and the grid toolbar supports Back, Forward, Up, Refresh, and
  root breadcrumbs.
- Inline grid expansion is implemented and verified: Settings persists
  `gridHierarchyMode: 'inline'`, the runtime no longer gates the mode to folder
  navigation, parent tiles render chevrons, collapsed children stay hidden, and
  expanded parents render nested child grids with variable-height virtual rows.
- `ViewService` zombie audit tests now assert the public `subscribe` contract
  instead of a removed private `_notificationCount` field.

## Latest Verification

- Component: `viewTreeSelection`, `panelExplorerSelection`, `viewGridSelection`,
  `settingsUI`, and `overlaySortMenu` passed sequentially with
  `--fileParallelism=false`; the inline grid completion rerun passed
  `viewGridSelection`, `panelExplorerSelection`, and `settingsUI` together with
  36 tests.
- Unit: `logicKeyboard`, `serviceViews`, and `serviceViewsZombie` passed.
- Broad checks: `pnpm run check`, `pnpm run lint`, and `pnpm run build` passed;
  `pnpm run build` hit the known transient `svelte` resolver issue once from
  `src/types/typeFrame.ts`, then passed on immediate sequential rerun without
  code changes.
- Scoped `git diff --check` for touched implementation, style, and test files
  exited 0.
- Obsidian CLI smoke passed after `obsidian plugin:reload id=vaultman`:
  chevron toggle, tree `ArrowLeft` parent/collapse flow, sort
  expand/collapse-all, grid folder navigation and Up navigation all worked;
  the inline completion smoke reloaded/opened Vaultman with
  `gridHierarchyMode: 'inline'`, cleared an unrelated older
  `notebook-navigator` error, and `obsidian dev:errors` then reported no
  captured errors.

## Stop Conditions

- Stop if a failing test cannot reproduce the chevron/badge/selection-box issue
  at any reliable seam. Record the failed reproduction attempts before editing.
- Stop if expansion commands would require hardcoding explorer provider ids in
  `overlaySortMenu.svelte`; add a generic bridge instead.
- Inline grid expansion now uses variable row virtualization in
  `ViewNodeGrid.svelte`; reopen this stop condition only if future nested-grid
  changes destabilize row measurement or selection geometry.
- Stop if Windows File Explorer parity conflicts with existing Vaultman search,
  sort, or add-mode controls. Preserve Vaultman workflows and document the
  deliberate difference.
