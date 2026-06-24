---
title: TanStack node table architecture and selection
type: spec-shard
status: active
parent: "[[docs/work/polish/specs/2026-05-07-tanstack-node-table/index|tanstack-node-table]]"
created: 2026-05-07T08:13:22
updated: 2026-05-07T08:13:22
tags:
  - agent/spec
  - initiative/polish
  - explorer/views
  - table
  - tanstack
created_by: codex
updated_by: codex
---

# Architecture And Selection

## Architecture

Create a new table path instead of extending grid.

Planned units:

- `src/services/serviceViewTableAdapter.ts`: local table adapter that maps
  Vaultman `ViewRow` and `ViewColumn` data into TanStack table-core column and
  row definitions.
- `src/components/views/ViewNodeTable.svelte`: Svelte 5 component that renders
  table headers, body rows, cells, selection state, focus state, and keyboard
  behavior.
- `src/components/containers/panelExplorer.svelte`: route
  `viewMode === 'table'` to the new table component instead of fallback.
- `src/styles/data/_table.scss`: `vm-table-*` styles reserved for matrix table
  UI.
- Component and unit tests under `test/component/` and `test/unit/services/`.

TanStack owns table mechanics inside the component: row model, header groups,
sorting helpers, row selection helpers, and future column sizing hooks.
Vaultman owns semantic view state, provider actions, node ids, active filters,
operations, context menus, and cross-view selection.

## Data Flow

Provider tree or render-model rows enter the table as node-backed rows.

The first implementation may use provider `TreeNode` values directly if the
existing table projection is not ready, but the adapter contract should match
`ViewRow` and `ViewColumn` so the table can migrate cleanly to
`ExplorerRenderModel`.

Minimum row fields:

- stable `id`;
- source node;
- display label;
- optional detail;
- icon;
- cells keyed by column id;
- layers for selected, focused, active filter, pending, warning, and disabled
  state.

Minimum column fields:

- stable `id`;
- label;
- optional icon;
- display type;
- width/min width hints;
- sortable flag;
- accessor from row or node.

## Controlled Selection

TanStack row selection must be integrated as controlled table state.

Rules:

- `NodeSelectionService` remains the cross-view authority.
- TanStack receives `rowSelection` derived from the current
  `NodeSelectionSnapshot`.
- TanStack uses `getRowId: row => row.id`, never row indexes.
- TanStack APIs such as `row.getIsSelected()`,
  `row.getToggleSelectedHandler()`, `table.getSelectedRowModel()`,
  `table.getIsSomeRowsSelected()`, and select-all helpers may drive table UI.
- Any TanStack selection update must pass through a local adapter that calls
  `NodeSelectionService` commands and then syncs back into the table state.
- Tree, grid, table, context menu, selected files, and batch operations must
  observe the same selected node ids.

This avoids two competing selection truths while still using TanStack's table
selection affordances.
