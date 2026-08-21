import type { TreeNode } from '../types/typeTree';

export interface VirtualTreeRow {
	node: TreeNode;
	index: number;
	top: number;
}

export interface VirtualTreeProjection {
	rows: TreeNode[];
	visibleRows: VirtualTreeRow[];
	indexById: Map<string, number>;
	totalHeight: number;
	startIndex: number;
	endIndex: number;
	rowHeight: number;
	topForIndex: (index: number) => number;
}

export interface VirtualTreeProjectionInput {
	nodes: TreeNode[];
	expandedIds: Set<string>;
	scrollTop: number;
	viewportHeight: number;
	rowHeight: number;
	overscan: number;
}

export interface VirtualTreeWindowInput {
	rows: TreeNode[];
	scrollTop: number;
	viewportHeight: number;
	rowHeight: number;
	overscan: number;
}

export function flattenVisibleTree(
	nodes: TreeNode[],
	expandedIds: Set<string>,
): TreeNode[] {
	return flattenVisibleTreeWithChain(nodes, expandedIds).rows;
}

/** The ancestor chain of a row, emitted while flattening instead of searched
 * for later. `parentIndex[i]` is the row index of i's parent, or -1 at the
 * root; `subtreeEnd[i]` is the index one past i's last descendant.
 *
 * Sticky headers need the chain of the first visible row. Walking these two
 * arrays upwards costs O(depth) — at most the stack limit, so about seven
 * steps — where scanning every row above the viewport costs O(scrollTop), and
 * a jump to the end of a long list stalls the frame. */
export interface FlattenedTree {
	rows: TreeNode[];
	parentIndex: number[];
	subtreeEnd: number[];
}

export function flattenVisibleTreeWithChain(
	nodes: TreeNode[],
	expandedIds: Set<string>,
): FlattenedTree {
	const rows: TreeNode[] = [];
	const parentIndex: number[] = [];
	const subtreeEnd: number[] = [];
	const walk = (items: TreeNode[], parent: number): void => {
		for (const item of items) {
			const index = rows.length;
			rows.push(item);
			parentIndex.push(parent);
			subtreeEnd.push(index + 1);
			if (item.children?.length && expandedIds.has(item.id)) {
				walk(item.children, index);
			}
			// Every ancestor now ends after this whole subtree.
			subtreeEnd[index] = rows.length;
			for (let up = parent; up >= 0; up = parentIndex[up] ?? -1) {
				subtreeEnd[up] = rows.length;
			}
		}
	};
	walk(nodes, -1);
	return { rows, parentIndex, subtreeEnd };
}

export function buildVirtualTreeWindow({
	rows,
	scrollTop,
	viewportHeight,
	rowHeight,
	overscan,
}: VirtualTreeWindowInput): Omit<VirtualTreeProjection, 'indexById'> {
	const boundedRowHeight = Math.max(1, rowHeight);
	const safeViewportHeight = Math.max(0, viewportHeight);
	const safeScrollTop = Math.max(0, scrollTop);
	const safeOverscan = Math.max(0, overscan);
	const startIndex = Math.max(
		0,
		Math.floor(safeScrollTop / boundedRowHeight) - safeOverscan,
	);
	const endIndex = Math.min(
		rows.length,
		Math.ceil((safeScrollTop + safeViewportHeight) / boundedRowHeight) +
			safeOverscan,
	);
	const topForIndex = (index: number) => index * boundedRowHeight;

	return {
		rows,
		visibleRows: rows.slice(startIndex, endIndex).map((node, offset) => {
			const index = startIndex + offset;
			return {
				node,
				index,
				top: topForIndex(index),
			};
		}),
		totalHeight: rows.length * boundedRowHeight,
		startIndex,
		endIndex,
		rowHeight: boundedRowHeight,
		topForIndex,
	};
}

export function buildVirtualTreeProjection({
	nodes,
	expandedIds,
	scrollTop,
	viewportHeight,
	rowHeight,
	overscan,
}: VirtualTreeProjectionInput): VirtualTreeProjection {
	const rows = flattenVisibleTree(nodes, expandedIds);
	const indexById = new Map<string, number>();
	rows.forEach((row, index) => {
		if (!indexById.has(row.id)) indexById.set(row.id, index);
	});
	const window = buildVirtualTreeWindow({
		rows,
		scrollTop,
		viewportHeight,
		rowHeight,
		overscan,
	});

	return {
		...window,
		indexById,
	};
}

/**
 * U121-080: rebuild the ancestor chain from an already-flattened row list.
 *
 * `updateExpansion` splices rows in place for speed and never rebuilt these
 * arrays, so every index in them described the PREVIOUS list. Two failures
 * followed, and both were reported: a collapsed folder kept the `subtreeEnd`
 * of its expanded self, so the sticky stack believed its subtree still ran for
 * hundreds of rows and pinned it no matter how far you scrolled; and expanding
 * any parent shifted every index below it, so the chain resolved to rows that
 * were no longer there and nothing became sticky at all until some unrelated
 * event forced a full render.
 *
 * Depth is the only input: the rows are already in visible order, so one pass
 * with a stack recovers both arrays. O(rows) on a structural change, which is
 * not the per-frame path -- the per-frame path reads what this produces.
 */
export function treeChainFromRows(rows: readonly TreeNode[]): {
	parentIndex: number[];
	subtreeEnd: number[];
} {
	const parentIndex = new Array<number>(rows.length).fill(-1);
	const subtreeEnd = new Array<number>(rows.length).fill(0);
	const open: number[] = [];

	for (let index = 0; index < rows.length; index += 1) {
		const depth = rows[index]?.depth ?? 0;
		while (open.length > 0) {
			const top = open[open.length - 1] ?? -1;
			if ((rows[top]?.depth ?? 0) < depth) break;
			// Closing at `index` means "one past my last descendant", which is
			// exactly index for a node whose subtree ended on the row before.
			subtreeEnd[top] = index;
			open.pop();
		}
		parentIndex[index] = open.length > 0 ? (open[open.length - 1] ?? -1) : -1;
		open.push(index);
	}
	while (open.length > 0) {
		const top = open.pop() ?? -1;
		if (top >= 0) subtreeEnd[top] = rows.length;
	}

	return { parentIndex, subtreeEnd };
}
