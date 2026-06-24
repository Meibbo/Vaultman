---
title: Research and view taxonomy
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T15:25:00
updated: 2026-05-04T15:25:00
tags:
  - agent/spec
  - explorer/views
---

# Research And View Taxonomy

## Corrected Taxonomy

The previous naming was wrong. The current `grid` was used as a table-like
matrix. That created confusion and made the implementation drift.

Vaultman should use this vocabulary:

```ts
export type ExplorerViewMode =
  | 'tree'
  | 'table'
  | 'grid'
  | 'cards'
  | 'list';
```

## Table

`viewTable.svelte` means Bases/Excel-like matrix.

Expected traits:

- rows;
- columns;
- cells;
- column resize;
- column reorder;
- row height modes;
- row selection;
- cell selection;
- range selection;
- copy/paste;
- optional inline editing;
- summaries;
- sorting;
- filtering indicators;
- group headers;
- property display order;
- keyboard navigation by cell.

This should be the view that recovers the original good beta progress that was
lost when the concept was renamed to grid and degraded.

## Grid

`viewGrid.svelte` means file-explorer icon grid.

Expected traits:

- icon-first or thumbnail-first layout;
- medium-icon density;
- label under or near icon;
- metadata kept secondary;
- multi-select tiles;
- spatial scanning;
- no cell matrix;
- no spreadsheet semantics;
- useful for files, folders, tags, props, values, snippets, templates.

This is analogous to file explorers when set to medium icons or tiles.

## Cards

`viewCards.svelte` means Bases-like cards.

Expected traits:

- each item is a richer block;
- configurable visible properties;
- image/cover/preview support where appropriate;
- item title, subtitle, badges, metadata;
- less dense than grid;
- better for review or browsing than bulk editing.

Cards and grid are different:

- grid optimizes spatial scanning and icon recognition;
- cards optimize richer per-item context.

## List

`viewList.svelte` means compact row list.

Expected traits:

- dense row renderer;
- icons and inline badges;
- quick actions;
- suited for queue, active filters, marks, templates, search results;
- no hierarchy unless grouped sections are supplied.

Queue and active filters should likely migrate to this first.

## Tree

`viewTree.svelte` means hierarchy.

Expected traits:

- expand/collapse;
- parent nodes;
- child nodes;
- indentation;
- inherited/bubbled badges;
- active row;
- keyboard navigation across visible flattened tree;
- optional inline rename.

## Obsidian Bases Notes

Official Bases docs distinguish view types:

- table;
- cards;
- list;
- map.

Relevant official references:

- Obsidian Bases views: `https://obsidian.md/help/bases/views`
- Obsidian Bases table view: `https://obsidian.md/help/bases/views/table`
- Obsidian custom Bases view plugin guide:
  `https://docs.obsidian.md/plugins/guides/bases-view`

Important table-view behaviors from official docs:

- files are displayed in rows;
- properties are displayed in columns;
- row height can be changed;
- cells can be selected;
- selected cells can be copied and pasted;
- summaries can appear at the bottom of a table.

Important custom-view concepts from the developer guide:

- custom Bases views use `registerBasesView`;
- views receive data through query/controller abstractions;
- rendering values goes through view-specific code;
- grouping is a first-class shape in the data.

Vaultman should not assume an official public API for reusing the internal
native Bases table implementation. If reuse is possible later, it must be
verified and isolated behind a boundary.

## File Explorer Notes

Windows list-view documentation distinguishes table/details views from icon or
tile views. The relevant concept is not to copy Windows UI, but to preserve the
semantic distinction:

- details/table is column-oriented;
- icon/tile/grid is object-oriented and spatial.

Reference:

- Windows list views:
  `https://learn.microsoft.com/en-us/windows/win32/uxguide/ctrl-list-views`

## Naming Rule

Never use `grid` to mean table again.

If a mode has columns and cells as primary structure, it is `table`.
If a mode has tiles/icons as primary structure, it is `grid`.
If a mode has rich item blocks, it is `cards`.
If a mode has dense rows, it is `list`.
If a mode has parent/child hierarchy, it is `tree`.

