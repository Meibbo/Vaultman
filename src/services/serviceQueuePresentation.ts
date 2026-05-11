import type { QueueChange } from '../types/typeContracts';
import type { PendingChange } from '../types/typeOps';

type QueueActionIntent = {
	label: string;
	icon: string;
};

const ACTION_INTENTS: readonly [RegExp, QueueActionIntent][] = [
	[/delete|remove/, { label: 'delete', icon: 'lucide-trash-2' }],
	[/add/, { label: 'add', icon: 'lucide-plus' }],
	[/rename/, { label: 'rename', icon: 'lucide-pencil' }],
	[/move/, { label: 'move', icon: 'lucide-folder-input' }],
	[/template/, { label: 'template', icon: 'lucide-book-marked' }],
	[/replace|content/, { label: 'replace', icon: 'lucide-replace' }],
	[/set/, { label: 'set', icon: 'lucide-settings-2' }],
];

export function queueActionLabel(actionKey: string): string {
	return queueActionIntent(actionKey).label;
}

export function queueActionIcon(actionKey: string): string {
	return queueActionIntent(actionKey).icon;
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

function queueActionIntent(actionKey: string): QueueActionIntent {
	const normalized = actionKey.trim().toLowerCase().replaceAll('_', ' ');
	for (const [pattern, intent] of ACTION_INTENTS) {
		if (pattern.test(normalized)) return intent;
	}
	return {
		label: normalized || 'operation',
		icon: 'lucide-settings-2',
	};
}

function isQueueChange(change: QueueChange | PendingChange): change is QueueChange {
	return typeof (change as QueueChange).change === 'object';
}
