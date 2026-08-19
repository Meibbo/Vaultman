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
