import { describe, expect, it } from 'vitest';

import {
	flattenTreeToPathLabels,
	groupRootHierarchy,
} from '../../src/logic/logicExplorerHierarchy';
import type { TreeNode } from '../../src/types/typeTree';

function node(
	id: string,
	label: string,
	children: TreeNode[] = [],
): TreeNode {
	return {
		id,
		label,
		children,
		depth: 0,
		meta: { id },
	};
}

describe('explorer hierarchy projections', () => {
	it('flattens nested rows into path-style labels without changing node identity', () => {
		const tree = [
			node('alpha', 'alpha', [
				node('alpha/beta', 'beta', [node('alpha/beta/note.md', 'note')]),
			]),
		];

		const flat = flattenTreeToPathLabels(tree);

		expect(flat.map((item) => item.id)).toEqual([
			'alpha',
			'alpha/beta',
			'alpha/beta/note.md',
		]);
		expect(flat.map((item) => item.label)).toEqual([
			'alpha',
			'alpha/beta',
			'alpha/beta/note',
		]);
		expect(flat.map((item) => item.depth)).toEqual([0, 0, 0]);
		expect(flat.every((item) => item.children?.length === 0)).toBe(true);
	});

	it('includes parent tags with direct occurrences (count > 0) in simple mode, stripped of children', () => {
		const treeWithCounts: TreeNode[] = [
			{ ...node('daily', 'daily'), count: 3 },
			{
				...node('work', 'work', [node('work/tasks', 'tasks')]),
				count: 5,
			},
			{
				...node('archive', 'archive', [node('archive/2024', '2024')]),
				count: 0,
			},
		];

		const simple = groupRootHierarchy(treeWithCounts, 'simple');

		expect(simple.map((item) => item.id)).toEqual(['daily', 'work']);
		expect(simple.find((item) => item.id === 'work')?.children).toHaveLength(0);
		expect(simple.find((item) => item.id === 'archive')).toBeUndefined();
	});

	it('keeps root simple tags separate from root nested tag families', () => {
		const tree = [
			node('daily', 'daily'),
			node('people', 'people', [node('people/birthdays', 'birthdays')]),
			node('projects', 'projects', [
				node('projects/vaultman', 'vaultman', [
					node('projects/vaultman/release', 'release'),
				]),
			]),
		];

		const simple = groupRootHierarchy(tree, 'simple');
		const nested = groupRootHierarchy(tree, 'nested');
		const all = groupRootHierarchy(tree, 'all');

		expect(simple.map((item) => item.id)).toEqual(['daily']);
		expect(nested.map((item) => item.id)).toEqual(['people', 'projects']);
		expect(nested[1].children?.[0].children?.[0].id).toBe(
			'projects/vaultman/release',
		);
		expect(all.map((item) => item.id)).toEqual([
			'daily',
			'people',
			'projects',
		]);
	});
});
