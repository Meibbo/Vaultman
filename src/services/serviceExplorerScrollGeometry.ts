import type { ExplorerRevealAlign, ExplorerRevealReason } from '../types/typeExplorerDataPlane';

export type ExplorerScrollIntentKind = 'id' | 'index';
export type ExplorerScrollIntentReason = ExplorerRevealReason | 'manual-scroll';

export interface ExplorerScrollGeometryOptions {
	idToIndex: ReadonlyMap<string, number>;
	rowHeight: number;
	rowCount: number;
	revision?: number;
	resolveIndexById?: (id: string) => number | null | undefined;
}

export interface ExplorerScrollIntent {
	kind: ExplorerScrollIntentKind;
	id?: string;
	index?: number;
	reason: ExplorerScrollIntentReason;
	align?: ExplorerRevealAlign;
	priority?: number;
	minRevision?: number;
}

export interface ExplorerScrollTarget {
	index: number;
	top: number;
	id?: string;
	reason: ExplorerScrollIntentReason;
	align: ExplorerRevealAlign;
	revision?: number;
}

export interface ExplorerScrollCancelInput {
	reason: 'manual-scroll';
}

export interface ExplorerScrollGeometryCoordinator {
	resolve(intent: ExplorerScrollIntent): ExplorerScrollTarget | null;
	queue(intent: ExplorerScrollIntent): void;
	flush(): ExplorerScrollTarget | null;
	cancelPending(input: ExplorerScrollCancelInput): void;
}

export interface ExplorerVariableGeometryOptions {
	rowCount: number;
	estimateSize: (index: number) => number;
}

export interface ExplorerVariableGeometry {
	readonly rowCount: number;
	sizeForIndex(index: number): number;
	topForIndex(index: number): number;
	measure(index: number, size: number): void;
}

export function createExplorerScrollGeometry({
	idToIndex,
	rowHeight,
	rowCount,
	revision,
	resolveIndexById,
}: ExplorerScrollGeometryOptions): ExplorerScrollGeometryCoordinator {
	let pendingIntent: ExplorerScrollIntent | null = null;
	const safeRowHeight = Math.max(0, rowHeight);
	const safeRowCount = Math.max(0, Math.floor(rowCount));

	function resolve(intent: ExplorerScrollIntent): ExplorerScrollTarget | null {
		if (!revisionAllows(intent, revision)) return null;

		const index = resolveIntentIndex(intent);
		if (!indexInRange(index, safeRowCount)) return null;

		return {
			index,
			top: index * safeRowHeight,
			id: intent.kind === 'id' ? intent.id : undefined,
			reason: intent.reason,
			align: intent.align ?? 'auto',
			revision,
		};
	}

	function queue(intent: ExplorerScrollIntent): void {
		if (!pendingIntent || priorityOf(intent) >= priorityOf(pendingIntent)) {
			pendingIntent = intent;
		}
	}

	function flush(): ExplorerScrollTarget | null {
		const intent = pendingIntent;
		pendingIntent = null;
		return intent ? resolve(intent) : null;
	}

	function cancelPending(_input: ExplorerScrollCancelInput): void {
		pendingIntent = null;
	}

	function resolveIntentIndex(intent: ExplorerScrollIntent): number | null {
		if (intent.kind === 'index') return intent.index ?? null;
		if (!intent.id) return null;
		return idToIndex.get(intent.id) ?? resolveIndexById?.(intent.id) ?? null;
	}

	return {
		resolve,
		queue,
		flush,
		cancelPending,
	};
}

export function createExplorerVariableGeometry({
	rowCount,
	estimateSize,
}: ExplorerVariableGeometryOptions): ExplorerVariableGeometry {
	const measuredSizes = new Map<number, number>();
	const safeRowCount = Math.max(0, Math.floor(rowCount));

	function sizeForIndex(index: number): number {
		if (!indexInRange(index, safeRowCount)) return 0;
		return measuredSizes.get(index) ?? Math.max(0, estimateSize(index));
	}

	function topForIndex(index: number): number {
		const boundedIndex = Math.min(Math.max(0, Math.floor(index)), safeRowCount);
		let top = 0;
		for (let current = 0; current < boundedIndex; current += 1) {
			top += sizeForIndex(current);
		}
		return top;
	}

	function measure(index: number, size: number): void {
		if (!indexInRange(index, safeRowCount)) return;
		measuredSizes.set(index, Math.max(0, size));
	}

	return {
		rowCount: safeRowCount,
		sizeForIndex,
		topForIndex,
		measure,
	};
}

function revisionAllows(intent: ExplorerScrollIntent, revision: number | undefined): boolean {
	if (intent.minRevision === undefined) return true;
	return typeof revision === 'number' && revision >= intent.minRevision;
}

function indexInRange(index: number | null | undefined, rowCount: number): index is number {
	return typeof index === 'number' && index >= 0 && index < rowCount;
}

function priorityOf(intent: ExplorerScrollIntent): number {
	return intent.priority ?? defaultPriority(intent.reason);
}

function defaultPriority(reason: ExplorerScrollIntentReason): number {
	if (reason === 'keyboard') return 50;
	if (reason === 'selection') return 40;
	if (reason === 'command') return 30;
	if (reason === 'expansion') return 20;
	if (reason === 'restore') return 10;
	return 0;
}
