---
title: TanStack node table context and decisions
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

# Context And Decisions

## Intent

Build the real `viewTable` for Vaultman as a dense node matrix backed by
TanStack Table core logic and Vaultman's existing Svelte 5 view architecture.

The table must replace the current `table` fallback with an actual view. It
must not inherit the old `viewGrid.svelte` table debt. Grid remains an icon or
tile layout; table means rows, columns, headers, and cells.

## User Decisions

- Use the conservative Svelte 5 route: `@tanstack/table-core` with a thin local
  adapter instead of the stable `@tanstack/svelte-table` adapter.
- Do not use the alpha Svelte 5 adapter as the base for v1 work.
- Keep the first table MVP useful but bounded: sorting, row/cell rendering,
  selection, keyboard basics, context menu, and virtualization.
- Defer spreadsheet-grade behavior: inline editing, copy/paste, rectangular
  range selection, persistent resize/reorder, summaries, and formulas.
- Integrate TanStack row-selection APIs where they improve table UI, but keep
  Vaultman's shared selection service authoritative.

## Source Evidence

- TanStack stable installation docs list `@tanstack/svelte-table` for Svelte 3
  and 4, and say Svelte 5 should use `@tanstack/table-core` with a custom
  adapter until a built-in Svelte 5 adapter is stable:
  https://tanstack.com/table/latest/docs/installation.
- TanStack stable Svelte docs describe `@tanstack/svelte-table` as a wrapper
  over core table logic that manages state and render templates the Svelte way:
  https://tanstack.com/table/latest/docs/framework/svelte/svelte-table.
- TanStack row-selection docs support hoisting row-selection state, passing it
  back through `state.rowSelection`, using `onRowSelectionChange`, and setting
  stable row ids through `getRowId`:
  https://tanstack.com/table/latest/docs/guide/row-selection.
- Vaultman already uses Svelte 5 runes and `@tanstack/svelte-virtual@3.13.24`
  for tree/grid virtualization.
- Current docs explicitly say not to base `viewTable.svelte` on current
  `viewGrid.svelte`.
