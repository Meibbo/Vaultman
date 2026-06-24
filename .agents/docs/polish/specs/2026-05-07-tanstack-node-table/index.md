---
title: TanStack node table
type: spec
status: active
parent: "[[docs/work/polish/index|polish]]"
created: 2026-05-07T08:13:22
updated: 2026-05-07T10:12:36
tags:
  - agent/spec
  - initiative/polish
  - explorer/views
  - table
  - tanstack
created_by: codex
updated_by: codex
glossary_candidates:
  - TanStack Table Core
  - controlled row selection
---

# TanStack Node Table

Build the real `viewTable` for Vaultman as a dense node matrix backed by
TanStack Table core logic and Vaultman's existing Svelte 5 view architecture.

The user approved the conservative Svelte 5 route: use
`@tanstack/table-core` behind a thin local adapter, keep
`NodeSelectionService` authoritative, and integrate TanStack row-selection APIs
as controlled table UI helpers.

## Shards

- [[docs/work/polish/specs/2026-05-07-tanstack-node-table/01-context-decisions|Context and decisions]]
- [[docs/work/polish/specs/2026-05-07-tanstack-node-table/02-architecture-selection|Architecture and selection]]
- [[docs/work/polish/specs/2026-05-07-tanstack-node-table/03-mvp-testing-risks|MVP, testing, and risks]]

## Implementation Status

- MVP table implementation completed and verified in the current worktree.
- UI route completed after smoke found the view-mode popup did not expose
  `table`; `ViewModePopup` now includes a Table button and translation.
- Obsidian CLI smoke verified the popup switches to table mode, renders 1
  `.vm-node-table` with 23 rows and `Name / Detail / Count` headers, supports
  row selection and header sorting, and reports no runtime errors or console
  errors after interaction.
- Provider-specific table columns are implemented for `props`, `tags`, `files`,
  and `content`; Obsidian CLI smoke verified the live `props` table renders
  `Name / Kind / Type / Count` with `Property` and `Value` row cells.

## Scope Summary

In scope for the first implementation:

- new table component, not derived from `viewGrid.svelte`;
- stable local adapter over `@tanstack/table-core`;
- body virtualization with `@tanstack/svelte-virtual`;
- headers, rows, cells, sorting, and controlled selection;
- context menu and keyboard behavior compatible with tree/grid;
- dense read-only matrix UI using `vm-table-*` styles.

Out of scope for the first implementation:

- inline editing;
- copy/paste;
- rectangular cell range selection;
- persisted column resize or reorder;
- formulas;
- Bases summaries;
- native Bases internals.

## Next Action

Choose the next post-MVP table capability, such as inline cell edit,
copy/paste, range selection, persisted column layout, Bases summaries, or
formulas.
