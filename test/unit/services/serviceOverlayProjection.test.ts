import { describe, expect, it } from 'vitest';
import {
	createActiveFilterOverlayIndex,
	createOperationOverlayIndex,
	projectOverlayLayers,
} from '../../../src/services/serviceOverlayProjection';
import type { ActiveFilterEntry, NodeBase, QueueChange } from '../../../src/types/typeContracts';
import type { FilterGroup, FilterRule } from '../../../src/types/typeFilter';

interface TestNode extends NodeBase {
	label: string;
}

describe('serviceOverlayProjection', () => {
	it('projects queue entries into ViewLayers without a ViewService instance', () => {
		const node = queueChange({
			id: 'op-delete-status',
			group: 'delete_prop',
			action: 'delete',
			type: 'property',
			property: 'status',
			details: 'Delete status',
		});

		const layers = projectOverlayLayers({
			node,
			label: 'delete',
			context: { kind: 'operation' },
			operations: createOperationOverlayIndex([]),
			activeFilters: createActiveFilterOverlayIndex([]),
		});

		expect(layers.state?.pending).toBe(true);
		expect(layers.icons?.[0]).toMatchObject({
			id: 'op-delete-status:op-icon',
			icon: 'lucide-trash-2',
			source: 'operation',
		});
		expect(layers.badges?.ops?.[0]).toMatchObject({
			id: 'op-delete-status:op',
			label: 'delete',
			tone: 'danger',
			sourceId: 'op-delete-status',
			actionId: 'remove',
		});
	});

	it('projects disabled active-filter rules into neutral filter layers', () => {
		const node = activeRule({
			id: 'filter-status',
			filterType: 'has_property',
			property: 'status',
			values: [],
			enabled: false,
		});

		const layers = projectOverlayLayers({
			node,
			label: 'has: status',
			context: { kind: 'filter' },
			operations: createOperationOverlayIndex([]),
			activeFilters: createActiveFilterOverlayIndex([]),
		});

		expect(layers.state?.activeFilter).toBeUndefined();
		expect(layers.state?.disabled).toBe(true);
		expect(layers.badges?.filters?.[0]).toMatchObject({
			id: 'filter-status:filter',
			label: 'has property',
			tone: 'neutral',
			sourceId: 'filter-status',
			actionId: 'remove',
		});
		expect(layers.highlights?.filter).toEqual([{ start: 5, end: 11 }]);
	});

	it('projects operation and active-filter overlays onto matching structural rows', () => {
		const node: TestNode = { id: 'prop:status::todo', label: 'todo' };
		const operation = queueChange({
			id: 'op-delete-todo',
			group: 'delete_prop',
			action: 'delete',
			type: 'property',
			property: 'status',
			oldValue: 'todo',
			details: 'Delete todo',
		});
		const filter = activeRule({
			id: 'filter-status-todo',
			filterType: 'specific_value',
			property: 'status',
			values: ['todo'],
		});

		const layers = projectOverlayLayers({
			node,
			label: node.label,
			context: { kind: 'prop', propName: 'status', isValueNode: true, rawValue: 'todo' },
			operations: createOperationOverlayIndex([operation]),
			activeFilters: createActiveFilterOverlayIndex([filter]),
			showMatchedFilterDecorations: true,
		});

		expect(layers.state).toMatchObject({
			pending: true,
			deleted: true,
			activeFilter: true,
		});
		expect(layers.badges?.ops?.[0]).toMatchObject({
			id: 'prop:status::todo:op:op-delete-todo',
			label: 'delete',
			sourceId: 'op-delete-todo',
		});
		expect(layers.badges?.filters?.[0]).toMatchObject({
			id: 'prop:status::todo:filter:filter-status-todo',
			label: 'specific value',
			sourceId: 'filter-status-todo',
		});
		expect(layers.highlights?.filter).toEqual([{ start: 0, end: 4 }]);
	});

	it('keeps matched active-filter layers opt-in for structural rows', () => {
		const node: TestNode = { id: 'tag:project', label: 'project' };
		const filter = activeRule({
			id: 'filter-project',
			filterType: 'has_tag',
			property: '',
			values: ['#project'],
		});

		const layers = projectOverlayLayers({
			node,
			label: node.label,
			context: { kind: 'tag', tagPath: 'project' },
			operations: createOperationOverlayIndex([]),
			activeFilters: createActiveFilterOverlayIndex([filter]),
			showMatchedFilterDecorations: false,
		});

		expect(layers.state?.activeFilter).toBeUndefined();
		expect(layers.badges?.filters).toBeUndefined();
		expect(layers.highlights?.filter).toBeUndefined();
	});
});

function queueChange(input: {
	id: string;
	group: string;
	action: string;
	type: 'property' | 'tag' | 'file_rename' | 'file_move' | 'file_delete' | 'content_replace';
	details: string;
	property?: string;
	value?: string;
	oldValue?: string;
	tag?: string;
}): QueueChange {
	return {
		id: input.id,
		group: input.group,
		change: {
			id: input.id,
			type: input.type,
			action: input.action,
			details: input.details,
			files: [],
			property: input.property,
			value: input.value,
			oldValue: input.oldValue,
			tag: input.tag,
			customLogic: true,
			logicFunc: () => null,
		} as QueueChange['change'],
	};
}

function activeRule(
	rule: Omit<FilterRule, 'type'> & { id: string; type?: 'rule' },
	parent?: FilterGroup,
): ActiveFilterEntry {
	return {
		id: rule.id,
		kind: 'rule',
		rule: {
			type: 'rule',
			...rule,
		},
		parent,
	};
}
