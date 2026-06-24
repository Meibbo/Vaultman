---
title: TanStack node table dependency and adapter part 2
type: implementation-plan
status: active
parent: "[[docs/work/polish/plans/2026-05-07-tanstack-node-table/index|tanstack-node-table-plan]]"
created: 2026-05-07T08:26:53
updated: 2026-05-07T08:26:53
tags:
  - agent/plan
  - initiative/polish
  - table
  - tanstack
created_by: codex
updated_by: codex
---

# Dependency And Adapter Part 2

Continuation of [[docs/work/polish/plans/2026-05-07-tanstack-node-table/01-dependency-adapter|Dependency and adapter]].

- [ ] **Step 4: Create the adapter implementation**

Create `src/services/serviceViewTableAdapter.ts` with these exported contracts:

```ts
import type {
	ColumnDef,
	RowSelectionState,
	SortingState,
	Updater,
} from '@tanstack/table-core';
import { functionalUpdate } from '@tanstack/table-core';
import type { NodeBase } from '../types/typeContracts';
import type { TreeNode } from '../types/typeNode';
import type { NodeSelectionSnapshot } from '../types/typeSelection';
import type { ViewCell, ViewColumn, ViewLayers, ViewRow } from '../types/typeViews';

export const DEFAULT_NODE_TABLE_COLUMNS: readonly ViewColumn<TreeNode>[] = [
	{ id: 'label', label: 'Name', icon: 'lucide-text', sortable: true, minWidth: 180 },
	{ id: 'detail', label: 'Detail', icon: 'lucide-info', sortable: false, minWidth: 160 },
	{ id: 'count', label: 'Count', icon: 'lucide-hash', sortable: true, minWidth: 72 },
];

export type NodeTableRow<TNode extends NodeBase = NodeBase> = ViewRow<TNode>;

export function nodeRowsFromTree<TMeta>(
	nodes: readonly TreeNode<TMeta>[],
): ViewRow<TreeNode<TMeta>>[] {
	const rows: ViewRow<TreeNode<TMeta>>[] = [];
	const visit = (items: readonly TreeNode<TMeta>[]) => {
		for (const node of items) {
			rows.push(rowFromTreeNode(node));
			if (node.children?.length) visit(node.children);
		}
	};
	visit(nodes);
	return rows;
}

function rowFromTreeNode<TMeta>(node: TreeNode<TMeta>): ViewRow<TreeNode<TMeta>> {
	const count = node.count ?? node.children?.length ?? '';
	const detail = detailForNode(node);
	const cells: ViewCell[] = [
		cell(node.id, 'label', node.label, 'text'),
		cell(node.id, 'detail', detail, 'text'),
		cell(node.id, 'count', count, 'number'),
	];
	return {
		id: node.id,
		node,
		label: node.label,
		detail,
		icon: node.icon,
		depth: node.depth,
		cells,
		cls: node.cls,
		layers: layersFromNode(node),
		actions: [],
	};
}

function cell(rowId: string, columnId: string, value: unknown, type: ViewCell['type']): ViewCell {
	const display = value == null ? '' : String(value);
	return { id: `${rowId}:${columnId}`, columnId, value, display, type };
}

function detailForNode<TMeta>(node: TreeNode<TMeta>): string {
	const meta = node.meta as { file?: { path?: string }; folderPath?: string; propType?: string } | undefined;
	return meta?.file?.path ?? meta?.folderPath ?? meta?.propType ?? '';
}

function layersFromNode<TMeta>(node: TreeNode<TMeta>): ViewLayers {
	const meta = node.meta as { layers?: ViewLayers } | undefined;
	return meta?.layers ?? {};
}

export function buildNodeTableColumnDefs<TNode extends NodeBase>(
	columns: readonly ViewColumn<TNode>[],
): ColumnDef<ViewRow<TNode>, unknown>[] {
	return columns.map((column) => ({
		id: column.id,
		header: column.label,
		accessorFn: (row) => valueForColumn(row, column),
		enableSorting: column.sortable === true,
		size: column.width,
		minSize: column.minWidth,
		meta: { viewColumn: column },
	}));
}

function valueForColumn<TNode extends NodeBase>(
	row: ViewRow<TNode>,
	column: ViewColumn<TNode>,
): unknown {
	if (column.getValue) return column.getValue(row.node);
	const cellValue = row.cells.find((cell) => cell.columnId === column.id)?.value;
	if (cellValue !== undefined) return cellValue;
	if (column.id === 'label') return row.label;
	if (column.id === 'detail') return row.detail ?? '';
	return '';
}

export function rowSelectionFromSnapshot(snapshot: NodeSelectionSnapshot): RowSelectionState {
	const out: RowSelectionState = {};
	for (const id of snapshot.ids) out[id] = true;
	return out;
}

export function rowSelectionIds(state: RowSelectionState): string[] {
	return Object.entries(state)
		.filter(([, selected]) => selected)
		.map(([id]) => id);
}

export function resolveRowSelectionUpdate(
	updater: Updater<RowSelectionState>,
	previous: RowSelectionState,
): RowSelectionState {
	return functionalUpdate(updater, previous);
}

export function sortingStateFromViewSort(sort?: { id: string; direction: 'asc' | 'desc' }): SortingState {
	return sort && sort.id !== 'manual' ? [{ id: sort.id, desc: sort.direction === 'desc' }] : [];
}
```

- [ ] **Step 5: Run the adapter test until it passes**

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceViewTableAdapter.test.ts
```

Expected: the adapter test file passes.
