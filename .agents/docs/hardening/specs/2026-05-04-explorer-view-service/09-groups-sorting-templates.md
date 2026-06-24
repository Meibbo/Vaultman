---
title: Groups sorting templates
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T15:25:00
updated: 2026-05-04T18:16:34
tags:
  - agent/spec
  - explorer/views
---

# Groups, Sorting, Templates

## Groups

Groups should be semantic parent structures in the render model.

Because groups are being added to every view mode, all views should treat their render model as hierarchical even when the projection looks flat. See
[[docs/work/hardening/specs/2026-05-04-explorer-view-service/13-hierarchical-badge-bubbling|Hierarchical badge bubbling]]
for shared descendant-layer behavior.

Group kinds:

- natural hierarchy;
- system group;
- manual group;
- filter group;
- queue operation group;
- template group;
- computed group.

Examples:

- file folders as natural groups;
- tag path segments as natural groups;
- property values under property nodes;
- queue operations grouped by operation type;
- active filters grouped by filter type;
- user-created manual groups;
- Bases-style `groupBy` groups.

## Group Shape

Candidate shape:

```ts
export interface ViewGroup<TNode extends NodeBase = NodeBase> {
  id: string;
  label: string;
  kind: ViewGroupKind;
  parentId?: string;
  itemIds: readonly string[];
  layers: ViewLayers;
  collapsed?: boolean;
  manual?: boolean;
  sort?: ViewSortState;
}
```

Groups can be rendered as:

- parent nodes in tree;
- section headers in table/list/cards;
- bands in grid;
- grouped rows in table.

Views may choose different visual affordances for hierarchy depth, but they
must not discard child layer data just because the current projection is not a
tree.

## Manual Groups

Manual groups allow user-created parent nodes.

Needed behavior:

- create group;
- rename group;
- delete group;
- move nodes into group;
- reorder group;
- persist group membership;
- show group as parent node or section depending on view.

Manual groups are not the same as filter groups. Filter groups express logical
conditions. Manual groups express user organization.

## Sorting

Sorting should be centralized.

Sort kinds:

- by label/name;
- by count;
- by date;
- by path;
- by property value;
- by operation type;
- manual order;
- grouped order;
- custom template order.

`serviceSorting.ts` can remain as helper, but `serviceViews` should own the
current sort state per explorer/view.

## Manual Sorting

Manual sorting is a mark/template concern.

Manual order should persist as:

- explorer ID;
- view mode;
- group ID if scoped;
- ordered item IDs;
- fallback behavior for unknown/new IDs.

New items should have a deterministic placement rule:

- top;
- bottom;
- sorted among unordered items;
- per-template setting.

## Table Column Order

`viewTable` needs independent column order.

Column order should be represented separately from row order.

Column settings:

- column ID;
- width;
- visibility;
- order;
- pinned state;
- editable flag;
- display type.

These settings belong in view marks/templates or persisted settings.

## Templates

Templates should represent reusable view configurations.

Template kinds:

- table column template;
- queue list template;
- filter view template;
- group template;
- sort template;
- specific view template;
- mark set.

Templates should be consumed by `serviceViews`, not by individual views.

## Bases Alignment

Obsidian Bases uses view definitions with:

- type;
- name;
- limit;
- groupBy;
- filters;
- order;
- summaries.

Vaultman does not need to fully mimic `.base` storage at first, but the view
model should not block future Bases-compatible import/export.

Potential mapping:

- Bases `views[].type` -> `ExplorerViewMode`;
- Bases `order` -> table/card/list property order;
- Bases `filters` -> filter mark/template;
- Bases `groupBy` -> group state;
- Bases `summaries` -> table summary descriptors.

## Queue Templates

Queue list templates are a concrete first template target.

Examples:

- destructive ops;
- by operation type;
- by file;
- by property;
- with diff preview;
- pending add/set/rename only;
- ready-to-execute checklist.

The current disabled marks button in `explorerQueue.svelte` should eventually
open or apply these templates.
