import { describe, expect, it } from 'vitest';

import type { TreeNode } from '../../src/types/typeTree';
import {
	flattenVisibleTreeWithChain,
	treeChainFromRows,
} from '../../src/utils/treeVirtualization';

const row = (id: string, depth: number): TreeNode => ({
	id,
	label: id,
	depth,
	meta: {},
});

describe('U121-080 rebuilding the ancestor chain from spliced rows', () => {
	it('agrees with the flattener on the same shape', () => {
		const tree: TreeNode[] = [
			{
				id: 'a',
				label: 'a',
				depth: 0,
				meta: {},
				children: [
					{ id: 'a/b', label: 'b', depth: 1, meta: {} },
					{
						id: 'a/c',
						label: 'c',
						depth: 1,
						meta: {},
						children: [
							{ id: 'a/c/d', label: 'd', depth: 2, meta: {} },
						],
					},
				],
			},
			{ id: 'e', label: 'e', depth: 0, meta: {} },
		];
		const expanded = new Set(['a', 'a/c']);
		const flattened = flattenVisibleTreeWithChain(tree, expanded);

		const rebuilt = treeChainFromRows(flattened.rows);

		expect(rebuilt.parentIndex).toEqual(flattened.parentIndex);
		expect(rebuilt.subtreeEnd).toEqual(flattened.subtreeEnd);
	});

	it('closes a collapsed parent at itself, so it stops claiming a subtree', () => {
		// The reported failure: '+' collapsed kept the subtreeEnd it had while
		// expanded, so the sticky stack pinned it for the whole tree.
		const collapsed = [row('+', 0), row('Canvas Bases', 0), row('x', 0)];

		const { parentIndex, subtreeEnd } = treeChainFromRows(collapsed);

		expect(parentIndex).toEqual([-1, -1, -1]);
		expect(subtreeEnd).toEqual([1, 2, 3]);
	});

	it('reparents everything below an expansion instead of shifting stale indices', () => {
		const expandedFirst = [
			row('+', 0),
			row('+/one', 1),
			row('+/two', 1),
			row('Canvas Bases', 0),
		];

		const { parentIndex, subtreeEnd } = treeChainFromRows(expandedFirst);

		expect(parentIndex).toEqual([-1, 0, 0, -1]);
		expect(subtreeEnd).toEqual([3, 2, 3, 4]);
	});

	it('runs a nested subtree to the end of the list', () => {
		const rows = [row('a', 0), row('a/b', 1), row('a/b/c', 2)];

		expect(treeChainFromRows(rows)).toEqual({
			parentIndex: [-1, 0, 1],
			subtreeEnd: [3, 3, 3],
		});
	});

	it('answers an empty list without inventing rows', () => {
		expect(treeChainFromRows([])).toEqual({ parentIndex: [], subtreeEnd: [] });
	});
});
