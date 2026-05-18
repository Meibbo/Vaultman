---
title: Phase 09 inventory
type: research-inventory
status: complete
parent: "[[09-residual-src-support-layer|Residual src support layer]]"
created: 2026-05-17T18:55:00-05:00
updated: 2026-05-17T18:55:00-05:00
tags:
  - agent/research
  - architecture
  - inventory
created_by: codex
updated_by: codex
---

# Phase 09 Inventory

## Source Support Files

- `src/badges/serviceBadge.ts`
- `src/config/themePresetsBuiltin.ts`
- `src/index/i18n/en.ts`
- `src/index/i18n/es.ts`
- `src/index/i18n/lang.ts`
- `src/index/indexActiveFilters.ts`
- `src/index/indexBasesImportTargets.ts`
- `src/index/indexContent.ts`
- `src/index/indexFiles.ts`
- `src/index/indexNodeCreate.ts`
- `src/index/indexOperations.ts`
- `src/index/indexPlugins.ts`
- `src/index/indexProps.ts`
- `src/index/indexSnippets.ts`
- `src/index/indexTags.ts`
- `src/index/utilPropIndex.ts`

## Component Support Files

- `src/components/addons/AddonsMarkdownPane.svelte`
- `src/components/dashboard/Dashboard3Column.svelte`
- `src/components/modals/modalDeleteConflict.svelte`
- `src/components/primitives/Badge.svelte`
- `src/components/primitives/BtnSquircle.svelte`
- `src/components/primitives/Dropdown.svelte`
- `src/components/primitives/HighlightText.svelte`
- `src/components/primitives/IndicatorOrbitingInk.svelte`
- `src/components/primitives/PrimitiveFab.svelte`
- `src/components/primitives/TextInput.svelte`
- `src/components/primitives/Toggle.svelte`
- `src/components/primitives/boxSearch.svelte`
- `src/components/primitives/dropDScope.svelte`
- `src/components/settings/SettingsUI.svelte`
- `src/components/settings/settingsLeafToggle.svelte`

## Style Files

- `src/styles/_animations.scss`
- `src/styles/_elastic.scss`
- `src/styles/_global.scss`
- `src/styles/_mixins.scss`
- `src/styles/_tokens.scss`
- `src/styles/components/_badges.scss`
- `src/styles/components/_curator.scss`
- `src/styles/components/_explorer-ui.scss`
- `src/styles/components/_modals.scss`
- `src/styles/components/_navbar.scss`
- `src/styles/components/_primitives.scss`
- `src/styles/components/_settings.scss`
- `src/styles/components/_sidebar.scss`
- `src/styles/components/_statistics.scss`
- `src/styles/components/_tabs.scss`
- `src/styles/data/_cards.scss`
- `src/styles/data/_file-list.scss`
- `src/styles/data/_filters-page.scss`
- `src/styles/data/_filters.scss`
- `src/styles/data/_grid.scss`
- `src/styles/data/_table.scss`
- `src/styles/explorer/_cards.scss`
- `src/styles/explorer/_explorer.scss`
- `src/styles/explorer/_tags.scss`
- `src/styles/explorer/_tree.scss`
- `src/styles/explorer/_virtual-list.scss`
- `src/styles/layout/_glass.scss`
- `src/styles/layout/_layout.scss`
- `src/styles/layout/_v3-layout.scss`
- `src/styles/nav/_tab-bar.scss`
- `src/styles/nav/_toolbar.scss`
- `src/styles/nav/_v3-nav.scss`
- `src/styles/panel/_content-ops.scss`
- `src/styles/panel/_diff-view.scss`
- `src/styles/panel/_ops.scss`
- `src/styles/panel/_queue.scss`
- `src/styles/popup/_islands.scss`
- `src/styles/popup/_sort-popup.scss`
- `src/styles/popup/_v3-popups.scss`
- `src/styles/popup/_viewmode-popup.scss`

## Test Surfaces

- Index/unit suites: files, props, tags, operations, active filters, content,
  plugins, snippets, Bases import targets, `createNodeIndex`, `utilPropIndex`.
- UI suites: `SettingsUI`, `settingsLeafToggle`, `PrimitiveFab`,
  navbar FAB badges/click weights, add-ons pane, dashboard, delete conflict
  modal, badge collision/hover behavior.
