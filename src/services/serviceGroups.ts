import { normalizeGroupLogic, type AnyGroupLogic, type FilterGroup } from '../types/typeFilter';
import type { QueueChange } from '../types/typeContracts';

export type GroupDropPosition = 'before' | 'after';

export interface CreateLogicGroupOptions {
	id?: string;
	label?: string;
	logic?: AnyGroupLogic;
}

export interface QueueActionGroupNode {
	id: string;
	kind: 'group';
	groupKey: string;
	label: string;
	count: number;
	depth: 0;
}

export type GroupedQueueChange = QueueChange & { depth?: number };
export type GroupedQueueRowNode = QueueActionGroupNode | GroupedQueueChange;

let logicGroupCounter = 0;

export function createLogicGroup(options: CreateLogicGroupOptions = {}): FilterGroup {
	return {
		id: options.id ?? `logic-group-${++logicGroupCounter}`,
		type: 'group',
		kind: 'logic_group',
		logic: normalizeGroupLogic(options.logic ?? 'and'),
		label: options.label ?? 'Group',
		enabled: true,
		children: [],
	};
}

export function moveFilterNodeWithinParent(
	parent: FilterGroup,
	sourceId: string,
	targetId: string,
	position: GroupDropPosition,
): boolean {
	if (sourceId === targetId) return false;
	const sourceIndex = parent.children.findIndex((child) => child.id === sourceId);
	if (sourceIndex < 0) return false;
	const [source] = parent.children.splice(sourceIndex, 1);
	const targetIndex = parent.children.findIndex((child) => child.id === targetId);
	if (targetIndex < 0) {
		parent.children.splice(sourceIndex, 0, source);
		return false;
	}
	const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
	parent.children.splice(insertIndex, 0, source);
	return true;
}

export function groupQueueChangesByAction(
	changes: readonly QueueChange[],
): GroupedQueueRowNode[] {
	const grouped = new Map<string, QueueChange[]>();
	for (const change of changes) {
		const key = queueActionKey(change);
		const bucket = grouped.get(key);
		if (bucket) {
			bucket.push(change);
		} else {
			grouped.set(key, [change]);
		}
	}

	const rows: GroupedQueueRowNode[] = [];
	for (const [action, bucket] of grouped) {
		rows.push({
			id: `queue-action:${action}`,
			kind: 'group',
			groupKey: action,
			label: action,
			count: bucket.length,
			depth: 0,
		});
		for (const change of bucket) rows.push({ ...change, depth: 1 });
	}
	return rows;
}

function queueActionKey(change: QueueChange): string {
	return (change.change.action || change.change.type || change.group || 'operation').trim();
}
