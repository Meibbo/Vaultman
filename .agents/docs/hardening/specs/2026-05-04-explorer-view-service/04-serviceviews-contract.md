---
title: serviceViews contract
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T15:25:00
updated: 2026-05-04T15:25:00
tags:
  - agent/spec
  - explorer/views
---

# serviceViews Contract

## Proposed File

Create:
- `src/services/serviceViews.svelte.ts`

Add contracts to:
- `src/types/typeContracts.ts`
- or a focused `src/types/typeViews.ts` if the contracts are large.

Prefer a focused `typeViews.ts` if this grows beyond a few interfaces.

## Top-Level Contract

Candidate shape:
```ts
export interface IViewService {
  getModel<TNode extends NodeBase>(
    input: ExplorerViewInput<TNode>
  ): ExplorerRenderModel<TNode>;

  setViewMode(explorerId: string, mode: ExplorerViewMode): void;
  getViewMode(explorerId: string): ExplorerViewMode;

  setSearch(explorerId: string, query: ViewSearchState): void;
  setSort(explorerId: string, sort: ViewSortState): void;

  select(explorerId: string, id: string, mode?: SelectionMode): void;
  clearSelection(explorerId: string): void;

  toggleExpanded(explorerId: string, id: string): void;
  setFocused(explorerId: string, id: string | null): void;

  subscribe(explorerId: string, cb: () => void): () => void;
}
```

This is illustrative. The implementation plan should refine names after
checking current type patterns.

## Input Shape

`ExplorerViewInput<TNode>` should represent source facts and desired view state.

Candidate fields:
```ts
export interface ExplorerViewInput<TNode extends NodeBase> {
  explorerId: string;
  mode: ExplorerViewMode;
  nodes: readonly TNode[];
  tree?: readonly TreeNode[];
  columns?: readonly ViewColumn<TNode>[];
  groups?: readonly ViewGroup<TNode>[];
  actions?: ViewActionMap<TNode>;
  search?: ViewSearchState;
  sort?: ViewSortState;
  capabilities?: ViewCapabilities;
}
```

The input should not require `TFile`. File explorers can include file metadata
inside node metadata.

## Render Model Shape

Candidate fields:
```ts
export interface ExplorerRenderModel<TNode extends NodeBase> {
  explorerId: string;
  mode: ExplorerViewMode;
  rows: readonly ViewRow<TNode>[];
  tree?: readonly ViewTreeNode<TNode>[];
  columns: readonly ViewColumn<TNode>[];
  groups: readonly ViewGroup<TNode>[];
  selection: ViewSelectionState;
  focus: ViewFocusState;
  sort: ViewSortState;
  search: ViewSearchState;
  virtualization: ViewVirtualState;
  capabilities: ViewCapabilities;
  empty?: ViewEmptyState;
}
```

Different views can consume different fields:
- tree consumes `tree`;
- table consumes `rows` and `columns`;
- grid consumes `rows`;
- cards consumes `rows` and card display descriptors;
- list consumes `rows`.

## Row Shape

Candidate fields:
```ts
export interface ViewRow<TNode extends NodeBase> {
  id: string;
  node: TNode;
  label: string;
  icon?: string;
  depth?: number;
  cells: readonly ViewCell[];
  layers: ViewLayers;
  actions: readonly ViewAction<TNode>[];
  disabled?: boolean;
}
```

For a tree node, `depth` matters. For a table row, cells matter more.

## Cell Shape

Candidate fields:
```ts
export interface ViewCell {
  id: string;
  columnId: string;
  value: unknown;
  display: string;
  type?: 'text' | 'number' | 'checkbox' | 'date' | 'tag' | 'file' | 'badge';
  editable?: boolean;
  layers: ViewLayers;
}
```

Cells allow `viewTable` to render without knowing frontmatter or file metadata.

## Column Shape

Candidate fields:
```ts
export interface ViewColumn<TNode extends NodeBase = NodeBase> {
  id: string;
  label: string;
  icon?: string;
  width?: number;
  minWidth?: number;
  type?: string;
  sortable?: boolean;
  resizable?: boolean;
  editable?: boolean;
  getValue?: (node: TNode) => unknown;
}
```

Columns are part of the render contract. Persisted user column settings should
eventually live in marks/templates or settings.

## Capabilities

Candidate capabilities:
```ts
export interface ViewCapabilities {
  canSelect?: boolean;
  canMultiSelect?: boolean;
  canExpand?: boolean;
  canRename?: boolean;
  canDrag?: boolean;
  canDrop?: boolean;
  canEditCells?: boolean;
  canResizeColumns?: boolean;
  canReorderColumns?: boolean;
  canGroup?: boolean;
  canApplyMarks?: boolean;
}
```

Views should hide or disable interactions based on capabilities, but the
service should define the allowed behavior.

## Actions

Actions should stay semantic:
- open;
- context menu;
- remove;
- clear;
- execute;
- rename;
- toggle filter;
- apply operation;
- remove operation;
- apply mark;
- edit cell.

Svelte views should call provided callbacks, but not construct operations.
