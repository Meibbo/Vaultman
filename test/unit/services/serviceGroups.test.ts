import { describe, expect, it } from 'vitest';
import {
	createLogicGroup,
	groupQueueChangesByAction,
	moveFilterNodeWithinParent,
} from '../../../src/services/serviceGroups';
import type { QueueChange } from '../../../src/types/typeContracts';
import type { FilterGroup, FilterRule } from '../../../src/types/typeFilter';

function rule(id: string, property: string): FilterRule {
	return {
		id,
		type: 'rule',
		filterType: 'has_property',
		property,
		values: [],
		enabled: true,
	};
}

function queueChange(id: string, action: string, type: QueueChange['change']['type']): QueueChange {
	return {
		id,
		group: type,
		change: {
			id,
			type,
			action,
			details: `${action} ${type}`,
			files: [],
			customLogic: true,
			logicFunc: () => null,
		} as QueueChange['change'],
	};
}

describe('serviceGroups', () => {
	it('creates visible enabled logic groups with normalized logic', () => {
		const group = createLogicGroup({ id: 'logic-1', logic: 'any', label: 'Scope' });

		expect(group).toMatchObject({
			id: 'logic-1',
			type: 'group',
			kind: 'logic_group',
			logic: 'or',
			label: 'Scope',
			enabled: true,
			children: [],
		});
	});

	it('reorders filter nodes inside the same parent before or after a target', () => {
		const parent: FilterGroup = {
			id: 'root',
			type: 'group',
			logic: 'and',
			children: [rule('a', 'alpha'), rule('b', 'beta'), rule('c', 'gamma')],
		};

		expect(moveFilterNodeWithinParent(parent, 'c', 'a', 'before')).toBe(true);
		expect(parent.children.map((child) => child.id)).toEqual(['c', 'a', 'b']);

		expect(moveFilterNodeWithinParent(parent, 'c', 'b', 'after')).toBe(true);
		expect(parent.children.map((child) => child.id)).toEqual(['a', 'b', 'c']);
	});

	it('keeps invalid same-parent reorder requests as no-ops', () => {
		const parent: FilterGroup = {
			id: 'root',
			type: 'group',
			logic: 'and',
			children: [rule('a', 'alpha'), rule('b', 'beta')],
		};

		expect(moveFilterNodeWithinParent(parent, 'a', 'a', 'after')).toBe(false);
		expect(moveFilterNodeWithinParent(parent, 'missing', 'b', 'before')).toBe(false);
		expect(parent.children.map((child) => child.id)).toEqual(['a', 'b']);
	});

	it('projects queue changes under stable action group rows', () => {
		const rows = groupQueueChangesByAction([
			queueChange('set-1', 'set', 'property'),
			queueChange('add-1', 'add', 'tag'),
			queueChange('set-2', 'set', 'tag'),
		]);

		expect(rows.map((row) => row.id)).toEqual([
			'queue-action:set',
			'set-1',
			'set-2',
			'queue-action:add',
			'add-1',
		]);
		expect(rows[0]).toMatchObject({ kind: 'group', label: 'set', count: 2, depth: 0 });
		expect(rows[1]).toMatchObject({ id: 'set-1', depth: 1 });
		expect(rows[3]).toMatchObject({ kind: 'group', label: 'add', count: 1, depth: 0 });
	});
});
