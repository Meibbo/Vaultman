import { describe, expect, it } from 'vitest';
import {
	activeFilterDetail,
	activeFilterLabel,
	canReorderActiveFilterEntries,
} from '../../../src/services/serviceActiveFilterPresentation';
import type { ActiveFilterEntry } from '../../../src/types/typeContracts';
import type { FilterGroup, FilterRule } from '../../../src/types/typeFilter';

describe('serviceActiveFilterPresentation', () => {
	it('labels active filter rules without Svelte component helpers', () => {
		expect(activeFilterLabel(rule({ filterType: 'has_property', property: 'status' }))).toBe(
			'has: status',
		);
		expect(
			activeFilterLabel(
				rule({ filterType: 'multiple_values', property: 'status', values: ['todo', 'done'] }),
			),
		).toBe('status: todo, done');
		expect(activeFilterLabel(rule({ filterType: 'file_name', values: ['daily'] }))).toBe(
			'name: daily',
		);
		expect(activeFilterLabel(rule({ filterType: 'file_folder', values: ['Journal'] }))).toBe(
			'folder: Journal',
		);
	});

	it('presents selected-file groups and children with stable details', () => {
		const group: FilterGroup = {
			type: 'group',
			logic: 'any',
			id: 'selected-files',
			kind: 'selected_files',
			label: '2 selected files',
			children: [],
		};
		const groupEntry: ActiveFilterEntry = {
			id: 'selected-files',
			kind: 'group',
			group,
		};
		const child = rule({ id: 'selected-file:Notes/A.md', filterType: 'file_path', values: ['Notes/A.md'] }, group);

		expect(activeFilterLabel(groupEntry)).toBe('2 selected files');
		expect(activeFilterDetail(groupEntry)).toBe('0 files');
		expect(activeFilterLabel(child)).toBe('file: Notes/A.md');
		expect(activeFilterDetail(child)).toBe('selected file');
	});

	it('keeps reorder boundaries pure and side-effect free', () => {
		const root: FilterGroup = { type: 'group', logic: 'all', id: 'root', children: [] };
		const nested: FilterGroup = { type: 'group', logic: 'any', id: 'nested', children: [] };
		const source = rule({ id: 'source', filterType: 'has_property', property: 'status' }, root);
		const sameParentTarget = rule({ id: 'target', filterType: 'has_property', property: 'owner' }, root);
		const nestedTarget = rule({ id: 'nested-target', filterType: 'has_property', property: 'due' }, nested);
		const searchTarget = {
			...sameParentTarget,
			id: 'search:file_name',
			source: 'search' as const,
		};

		expect(canReorderActiveFilterEntries({ source, target: sameParentTarget, root })).toBe(true);
		expect(canReorderActiveFilterEntries({ source, target: nestedTarget, root })).toBe(false);
		expect(canReorderActiveFilterEntries({ source, target: searchTarget, root })).toBe(false);
	});
});

function rule(
	input: Partial<FilterRule> & { filterType: FilterRule['filterType']; id?: string },
	parent?: FilterGroup,
): ActiveFilterEntry {
	return {
		id: input.id ?? `${input.filterType}:${input.property ?? input.values?.[0] ?? 'rule'}`,
		kind: 'rule',
		parent,
		rule: {
			type: 'rule',
			id: input.id,
			filterType: input.filterType,
			property: input.property ?? '',
			values: input.values ?? [],
			enabled: input.enabled,
		},
	};
}
