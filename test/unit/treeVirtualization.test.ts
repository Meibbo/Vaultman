import { describe, expect, it } from 'vitest';

import type { TreeNode } from '../../src/types/typeTree';
import {
	buildVirtualTreeProjection,
	flattenVisibleTree,
} from '../../src/utils/treeVirtualization';

function node(id: string, depth: number, children: TreeNode[] = []): TreeNode {
	return {
		id,
		label: id,
		depth,
		children,
		meta: {},
	};
}

describe('tree virtualization model', () => {
	it('sets the full scroll height immediately and renders only the visible window', () => {
		const nodes = [
			node('a', 0, [node('a-1', 1), node('a-2', 1)]),
			node('b', 0, [node('b-1', 1), node('b-2', 1)]),
			node('c', 0, [node('c-1', 1), node('c-2', 1)]),
		];
		const expandedIds = new Set(['a', 'b', 'c']);
		const rowHeight = 28;

		const projection = buildVirtualTreeProjection({
			nodes,
			expandedIds,
			scrollTop: rowHeight * 3,
			viewportHeight: rowHeight * 2,
			rowHeight,
			overscan: 1,
		});

		expect(
			flattenVisibleTree(nodes, expandedIds).map((item) => item.id),
		).toEqual(['a', 'a-1', 'a-2', 'b', 'b-1', 'b-2', 'c', 'c-1', 'c-2']);
		expect(projection.totalHeight).toBe(9 * rowHeight);
		expect(projection.startIndex).toBe(2);
		expect(projection.endIndex).toBe(6);
		expect(projection.visibleRows.map((row) => row.node.id)).toEqual([
			'a-2',
			'b',
			'b-1',
			'b-2',
		]);
		expect(projection.indexById.get('b-1')).toBe(4);
		expect(projection.topForIndex(8)).toBe(8 * rowHeight);
	});
});
