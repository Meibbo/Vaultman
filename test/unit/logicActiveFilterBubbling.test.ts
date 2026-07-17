import { describe, expect, it } from 'vitest';

import { resolvePresentedActiveFilterIds } from '../../src/logic/logicActiveFilterBubbling';
import type { TreeNode } from '../../src/types/typeTree';

function node(
	id: string,
	children: TreeNode[] = [],
	depth = 0,
): TreeNode {
	return {
		id,
		label: id,
		depth,
		meta: {},
		children,
	};
}

const tree = [
	node('root', [
		node('branch', [node('leaf-a', [], 2), node('leaf-b', [], 2)], 1),
	], 0),
];

describe('active-filter cell bubbling', () => {
	it('bubbles a hidden active child to its collapsed parent', () => {
		const exact = new Set(['leaf-a']);
		const presented = resolvePresentedActiveFilterIds(
			tree,
			new Set(['root']),
			exact,
		);

		expect([...presented].sort()).toEqual(['branch', 'leaf-a']);
		expect([...exact]).toEqual(['leaf-a']);
	});

	it('does not bubble through an expanded parent', () => {
		const exact = new Set(['leaf-a']);
		const presented = resolvePresentedActiveFilterIds(
			tree,
			new Set(['root', 'branch']),
			exact,
		);

		expect(presented).toBe(exact);
	});

	it('bubbles to the highest collapsed visible ancestor in a deep tree', () => {
		const exact = new Set(['leaf-a']);
		const presented = resolvePresentedActiveFilterIds(tree, new Set(), exact);

		expect([...presented].sort()).toEqual(['branch', 'leaf-a', 'root']);
	});

	it('deduplicates several active descendants and preserves direct parents', () => {
		const exact = new Set(['branch', 'leaf-a', 'leaf-b']);
		const presented = resolvePresentedActiveFilterIds(
			tree,
			new Set(['root']),
			exact,
		);

		expect([...presented].sort()).toEqual(['branch', 'leaf-a', 'leaf-b']);
		expect(presented).toBe(exact);
	});

	it('keeps the empty set reference and skips traversal work', () => {
		const exact = new Set<string>();
		expect(resolvePresentedActiveFilterIds(tree, new Set(), exact)).toBe(exact);
	});
});
