---
title: Context and EDP-009 alignment
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/index|0-H virtualizer + list mode]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/views
  - explorer/virtualization
---

# Context And EDP-009 Alignment

## Why this spec exists

The Explorer has six view modes: `'tree'`, `'table'`, `'grid'`, `'cards'`,
`'markmap'`, `'list'`. Five of these are wired in
`src/components/containers/panelExplorer.svelte` to real components running
on `@tanstack/svelte-virtual`. The sixth — `'list'` — is present in
`EXPLORER_VIEW_MODES` (defined at `src/types/typeViews.ts:3-11`) but has no
corresponding branch in the view-mode switch at
`src/components/containers/panelExplorer.svelte:1122-1278`; selecting it
falls through to the empty-state fallback at `:1274`.

Meanwhile, a separate generic list-rendering component
(`src/components/views/viewList.svelte`, 216 LOC) exists and is in active
use by two widget call sites
(`src/components/containers/explorerQueue.svelte:4,142` and
`src/components/containers/explorerActiveFilters.svelte:4,243`), but it
runs on a separate, fixed-height, custom virtualizer service
(`src/services/serviceVirtualizer.svelte.ts`).

This split creates three intertwined problems:

1. The `list` view mode is non-functional. Selecting it shows an empty
   panel.
2. Two virtualization engines coexist (`@tanstack/svelte-virtual` for
   measured-height views; the custom `Virtualizer` for fixed-height list
   widgets), expanding maintenance surface for no semantic benefit.
3. `viewList.svelte` was never included in EDP-009's row-input contract
   migration. While `viewTree.svelte`, `ViewNodeTable.svelte`,
   `ViewNodeCards.svelte`, and `ViewNodeGrid.svelte` all now consume
   `ExplorerRowInput<TMeta>` via the helpers in
   `src/services/serviceExplorerRowInput.ts`, `viewList.svelte` still
   consumes the legacy `ExplorerRenderModel<NodeBase>` shape with no
   rowInput awareness.

Sub-system H from the Phase 0 worldview was originally framed as
"virtualizer consolidation" and "wire the dead `list` mode." After
re-verifying against `claude/explorer`, the more accurate framing is that
0-H is **Group 4 (G4) of EDP-009**: finish the row-contract migration for
the last unmigrated view, and consequently retire the custom virtualizer.
Wiring the `list` view mode and replacing `viewList.svelte`'s call sites
naturally falls out of that completion.

## EDP-009 in 60 seconds

EDP-009 introduced a stable, flat row payload type at
`src/services/serviceExplorerRowInput.ts`. The central interface is
`ExplorerRowInput<TMeta>`, carrying:

- `id`, `callbackId`, `source: 'snapshot' | 'tree-node' | 'view-row'`
- `node` (the underlying typed metadata)
- `label`, `detail`, `icon`, `cls`, `depth`
- `layers` (icons, badges, state)
- `cells?`, `actions?`, `disabled?`
- snapshot-lookup metadata `parentId`, `childrenIds`, `domainKey`, `path`

The contract is **not a context, not a builder, not a service** — it is a
plain data interface plus a small set of pure adapter helpers:

- `rowInputFromSnapshotRow`, `rowInputFromTreeNode`, `rowInputFromViewRow`
  — three constructor adapters from older shapes.
- `rowInputToTreeNode` — back-bridge for code paths still reading the
  legacy `TreeNode` decoration.
- `rowInputCallbackId(row)` — stable identifier for action dispatch.
- `rowInputVirtualKey(row)` — stable key for virtualizer reuse.
- `rowInputGroupKey(row)` — grouping key.
- `buildRowInputIdIndex(rows)`, `resolveRowInputRevealIndex(...)` —
  lookup helpers for reveal/scroll-to operations.

A view consumes the contract by accepting either legacy props or an
optional `rowInputs?: readonly ExplorerRowInput[]` prop and routing all
callbacks through `rowInputCallbackId(row)`. The TanStack virtualizer
setup uses `rowInputVirtualKey(row)` as the item key so rows survive
reorders without remount.

Crucially, EDP-009 standardizes **per-row payload** and **callback-id
discipline**, but it does **not** standardize the callback surface of a
view component. Each migrated view defines its own callbacks (`onToggle`,
`onRowClick`, `onPrimaryAction`, `onContextMenu`, `onManualDrop`, etc.).
This means `ViewNodeList` is free to define its own callback surface
tailored to the list/widget use case; the result parallels EDP-009 rather
than conflicting with it.

EDP-009 does **not** prescribe DOM emission, class names, or markup.
Sub-system 0-A (native-DOM parity contract) is therefore unencumbered by
EDP-009 and proceeds independently.

## EDP-009 migration status before 0-H

| Component                      | EDP-009 migration | Virtualizer used                     |
|--------------------------------|-------------------|--------------------------------------|
| `viewTree.svelte`              | migrated (G1)     | `@tanstack/svelte-virtual`           |
| `ViewNodeGrid.svelte`          | migrated (G1)     | `@tanstack/svelte-virtual`           |
| `ViewNodeTable.svelte`         | migrated (G2)     | `@tanstack/svelte-virtual`           |
| `ViewNodeCards.svelte`         | migrated (G2)     | `@tanstack/svelte-virtual`           |
| `ViewSvarFileManager.svelte`   | removed (G3)      | n/a — file deleted on `claude/explorer` |
| `viewList.svelte`              | **not migrated**  | custom `serviceVirtualizer.svelte.ts` |
| `viewGrid.svelte`              | **never used**    | custom `serviceVirtualizer.svelte.ts` (dead) |
| `ViewMarkmap.svelte`           | n/a (no rows)     | none                                 |

0-H closes the table by migrating `viewList.svelte`, wiring `'list'` in
the view-mode switch, and removing the two remaining custom-virtualizer
consumers.

## What survives from the brainstorm

The brainstorm session locked the following decisions; they are inputs to
this spec and are not re-litigated:

- Full foundations ambition for Phase 0.
- Panel + in-editor surface scope for sub-system A.
- 1-foundation interpretation of in-editor (0-A makes contracts
  in-editor-complete; new renderers are a fast-follow sub-phase).
- Three Phase 0 specs in dependency order: 0-H, 0-B, 0-A.
- 0-H component shape: one component with opt-in callback presence.
- `'list'` view mode: wire it, dual-purpose.
- Defer `@chenglou/pretext` and `@dnd-kit/svelte`.
- Add ARIA mode-switching by callback presence; add `onContextMenu`.
- Preserve queue-specific row handling bit-for-bit in 0-H; spawn a
  follow-up task.

These decisions inform the architecture in the next shard.
