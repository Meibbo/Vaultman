import type { PendingChange } from '../types/typeOps';

export type QueueWarningKind = 'empty-target' | 'large-target';
export type QueueWarningSeverity = 'error' | 'warning';

export interface QueueOperationWarning {
	kind: QueueWarningKind;
	severity: QueueWarningSeverity;
	targetCount: number;
	threshold?: number;
}

export function warningsForQueuedChange(
	change: Pick<PendingChange, 'files'>,
	threshold: number,
): QueueOperationWarning[] {
	const targetCount = change.files.length;
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
	queue: Array<Pick<PendingChange, 'files'>>,
	threshold: number,
): number {
	return queue.reduce(
		(count, change) => count + warningsForQueuedChange(change, threshold).length,
		0,
	);
}
