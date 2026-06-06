import { describe, expect, it } from 'vitest';

import {
	filterGroupToBasesFilters,
	translateBasesFilterExpression,
	translateBasesFiltersToVaultman,
} from '../../src/utils/basesFilterInterop';
import type { FilterGroup } from '../../src/types/typeFilter';

describe('Bases filter interop', () => {
	it('translates supported Bases filter expressions into Vaultman rules', () => {
		expect(translateBasesFilterExpression('file.hasTag("project")')).toMatchObject({
			type: 'rule',
			filterType: 'has_tag',
			values: ['project'],
		});
		expect(translateBasesFilterExpression('file.ext == "base"')).toMatchObject({
			type: 'rule',
			filterType: 'file_name',
			values: ['.base'],
		});
		expect(translateBasesFilterExpression('status == "done"')).toMatchObject({
			type: 'rule',
			filterType: 'specific_value',
			property: 'status',
			values: ['done'],
		});
	});

	it('translates recursive Bases and/or/not filters', () => {
		const group = translateBasesFiltersToVaultman({
			and: [
				'file.inFolder("Projects")',
				{ or: ['status == "done"', 'status == "active"'] },
				{ not: ['file.hasTag("archived")'] },
			],
		});

		expect(group.logic).toBe('all');
		expect(group.children).toHaveLength(3);
		expect(group.children[0]).toMatchObject({
			type: 'rule',
			filterType: 'folder',
			values: ['Projects'],
		});
		expect(group.children[1]).toMatchObject({
			type: 'group',
			logic: 'any',
		});
		expect(group.children[2]).toMatchObject({
			type: 'group',
			logic: 'none',
		});
	});

	it('exports supported Vaultman filters back to Bases expressions', () => {
		const group: FilterGroup = {
			type: 'group',
			logic: 'all',
			id: 'root',
			enabled: true,
			children: [
				{
					type: 'rule',
					filterType: 'has_tag',
					property: '',
					values: ['project'],
				},
				{
					type: 'rule',
					filterType: 'specific_value',
					property: 'status',
					values: ['done'],
				},
			],
		};

		expect(filterGroupToBasesFilters(group)).toEqual({
			and: ['file.hasTag("project")', 'status == "done"'],
		});
	});
});
