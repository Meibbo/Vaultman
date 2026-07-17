import { describe, expect, it } from 'vitest';

import {
	activeScopeSort,
	normalizeExplorerSortState,
	replaceActiveScopeSort,
	sameSortProjection,
	sortAllWithDrill,
	sortTwoLevel,
} from '../../src/logic/logicScopedSort';

interface TestNode {
	id: string;
	label: string;
	children?: TestNode[];
}

const byLabel = (direction: 'asc' | 'desc') => (a: TestNode, b: TestNode) =>
	direction === 'asc'
		? a.label.localeCompare(b.label)
		: b.label.localeCompare(a.label);

describe('scoped explorer sort state', () => {
	it.each([false, true])(
		'migrates legacy property sort state without preserving childLevel=%s',
		(childLevel) => {
			const state = normalizeExplorerSortState('props', {
				sortBy: 'count',
				direction: 'desc',
				childLevel,
				nodeTypeFilter: 'property',
			});

			expect(state).toMatchObject({
				activeScope: 'properties',
				sorts: { properties: { sortBy: 'count', direction: 'desc' } },
				nodeTypeFilter: 'property',
			});
			expect(state).not.toHaveProperty('childLevel');
			expect(activeScopeSort('props', state, 'values')).toEqual({
				sortBy: 'name',
				direction: 'asc',
			});
		},
	);

	it('defaults unknown shapes and migrates file modifiers', () => {
		expect(normalizeExplorerSortState('tags', { unexpected: true })).toEqual({
			sorts: {},
			activeScope: 'all',
			drillNodeId: null,
			nodeTypeFilter: null,
		});

		expect(
			normalizeExplorerSortState('files', {
				sortBy: 'modified',
				direction: 'desc',
				childLevel: true,
				nodeTypeFilter: null,
				parentsFirst: false,
			}),
		).toMatchObject({
			activeScope: 'all',
			sorts: { all: { sortBy: 'modified', direction: 'desc' } },
			parentsFirst: false,
		});
	});

	it('falls an orphaned drill scope back to All', () => {
		const saved = {
			sorts: {
				all: { sortBy: 'name', direction: 'asc' },
				drill: { sortBy: 'count', direction: 'desc' },
			},
			activeScope: 'drill',
			drillNodeId: 'tag:#missing',
			nodeTypeFilter: null,
		};

		expect(
			normalizeExplorerSortState('tags', saved, {
				isValidDrillNode: () => false,
			}),
		).toMatchObject({ activeScope: 'all', drillNodeId: null });
		expect(
			normalizeExplorerSortState('tags', saved, {
				isValidDrillNode: (id) => id === 'tag:#missing',
			}),
		).toMatchObject({ activeScope: 'drill', drillNodeId: 'tag:#missing' });
	});

	it('round-trips the full scoped state', () => {
		const state = normalizeExplorerSortState('files', {
			sorts: {
				all: { sortBy: 'name', direction: 'asc' },
				drill: { sortBy: 'modified', direction: 'desc' },
			},
			activeScope: 'drill',
			drillNodeId: 'folder:Projects',
			parentsFirst: false,
			nodeTypeFilter: 'md',
			nodeTypeFilters: ['md', 'canvas'],
		});

		expect(
			normalizeExplorerSortState(
				'files',
				JSON.parse(JSON.stringify(state)) as unknown,
			),
		).toEqual(state);
	});

	it('changes only the active scope sort and ignores scope selection in the render projection', () => {
		const base = normalizeExplorerSortState('tags', {
			sorts: {
				all: { sortBy: 'name', direction: 'asc' },
				drill: { sortBy: 'count', direction: 'desc' },
			},
			activeScope: 'all',
			drillNodeId: 'tag:#parent',
			nodeTypeFilter: null,
		});
		const selected = {
			...base,
			activeScope: 'drill' as const,
			drillNodeId: 'tag:#other-parent',
		};
		const changed = replaceActiveScopeSort('tags', selected, {
			sortBy: 'name',
			direction: 'desc',
		});

		expect(sameSortProjection(base, selected)).toBe(true);
		expect(changed.sorts.all).toEqual(base.sorts.all);
		expect(changed.sorts.drill).toEqual({ sortBy: 'name', direction: 'desc' });
		expect(sameSortProjection(selected, changed)).toBe(false);
	});
});

describe('scoped tree ordering', () => {
	it('sorts property rows and value rows with independent comparators', () => {
		const tree: TestNode[] = [
			{
				id: 'property:zeta',
				label: 'zeta',
				children: [
					{ id: 'value:zeta:a', label: 'alpha' },
					{ id: 'value:zeta:z', label: 'zulu' },
				],
			},
			{ id: 'property:alpha', label: 'alpha' },
		];

		const sorted = sortTwoLevel(tree, byLabel('asc'), byLabel('desc'));

		expect(sorted.map((node) => node.label)).toEqual(['alpha', 'zeta']);
		expect(sorted[1].children?.map((node) => node.label)).toEqual([
			'zulu',
			'alpha',
		]);
	});

	it('uses All recursively and overrides only the selected drill node children', () => {
		const tree: TestNode[] = [
			{
				id: 'tag:#zeta',
				label: 'zeta',
				children: [
					{ id: 'tag:#zeta/a', label: 'alpha' },
					{ id: 'tag:#zeta/z', label: 'zulu' },
				],
			},
			{ id: 'tag:#alpha', label: 'alpha' },
		];

		const drilled = sortAllWithDrill(
			tree,
			byLabel('asc'),
			byLabel('desc'),
			'tag:#zeta',
		);
		const reset = sortAllWithDrill(
			tree,
			byLabel('asc'),
			byLabel('desc'),
			null,
		);

		expect(drilled.map((node) => node.label)).toEqual(['alpha', 'zeta']);
		expect(drilled[1].children?.map((node) => node.label)).toEqual([
			'zulu',
			'alpha',
		]);
		expect(reset[1].children?.map((node) => node.label)).toEqual([
			'alpha',
			'zulu',
		]);
	});
});
