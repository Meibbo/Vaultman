---
title: Open questions and risks
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T15:25:00
updated: 2026-05-04T15:25:00
tags:
  - agent/spec
  - explorer/views
---

# Open Questions And Risks

## Open Questions

Should `serviceViews` live as one service or as a facade over smaller services?

Possible internal split:

- `serviceViews`;
- `serviceViewSelection`;
- `serviceViewLayers`;
- `serviceViewMarks`;
- `serviceViewGroups`.

Start with one service only if it stays readable. Extract when boundaries are
proven.

## Bases Reuse

Can Vaultman reuse any native Bases implementation?

Known facts:

- official docs expose `.base` file syntax and custom view plugin APIs;
- the custom API lets plugins register custom Bases views;
- direct reuse of internal native table/card components is not confirmed.

Risk:

- depending on undocumented internals can break across Obsidian versions.

Rule:

- verify before use;
- route internal Obsidian APIs through a documented extended type boundary;
- prefer semantic compatibility over internal reuse unless API is stable.

## ViewTable Complexity

`viewTable` can become a large project.

High-risk features:

- copy/paste;
- cell range selection;
- inline editing;
- column resize;
- column reorder;
- row/column virtualization;
- formulas/summaries;
- keyboard accessibility.

Mitigation:

- build MVP table first;
- keep table contract compatible with future features;
- do not implement spreadsheet behavior until render model is stable.

## serviceViews Scope Creep

The service can become too broad.

Risk signs:

- it starts opening modals;
- it starts editing files directly;
- it starts knowing domain-specific operation details deeply;
- it becomes impossible to test without a full plugin.

Mitigation:

- use providers/adapters for domain matching;
- keep service actions semantic;
- test layer builders independently.

## Provider Compatibility

Existing providers are class-based and contain action logic.

Migration risk:

- moving too much at once can break context menus, add mode, filters, and queue
  operations.

Mitigation:

- keep provider action methods;
- move visual layer logic first;
- migrate providers one at a time;
- retain adapter functions during transition.

## Styling Debt

Existing styles include:

- explorer tree styles;
- virtual list styles;
- grid/table styles;
- cards styles;
- badges styles;
- popup island styles.

Risk:

- new views may inherit broken names from old `grid` semantics.

Mitigation:

- use new class prefixes intentionally;
- reserve `vm-table-*` for matrix table;
- reserve `vm-grid-*` for icon grid;
- reserve `vm-card-*` for cards;
- reserve `vm-list-*` for compact lists.

## Accessibility

Each view has different roles:

- tree should use tree/treeitem semantics;
- table may need grid/table semantics depending on interactivity;
- grid needs listbox/grid-like keyboard behavior;
- cards may use list/grid semantics;
- list uses list/listitem or row semantics.

Do not copy roles blindly from old components.

## Persistence

Persisted view state needs a storage decision.

Candidates:

- plugin settings;
- mark/template files;
- `.base` import/export;
- session-only state.

Do not persist everything in the first slice.

## Naming Migration

Changing `ExplorerViewMode` from `grid` to `table` can break callers.

Mitigation:

- support legacy `grid` temporarily as alias to old behavior if needed;
- update `overlayViewMenu.svelte`;
- update i18n keys;
- update settings migration if view mode is persisted.

## Current User Decisions

Confirmed:

- use a service-owned view architecture;
- layers are semantic;
- each view presents layers differently;
- add real `viewTable.svelte`;
- distinguish table/grid/cards/list/tree;
- current `viewGrid` is failed table debt;
- queue and active filters should eventually consume shared views.

Not yet decided:

- whether first implementation starts with queue/list or tree/layers;
- exact persistence shape for marks/templates;
- whether to write `.base` import/export in the same initiative or later;
- whether `serviceViews` should be created before or alongside `viewList`.

