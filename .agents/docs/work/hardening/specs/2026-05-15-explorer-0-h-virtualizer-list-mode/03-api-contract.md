---
title: ViewNodeList API contract
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/index|0-H virtualizer + list mode]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/views
---

# `ViewNodeList` API Contract

## Props

```typescript
import type { ExplorerRowInput } from '../../services/serviceExplorerRowInput';
import type { ViewAction, ViewRow } from '../../types/typeViews';
import type { NodeBase } from '../../types/typeContracts';

export interface ListReorderRequest {
  sourceId: string;
  targetId: string;
  position: 'before' | 'after';
}

export interface SelectModifiers {
  /** Ctrl on Win/Linux, Cmd on macOS. Captured as ctrlKey || metaKey. */
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

export interface ViewNodeListProps {
  // Required data
  rowInputs: readonly ExplorerRowInput<NodeBase>[];

  // Adapter — required if any row has an icon
  icon?: (el: HTMLElement, name: string) => { update(name: string): void };

  // Widget-style callbacks (queue, active-filters)
  onAction?:    (action: ViewAction<NodeBase>, row: ExplorerRowInput<NodeBase>) => void;
  onReorder?:   (request: ListReorderRequest) => void;

  // Explorer-mode callbacks (list view mode)
  onSelect?:      (row: ExplorerRowInput<NodeBase>, modifiers: SelectModifiers) => void;
  onActivate?:    (row: ExplorerRowInput<NodeBase>) => void;
  onFocus?:       (rowId: string | null) => void;
  onContextMenu?: (event: MouseEvent, row: ExplorerRowInput<NodeBase>) => void;

  // Explorer-mode external state (optional; presence drives ARIA mode)
  selectedIds?: ReadonlySet<string>;
  focusedId?:   string | null;

  // Reorder capability gate (consumer-supplied; mirrors
  // ExplorerRenderModel.capabilities.canDrag && canDrop from current
  // viewList.svelte). When omitted, defaults to `false`.
  canReorder?: boolean;
}
```

All callbacks are optional. The component's behavior switches on **callback presence**:

- `onSelect` and/or `onFocus` wired → ARIA listbox mode (see below).
- Only `onAction` / `onReorder` wired → ARIA list mode (current `viewList.svelte` behavior).

`canReorder` defaults to `false` when omitted. DnD is enabled only when `canReorder === true` AND `onReorder` is provided.

## Behavior contracts

### Selection visual

A row is rendered with the `is-selected` class when **either**:
- `selectedIds?.has(row.id)`, **or**
- `row.layers.state?.selected === true` (carried in the row input itself).

The two paths coexist intentionally. Widget consumers continue to bake selection into the row payload (as the queue does today). Explorer-mode consumers pass selection as an external `selectedIds` set tracked by `selectionService`. Neither path requires the other.

### Click

- Single click on a row → fires `onSelect(row, modifiers)` if wired.
  `modifiers` is captured from the source `MouseEvent`:
  - `ctrl = event.ctrlKey || event.metaKey`
  - `shift = event.shiftKey`
  - `alt = event.altKey`
- If `onSelect` is not wired, single click on a row is a no-op at the component level. Consumers can still wire action-button clicks through `onAction`.

### Double-click

- Double-click on a row → fires `onActivate(row)` if wired.

### Context menu (right-click)

- Contextmenu event on a row → fires `onContextMenu(event, row)` if wired. The consumer is responsible for `event.preventDefault()` if it wishes to suppress the platform default menu.

### Keyboard navigation

Keyboard handling is active only when at least one of `onFocus`, `onSelect`, or `onActivate` is wired. The component owns a single "focused index" derived from `focusedId` (when provided) or an internal state otherwise.

| Key                     | Effect                                                                       |
|-------------------------|------------------------------------------------------------------------------|
| ArrowDown / ArrowUp     | Move focus to next / previous row. Fires `onFocus(newRowId)` if wired.       |
| Home / End              | Move focus to first / last row.                                              |
| PageDown / PageUp       | Move focus by ±10 rows (clamped).                                            |
| Enter                   | Fires `onActivate(focusedRow)` if wired.                                     |
| Space                   | Fires `onSelect(focusedRow, { ctrl:false, shift:false, alt:false })`.        |
| Shift+ArrowDown / Up    | Fires `onSelect(targetRow, { ctrl:false, shift:true, alt:false })` for range select; consumer applies range semantics. |
| Ctrl/Cmd+A              | Optional — not handled by `ViewNodeList` in 0-H. Consumers handle vault-wide select-all separately. |

### Auto-scroll on focus change

When the external `focusedId` prop changes and the resulting focused row is outside the current TanStack viewport, the component calls `virtualizer.scrollToIndex(idx, { align: 'auto' })` to bring it into view. When `prefers-reduced-motion: reduce` is set, the scroll uses `align: 'auto'` with `behavior: 'auto'` (no smooth animation).

### DnD reorder

The HTML5 native drag implementation from `viewList.svelte:108-143` is preserved bit-for-bit:

- Gated by `canReorder === true && onReorder !== undefined`.
- Drag handlers: `dragstart` captures `draggingRowId`; `dragover` guards against drop-on-self and sets `dataTransfer.dropEffect = 'move'`;
  `drop` computes `'before' | 'after'` from `clientY` versus row-rect center, then fires `onReorder({sourceId, targetId, position})` and clears `draggingRowId`; `dragend` always clears `draggingRowId`.
- Disabled rows (`row.disabled === true` or `row.layers.state?.disabled === true`) are not draggable.

DnD is **not migrated to `@dnd-kit/svelte`** in 0-H. That migration is a separate initiative.

### Measured heights

`createVirtualizer` is configured with:

- `estimateSize: () => 32` — a constant. The current `viewList.svelte` reads `model.virtualization.rowHeight`; preserving a per-consumer estimate via a `rowHeightEstimate?: number` prop is permissible but not required for 0-H.
- `measureElement` enabled. TanStack attaches a `ResizeObserver` to each rendered row and reflows the index map when actual heights differ from the estimate. This enables variable-height content (wrapped labels, multi-line details, multi-row badge stacks) that the current fixed-height `Virtualizer` cannot do.
- `getItemKey: (index) => rowInputVirtualKey(rowInputs[index])` — uses the EDP-009 helper so rows survive reordering and partial-update cycles without remounting.

### ARIA modes

| Wiring                                   | Container `role` | Row `role`   | Extras                                 |
|------------------------------------------|------------------|--------------|----------------------------------------|
| `onSelect` and/or `onFocus` wired        | `listbox`        | `option`     | `aria-selected` per row; `aria-activedescendant` on container points at `focusedId`. Each row also gets an `id` derived from `row.id`. |
| Otherwise (only `onAction`/`onReorder`)  | `list`           | `listitem`   | None.                                  |

The switch is automatic from callback presence; no `mode` prop is introduced.

### Empty `rowInputs`

When `rowInputs.length === 0`, the component renders the outer container (so its `role` and `class` stay attached for stable layout) but emits no rows. Matches the current `viewList.svelte` behavior.

### Row content rendering

The per-row markup mirrors the current `viewList.svelte:148-211` template structure, adapted for `ExplorerRowInput` field access:

- `row.icon ?? row.layers.icons?.[0]?.icon` → icon `<span>`.
- `row.label` → main label span.
- `row.detail` (when present) → detail span.
- `row.layers.badges` (5 groups: `ops`, `filters`, `warnings`, `inherited`, `counts`) → flattened into a single badge row, in that order.
- `row.actions` (when present and non-empty) → action button row.
- `--vm-list-depth-indent: {(row.depth ?? 0) * 14}px` CSS variable on the row element for hierarchy indent visualization.

### Group rows and queue-child rows

The existing visual conventions are preserved bit-for-bit:

- `is-group` class is added when the row's underlying node has `kind === 'group'` (read via `row.node`).
- `is-queue-child` is honored when present in `row.cls`.
- The inline-cancel pattern for queue's `remove` action — currently at `viewList.svelte:92-98` and `:78-86` — is **preserved verbatim** inside `ViewNodeList`. A follow-up task ("Decouple queue knowledge from ViewNodeList") will move that special-case behind a generic `layout?: 'inline-cancel'` hint on `ViewAction<NodeBase>` plus a queue-owned stylesheet.

### CSS class vocabulary

`ViewNodeList` emits the same `vm-view-list-*` / `vm-explorer-popup-*` class set as `viewList.svelte` does today. No new native-DOM classes (`nav-file*`, `tag-pane-tag*`, `metadata-property*`, etc.) are added in 0-H — that contract belongs to sub-system 0-A. The component does not take a `themeService` prop; native-DOM emission is layered on top of 0-H's emissions later.

## Out of scope for this contract

The following are deliberately NOT in `ViewNodeList`'s API:

- `themeService` prop, `useNativeDom` gating, provider-specific native classes — 0-A.
- `mode: 'view' | 'widget'` discriminator prop — callback presence carries the same information without a redundant flag.
- `onHover` callback — adjacent to sub-system 0-A's hover-link wiring via `serviceNativeSurfaceBinding`. Defer to 0-A.
- `rowClass(row) => string` extension hook — `row.cls` already covers consumer-defined per-row class additions.
- `empty?: Snippet` slot — consumers render empty states outside the list (current behavior).
- Loading indicator — consumer concern.
- `indentPerDepth: number` prop — the constant `14px` matches current behavior; consumers needing a different ratio can override via CSS custom property.
- Custom `onKeyDown` extension hook — Explorer-mode key handling is standard; widgets don't use keyboard.
- Touch-specific DnD — Obsidian-mobile is secondary; HTML5 native DnD on touch is broken anyway. Defer to a touch-DnD initiative.
- i18n / RTL polish beyond a basic smoke test — no localized strings are introduced; RTL is a CSS-side audit that does not affect this contract.
