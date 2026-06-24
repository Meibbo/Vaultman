---
title: Migration plan
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T15:25:00
updated: 2026-05-04T15:25:00
tags:
  - agent/spec
  - explorer/views
---

# Migration Plan

## Migration Rule

Do not migrate everything in one commit.

The architecture is broad enough to require vertical slices. Each slice should
leave the plugin usable and verified.

## Slice 0: Contracts Only

Create or extend type files:
- `typeViews.ts` or `typeContracts.ts`;
- `ExplorerViewMode = 'tree' | 'table' | 'grid' | 'cards' | 'list'`;
- `ViewLayers`;
- `ViewRow`;
- `ViewCell`;
- `ViewColumn`;
- `ExplorerRenderModel`;
- `IViewService`.

Add tests that compile or validate simple render models.

No UI behavior change.

## Slice 1: serviceViews Foundation

Create `serviceViews.svelte.ts`.

Implement:
- per-explorer mode state;
- selection state;
- expansion state;
- basic render model creation for flat rows;
- layer bridge from `DecorationManager`;
- query highlight propagation;
- simple virtual list support.

First consumers:
- queue explorer;
- active filters explorer.

Reason:
- they already use indexes;
- they already render compact lists;
- they are isolated overlays.

## Slice 2: viewList

Create `viewList.svelte`.

Migrate:

- `explorerQueue.svelte` row rendering to `viewList`;
- `explorerActiveFilters.svelte` row rendering to `viewList`;
- keep their popup shells and action toolbars initially.

Do not yet rewrite queue/filter actions.

Result:

- first real shared view;
- immediate reduction of inline virtualized list duplication.

## Slice 3: Decoration Layers

Move queue badge construction out of:

- `explorerProps.ts`;
- `explorerTags.ts`.

Move active filter highlight calculation into:

- `serviceViews`;
- or a helper consumed by `serviceViews`.

Connect:

- `badges.ops`;
- `badges.filters`;
- `highlights.query`;
- `highlights.filter`;
- deletion/pending state.

Add tests for props/tags/files layer output without mounting views.

## Slice 4: Tree Render Model

Adapt `viewTree.svelte` to consume `ViewTreeRenderModel`.

Move flattening and inherited badge bubbling out of view or into a dedicated
tree projection helper.

Keep `viewTree` as renderer:

- chevrons;
- indentation;
- label markup;
- badge zone;
- keyboard event forwarding.

Restore regression:

- active filter highlight;
- badge bubbling.

## Slice 5: Replace Failed Table/Grid

Retire current `viewGrid.svelte` behavior.

Create:

- `viewTable.svelte` for matrix/table;
- maybe keep old file temporarily as `viewGridLegacy` only if needed;
- rebuild `viewGrid.svelte` later as icon grid.

Update `panelExplorer.svelte`:

- route `table` to `viewTable`;
- route `grid` only when true icon grid exists;
- stop passing `App` into table/grid views.

## Slice 6: Table MVP

Implement `viewTable.svelte` MVP:

- generic rows;
- generic columns;
- virtualized rows;
- sortable headers;
- row selection;
- cell rendering;
- query/filter highlights in cells;
- queue/filter chips as cells or status column.

Defer:

- copy/paste;
- cell range selection;
- inline edit;
- column resize;
- column reorder.

## Slice 7: Interaction Layer

Add:

- keyboard navigation;
- focus state;
- DnD state;
- manual order state;
- manual groups.

Migrate views one at a time.

## Slice 8: Marks And Templates

Add:

- marks model;
- specific view;
- query/filter/order marks;
- queue list templates;
- view templates;
- import/export bridge direction for `.base` compatibility.

## Slice 9: Cards And Icon Grid

Create or refine:

- `viewGrid.svelte` as icon grid;
- `viewCards.svelte` as Bases-style cards.

These should consume the same render model and layer families.

## Cleanup

After migration:

- remove file-specific `viewGrid` API;
- delete duplicated queue list virtualizers from explorers;
- delete duplicated active filter list virtualizer;
- remove queue badge construction from providers;
- remove active filter visual state from providers;
- update docs and tests.
