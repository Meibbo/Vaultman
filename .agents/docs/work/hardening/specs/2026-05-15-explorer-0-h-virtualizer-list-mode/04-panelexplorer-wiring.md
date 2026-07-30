---
title: panelExplorer.svelte wiring
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/index|0-H virtualizer + list mode]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/views
---

# `panelExplorer.svelte` Wiring

This shard specifies how the new `list` view-mode branch is added to `src/components/containers/panelExplorer.svelte` on `claude/explorer`.

## Where the branch goes

The view-mode switch is at `panelExplorer.svelte:1122-1278`. The current branch order is `tree` (~:1124), `grid` (~:1155), `cards` (~:1204), `markmap` (~:1229), `table` (~:1247), with a fallback `{:else}` at `:1274` rendering `<ViewEmptyLanding state={fallbackState} {icon} />`.

The new `list` branch is added **before** the `{:else}` fallback. Its position relative to the other branches is a stylistic choice; placing it after `table` and before the fallback keeps the natural reading order from hierarchical (tree) → tabular (table) → flat list.

## Building the row inputs

`panelExplorer.svelte` already constructs per-mode derived state near `:141-156` (`gridExpandedIds`, `currentGridNodes`, `gridNodes`, `cardNodes`, `markmapNodes`, `tableRows`, `tableColumns`, `visibleFieldsKey`, `emptyState`, `fallbackState`, the various `is*Empty` flags). 0-H adds an analogous derived value for `list`:

```typescript
// Around line ~156 in panelExplorer.svelte, alongside tableRows / cardNodes / etc.

// Reuse the existing per-mode shape-builder pattern. The exact
// row-input source is to be confirmed by reading how `viewTree.svelte`
// and `ViewNodeGrid.svelte` build their `rowInputs` from `nodes` on
// `claude/explorer`. Likely one of:
//   (a) reuse nodeRowsFromTree(nodes) (as `table` does at :153) and
//       adapt each ViewRow → ExplorerRowInput via rowInputFromViewRow;
//   (b) reuse the already-migrated views' builder if one exists
//       (e.g. nodeRowsFromRowInputs referenced indirectly in EDP-009
//       audit notes — pinned during implementation);
//   (c) introduce a thin nodeRowsToListRowInputs(nodes) helper
//       alongside the existing builders if neither (a) nor (b) yields
//       the right shape.
const listRowInputs: readonly ExplorerRowInput<NodeBase>[] = $derived(
  viewMode === 'list' ? buildListRowInputs(nodes, provider) : []
);

const isListEmpty = $derived(viewMode === 'list' && listRowInputs.length === 0);
```

The empty-state derived value (`isListEmpty`) feeds the existing `resolveEmptyState` / `resolveFallbackState` machinery at `:156-160` so the same empty-state UX applies when `list` mode has no rows.

The exact body of `buildListRowInputs` is pinned during implementation against the EDP-009 row-builder precedent already in use by `viewTree`/`ViewNodeTable`/`ViewNodeGrid`/`ViewNodeCards`. Reading their `rowInputs={…}` construction sites in `panelExplorer.svelte:993-1142` is the canonical reference.

## The list branch

```svelte
{:else if viewMode === 'list'}
  <div class="vm-list-container">
    <ViewNodeList
      rowInputs={listRowInputs}
      selectedIds={selectionService.selectedIds}
      focusedId={selectionService.focusedId}
      canReorder={provider.capabilities?.canReorder ?? false}
      onSelect={(row, mods) => selectionService.applyClick(row.id, mods)}
      onActivate={(row) => onActivate(row.node)}
      onFocus={(id) => selectionService.setFocus(id)}
      onAction={(action, row) => onAction(action, row.node)}
      onContextMenu={(event, row) => onContextMenu(event, row.node)}
      onReorder={(req) => onReorder(req)}
      icon={iconAdapter}
    />
  </div>
```

The exact handler names (`onActivate`, `onAction`, `onContextMenu`, `onReorder`, `iconAdapter`, `selectionService.applyClick`, `selectionService.setFocus`) must match the panel's existing locals — read the `<ViewTree …/>` mount at `:1124` and the `<ViewNodeTable …/>` mount at `:1247` for the canonical names on `claude/explorer`. Adjust accordingly during implementation.

## Per-provider `onActivate` semantics

`ViewNodeList` fires `onActivate(row)` on double-click and Enter. The panel's `onActivate(node)` handler decides what activate MEANS per provider. This spec does not change how `panelExplorer.svelte` dispatches activate — it only ensures the `list` view mode wires the callback consistently with how other view modes already use it.

The design intent recorded during the 0-H brainstorm is summarized below. The matrix is documentation, not a contract `ViewNodeList` enforces; the component fires the callback, the panel wires the body.

| Provider                                                | `onActivate(node)` design intent                                                          |
|---------------------------------------------------------|-------------------------------------------------------------------------------------------|
| `explorerFiles`                                         | Open the file in the active leaf (current default file-explorer behavior).                |
| `explorerContent` (search results)                      | Open the file at `match.line` (currently captured but unused per worldview research §3).  |
| `explorerOutline` (when built as a real provider — that work belongs to 0-C / Outline spec) | Open the file at the heading / block ref.                          |
| `explorerBasesImport`                                   | Open the source `.base` file. (Alternative: apply the imported view; pin per impl.)       |
| `explorerPlugins`                                       | Toggle plugin enabled ↔ disabled.                                                         |
| `explorerSnippets`                                      | Toggle snippet enabled ↔ disabled.                                                        |
| `explorerTags`                                          | Toggle the tag as an active filter (mirrors current primary-click behavior).              |
| `explorerProps`                                         | Toggle the property as an active filter, or open the value editor. Pin per impl.          |
| Future state-bearing providers (templates, layouts, settings, commands) | Toggle / cycle through state. General rule: state-bearing providers toggle on activate. |

The general principle is **"file providers open, state providers toggle, tag/property providers filter."** Where a provider's activate body does not yet exist in `panelExplorer.svelte`'s current dispatch (most non-file providers may not, because `list` mode was never wired and other view modes may not call activate uniformly), the wiring is either added during 0-H step 4 if trivial (Plugins, Snippets) or deferred to a follow-up sub-spec if non-trivial — see shard 07 R8.

The captured Enter-toggle intent also informs the broader unified input-configuration vision recorded in the [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index|Explorer UI vision]] backlog, where `onActivate` becomes one command in a larger configurable command vocabulary.

## Empty state

The `list` mode reuses the same `<ViewEmptyLanding>` machinery as the other view modes. When `isListEmpty` is true, `resolveFallbackState` (at `:156-160`) returns a fallback that the existing fallback container at `:1274` renders. No new empty-state component is needed.

## Provider capability gating

DnD reorder for `ViewNodeList` is gated by `provider.capabilities?.canReorder ?? false`. This mirrors how `viewTree.svelte`'s reorder is gated today. Providers that do not implement reorder (e.g., `explorerSnippets` if it has none, or the content/search provider) automatically have DnD disabled at the `ViewNodeList` level.

Action enablement comes from `row.actions[*].disabled` per EDP-009 and needs no extra gating at the wiring layer.

## CSS scaffolding

Wrap the mount in a `<div class="vm-list-container">` parallel to the existing per-mode containers (`vm-tree-container`, `vm-grid-container`, `vm-cards-container`, `vm-markmap-container`, `vm-table-container`).
The container provides `height: 100%` and a bounded scroll region so `ViewNodeList`'s ResizeObserver and TanStack measurement can function.
Add the SCSS rule alongside the others in the panel's stylesheet partial (search for `.vm-tree-container` on `claude/explorer` to locate it).

## `useNativeDom` and theming

`ViewNodeList` does not take a `themeService` prop. The panel's existing `useNativeDom` plumbing is irrelevant to `ViewNodeList` in 0-H.
Sub-system 0-A will later thread native-DOM emission into `ViewNodeList` through the contract module it defines; that change is additive and non-breaking with respect to 0-H's wiring.

## `EXPLORER_VIEW_MODES`

`'list'` is already present in the enum at `src/types/typeViews.ts:3-11` on `claude/explorer`. No enum change is required. The 0-H wiring fulfils a promise the enum has been making.
