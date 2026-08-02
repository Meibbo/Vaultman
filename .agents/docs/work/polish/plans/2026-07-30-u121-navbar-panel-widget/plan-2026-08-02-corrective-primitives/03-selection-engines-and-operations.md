---
title: U121-003 plan 03 - selection engines and operations
type: implementation-plan-shard
status: pending-approval
parent: "[[index|U121-003 corrective implementation plan]]"
updated: 2026-08-02
---

# 03 — Selection axon, engine Cells and batch operations

## Task 3.1 — Replace file-only selection with an ordered generic axon

**Files:**

- Create: `src/logic/logicNodeSelection.ts`
- Create: `test/unit/nodeSelection.test.ts`
- Modify: `test/unit/fileSelection.test.ts`
- Modify: `test/unit/fileSelectionSource.test.ts`
- Delete after migration: `src/logic/logicFileSelection.ts`

- [ ] Add table-driven tests for single select, Ctrl/Cmd toggle, Shift range over
  visible ordered IDs, anchor movement, stable IDs after sort, and reconciliation
  after filter/nested/provider changes.
- [ ] Add a virtualized-range test with 100 ordered IDs where only the endpoints
  are mounted; the selected range must come from projection order, not DOM.
- [ ] Add tests proving reconciliation removes hidden/invalid IDs and clears or
  advances an invalid anchor deterministically.
- [ ] Run the new suite and confirm RED because the module does not exist.
- [ ] Implement this provider-agnostic public contract:

```ts
export type SelectionIntent<T> =
  | { kind: 'replace'; id: T }
  | { kind: 'toggle'; id: T }
  | { kind: 'range'; id: T }
  | { kind: 'set'; id: T; selected: boolean }
  | { kind: 'clear' };

export interface SelectionSnapshot<T> {
  selected: ReadonlySet<T>;
  anchor: T | null;
}

export class NodeSelectionAxon<T> {
  snapshot(): SelectionSnapshot<T>;
  apply(intent: SelectionIntent<T>, orderedVisibleIds: readonly T[]): void;
  reconcile(orderedVisibleIds: readonly T[], validIds?: ReadonlySet<T>): void;
  subscribe(listener: (snapshot: SelectionSnapshot<T>) => void): () => void;
}
```

- [ ] Clone externally supplied Sets and expose read-only snapshots so renderers
  cannot mutate axon state behind its notification boundary.
- [ ] Notify synchronously once per semantic change and not for equal snapshots.
- [ ] Port the old file-selection assertions to the generic contract, then delete
  `logicFileSelection.ts` only when the source test proves no imports remain.
- [ ] Re-run focused tests and confirm GREEN.

## Task 3.2 — Give every PanelExplorer one axon

**Files:**

- Modify: `src/components/containers/explorerFiles.ts`
- Modify: `src/components/containers/explorerProps.ts`
- Modify: `src/components/containers/explorerTags.ts`
- Modify: `src/components/containers/explorerSnippets.ts`
- Modify: `src/components/containers/explorerPlugins.ts`
- Modify: `src/components/pages/tabContent.svelte`
- Modify: `src/components/pages/pageFilters.svelte`
- Create: `test/unit/explorerSelectionOwnershipSource.test.ts`

- [ ] Add a source test requiring exactly one `NodeSelectionAxon` owner in each
  Files, Props, Tags, Snippets, Plugins and Content/Text adapter, and forbidding
  provider-local `selectedNodeIds`/`selectedFilePaths` mutation stores.
- [ ] Add adapter tests proving `in mode=select` is available for all six surfaces
  and that each exposes the same selection snapshot to its active engine.
- [ ] Run the tests and confirm RED on missing Files checkbox projection, missing
  Content selection and provider-local stores.
- [ ] Instantiate one axon per PanelExplorer instance; do not put it in a global
  registry, Scene singleton or renderer.
- [ ] Map mouse/keyboard modifiers into `SelectionIntent`; Shift uses the current
  ordered visible projection after sort/filter/nested resolution.
- [ ] Subscribe engine repaint directly to axon changes. Do not wait for a full
  provider render or an unrelated action.
- [ ] On projection change, call `reconcile` before menus or OperationNodes can
  read targets.
- [ ] For Content/Text, use a local selectable-provider adapter rather than
  widening every `ExplorerTabId` sort/settings record with an invalid tab.
- [ ] Run the Svelte autofixer on `tabContent.svelte` and `pageFilters.svelte`, then
  confirm focused tests GREEN.

## Task 3.3 — Render `cell_checkbox` as a real engine Cell

**Files:**

- Modify: `test/unit/selectionCheckboxSource.test.ts`
- Modify: `test/unit/viewTreeBehavior.test.ts`
- Create: `test/unit/nodeTableSelectionCellSource.test.ts`
- Create: `test/unit/cardsSelectionCellSource.test.ts`
- Modify: `src/components/layout/viewTree.ts`
- Modify: `src/components/layout/viewNodeTable.ts`
- Modify: `src/components/layout/viewGrid.ts`
- Modify: `src/components/layout/viewFilesGrid.ts`
- Modify: `styles.css`

- [ ] Add failing assertions for Tree start placement before the caret; Tree end
  placement after content; Table as a first/final layout column for every row;
  and Cards as one top-corner Cell per card.
- [ ] Add a live-mutation unit/source test: changing the axon snapshot updates
  existing recycled rows/cards without rebuilding the explorer.
- [ ] Add guards forbidding absolute frame-owned checkboxes and Table checkboxes
  appended outside `layout.columns`.
- [ ] Run focused tests and confirm RED.
- [ ] In Tree, include checkbox state/position in row signature, create start
  checkbox before the caret, and update `checked` in the mutable-state path.
- [ ] In Table, inject a synthetic selection column into the computed layout at
  index zero or the final index. Center the checkbox within that cell; account for
  its width in header/body surface geometry.
- [ ] In Cards, render one checkbox within each card and anchor it to the chosen
  top corner. Its click stops propagation but belongs to that card's node ID.
- [ ] Give Files the same checkbox callback as every other provider; remove engine
  copies of selection Set ownership and consume the axon snapshot.
- [ ] Preserve keyboard activation, dragging, virtualization and row recycling.
- [ ] Run focused tests, Stylelint and `pnpm run check`; confirm GREEN.

## Task 3.4 — Build OperationTargetSet and batch-safe context menus

**Files:**

- Create: `src/logic/logicOperationTargetSet.ts`
- Create: `test/unit/operationTargetSet.test.ts`
- Modify: `src/types/typeCMenu.ts`
- Modify: `src/services/serviceContextMenu.ts`
- Modify: `test/unit/contextMenuSource.test.ts`
- Modify: `test/unit/nodeContextMenuKinds.test.ts`
- Modify: `src/components/containers/explorerFiles.ts`
- Modify: `src/components/containers/explorerProps.ts`
- Modify: `src/components/containers/explorerTags.ts`
- Modify: `src/components/containers/explorerSnippets.ts`
- Modify: `src/components/containers/explorerPlugins.ts`
- Modify: `src/components/pages/tabContent.svelte`

- [ ] Add pure tests proving targets equal `visible selected U invoked`, are
  deduplicated in projection order, exclude reconciled-hidden nodes, and never
  expand selected folders into descendants.
- [ ] Add compatibility tests proving an action appears only when every target
  supports its node kind, capability and cardinality; no incompatible subset is
  silently retained.
- [ ] Add label tests such as `Rename 12 items` where displayed count equals the
  exact OperationNode target count.
- [ ] Run the new suites and confirm RED.
- [ ] Introduce explicit target-aware types:

```ts
export interface OperationTarget<TNode = unknown> {
  id: string;
  kind: MenuCtx['nodeType'];
  node: TNode;
}
export interface OperationTargetSet<TNode = unknown> {
  targets: readonly OperationTarget<TNode>[];
  count: number;
}
```

- [ ] Extend `ActionDef` with explicit `cardinality`, `supportsTargets`,
  `labelForTargets` and `runTargets`; keep single-node compatibility only through
  an adapter that rejects multi-target input.
- [ ] Have `serviceContextMenu.openPanelMenu` construct the target set once, take
  the intersection of available actions, and pass the same immutable set to label
  and invocation.
- [ ] Adapt Files rename/move/delete using their existing array-capable modals or
  OperationNodes. Adapt other provider actions only where their OperationNode
  accepts all targets; hide unsupported batch actions instead of looping an
  unsafe single-node callback.
- [ ] Confirm a context click on an unselected node preserves current selected
  nodes and adds the invoked node exactly once.
- [ ] Run all context-menu and selection suites; confirm GREEN.

## Task 3.5 — Commit the selection slice

- [ ] Run `pnpm run lint`, `pnpm run check` and every test named in this shard.
- [ ] Verify no provider owns a parallel selection Set and no renderer rescans the
  vault to construct ranges/targets.
- [ ] Commit code-only as `feat: unify explorer selection and operation targets`.
- [ ] Record the hash; do not stage `.agents/`.
