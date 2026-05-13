import type { NodeBase, QueueChange } from '../types/typeContracts';
import type { PendingChange } from '../types/typeOps';
import type { ExplorerRenderModel, ViewLayers, ViewRow, ViewTone } from '../types/typeViews';

export type QueueActionIntent = {
	label: string;
	icon: string;
	tone: ViewTone;
};

const ACTION_INTENTS: readonly [RegExp, QueueActionIntent][] = [
	[/delete|remove/, { label: 'delete', icon: 'lucide-trash-2', tone: 'danger' }],
	[/add/, { label: 'add', icon: 'lucide-plus', tone: 'success' }],
	[/rename/, { label: 'rename', icon: 'lucide-pencil', tone: 'warning' }],
	[/move/, { label: 'move', icon: 'lucide-folder-input', tone: 'info' }],
	[/template/, { label: 'template', icon: 'lucide-book-marked', tone: 'accent' }],
	[/replace|content/, { label: 'replace', icon: 'lucide-replace', tone: 'warning' }],
	[/set/, { label: 'set', icon: 'lucide-settings-2', tone: 'info' }],
];

export interface QueueActionGroupPresentationNode extends NodeBase {
	kind: 'group';
	groupKey: string;
	count: number;
}

export function queueActionLabel(actionKey: string): string {
	return queueActionIntent(actionKey).label;
}

export function queueActionIcon(actionKey: string): string {
	return queueActionIntent(actionKey).icon;
}

export function queueActionTone(actionKey: string): ViewTone {
	return queueActionIntent(actionKey).tone;
}

export function queueChangeIntent(change: QueueChange | PendingChange): QueueActionIntent {
	const pending = isQueueChange(change) ? change.change : change;
	const group = isQueueChange(change) ? change.group : '';
	const matched = matchedQueueActionIntent(`${pending.action ?? ''} ${pending.type ?? ''} ${group}`);
	if (matched) return matched;
	return {
		label: pending.action || pending.type || group || 'operation',
		icon: 'lucide-settings-2',
		tone: 'info',
	};
}

export function queueChildLabel(change: QueueChange | PendingChange): string {
	const pending = isQueueChange(change) ? change.change : change;
	if (pending.type === 'property') {
		return pending.value !== undefined || pending.oldValue !== undefined ? 'value' : 'property';
	}
	if (pending.type === 'tag') return 'tag';
	if (pending.type === 'content_replace') return 'content';
	if (pending.type === 'template') return 'template';
	if (
		pending.type === 'file_rename' ||
		pending.type === 'file_move' ||
		pending.type === 'file_delete'
	) {
		return 'file';
	}
	return 'operation';
}

export function queueActionIntent(actionKey: string): QueueActionIntent {
	const normalized = actionKey.trim().toLowerCase().replaceAll('_', ' ');
	const matched = matchedQueueActionIntent(normalized);
	if (matched) return matched;
	return {
		label: normalized || 'operation',
		icon: 'lucide-settings-2',
		tone: 'info',
	};
}

function matchedQueueActionIntent(actionKey: string): QueueActionIntent | null {
	const normalized = actionKey.trim().toLowerCase().replaceAll('_', ' ');
	for (const [pattern, intent] of ACTION_INTENTS) {
		if (pattern.test(normalized)) return intent;
	}
	return null;
}

export function presentQueueModel<TNode extends NodeBase>(
	nextModel: ExplorerRenderModel<TNode>,
): ExplorerRenderModel<TNode> {
	return {
		...nextModel,
		rows: nextModel.rows.map((row) => presentQueueRow(row)),
	};
}

export function presentQueueRow<TNode extends NodeBase>(row: ViewRow<TNode>): ViewRow<TNode> {
	if (isQueueActionGroupNode(row.node)) {
		return {
			...row,
			label: queueActionLabel(row.node.groupKey),
			icon: queueActionIcon(row.node.groupKey),
			cls: addClass(row.cls, 'is-queue-parent'),
			layers: addQueueParentCount(row.layers, row.id, row.node.count),
		};
	}
	return {
		...row,
		label: isQueueChange(row.node) ? queueChildLabel(row.node) : row.label,
		icon: undefined,
		cls: addClass(row.cls, 'is-queue-child'),
		layers: stripQueueChildOperationLayers(row.layers),
	};
}

export function addQueueParentCount(layers: ViewLayers, rowId: string, count: number): ViewLayers {
	const existingCounts = layers.badges?.counts?.filter((badge) => badge.id !== `${rowId}:count`);
	return {
		...layers,
		badges: {
			...layers.badges,
			counts: [
				...(existingCounts ?? []),
				{
					id: `${rowId}:count`,
					label: String(count),
					tone: 'neutral',
				},
			],
		},
	};
}

export function stripQueueChildOperationLayers(layers: ViewLayers): ViewLayers {
	return {
		...layers,
		icons: undefined,
		badges: {
			...layers.badges,
			ops: undefined,
		},
		state: {
			...layers.state,
			pending: undefined,
			deleted: undefined,
		},
	};
}

export function isQueueActionGroupNode(node: NodeBase): node is QueueActionGroupPresentationNode {
	const candidate = node as Partial<QueueActionGroupPresentationNode>;
	return candidate.kind === 'group' && typeof candidate.groupKey === 'string';
}

function addClass(current: string | undefined, name: string): string {
	const classes = new Set((current ?? '').split(/\s+/).filter(Boolean));
	classes.add(name);
	return [...classes].join(' ');
}

function isQueueChange(change: unknown): change is QueueChange {
	return typeof (change as QueueChange).change === 'object';
}
