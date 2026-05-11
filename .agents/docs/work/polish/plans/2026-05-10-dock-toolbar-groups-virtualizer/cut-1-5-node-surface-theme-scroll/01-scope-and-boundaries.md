---
title: Cut 1.5 Scope And Boundaries
type: agent-plan-shard
status: planned
parent: "[[docs/work/polish/plans/2026-05-10-dock-toolbar-groups-virtualizer/cut-1-5-node-surface-theme-scroll/index|Cut 1.5 Node Surface Theme And Scroll Plan]]"
created: 2026-05-10T19:53:58
updated: 2026-05-10T19:53:58
tags:
  - agent/plan
  - polish
created_by: codex
updated_by: codex
---

# Scope And Boundaries

## Files Likely Owned By This Cut

- Modify `src/services/serviceViews.svelte.ts`: add default-off matched active-filter decoration option.
- Create `src/services/serviceTheme.ts`: normalize layout themes, apply body classes, expose settings option metadata.
- Create `src/services/serviceScroll.ts`: shared fixed-row scroll helpers and RAF/ResizeObserver rect observer.
- Modify `src/types/typeSettings.ts`: add theme/node-surface/matched-filter settings.
- Modify `src/main.ts`: instantiate `ViewService` with the matched-filter setting getter and delegate body theme classes to `serviceTheme`.
- Modify `src/components/settings/SettingsUI.svelte`: add settings controls for matched-filter node decoration, node backgrounds, node borders, and theme variants.
- Modify `src/components/containers/panelExplorer.svelte`: remove primary-hover visual wiring and pass queue-badge removal handlers to non-tree views.
- Modify `src/components/views/viewTree.svelte`: use `serviceScroll`, remove `is-primary-action`, retain direct queue-badge removal.
- Modify `src/components/views/ViewNodeGrid.svelte`: remove `is-primary-action`, add direct node badge rendering/removal.
- Modify `src/components/views/ViewNodeCards.svelte`: add direct node badge rendering/removal and keep dynamic text measurement unchanged unless audit proves a bug.
- Modify `src/components/views/ViewNodeTable.svelte`: add direct node badge rendering/removal in the label cell.
- Modify `src/components/views/viewList.svelte`: support Queue child-row action placement classes without changing generic list semantics.
- Modify `src/components/containers/explorerQueue.svelte`: present group parent rows and child rows differently.
- Modify `src/services/serviceGroups.ts` or create `src/services/serviceQueuePresentation.ts`: expose queue action labels/icons and child labels.
- Modify `src/components/layout/Toolbar.svelte`: Props category labels should read `Props` and `Values`.
- Modify `src/index/i18n/en.ts` and `src/index/i18n/es.ts`: update/add category and setting labels.
- Modify SCSS files:
  - `src/styles/components/_badges.scss`
  - `src/styles/explorer/_virtual-list.scss`
  - `src/styles/explorer/_tree.scss`
  - `src/styles/data/_grid.scss`
  - `src/styles/data/_cards.scss`
  - `src/styles/data/_table.scss`
  - `src/styles/popup/_islands.scss`
  - `src/styles/components/_tabs.scss`
  - `src/styles/nav/_tab-bar.scss`
  - `src/styles/nav/_v3-nav.scss`

## Shared Write-Scope Rules

- Facet 1 owns `serviceViews`, hover badge classes, and selection/active-filter SCSS.
- Facet 2 owns badge rendering in grid/cards/table, PanelExplorer handler wiring, and Props labels.
- Facet 3 owns `serviceTheme`, settings types/UI, and node surface background/border classes.
- Facet 4 owns `serviceScroll` and ViewTree scroll integration.
- Facet 5 owns horizontal overflow styles only.
- Facet 6 owns Queue explorer presentation and ViewList action placement.
- Final integration may touch all changed files only to resolve type/check/test failures.

## Existing Facts To Preserve

- Props search default is already effectively `all` in `explorerProps` and `tabProps`; verify before changing logic.
- Active Filters explorer rows must still show their filter icon/badge/highlight. Only ordinary nodes matched by active filters become default-off.
- `ViewNodeCards.svelte` already uses `serviceTextMeasure`/fallback text measurement through card layout code. Tree/grid/table/list are fixed-height surfaces unless this cut changes that intentionally.
- Existing dirty worktree changes are not automatically yours. Inspect `git diff -- <file>` before editing any already-modified file.
