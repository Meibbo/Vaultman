import type { PendingChange } from '../types/typeOps';

export type QueueWarningKind = 'empty-target' | 'large-target';
export type QueueWarningSeverity = 'error' | 'warning';

export interface QueueOperationWarning {
	kind: QueueWarningKind;
	severity: QueueWarningSeverity;
	targetCount: number;
	threshold?: number;
}

export interface QueueWarningTarget {
	files: PendingChange['files'];
	type: PendingChange['type'];
	targetFolder?: string;
}

export function targetCountForQueuedChange(
	change: QueueWarningTarget,
): number {
	if (
		change.type === 'file_delete' &&
		change.targetFolder &&
		change.files.length === 0
	) {
		return 1;
	}
	return change.files.length;
}

export function warningsForQueuedChange(
	change: QueueWarningTarget,
	threshold: number,
): QueueOperationWarning[] {
	const targetCount = targetCountForQueuedChange(change);
	if (targetCount === 0) {
		return [{ kind: 'empty-target', severity: 'error', targetCount }];
	}
	const safeThreshold = Math.max(1, Math.floor(threshold));
	if (targetCount > safeThreshold) {
		return [
			{
				kind: 'large-target',
				severity: 'warning',
				targetCount,
				threshold: safeThreshold,
			},
		];
	}
	return [];
}

export function countQueuedOperationWarnings(
	queue: QueueWarningTarget[],
	threshold: number,
): number {
	return queue.reduce(
		(count, change) => count + warningsForQueuedChange(change, threshold).length,
		0,
	);
}
