import { describe, expect, it } from 'vitest';

import {
	activeScopeSort,
	isSortOptionVisible,
	normalizeExplorerSortState,
	replaceActiveScopeSort,
	sameExplorerSortState,
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

			// U121-079: a legacy state carried ONE sort, and it meant the whole
			// tree. It now lands in `all` -- propScene's new default scope -- so
			// the values follow it instead of quietly reverting to name/asc.
			expect(state).toMatchObject({
				activeScope: 'all',
				sorts: { all: { sortBy: 'count', direction: 'desc' } },
				nodeTypeFilter: 'property',
			});
			expect(state).not.toHaveProperty('childLevel');
			expect(activeScopeSort('props', state, 'values')).toEqual({
				sortBy: 'count',
				direction: 'desc',
			});
		},
	);

	it('defaults unknown shapes and migrates file modifiers', () => {
		// U121-029: the node providers carry the narrowing state explicitly, so an
		// undefined here cannot read as a change against a false there. Add-on
		// explorers project no property set and keep the older, smaller shape.
		expect(normalizeExplorerSortState('tags', { unexpected: true })).toEqual({
			sorts: {},
			activeScope: 'all',
			drillNodeId: null,
			nodeTypeFilter: null,
			filtered: false,
			revealAnchor: 'current-file',
			revealAnchorPath: null,
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

	it('uses one flat All scope for add-on explorers', () => {
		for (const tab of ['snippets', 'plugins'] as const) {
			const state = normalizeExplorerSortState(tab, null);
			expect(state).toEqual({
				sorts: {},
				activeScope: 'all',
				nodeTypeFilter: null,
			});
			expect(activeScopeSort(tab, state)).toEqual({
				sortBy: 'name',
				direction: 'asc',
			});
		}
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

	// U121-079: the reported symptom. With sort_preset=custom and the scope
	// drawer untouched, only the node_props reordered while the node_values
	// stayed alphabetical -- one sort applying to one level of the same tree.
	it('reaches the values when custom is chosen on the whole tree', () => {
		const state = normalizeExplorerSortState('props', {
			sorts: { all: { sortBy: 'custom', direction: 'asc' } },
			activeScope: 'all',
			nodeTypeFilter: null,
		});

		expect(activeScopeSort('props', state, 'properties')).toEqual({
			sortBy: 'custom',
			direction: 'asc',
		});
		expect(activeScopeSort('props', state, 'values')).toEqual({
			sortBy: 'custom',
			direction: 'asc',
		});
	});

	// ...but a scope the user set on purpose still wins over the tree-wide one.
	it('lets an explicit values scope override the tree-wide sort', () => {
		const state = normalizeExplorerSortState('props', {
			sorts: {
				all: { sortBy: 'custom', direction: 'asc' },
				values: { sortBy: 'count', direction: 'desc' },
			},
			activeScope: 'all',
			nodeTypeFilter: null,
		});

		expect(activeScopeSort('props', state, 'values')).toEqual({
			sortBy: 'count',
			direction: 'desc',
		});
		expect(activeScopeSort('props', state, 'properties')).toEqual({
			sortBy: 'custom',
			direction: 'asc',
		});
	});

	it('round-trips semantic sorts and sanitizes Type from Props values', () => {
		const snippets = normalizeExplorerSortState('snippets', {
			sorts: { all: { sortBy: 'state', direction: 'desc' } },
			activeScope: 'all',
			nodeTypeFilter: null,
		});
		const properties = normalizeExplorerSortState('props', {
			sorts: {
				properties: { sortBy: 'type', direction: 'asc' },
				values: { sortBy: 'type', direction: 'desc' },
			},
			activeScope: 'properties',
			nodeTypeFilter: null,
		});
		const tags = normalizeExplorerSortState('tags', {
			sorts: { all: { sortBy: 'type', direction: 'desc' } },
			activeScope: 'all',
			drillNodeId: null,
			nodeTypeFilter: null,
		});

		expect(snippets.sorts.all).toEqual({
			sortBy: 'state',
			direction: 'desc',
		});
		expect(properties.sorts.properties).toEqual({
			sortBy: 'type',
			direction: 'asc',
		});
		expect(properties.sorts.values).toBeUndefined();
		expect(activeScopeSort('props', properties, 'values')).toEqual({
			sortBy: 'name',
			direction: 'asc',
		});
		expect(tags.sorts.all).toEqual({
			sortBy: 'type',
			direction: 'desc',
		});
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
		const reset = sortAllWithDrill(tree, byLabel('asc'), byLabel('desc'), null);

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

describe('By level phase 2 (BT4-009 / D29+D33)', () => {
	it('defaults and normalizes fixedFolders for files only', () => {
		const files = normalizeExplorerSortState('files', null);
		expect(files.fixedFolders).toBe(true);
		expect(files.parentsFirst).toBe(true);
		const kept = normalizeExplorerSortState('files', {
			...files,
			fixedFolders: false,
		});
		expect(kept.fixedFolders).toBe(false);
		expect(
			sameExplorerSortState(files, { ...files, fixedFolders: false }),
		).toBe(false);
		expect(
			normalizeExplorerSortState('tags', null).fixedFolders,
		).toBeUndefined();
	});

	it('hides contextually meaningless sort options', () => {
		expect(
			isSortOptionVisible('path', {
				tab: 'files',
				nestedActive: true,
				activeScope: 'all',
			}),
		).toBe(false);
		expect(
			isSortOptionVisible('path', {
				tab: 'files',
				nestedActive: false,
				activeScope: 'all',
			}),
		).toBe(true);
		expect(
			isSortOptionVisible('sub', {
				tab: 'props',
				nestedActive: true,
				activeScope: 'values',
			}),
		).toBe(false);
		expect(
			isSortOptionVisible('sub', {
				tab: 'props',
				nestedActive: true,
				activeScope: 'properties',
			}),
		).toBe(true);
		expect(
			isSortOptionVisible('type', {
				tab: 'props',
				nestedActive: true,
				activeScope: 'values',
			}),
		).toBe(false);
		expect(
			isSortOptionVisible('name', {
				tab: 'files',
				nestedActive: true,
				activeScope: 'all',
			}),
		).toBe(true);
	});
});
