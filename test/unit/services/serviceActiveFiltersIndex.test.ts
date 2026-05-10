import { describe, it, expect } from 'vitest';
import { createActiveFiltersIndex } from '../../../src/index/indexActiveFilters';
import type { ActiveFilterEntry, IFilterService } from '../../../src/types/typeContracts';
import type { FilterGroup, FilterNode, FilterRule } from '../../../src/types/typeFilter';

function stubFilter(rules: FilterNode[] = []): IFilterService {
	return {
		activeFilter: {
			type: 'group',
			logic: 'all',
			children: rules,
			id: 'root',
			enabled: true,
		},
		filteredFiles: [],
		selectedFiles: [],
		setFilter: () => {},
		clearFilters: () => {},
		addNode: () => {},
		removeNode: () => {},
		removeNodeByProperty: () => {},
		setSelectedFiles: () => {},
		subscribe: () => () => {},
	};
}

describe('serviceActiveFiltersIndex', () => {
	it('flattens active rules into nodes', async () => {
		const rule: FilterRule = {
			type: 'rule',
			filterType: 'has_property',
			property: 'status',
			values: ['draft'],
			id: 'r1',
			enabled: true,
		};
		const idx = createActiveFiltersIndex(stubFilter([rule]));
		await idx.refresh();
		expect(idx.nodes.length).toBe(1);
		expect(idx.nodes[0].rule.property).toBe('status');
	});

	it('returns empty nodes when filter has no rules', async () => {
		const idx = createActiveFiltersIndex(stubFilter([]));
		await idx.refresh();
		expect(idx.nodes.length).toBe(0);
	});

	it('uses rule.id when provided', async () => {
		const rule: FilterRule = {
			type: 'rule',
			filterType: 'has_property',
			property: 'tag',
			values: [],
			id: 'stable-id',
			enabled: true,
		};
		const idx = createActiveFiltersIndex(stubFilter([rule]));
		await idx.refresh();
		expect(idx.nodes[0].id).toBe('stable-id');
	});

	it('generates an id when rule.id is undefined', async () => {
		const rule: FilterRule = {
			type: 'rule',
			filterType: 'missing_property',
			property: 'author',
			values: [],
		};
		const idx = createActiveFiltersIndex(stubFilter([rule]));
		await idx.refresh();
		expect(idx.nodes[0].id).toBeTruthy();
	});

	it('byId returns the matching node', async () => {
		const rule: FilterRule = {
			type: 'rule',
			filterType: 'has_property',
			property: 'x',
			values: [],
			id: 'node-id',
		};
		const idx = createActiveFiltersIndex(stubFilter([rule]));
		await idx.refresh();
		expect(idx.byId('node-id')?.rule.property).toBe('x');
	});

	it('keeps user logic groups visible with nested rule children indented', async () => {
		const filter: IFilterService = {
			activeFilter: {
				type: 'group',
				logic: 'all',
				id: 'root',
				children: [
					{
						type: 'rule',
						filterType: 'has_property',
						property: 'a',
						values: [],
						id: 'r-a',
					},
					{
						type: 'group',
						logic: 'any',
						id: 'inner',
						children: [
							{
								type: 'rule',
								filterType: 'has_property',
								property: 'b',
								values: [],
								id: 'r-b',
							},
						],
					},
				],
			},
			filteredFiles: [],
			selectedFiles: [],
			setFilter: () => {},
			clearFilters: () => {},
			addNode: () => {},
			removeNode: () => {},
			removeNodeByProperty: () => {},
			setSelectedFiles: () => {},
			subscribe: () => () => {},
		};
		const idx = createActiveFiltersIndex(filter);
		await idx.refresh();

		expect(idx.nodes.map((node) => node.id)).toEqual(['r-a', 'inner', 'r-b']);
		expect(idx.nodes.map((node) => node.kind)).toEqual(['rule', 'group', 'rule']);
		expect(idx.nodes.map((node) => node.depth)).toEqual([0, 0, 1]);
		expect((idx.nodes[2] as Extract<ActiveFilterEntry, { kind: 'rule' }>).parent?.id).toBe(
			'inner',
		);
	});

	it('keeps selected-files as a group row with file children', async () => {
		const selectedGroup: FilterGroup = {
			type: 'group',
			logic: 'any',
			id: 'selected-files',
			kind: 'selected_files',
			label: '2 selected files',
			children: [
				{
					type: 'rule',
					filterType: 'file_path',
					property: '',
					values: ['Notes/A.md'],
					id: 'selected-file:Notes/A.md',
				},
				{
					type: 'rule',
					filterType: 'file_path',
					property: '',
					values: ['Notes/B.md'],
					id: 'selected-file:Notes/B.md',
				},
			],
		};
		const idx = createActiveFiltersIndex(stubFilter([selectedGroup]));
		await idx.refresh();

		const nodes = idx.nodes as Array<ActiveFilterEntry & { group?: FilterGroup }>;

		expect(nodes.map((entry) => entry.id)).toEqual([
			'selected-files',
			'selected-file:Notes/A.md',
			'selected-file:Notes/B.md',
		]);
		expect(nodes.map((entry) => entry.kind)).toEqual(['group', 'rule', 'rule']);
		expect(nodes.map((entry) => entry.depth)).toEqual([0, 1, 1]);
		expect(nodes[0].group).toBe(selectedGroup);
		expect(nodes[1].parent).toBe(selectedGroup);
		expect(nodes[2].parent).toBe(selectedGroup);
	});

	it('includes file explorer search terms as virtual active filter rules', async () => {
		const filter = {
			...stubFilter([]),
			getSearchFilterRules: () => [
				{
					type: 'rule',
					filterType: 'file_name',
					property: '',
					values: ['daily'],
					id: 'search:file_name',
					enabled: true,
				},
				{
					type: 'rule',
					filterType: 'file_folder',
					property: '',
					values: ['Journal'],
					id: 'search:file_folder',
					enabled: true,
				},
			],
		};

		const idx = createActiveFiltersIndex(filter);
		await idx.refresh();

		expect(idx.nodes.map((entry) => entry.id)).toEqual(['search:file_name', 'search:file_folder']);
		expect(idx.nodes.every((entry) => entry.source === 'search')).toBe(true);
	});
});
