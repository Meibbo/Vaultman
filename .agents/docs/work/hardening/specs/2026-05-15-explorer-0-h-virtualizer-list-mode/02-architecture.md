---
title: Architecture
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

# Architecture

## Single component, three consumers

0-H introduces one new view component:
`src/components/views/ViewNodeList.svelte`, produced by renaming and rewriting the existing `src/components/views/viewList.svelte`. The rewritten component consumes the EDP-009 row input contract and is backed by `@tanstack/svelte-virtual` with measured-height virtualization.

The component is general enough to serve three call sites with different interaction models. **Callback presence is the switch**: when Explorer-mode callbacks (`onSelect`, `onFocus`, `onActivate`) are wired, the component renders as an interactive listbox; when only widget callbacks (`onAction`, `onReorder`) are wired, it renders as a static list with action buttons. There is no `mode` prop; behavior is determined by which callbacks the caller provides.

```text
┌─ ViewNodeList.svelte (rename + TanStack rewrite of viewList.svelte) ──┐
│                                                                       │
│  Input payload:                                                       │
│    rowInputs: readonly ExplorerRowInput<NodeBase>[]                   │
│                                                                       │
│  Renders per row:                                                     │
│    label, detail, icon, layers.icons[0], layers.badges (5 groups:     │
│    ops/filters/warnings/inherited/counts), actions, depth indent,     │
│    selection state, group/queue-child markers.                        │
│                                                                       │
│  Virtualization:                                                      │
│    @tanstack/svelte-virtual createVirtualizer<HTMLDivElement, …>      │
│    getItemKey   = rowInputVirtualKey                                  │
│    estimateSize = constant (32px)                                     │
│    measureElement enabled so per-row heights reflow under variable    │
│    content (wrapped labels, multi-line details, multi-row badges).    │
│                                                                       │
│  Callback surface (all optional; presence switches behavior):         │
│    onAction        (action, row)                                      │
│    onReorder       (request: ListReorderRequest)                      │
│    onSelect        (row, modifiers: SelectModifiers)                  │
│    onActivate      (row)                                              │
│    onFocus         (rowId: string | null)                             │
│    onContextMenu   (event: MouseEvent, row)                           │
│    icon            (el, name) → { update(name) }                      │
│                                                                       │
│  Explorer-mode external state (optional):                             │
│    selectedIds: ReadonlySet<string>                                   │
│    focusedId:   string | null                                         │
└───────────────────────────────────────────────────────────────────────┘
```

## Consumers after 0-H

```text
src/components/containers/panelExplorer.svelte
  NEW `list` mode branch in the view-mode switch (~:1122-1278).
  Wires: onSelect, onActivate, onFocus, onAction, onContextMenu, icon,
         selectedIds, focusedId.
  Reorder gated on provider.capabilities.canReorder.
  Builds rowInputs from `nodes`. The source preference is to reuse
  existing builder logic (see shard 04 for the precise plumbing).

src/components/containers/explorerQueue.svelte
  Wires: onAction, onReorder, icon.
  Adapts the existing ExplorerRenderModel<NodeBase>.rows to
  ExplorerRowInput<NodeBase>[] via rowInputFromViewRow (consumer-side
  transformation; the queue's row builder is not touched in 0-H).

src/components/containers/explorerActiveFilters.svelte
  Wires: onAction, onReorder, icon (active-filters also reorders).
  Same adapter strategy as queue.
```

## Deletions

| Path                                                    | Reason                                                   |
|---------------------------------------------------------|----------------------------------------------------------|
| `src/components/views/viewList.svelte`                  | Renamed to `ViewNodeList.svelte`. Old filename removed.  |
| `src/components/views/viewGrid.svelte`                  | Dead. Zero references in `src/` and `test/` on both branches. |
| `src/services/serviceVirtualizer.svelte.ts`             | No remaining consumers once `viewList.svelte` is renamed and `viewGrid.svelte` is deleted. Exports `Virtualizer<T>` + `TreeVirtualizer<TMeta>` (latter already unused at runtime). |

## Kept dependencies

| Path / package                                          | Role                                                     |
|---------------------------------------------------------|----------------------------------------------------------|
| `@tanstack/svelte-virtual` v3.13.24                     | Sole virtualization engine across every Explorer view. Already used by `viewTree.svelte:3,244`, `ViewNodeTable.svelte:4,132`, `ViewNodeGrid.svelte:3,246`, `ViewNodeCards.svelte:3,125`. |
| `src/services/serviceExplorerRowInput.ts`               | EDP-009 row input contract module. Consumed by `ViewNodeList` for `ExplorerRowInput` typing and the `rowInputCallbackId` / `rowInputVirtualKey` / `resolveRowInputRevealIndex` helpers. |

## Why one component, not a primitive plus a wrapper

An earlier architecture proposal was a primitive `ListVirtualScroll.svelte` plus a node-aware wrapper `ViewNodeList.svelte`, on the theory that "widget rows are not Explorer rows." Reading the current `viewList.svelte:1-216` invalidated that theory: both widget consumers already pass `ExplorerRenderModel<NodeBase>` with `ViewRow<NodeBase>` rows, with labels, details, icons, badges, actions, selection state, depth, and group/queue-child kinds. No non-node consumer exists.

The genuine distinction between the view-mode use and the widget uses is not item shape but **interaction richness** — which callbacks are wired, and whether the surface is selectable / keyboard-navigable. Opt-in callback presence cleanly captures that distinction without splitting the component. Widgets ignore `onSelect`/`onFocus`/`onActivate`; the `list` view mode ignores `onReorder` when its provider's `canReorder` capability is false. The component remains semantically focused on "render a virtualized list of `ExplorerRowInput` rows with optional row-level interactions."

## Why `ExplorerRowInput`, not `ExplorerRenderModel`

The four migrated views all consume `ExplorerRowInput<TMeta>` directly and use the EDP-009 helpers (`rowInputCallbackId`, `rowInputVirtualKey`, `resolveRowInputRevealIndex`) for identity, virtualization keying, and scroll-to-row. Consuming the same contract aligns `ViewNodeList` with the EDP-009 precedent and avoids creating a parallel "view-list-only" payload shape. Existing widget consumers continue to build `ExplorerRenderModel<NodeBase>` today; the migration steps in shard 05 adapt their output via `rowInputFromViewRow` at the call-site boundary, so no consumer-side row-builder rewrite is required in 0-H.

## Net diff

- `+0` files net for the rename of `viewList.svelte` → `ViewNodeList.svelte`.
- `-2` files deleted (`viewGrid.svelte`, `serviceVirtualizer.svelte.ts`).
- Net virtualization codepaths: `2 → 1`.
- Net view components consuming `ExplorerRowInput`: `4 → 5` (the four G1/G2 migrated views plus `ViewNodeList`).
