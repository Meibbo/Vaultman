import { describe, expect, it } from 'vitest';

import { resolveActiveFilterPresentation } from '../../src/logic/logicActiveFilterBubbling';
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

describe('BT5-038 active-filter presentation', () => {
	it('keeps the exact set for the decoration and dots collapsed ancestors', () => {
		const exact = new Set(['leaf-a']);
		const { exact: keptExact, bubbled } = resolveActiveFilterPresentation(
			tree,
			new Set(['root']),
			exact,
		);
		// The decoration stays on the real filter only; the collapsed ancestor
		// hiding it gets a dot, never the decoration.
		expect(keptExact).toBe(exact);
		expect([...bubbled].sort()).toEqual(['branch']);
	});

	it('does not dot through an expanded parent', () => {
		const { bubbled } = resolveActiveFilterPresentation(
			tree,
			new Set(['root', 'branch']),
			new Set(['leaf-a']),
		);
		expect(bubbled.size).toBe(0);
	});

	it('dots every collapsed visible ancestor in a deep tree', () => {
		const { bubbled } = resolveActiveFilterPresentation(
			tree,
			new Set(),
			new Set(['leaf-a']),
		);
		expect([...bubbled].sort()).toEqual(['branch', 'root']);
	});

	it('never dots a node that is itself an exact filter', () => {
		// branch is an exact filter hiding leaf-a; root only hides them.
		const exact = new Set(['branch', 'leaf-a']);
		const { bubbled } = resolveActiveFilterPresentation(tree, new Set(), exact);
		// branch keeps the decoration (not a dot); root gets the dot.
		expect(bubbled.has('branch')).toBe(false);
		expect([...bubbled]).toEqual(['root']);
	});

	it('returns an empty bubble set for no filters', () => {
		const exact = new Set<string>();
		const { exact: kept, bubbled } = resolveActiveFilterPresentation(
			tree,
			new Set(),
			exact,
		);
		expect(kept).toBe(exact);
		expect(bubbled.size).toBe(0);
	});
});
