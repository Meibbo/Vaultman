---
title: U121-003 plan 04 - cell capabilities and sorts
type: implementation-plan-shard
status: pending-approval
parent: "[[index|U121-003 corrective implementation plan]]"
updated: 2026-08-02
---

# 04 — Cell capabilities, file-count and By badges

## Task 4.1 — Make one CellCapabilityResolver authoritative

**Files:**

- Create: `src/logic/logicCellCapabilities.ts`
- Create: `test/unit/cellCapabilities.test.ts`
- Modify: `src/logic/logicCellRegistry.ts`
- Modify: `test/unit/cellRegistry.test.ts`
- Modify: `src/logic/logicSortMenu.ts`
- Modify: `test/unit/sortMenuModel.test.ts`

- [ ] Add a table-driven matrix covering provider, engine, nested topology,
  fixedFolders, selection mode and node kinds. For each row assert the same Cell
  set drives render, View menu, Sort menu and Filter-by-type.
- [ ] Add canonical-engine tests mapping `tree` and `dnd` to `tree`, `table` to
  `table`, and `grid` and `cards` to `cards` before capability evaluation.
- [ ] Add a consistency test that fails if a visible Cell has no View entry, a
  Sort option is offered for an unavailable Cell, or a Filter type references an
  unavailable Cell.
- [ ] Run focused tests and confirm RED because registry entries currently encode
  partial static explorer/view-mode rules.
- [ ] Implement these DOM-free contracts:

```ts
export type CanonicalExplorerEngine = 'tree' | 'table' | 'cards';

export interface CellCapabilityContext {
  providerId: string;
  engine: CanonicalExplorerEngine;
  nested: boolean;
  fixedFolders: boolean;
  selectionMode: boolean;
  nodeKinds: ReadonlySet<MenuCtx['nodeType']>;
}

export interface CellCapabilityResolution {
  availableCellIds: ReadonlySet<string>;
  effectiveVisibleCellIds: ReadonlySet<string>;
  availableSortIds: ReadonlySet<string>;
  availableFilterTypeIds: ReadonlySet<string>;
  effectiveSort: ExplorerSortState;
}
```

- [ ] Give each `ExplorerCellDef` a pure availability predicate or capability key;
  the resolver evaluates it once per projection signature.
- [ ] Register `cell_checkbox` with View, Sort and Filter-by-type affordances only
  while selection mode is active. Sort groups selected/unselected stably; filter
  types expose selected and unselected without mutating the axon.
- [ ] Change `visibleSortOptions` and View/Filter builders to consume the same
  `CellCapabilityResolution`, not re-encode conditions.
- [ ] Memoize only by immutable projection signature; invalidate on every context
  field above and never cache provider-owned mutable objects.
- [ ] Re-run focused suites and confirm GREEN.

## Task 4.2 — Remove `cell_chevron` from every flat Tree projection

**Files:**

- Modify: `test/unit/viewTreeBehavior.test.ts`
- Modify: `test/unit/viewTreeSource.test.ts`
- Modify: `src/components/layout/viewTree.ts`
- Modify: `src/components/containers/explorerFiles.ts`
- Modify: `src/components/containers/explorerProps.ts`
- Modify: `src/components/containers/explorerTags.ts`
- Modify: `src/components/containers/explorerSnippets.ts`
- Modify: `src/components/containers/explorerPlugins.ts`
- Modify: `src/components/pages/tabContent.svelte`
- Modify: `styles.css`

- [ ] Add tests for Files, Props, Tags, Snippets, Plugins and Content/Text with
  Tree plus `nested=false`: `showCaret` is false, no collapse-icon DOM is created,
  and row geometry reserves zero chevron width.
- [ ] Add paired nested-on tests proving real parents retain caret and recursive
  expand behavior.
- [ ] Run focused tests and confirm RED on providers that set `node.showCaret` or
  CSS that reserves the slot despite flat topology.
- [ ] Make topology resolution set one explicit `hasHierarchy` capability before
  rendering. Tree computes caret from `hasHierarchy && hasChildren`; provider
  renderers may not force a decorative empty caret in flat mode.
- [ ] Remove flat-mode padding/margin based on a presumed collapse-icon. The start
  selection Cell takes the first slot when enabled.
- [ ] Preserve `iconInCaretSlot` only for nested Tree configurations where a real
  caret column exists; do not let it recreate flat indentation.
- [ ] Run Tree, selection and virtualization suites; confirm GREEN.

## Task 4.3 — Constrain folder `file-count` and normalize invalid sorts

**Files:**

- Modify: `test/unit/cellCapabilities.test.ts`
- Modify: `test/unit/explorerSort.test.ts`
- Modify: `test/unit/sortMenuModel.test.ts`
- Modify: `src/logic/logicCellRegistry.ts`
- Modify: `src/logic/logicSortMenu.ts`
- Modify: `src/components/containers/explorerFiles.ts`

- [ ] Add a full context matrix: `file-count` is available only for Files + Tree
  + nested on + folder nodes. It is absent in nested-off, Table and Cards.
- [ ] Add tests proving its Sort option is absent when `fixedFolders=true`, and a
  persisted invalid file-count sort resolves effectively to Name without erasing
  the saved preference.
- [ ] Add comparator tests proving file-to-file ordering is Name even while folder
  grouping uses file-count; direction affects the folder group only.
- [ ] Run the focused suites and confirm RED on the current static registry/menu.
- [ ] Encode file-count's full predicate in `CellCapabilityResolver` and remove
  all duplicate provider/view checks.
- [ ] Separate saved sort from `effectiveSort` so returning to compatible nested
  Tree can restore the preference.
- [ ] Keep folders and files in explicit comparator branches. Never read a missing
  count from a file as zero and accidentally reorder files.
- [ ] Re-run focused suites and confirm GREEN.

## Task 4.4 — Add semantic, stable `By badges` across explorers

**Files:**

- Create: `src/logic/logicBadgeSort.ts`
- Create: `test/unit/badgeSort.test.ts`
- Modify: `src/types/typeTree.ts`
- Modify: `src/components/containers/explorerFiles.ts`
- Modify: `src/components/containers/explorerProps.ts`
- Modify: `src/components/containers/explorerTags.ts`
- Modify: `src/components/containers/explorerSnippets.ts`
- Modify: `src/components/containers/explorerPlugins.ts`
- Modify: `src/components/pages/tabContent.svelte`
- Modify: `src/logic/logicSortMenu.ts`
- Modify: `src/logic/logicSort.ts`
- Modify: `src/logic/logicScopedSort.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/es.ts`

- [ ] Add semantic badge tests for pending delete, rename, move, convert,
  conflict, inclusive filter and exclusive filter.
- [ ] Add grouping tests: any semantic badge puts the node in the first binary
  group; several badges do not change group rank; original/effective secondary
  sort remains stable within each group.
- [ ] Add tests proving presentation-only counters/colors do not count as the
  requested badge sort unless they carry one of the semantic kinds.
- [ ] Run the suite and confirm RED because `NodeBadge` lacks semantic identity.
- [ ] Extend `NodeBadge` with a discriminated semantic field such as:

```ts
type NodeBadgeKind =
  | 'pending-delete' | 'pending-rename' | 'pending-move'
  | 'pending-convert' | 'conflict' | 'filter-include' | 'filter-exclude';
```

- [ ] Populate the semantic kind at the queue/conflict/filter projection source,
  not by parsing translated tooltip text, CSS classes, icon names or colors.
- [ ] Implement a pure `hasPriorityBadge(node)` and stable decorate-sort-undecorate
  grouping using the already ordered projection as the tie breaker.
- [ ] Offer `By badges` in every explorer's Sort menu through the shared resolver.
- [ ] Confirm changing badges invalidates the relevant node/sort projection by the
  next reactive flush without a vault-wide rescan.
- [ ] Run focused suites, `pnpm run lint` and `pnpm run check`; confirm GREEN.

## Task 4.5 — Commit the Cell/sort slice

- [ ] Inspect for duplicated capability conditions in registries, menus and
  renderers; consolidate them before commit.
- [ ] Commit code-only as `fix: resolve explorer cells by capability`.
- [ ] Record the hash; do not stage `.agents/`.
