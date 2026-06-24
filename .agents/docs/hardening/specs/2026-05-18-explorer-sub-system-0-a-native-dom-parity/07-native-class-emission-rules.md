---
title: 07 — Native-class emission rules per view
type: spec-shard
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 07 — Native-class emission rules per view

Per-view emission logic. Data-driven from
`explorerViewContract(viewMode).nativeDomEmission[mountContext]`
(declared in `02-extended-view-feature-contract.md`). View
components stop hard-coding native class strings; they look them
up from the contract.

## Emission rule master

```
For each view component, on each row:

  const vocab = preset.useNativeDom
    ? explorerViewContract(viewMode).nativeDomEmission[mountContext]
    : null;

  rowRoot.class = [
    'vm-<view-specific-row-class>',     // always emit vm-*
    vocab?.rowRoot,                     // additive when native
    ...stateModEmissions(vocab, isSelected, isFocused, isActive, ...)
  ].filter(Boolean).join(' ');

  primaryLabel.class = [
    'vm-<view-specific-label-class>',
    vocab?.primaryLabel,
  ].filter(Boolean).join(' ');

  // ... etc for innerWrapper, childrenContainer, collapseIcon,
  //     cellWrapper, coverImage, headerCell
```

Always emit `vm-*` classes regardless of preset. Emit native
classes additively when `preset.useNativeDom === true`. This
preserves all existing SCSS rules in `src/styles/_views.scss`
and friends while letting Obsidian theme rules apply via the
native classes.

## State-mod emission

```typescript
function stateModEmissions(
  vocab: NativeClassVocabulary | null,
  rowState: { isSelected: boolean; isFocused: boolean; isActive: boolean; isDragSource: boolean; isDropTarget: boolean; hasActiveMenu: boolean },
): string[] {
  const out: string[] = [];

  // vm-* state classes always emit
  if (rowState.isSelected) out.push('vm-is-selected');
  if (rowState.isFocused) out.push('vm-is-focused');
  if (rowState.isActive) out.push('vm-is-active');
  if (rowState.isDragSource) out.push('vm-drag-source');
  if (rowState.isDropTarget) out.push('vm-drop-target');
  if (rowState.hasActiveMenu) out.push('vm-has-active-menu');

  // Native state mods only when useNativeDom AND mod is allow-listed by view contract
  if (vocab) {
    if (rowState.isSelected && vocab.rowStateMods.includes('is-selected')) out.push('is-selected');
    if (rowState.isFocused && vocab.rowStateMods.includes('is-focused')) out.push('is-focused');
    if (rowState.isActive && vocab.rowStateMods.includes('is-active')) out.push('is-active');
    if (rowState.isDragSource && vocab.rowStateMods.includes('is-being-dragged')) out.push('is-being-dragged');
    if (rowState.isDropTarget && vocab.rowStateMods.includes('is-being-dragged-over')) out.push('is-being-dragged-over');
    if (rowState.hasActiveMenu && vocab.rowStateMods.includes('has-active-menu')) out.push('has-active-menu');
  }

  return out;
}
```

Lives in `src/services/serviceNodeClassEmission.ts` (new, small
helper module) or inlined in view components depending on impl
preference. Spec assumes a small shared helper for testability.

## Per-view emission table (panel context)

| View | rowRoot vm-* | rowRoot native | primaryLabel vm-* | primaryLabel native | cellWrapper native | coverImage native | headerCell native | rowStateMods (native) |
|---|---|---|---|---|---|---|---|---|
| viewTree | `vm-tree-virtual-row` | `tree-item` | `vm-tree-label` | `tree-item-inner` | (n/a) | (n/a) | (n/a) | is-active, is-selected, is-focused, has-active-menu, is-being-dragged, is-being-dragged-over, mod-collapsible, is-collapsed |
| ViewNodeList | `vm-view-list-row vm-explorer-popup-row` | none | `vm-view-list-label` | none | (n/a) | (n/a) | (n/a) | (none — vm-only) |
| ViewNodeTable | `vm-node-table-row` | `bases-tr` | `vm-node-table-primary` | `bases-table-cell` | `bases-td` (on `.vm-node-table-cell`) | (n/a) | `bases-table-header` (on header `.vm-node-table-header-cell`) | is-active, is-selected, is-focused, has-active-menu, is-being-dragged, is-being-dragged-over |
| ViewNodeGrid | `vm-node-grid-tile` | none | `vm-node-grid-label` | none | (n/a) | (n/a) | (n/a) | (none — vm-only) |
| ViewNodeCards | `vm-node-card` | `bases-cards-item` | `vm-node-card-field is-title` | `bases-cards-property mod-title` | `bases-cards-property` (on `.vm-node-card-field`) | `bases-cards-cover` (on `.vm-node-card-cover`) | (n/a) | is-active, is-selected, is-focused, has-active-menu, is-being-dragged, is-being-dragged-over |

In-editor context applies the same table with the
`rowStateMods` reduced to `['is-active', 'is-selected', 'is-focused']`
(no DnD by default; future in-editor renderer can opt in).

## Media slot (cards-specific)

```svelte
<!-- inside ViewNodeCards.svelte, per card -->
{#if mask.media && row.mediaDescriptor}
  <div class="vm-node-card-cover {vocab?.coverImage ?? ''}">
    <img src={row.mediaDescriptor.thumbnailUrl} alt="" loading="lazy" />
  </div>
{/if}
```

`bases-cards-cover` only applies in cards. Tree / list / table /
grid do not have a media slot in 0-A. If `mask.media === true`
and `row.mediaDescriptor` exists for those views, they may render
an inline thumbnail using `vm-node-<view>-media` — but Obsidian
provides no native analog and the cover-image native class stays
exclusive to cards.

## DnD universal class emission

Imported from `UNIVERSAL_DND_VOCAB`. View components inspect their
own `isDragSource` / `isDropTarget` booleans (sourced from
`serviceDnd` / `serviceManualDnd` per current behavior, unchanged
by 0-A) and apply the native class string when `useNativeDom` is
true, the vm class string when false.

```typescript
// inside the row component
import { UNIVERSAL_DND_VOCAB } from '../../types/typeViewHost';

const dragClass = $derived(
  isDragSource
    ? (useNativeDom ? UNIVERSAL_DND_VOCAB.dragSource : 'vm-drag-source')
    : ''
);

const dropClass = $derived(
  isDropTarget
    ? (useNativeDom ? UNIVERSAL_DND_VOCAB.dragTarget : 'vm-drop-target')
    : ''
);
```

The `drop-indicator` element (rendered above/below the target row
during DnD) lives at the view container level, not per-row. When
emitted, the element receives the universal class:

```svelte
{#if dropIndicatorY != null}
  <div
    class="vm-drop-indicator { useNativeDom ? UNIVERSAL_DND_VOCAB.dropIndicator : '' } { useNativeDom ? UNIVERSAL_DND_VOCAB.dropIndicatorActive : '' }"
    style="top: {dropIndicatorY}px"
  ></div>
{/if}
```

`body.is-grabbing` and `.drag-ghost` ghost element rendering are
managed today by `serviceDnd` / `serviceManualDnd`. 0-A does not
change that behavior. If those services emit `is-dnd-dragging`
on body today and we want native `is-grabbing` instead, this is a
fast-follow tagged `ghost-element-native` in `11-risks-and-followups.md`.

## C8 + C9 verification gates

```typescript
// C8 — native-class emission per view
test('viewTree emits tree-item on row root when preset.useNativeDom=true AND panel context');
test('viewTree emits tree-item-inner on primary label when preset.useNativeDom=true');
test('viewTree emits tree-item-children on children container when preset.useNativeDom=true');
test('viewTree emits collapse-icon on collapse icon when preset.useNativeDom=true');
test('ViewNodeList emits NO native classes on any element regardless of preset.useNativeDom');
test('ViewNodeTable emits bases-tr on row root when preset.useNativeDom=true');
test('ViewNodeTable emits bases-table-cell on primary label cell when preset.useNativeDom=true');
test('ViewNodeTable emits bases-td on every cell wrapper when preset.useNativeDom=true');
test('ViewNodeTable emits bases-table-header on header cells when preset.useNativeDom=true');
test('ViewNodeGrid emits NO native classes on any element regardless of preset.useNativeDom');
test('ViewNodeCards emits bases-cards-item on card root when preset.useNativeDom=true');
test('ViewNodeCards emits bases-cards-property mod-title on primary label when preset.useNativeDom=true');
test('ViewNodeCards emits bases-cards-property on every field wrapper when preset.useNativeDom=true');
test('ViewNodeCards emits bases-cards-cover when mask.media=true AND row.mediaDescriptor exists AND preset.useNativeDom=true');
test('all 5 views always emit vm-* classes regardless of preset.useNativeDom value');

// C9 — DnD universal vocab
test('row emits is-being-dragged when isDragSource=true AND useNativeDom=true AND vocab.rowStateMods includes is-being-dragged');
test('row emits vm-drag-source when isDragSource=true AND useNativeDom=false');
test('row emits is-being-dragged-over when isDropTarget=true AND useNativeDom=true');
test('row emits vm-drop-target when isDropTarget=true AND useNativeDom=false');
test('drop-indicator element emits drop-indicator + is-active classes when useNativeDom=true');
test('drop-indicator element emits vm-drop-indicator class when useNativeDom=false');
test('ViewNodeList does NOT emit native DnD classes (rowStateMods=[] in contract)');
test('ViewNodeGrid does NOT emit native DnD classes (rowStateMods=[] in contract)');
test('serviceDnd and serviceManualDnd source files are NOT modified in C8 or C9');
test('dnd-kit library is NOT modified in C8 or C9');
```

## Pre-existing emission audit

The 5 view components today already emit some native classes
conditional on `themeService?.useNativeDom ?? false` (per the
inventory in the brainstorm research). C8 standardizes the
emission so every per-view template reads from the contract
literals rather than hard-coding the strings. Expected diffs:

- **viewTree.svelte**: `class:tree-item={useNativeDom}` etc.
  become `class:tree-item={vocab?.rowRoot === 'tree-item'}` —
  or simpler, drive emission through the helper. Mostly a
  refactor of where strings come from, not what they are.
- **ViewNodeTable.svelte**: today emits `.nav-file` +
  `.nav-file-title`. **C8 changes these to `.bases-tr` +
  `.bases-table-cell` + adds `.bases-td` + `.bases-table-header`**.
  Visual smoke verifies no regression.
- **ViewNodeCards.svelte**: today emits `.nav-file` +
  `.nav-file-title`. **C8 changes these to `.bases-cards-item` +
  `.bases-cards-property mod-title` + adds `.bases-cards-property`
  + `.bases-cards-cover`**.
- **ViewNodeGrid.svelte**: today emits `.nav-file` +
  `.nav-file-title`. **C8 drops these to none (vm-only)** per
  honest-hybrid rule — Bases has no grid analog and inventing
  pseudo-native names is rejected.
- **ViewNodeList.svelte**: no native classes today. C8 confirms
  this is intentional and matches the contract.

This is a behavior-relevant change because Obsidian theme CSS
that previously styled `.nav-file` on table/grid/cards rows will
no longer apply. Risk R2 in `11-risks-and-followups.md` covers
mitigation (visual smoke + vm-* fallback styling).
