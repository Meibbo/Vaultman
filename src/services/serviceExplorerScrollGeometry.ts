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
	totalSize(): number;
	indexForOffset(offset: number): number;
	visibleRange(input: ExplorerVariableGeometryRangeInput): ExplorerVariableGeometryRange;
	measure(index: number, size: number): void;
}

export interface ExplorerVariableGeometryRangeInput {
	scrollTop: number;
	viewportHeight: number;
	overscan: number;
}

export interface ExplorerVariableGeometryRange {
	startIndex: number;
	endIndex: number;
	top: number;
	bottom: number;
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
	const safeRowCount = Math.max(0, Math.floor(rowCount));
	const sizes = Array.from({ length: safeRowCount }, (_, index) =>
		Math.max(0, estimateSize(index)),
	);
	const tree = Array.from({ length: safeRowCount + 1 }, () => 0);

	for (let index = 0; index < safeRowCount; index += 1) {
		addFenwick(tree, index, sizes[index]);
	}

	function sizeForIndex(index: number): number {
		if (!indexInRange(index, safeRowCount)) return 0;
		return sizes[index];
	}

	function topForIndex(index: number): number {
		const boundedIndex = Math.min(Math.max(0, Math.floor(index)), safeRowCount);
		return prefixFenwick(tree, boundedIndex);
	}

	function totalSize(): number {
		return prefixFenwick(tree, safeRowCount);
	}

	function indexForOffset(offset: number): number {
		if (safeRowCount <= 0) return -1;
		const safeOffset = Math.max(0, offset);
		if (safeOffset >= totalSize()) return safeRowCount - 1;
		return Math.min(safeRowCount - 1, lowerBoundFenwick(tree, safeOffset));
	}

	function visibleRange({
		scrollTop,
		viewportHeight,
		overscan,
	}: ExplorerVariableGeometryRangeInput): ExplorerVariableGeometryRange {
		if (safeRowCount <= 0) {
			return { startIndex: 0, endIndex: 0, top: 0, bottom: 0 };
		}
		const safeScrollTop = Math.max(0, scrollTop);
		const viewportBottom = safeScrollTop + Math.max(0, viewportHeight);
		const safeOverscan = Math.max(0, Math.floor(overscan));
		const visibleStart = indexForOffset(safeScrollTop);
		const visibleEnd = indexForOffset(Math.max(safeScrollTop, viewportBottom - 0.001));
		const startIndex = Math.max(0, visibleStart - safeOverscan);
		const endIndex = Math.min(safeRowCount, visibleEnd + safeOverscan + 1);
		return {
			startIndex,
			endIndex,
			top: topForIndex(startIndex),
			bottom: topForIndex(endIndex),
		};
	}

	function measure(index: number, size: number): void {
		if (!indexInRange(index, safeRowCount)) return;
		const nextSize = Math.max(0, size);
		const delta = nextSize - sizes[index];
		if (delta === 0) return;
		sizes[index] = nextSize;
		addFenwick(tree, index, delta);
	}

	return {
		rowCount: safeRowCount,
		sizeForIndex,
		topForIndex,
		totalSize,
		indexForOffset,
		visibleRange,
		measure,
	};
}

function addFenwick(tree: number[], index: number, delta: number): void {
	for (let current = index + 1; current < tree.length; current += current & -current) {
		tree[current] += delta;
	}
}

function prefixFenwick(tree: readonly number[], count: number): number {
	let sum = 0;
	for (let current = Math.min(count, tree.length - 1); current > 0; current -= current & -current) {
		sum += tree[current];
	}
	return sum;
}

function lowerBoundFenwick(tree: readonly number[], offset: number): number {
	let index = 0;
	let sum = 0;
	let bit = 1;
	while (bit * 2 < tree.length) bit *= 2;
	for (let step = bit; step > 0; step >>= 1) {
		const next = index + step;
		if (next < tree.length && sum + tree[next] <= offset) {
			sum += tree[next];
			index = next;
		}
	}
	return index;
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
