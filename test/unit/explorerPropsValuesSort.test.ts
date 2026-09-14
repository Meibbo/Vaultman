import { describe, expect, it } from 'vitest';
import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';
import { sortTwoLevel, activeScopeSort, normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import type { TreeNode, PropMeta } from '../../src/types/typeTree';

describe('propScene values sort scope on all property types', () => {
	it('does not restrict values sort to list properties in explorerProps.ts', () => {
		expect(propsExplorerSource).not.toContain("!== 'list'");
		expect(propsExplorerSource).not.toContain("debería ordenar los valores solamente de las propiedades tipo lista");
	});

	it('sorts values of non-list properties (text, number, tags, etc.) when values sort is applied', () => {
		const tree: TreeNode<PropMeta>[] = [
			{
				id: 'status',
				label: 'status',
				depth: 0,
				meta: { propName: 'status', propType: 'text', isValueNode: false },
				children: [
					{
						id: 'status::todo',
						label: 'todo',
						depth: 1,
						count: 5,
						meta: { propName: 'status', propType: 'text', isValueNode: true, rawValue: 'todo' },
					},
					{
						id: 'status::done',
						label: 'done',
						depth: 1,
						count: 10,
						meta: { propName: 'status', propType: 'text', isValueNode: true, rawValue: 'done' },
					},
					{
						id: 'status::in-progress',
						label: 'in-progress',
						depth: 1,
						count: 2,
						meta: { propName: 'status', propType: 'text', isValueNode: true, rawValue: 'in-progress' },
					},
				],
			},
			{
				id: 'rating',
				label: 'rating',
				depth: 0,
				meta: { propName: 'rating', propType: 'number', isValueNode: false },
				children: [
					{
						id: 'rating::5',
						label: '5',
						depth: 1,
						count: 1,
						meta: { propName: 'rating', propType: 'number', isValueNode: true, rawValue: '5' },
					},
					{
						id: 'rating::1',
						label: '1',
						depth: 1,
						count: 8,
						meta: { propName: 'rating', propType: 'number', isValueNode: true, rawValue: '1' },
					},
				],
			},
		];

		// Sort values by name asc
		const sortedByNameAsc = sortTwoLevel(
			tree,
			(a, b) => a.label.localeCompare(b.label),
			(a, b) => a.label.localeCompare(b.label),
		);

		expect(sortedByNameAsc[0].children?.map((c) => c.label)).toEqual([
			'1',
			'5',
		]);
		expect(sortedByNameAsc[1].children?.map((c) => c.label)).toEqual([
			'done',
			'in-progress',
			'todo',
		]);

		// Sort values by count desc
		const sortedByCountDesc = sortTwoLevel(
			tree,
			(a, b) => a.label.localeCompare(b.label),
			(a, b) => (b.count ?? 0) - (a.count ?? 0),
		);

		expect(sortedByCountDesc[1].children?.map((c) => c.label)).toEqual([
			'done',
			'todo',
			'in-progress',
		]);
	});

	it('resolves activeScopeSort correctly for values scope in props tab', () => {
		const state = normalizeExplorerSortState('props', {
			activeScope: 'level:2',
			sorts: {
				all: { sortBy: 'name', direction: 'asc' },
				values: { sortBy: 'count', direction: 'desc' },
			},
		});

		expect(activeScopeSort('props', state, 'level:2')).toEqual({
			sortBy: 'count',
			direction: 'desc',
		});
		expect(activeScopeSort('props', state, 'level:1')).toEqual({
			sortBy: 'name',
			direction: 'asc',
		});
	});
});
