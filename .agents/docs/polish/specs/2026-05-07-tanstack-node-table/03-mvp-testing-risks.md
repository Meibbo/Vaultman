---
title: TanStack node table MVP testing and risks
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

# MVP, Testing, And Risks

## MVP Behavior

The first `viewTable` ships as a dense read-only operational table:

- virtualized body rows with `@tanstack/svelte-virtual`;
- headers generated from table-core header groups;
- sortable headers for sortable columns;
- row click, modifier click, and shift range behavior consistent with
  tree/grid selection;
- basic keyboard movement by row and cell;
- visible selected, focused, active-filter, pending, warning, and disabled
  states;
- context menu by row or cell using provider node context;
- cells for text, number, date, tag, file, checkbox display, and badge-like
  content;
- empty state through existing `ViewEmptyLanding`;
- no dependency on Obsidian `App` or raw `TFile` in the table component.

Out of scope for MVP:

- inline edit;
- copy/paste;
- rectangular cell range selection;
- persisted column resize or reorder;
- formulas;
- Bases summaries;
- native Bases internals.

## Accessibility And Interaction

Use table/grid semantics intentionally, not copied from `viewGrid`.

The table should expose a keyboard-reachable matrix with explicit selected and
focused states. It should preserve the project cursor policy: broad data rows
and cells are working surfaces, while explicit header buttons, sort controls,
checkboxes, and compact actions can use pointer affordance.

Initial keyboard scope:

- `ArrowUp` and `ArrowDown` move focus by row.
- `ArrowLeft` and `ArrowRight` move focus by visible cell.
- `Space` toggles the focused row.
- `Enter` activates the focused row/cell primary action when available.
- `Escape` clears table/node selection consistently with tree/grid.

## Styling

Reserve `vm-table-*` classes for the table matrix.

Do not reuse old grid debt names for table layout. The table should be dense,
quiet, and scannable, matching Vaultman's operational UI direction:

- sticky or stable header area if implementation cost is low;
- fixed row height in MVP;
- compact cell padding;
- visible column separators only if configured or needed for readability;
- distinct selected, focused, active-filter, pending, warning, and disabled
  states.

## Testing

Unit tests:

- adapter maps row and column ids without index-based ids;
- adapter builds sortable columns only when `ViewColumn.sortable` is true;
- controlled selection converts `NodeSelectionSnapshot` to TanStack
  `RowSelectionState`;
- controlled selection converts TanStack row-selection updates back into
  selection service commands without losing ids.

Component tests:

- table mode renders headers and body rows instead of fallback;
- row selection reflects `NodeSelectionService`;
- clicking or toggling a row updates the shared selection service;
- keyboard navigation moves focus without activating rows unexpectedly;
- context menu receives the same selected-node context shape as tree/grid;
- empty state renders when no rows are available.

Verification:

- focused unit tests for the adapter;
- focused component tests for `ViewNodeTable` and `panelExplorer`;
- `pnpm run check`;
- `pnpm run lint`;
- `pnpm run build`.

## Risks And Mitigations

Risk: the table creates a second selection system.
Mitigation: control TanStack row-selection state from `NodeSelectionService` and
adapt all table selection changes back through service commands.

Risk: the Svelte 5 table adapter changes under us.
Mitigation: use stable `@tanstack/table-core` and keep the adapter local.

Risk: table scope becomes spreadsheet scope.
Mitigation: MVP is read-only and explicitly defers editing, copy/paste, range
selection, summaries, formulas, and persistent column layout.

Risk: old grid/table naming debt leaks into the new component.
Mitigation: use `ViewNodeTable.svelte`, `serviceViewTableAdapter.ts`, and
`vm-table-*` styles.

Risk: render-model contracts are not mature enough.
Mitigation: allow a temporary provider-tree adapter if needed, but keep the
public table adapter shaped around `ViewRow` and `ViewColumn`.

## Plan Gate

Do not start implementation until this spec is reviewed. The next document
should be an implementation plan under:

`docs/work/polish/plans/2026-05-07-tanstack-node-table/`.
