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
	const rows: TreeNode[] = [];
	const walk = (items: TreeNode[]): void => {
		for (const item of items) {
			rows.push(item);
			if (item.children?.length && expandedIds.has(item.id)) {
				walk(item.children);
			}
		}
	};
	walk(nodes);
	return rows;
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
