---
title: 03 — TanStack Table (we use types-only today)
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/index|Frontend Stack Deep Research]]"
created: 2026-06-15T00:00:00
updated: 2026-06-15T00:00:00
created_by: opus-4-8
updated_by: opus-4-8
tags:
  - agent/research
  - explorer/table
---

# 03 — TanStack Table (`@tanstack/table-core` 8.21.3)

## Key finding (verified)

**Vaultman does NOT use the TanStack Table Svelte adapter.** It imports `@tanstack/table-core` for
**TYPES ONLY** (`SortingState`, `ColumnDef`, `RowSelectionState`, `functionalUpdate`) and implements its
own table state with Svelte 5 runes: `let sorting = $state<SortingState>([])`, an inline `sortRows()` that
applies the first sort key, and `buildNodeTableColumnDefs()` that maps our `ViewColumn[]` → `ColumnDef[]`
(verified in `serviceViewTableAdapter.ts` + `ViewNodeTable.svelte`). Virtualization is `svelte-virtual`
(see shard 01); the row model pipeline (filter/group/expand/paginate) is NOT used.

## If we adopt `createSvelteTable` (the alternative)

- **State.** `createSvelteTable({data, columns, state:{sorting,columnVisibility,columnOrder,rowSelection},
  onStateChange, getCoreRowModel, getSortedRowModel, ...})`; controlled state bound to runes; updates via
  functional updaters.
- **Columns.** accessor vs display columns; `accessorFn` chains through our `valueForColumn()`.
- **Row models.** `getCoreRowModel → getFiltered → getGrouped → getSorted → getExpanded → getPagination`.
  Adopting these replaces our inline `sortRows` and unlocks filtering/grouping/expansion "for free."
- **Virtualized composition.** `const rows = table.getRowModel().rows`; feed `rows.length` to the virtualizer
  `count`; render `rows[virtualRow.index].getVisibleCells()`. Pitfalls: header/body column-width sync, sticky
  header, re-measure on resize/column change.
- **Bases vocabulary preserved.** Keep emitting `bases-tr`/`bases-td`/`bases-table-header` (from
  `serviceExplorerViewContract` NativeClassVocabulary) by carrying class hints in column `meta` and applying
  them in the template — works the same whether rows come from manual arrays or `table.getRowModel()`.

## Decision (D-FE-4)

- **Keep types-only manual** (lower risk, explicit, what ships today) — fine while the table needs only
  single-key sort + visibility.
- **Adopt `createSvelteTable`** when the table needs real filtering/grouping/multi-sort/expansion or column
  reordering UX. Then `getVisibleCells()` + row models earn their keep. **Lower urgency than N.R/V.D**; revisit
  when the table engine of V.D (N2) is specced — the engine `table` of the ViewConfig is where this lands.

## Citations

- https://tanstack.com/table/latest/docs/framework/svelte/svelte-table; guides: column-defs, row-models,
  sorting, column-visibility, column-sizing.
- In-repo: serviceViewTableAdapter.ts, ViewNodeTable.svelte, serviceExplorerViewContract.ts, panelExplorer.svelte.
</content>
