import { describe, expect, it, vi } from 'vitest';

import {
	activeFilterDragSelection,
	setVaultmanDragPayload,
	withActiveFilterDragSelection,
} from '../../src/utils/dragPayload';
import type { FilterGroup } from '../../src/types/typeFilter';

describe('setVaultmanDragPayload', () => {
	it('stores a JSON Vaultman payload and readable text fallback', () => {
		const setData = vi.fn();
		const event = {
			dataTransfer: {
				setData,
				effectAllowed: '',
			},
		} as unknown as DragEvent;

		setVaultmanDragPayload(event, { kind: 'file', path: 'Notes/a.md' });

		expect(setData).toHaveBeenCalledWith(
			'application/x-vaultman-node',
			JSON.stringify({ kind: 'file', path: 'Notes/a.md' }),
		);
		expect(setData).toHaveBeenCalledWith('text/plain', 'Notes/a.md');
		expect(event.dataTransfer?.effectAllowed).toBe('copyMove');
	});

	it('derives temporary drag selection from active property filters', () => {
		const filter: FilterGroup = {
			type: 'group',
			logic: 'all',
			children: [
				{
					type: 'rule',
					filterType: 'has_property',
					property: 'Birthday',
					values: [],
					enabled: true,
				},
				{
					type: 'rule',
					filterType: 'specific_value',
					property: 'status',
					values: ['active'],
					enabled: true,
				},
			],
		};

		expect(activeFilterDragSelection(filter, 'props')).toEqual([
			{ kind: 'property', property: 'Birthday' },
			{
				kind: 'property-value',
				property: 'status',
				value: 'active',
				mode: 'property-value',
			},
		]);
	});

	it('attaches multi-node selection only when dragging an active filtered node', () => {
		const filter: FilterGroup = {
			type: 'group',
			logic: 'all',
			children: [
				{
					type: 'rule',
					filterType: 'has_tag',
					property: '',
					values: ['#project'],
				},
				{
					type: 'rule',
					filterType: 'has_tag',
					property: '',
					values: ['#journal'],
				},
			],
		};

		expect(
			withActiveFilterDragSelection(
				{ kind: 'tag', tagPath: 'project' },
				filter,
				'tags',
			),
		).toEqual({
			kind: 'tag',
			tagPath: 'project',
			selection: [
				{ kind: 'tag', tagPath: 'project' },
				{ kind: 'tag', tagPath: 'journal' },
			],
		});
		expect(
			withActiveFilterDragSelection(
				{ kind: 'tag', tagPath: 'other' },
				filter,
				'tags',
			),
		).toEqual({ kind: 'tag', tagPath: 'other' });
	});
});
