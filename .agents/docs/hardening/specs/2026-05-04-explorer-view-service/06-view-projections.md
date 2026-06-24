---
title: View projections
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T15:25:00
updated: 2026-05-04T15:25:00
tags:
  - agent/spec
  - explorer/views
---

# View Projections

## Core Rule

All views receive the same semantic layer families. Each view projects them in
the layout that fits the view.

## Tree Projection

`viewTree.svelte` should project:

- hierarchy through indentation and chevrons;
- expansion through `expandedIds` or render model expansion state;
- query highlights on labels;
- filter highlights as row state or label accent;
- queue badges in badge zone;
- inherited badges as bubbled badges on collapsed parents;
- active filter as row state;
- deletion as row state;
- selection as active row;
- focus as keyboard focus row;
- groups as parent nodes.

Tree-specific behavior:

- flatten visible nodes for virtualization;
- show chevron only for expandable nodes;
- bubble descendant badges only when descendants are not visible;
- preserve inline rename if supported;
- forward badge actions without constructing queue operations.

## Table Projection

`viewTable.svelte` should project:

- rows and columns as a matrix;
- `highlights.query` inside cell text;
- `highlights.filter` as cell or row accents;
- `badges.ops` as status column chips or row/cell chips;
- `badges.filters` as filter column chips or row state;
- selected cell/range/row distinctly;
- focus as active cell;
- groups as section headers or grouped row bands;
- marks as column chips, header icons, or pinned status.

Table-specific behavior:

- column resize;
- column reorder;
- row height mode;
- cell selection;
- range selection;
- copy/paste;
- inline edit for editable cells;
- keyboard movement by cell;
- summaries if supplied.

The table must not depend on `TFile` or `App`.

## Grid Projection

`viewGrid.svelte` should project:

- item icon or thumbnail prominently;
- label below or beside icon;
- query highlight in label;
- filter highlight as tile ring/accent;
- queue badges as corner chips;
- warning badges as overlay icons;
- selected state as tile selection;
- groups as bands or sections;
- count/state as compact metadata.

Grid-specific behavior:

- tile layout;
- responsive columns;
- medium-icon density;
- multi-select;
- keyboard movement spatially;
- no spreadsheet cells;
- no table semantics.

## Cards Projection

`viewCards.svelte` should project:

- title;
- subtitle;
- selected visible properties;
- image/cover/preview where supplied;
- badges as card chips;
- query highlights in title/properties;
- filter highlights as card accent;
- queue state as top-right or footer chips;
- marks as saved-view/template chips.

Cards-specific behavior:

- optional drill-down;
- richer item context;
- property display order;
- lower density than grid/list;
- good for review, not bulk editing.

## List Projection

`viewList.svelte` should project:

- icon;
- primary label;
- secondary detail;
- inline badges;
- remove/action buttons;
- query highlights in label/detail;
- filter highlights as row accent;
- selected/focused row state;
- groups as compact section headers.

List-specific behavior:

- dense rows;
- quick actions;
- virtualized by default;
- ideal first target for queue and active filters.

## Diff Projection

`viewDiff.svelte` already exists and is not one of the explorer base views.

However, the view service should eventually provide enough semantic operation
state that diff views can be launched from queue rows, table cells, or badge
actions without duplicating queue lookup logic.

## Projection Matrix

| Layer | Tree | Table | Grid | Cards | List |
|---|---|---|---|---|---|
| query highlight | label marks | cell marks | label mark | title/property marks | label/detail marks |
| filter highlight | row state | row/cell state | tile ring | card accent | row accent |
| queue badges | badge zone | chips/status column | corner chips | card chips | inline chips |
| inherited badges | bubbled parent badge | group/row summary | group/tile count | group/card count | group count |
| selection | row | cell/range/row | tile | card | row |
| groups | parent nodes | sections | bands | sections | sections |
| marks | row chips | headers/cells/chips | tile chips | card chips | inline chips |

