---
title: Cut 1.5 Implementation Facets
type: agent-plan-shard
status: planned
parent: "[[docs/work/polish/plans/2026-05-10-dock-toolbar-groups-virtualizer/cut-1-5-node-surface-theme-scroll/index|Cut 1.5 Node Surface Theme And Scroll Plan]]"
created: 2026-05-10T19:53:58
updated: 2026-05-10T21:09:57
tags:
  - agent/plan
  - polish
created_by: codex
updated_by: codex
---

# Implementation Facets

## Facet 1: Matched Filter Decoration And Hover Primary

- [x] Add `showMatchedFilterDecorations?: () => boolean` to `ViewServiceOptions` in `src/services/serviceViews.svelte.ts`.
- [x] Store it on `ViewService`, defaulting to `() => false`.
- [x] Include the setting result in semantic cache keys so toggling the setting cannot reuse stale filtered layers.
- [x] Change `semanticLayersFor` so ordinary nodes merge active-filter layers only when the option is true.
- [x] Keep `filterLayersFor` unchanged for Active Filters explorer rows.
- [x] In `src/main.ts`, instantiate:

```ts
this.viewService = new ViewService({
	decorationManager: this.decorationManager,
	showMatchedFilterDecorations: () => this.settings.explorerShowMatchedFilterDecorations === true,
});
```

- [x] Remove `primaryHoverBadgeKind` rendering classes from `viewTree.svelte` and `ViewNodeGrid.svelte`.
- [x] Remove unused primary-hover derivation and prop passing from `panelExplorer.svelte` if no other code uses it.
- [x] In `src/styles/components/_badges.scss`, give `.vm-badge.is-hover-badge:hover` and `:focus-visible` a faint background so icons remain visible when label overlay reaches the badge area.
- [x] In tree/grid/card/table SCSS, move old selected accent treatment to `.is-active-filter` and make `.is-selected` faint, without a left border.

## Facet 2: Generic Queue Badge Removal And Props Labels

- [x] Create `src/components/views/nodeBadgeHelpers.ts` with shared pure helpers:
  - `ownNodeBadges(node)`
  - `nodeBadgeKey(badge, index)`
  - `nodeBadgeTitle(badge, inherited?)`
  - `nodeBadgeAriaLabel(badge, inherited?)`
  - `nodeBadgeIsActionable(badge)`
  - `handleNodeBadgePress(event, badge, onQueueIndex)`
- [x] Replace duplicated tree badge helper logic with the shared helpers where practical.
- [x] Add `onBadgeDoubleClick?: (queueIndex: number) => void` to `ViewNodeGrid.svelte`, `ViewNodeCards.svelte`, and `ViewNodeTable.svelte`.
- [x] Render direct non-inherited `node.badges` in those views.
  - Grid: small absolute badge zone in the tile.
  - Cards: small absolute badge zone in the card.
  - Table: badge zone in the `label` column after the primary label.
- [x] Ensure badge clicks stop propagation and prevent row selection/open actions.
- [x] Pass `onBadgeDoubleClick={handleBadgeClick}` from `panelExplorer.svelte` to tree, grid, cards, and table.
- [x] In `src/components/layout/Toolbar.svelte`, set Props category labels to short labels:

```ts
props: [translate('filter.category.props'), translate('filter.category.values')]
```

with translations changed to `Props` / `Values` in English and `Props` / `Valores` or `Propiedades` / `Valores` in Spanish. Do not include `names` or redundant `props` in the value label.
- [x] Verify `tabProps.svelte` still starts with `searchMode = 0` and `explorerProps` still defaults to `all`. Do not change this unless a test proves otherwise.

## Facet 3: serviceTheme And Node Surface Settings

- [x] Create `src/services/serviceTheme.ts`.
- [x] Export:
  - `type LayoutTheme = 'default' | 'polish' | 'glass' | 'custom'`
  - `normalizeLayoutTheme(value: unknown): LayoutTheme`
  - `applyVaultmanTheme(body: HTMLElement, settings: ThemeSettingsLike): void`
  - `LAYOUT_THEME_OPTIONS` for Settings UI labels/disabled state if useful.
- [x] Treat saved legacy `native` as `default`.
- [x] Add settings in `src/types/typeSettings.ts`:

```ts
layoutTheme: LayoutTheme;
explorerShowMatchedFilterDecorations: boolean;
explorerNodeBackgrounds: boolean;
explorerNodeBorders: boolean;
```

Defaults:

```ts
layoutTheme: 'default';
explorerShowMatchedFilterDecorations: false;
explorerNodeBackgrounds: true;
explorerNodeBorders: true;
```

- [x] In `main.ts`, replace direct theme body toggling with `applyVaultmanTheme(activeDocument.body, this.settings)`.
- [x] In `SettingsUI.svelte`, add toggles in Appearance or Explorer:
  - Show matched filter node decorations
  - Show node backgrounds
  - Show node borders
- [x] Add theme dropdown option `custom` / `Create your own` as disabled placeholder.
- [x] Add body-class SCSS:
  - `body.vm-node-backgrounds-off ... { background: transparent; }`
  - `body.vm-node-borders-off ... { border-color: transparent; box-shadow: none; }`
- [x] Keep state backgrounds visible when needed for hover/selection/focus unless the setting explicitly removes the base node surface only.

## Facet 4: serviceScroll And ViewTree Lag

- [ ] Create `src/services/serviceScroll.ts` with fixed-row helpers:
  - `fallbackFixedVirtualRows({ count, rowHeight, viewportHeight, scrollTop, overscan, getKey })`
  - `scrollFixedIndexIntoView({ index, rowHeight, viewportHeight, scrollTop })`
  - `createRafElementRectObserver({ getElement, fallbackWidth, fallbackHeight })`
- [ ] Replace `viewTree.svelte` local fallback row and rect observer logic with the service helpers.
- [ ] Increase `TREE_OVERSCAN` conservatively for ViewTree only, for example from 12 to 24, if the fallback test/manual pass confirms blank gaps.
- [ ] Keep grid/cards/table scroll helpers local unless this cut needs them; the service can be generic with ViewTree as first consumer.
- [ ] Add a PretextJS audit note to final handoff:
  - `ViewNodeCards` uses service text measurement for dynamic card heights.
  - Tree/grid/table/list are fixed-height views and should not get PretextJS unless their row height becomes dynamic.
  - If any non-card view has dynamic content hidden by fixed height, capture it as a follow-up rather than widening this cut.

## Facet 5: Scrollable Compact Controls

- [ ] In SCSS, make compact horizontal control containers scrollable when the frame is too narrow:
  - `.vm-popup-squircles`
  - `.vm-squircle-row`
  - `.vm-viewmode-pills`
  - `.vm-tab-bar`
  - `.vm-nav-dock`
  - any existing menu pill/multi-selection row class discovered by `rg "pill|squircle|selection" src/styles src/components`.
- [ ] Use `overflow-x: auto`, `max-width: 100%`, `min-width: 0`, `scrollbar-width: none`, and `justify-content: safe center` or `flex-start` where centered overflow hides the first item.
- [ ] Do not alter button sizes or labels in this facet.

## Facet 6: Queue Explorer Child Rows

- [ ] Add queue presentation helpers in `src/services/serviceQueuePresentation.ts` or `serviceGroups.ts`:
  - `queueActionLabel(actionKey)`
  - `queueActionIcon(actionKey)`
  - `queueChildLabel(change)`
- [ ] `queueChildLabel(change)` must return only the object kind:
  - property value deletion/set with `value` or `oldValue`: `value`
  - property operation without value: `property`
  - tag operation: `tag`
  - file operation: `file`
  - content replace: `content`
  - template: `template`
- [ ] In `explorerQueue.svelte`, after `getModel`, normalize rows:
  - Parent group rows: `cls` includes `is-queue-parent`, `icon` is the action icon, count badge/counter remains visible.
  - Child rows: `cls` includes `is-queue-child`, `icon` is undefined, operation badges are removed, pending/deleted row state is removed, remove action remains.
- [ ] In `viewList.svelte`, add action wrapper/button classes based on row/action:
  - `.is-inline-cancel`
  - `.is-counter-slot`
- [ ] In popup/list SCSS, style child remove action as a small inline `x` in the counter area with transparent background and no extra label/icon box.
- [ ] Keep parent group row non-removable.
