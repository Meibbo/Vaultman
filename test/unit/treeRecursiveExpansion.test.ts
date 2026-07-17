import { describe, expect, it } from 'vitest';

import { collectExpandableSubtreeIds } from '../../src/logic/logicTreeExpansion';
import type { TreeNode } from '../../src/types/typeTree';

describe('recursive tree expansion', () => {
	it('collects the pressed parent and every descendant that can expand', () => {
		const tree: TreeNode = {
			id: 'root',
			label: 'Root',
			depth: 0,
			meta: {},
			children: [
				{ id: 'leaf-a', label: 'Leaf A', depth: 1, meta: {} },
				{
					id: 'parent-b',
					label: 'Parent B',
					depth: 1,
					meta: {},
					children: [
						{
							id: 'parent-c',
							label: 'Parent C',
							depth: 2,
							meta: {},
							children: [{ id: 'leaf-d', label: 'Leaf D', depth: 3, meta: {} }],
						},
					],
				},
			],
		};

		expect(collectExpandableSubtreeIds(tree)).toEqual([
			'root',
			'parent-b',
			'parent-c',
		]);
	});

	it('does not mark a leaf as expanded', () => {
		const leaf: TreeNode = {
			id: 'leaf',
			label: 'Leaf',
			depth: 0,
			meta: {},
		};
		expect(collectExpandableSubtreeIds(leaf)).toEqual([]);
	});

	it('handles a deeply nested hierarchy without recursive stack growth', () => {
		const root: TreeNode = {
			id: 'node-0',
			label: 'Node 0',
			depth: 0,
			meta: {},
		};
		let cursor = root;
		for (let depth = 1; depth <= 2_000; depth += 1) {
			const child: TreeNode = {
				id: `node-${depth}`,
				label: `Node ${depth}`,
				depth,
				meta: {},
			};
			cursor.children = [child];
			cursor = child;
		}

		expect(collectExpandableSubtreeIds(root)).toHaveLength(2_000);
	});
});
