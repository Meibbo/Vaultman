/** Pure geometry for the scope-pick hover affordance.
 *
 * The renderer owns the virtual row list, but this module deliberately knows
 * nothing about DOM. That keeps the off-screen part of the outline derived
 * from the same row metrics as virtualization rather than materialising rows
 * just to measure them.
 */

export interface ScopePreviewRow {
	id: string;
	depth: number;
	/** A p-node keeps its depth even when the indent view option is off. */
	hasCaret: boolean;
	/** Semantic containers may be flat (for example Files folders-only). */
	isParent?: boolean;
}

export type ScopePreviewMode = 'parent' | 'level' | 'drill';

export interface ScopePreviewInput {
	rows: readonly ScopePreviewRow[];
	/** Variable-window callers may provide bounded row access instead of a
	 * materialized projection. The legacy `rows` array remains supported. */
	rowCount?: number;
	rowAt?: (index: number) => ScopePreviewRow | undefined;
	parentIndex: readonly number[];
	subtreeEnd: readonly number[];
	hoveredIndex: number;
	mode: ScopePreviewMode;
	rowHeight: number;
	scrollTop: number;
	viewportHeight: number;
	contentWidth: number;
	rowInset: number;
	rowPaddingStart: number;
	leafRowPaddingStart?: number;
	indentUnit: number;
	indentEnabled: boolean;
	/** A full-width decoration box does not inherit its label's depth/gutter. */
	fullWidthRows?: boolean;
	/** Optional render-time index. When present, hover does not scan all rows. */
	levelIndices?: ReadonlyMap<number, readonly number[]>;
	levelBounds?: ReadonlyMap<number, { readonly first: number; readonly last: number }>;
	/** Visible row index window used to avoid creating off-screen segments. */
	visibleStartIndex?: number;
	visibleEndIndex?: number;
	/**
	 * U130 native polish: measured row tops/heights from the shared height
	 * index. When present, segment tops agree with the virtual window;
	 * `rowHeight` remains the estimate fallback. Absent keeps today's formula.
	 */
	tops?: readonly number[];
	heights?: readonly number[];
	topAt?: (index: number) => number;
	heightAt?: (index: number) => number;
}

export interface ScopePreviewSegment {
	index: number;
	top: number;
	height: number;
	left: number;
	width: number;
	/** True means the target continues outside the clipped top/bottom edge. */
	openTop: boolean;
	openBottom: boolean;
}

export interface ScopePreviewResult {
	targetIndices: number[];
	segments: ScopePreviewSegment[];
}

function safeNumber(value: number, fallback = 0): number {
	return Number.isFinite(value) ? value : fallback;
}

function leftForRow(
	row: ScopePreviewRow,
	input: ScopePreviewInput,
): number {
	if (input.fullWidthRows) return Math.max(0, input.rowInset);
	const paddingStart =
		!input.indentEnabled && !row.hasCaret
			? (input.leafRowPaddingStart ?? input.rowPaddingStart)
			: input.rowPaddingStart;
	const depthIndent =
		input.indentEnabled || row.hasCaret ? row.depth * input.indentUnit : 0;
	return Math.max(0, input.rowInset + paddingStart + depthIndent);
}

function sortedPosition(values: readonly number[], value: number): number {
	let low = 0;
	let high = values.length - 1;
	while (low <= high) {
		const middle = (low + high) >> 1;
		const current = values[middle];
		if (current === value) return middle;
		if (current < value) low = middle + 1;
		else high = middle - 1;
	}
	return -1;
}

function sortedPositionAtOrAfter(values: readonly number[], value: number): number {
	let low = 0;
	let high = values.length;
	while (low < high) {
		const middle = (low + high) >> 1;
		if (values[middle] < value) low = middle + 1;
		else high = middle;
	}
	return low;
}

/**
 * Resolve and clip the target rows for one hover. Rows outside the viewport
 * are never returned as DOM work. Their presence still controls `openTop` /
 * `openBottom`, so a clipped outline remains visibly open while its target
 * continues through the virtual list.
 */
export function scopePreviewGeometry(
	input: ScopePreviewInput,
): ScopePreviewResult {
	const rowCount = input.rowCount ?? input.rows.length;
	const rowAt = input.rowAt ?? ((index: number) => input.rows[index]);
	const hovered = Math.trunc(input.hoveredIndex);
	if (hovered < 0 || hovered >= rowCount || rowCount === 0) {
		return { targetIndices: [], segments: [] };
	}

	const targetIndices: number[] = [];
	let allTargetIndices: readonly number[] | null = null;
	let levelBoundDepth: number | undefined;
	let rangeStart = hovered;
	let rangeEnd = hovered + 1;
	// The floating TOC drill is one gesture with two meanings: hovering a
	// child previews its parent (like the parent pick), hovering a p-node
	// previews its whole level (like the level pick).
	const effectiveMode =
		input.mode === 'drill'
			? ((rowAt(hovered)?.isParent ?? rowAt(hovered)?.hasCaret)
					? 'level'
					: 'parent')
			: input.mode;
	if (effectiveMode === 'level') {
		const depth = rowAt(hovered)?.depth;
		if (depth === undefined) return { targetIndices, segments: [] };
		const indexed = input.levelIndices?.get(depth);
		if (indexed) {
			allTargetIndices = indexed;
		} else if (input.levelBounds?.get(depth)) {
			const bounds = input.levelBounds.get(depth);
			if (bounds) {
				rangeStart = bounds.first;
				rangeEnd = bounds.last + 1;
				levelBoundDepth = depth;
			}
		} else {
			const indices: number[] = [];
			for (let index = 0; index < rowCount; index += 1) {
				if (rowAt(index)?.depth === depth) indices.push(index);
			}
			allTargetIndices = indices;
		}
	} else {
		const hoveredRow = rowAt(hovered);
		// A p-node owns itself; a gc/leaf resolves to its nearest structural
		// parent. This mirrors the acceptance resolver and never skips upward.
		const ownsScope = hoveredRow?.isParent ?? hoveredRow?.hasCaret;
		const root = ownsScope ? hovered : (input.parentIndex[hovered] ?? -1);
		if (root < 0 || root >= rowCount) {
			return { targetIndices: [], segments: [] };
		}
		rangeStart = root;
		rangeEnd = Math.max(
			root + 1,
			Math.min(rowCount, input.subtreeEnd[root] ?? root + 1),
		);
	}
	const visibleStart = Math.max(0, input.visibleStartIndex ?? 0);
	const visibleEnd = Math.min(rowCount, input.visibleEndIndex ?? rowCount);
	if (levelBoundDepth !== undefined) {
		const first = Math.max(rangeStart, visibleStart);
		const last = Math.min(rangeEnd, visibleEnd);
		allTargetIndices = Array.from(
			{ length: Math.max(0, last - first) },
			(_, offset) => first + offset,
		).filter((index) => rowAt(index)?.depth === levelBoundDepth);
	}
	let visibleTargetIndices: readonly number[];
	if (allTargetIndices) {
		if (input.visibleStartIndex === undefined) {
			visibleTargetIndices = allTargetIndices;
		} else {
			const first = sortedPositionAtOrAfter(allTargetIndices, visibleStart);
			const last = sortedPositionAtOrAfter(allTargetIndices, visibleEnd);
			visibleTargetIndices = allTargetIndices.slice(first, last);
		}
	} else {
		const first = Math.max(rangeStart, visibleStart);
		const last = Math.min(rangeEnd, visibleEnd);
		visibleTargetIndices = Array.from(
			{ length: Math.max(0, last - first) },
			(_, offset) => first + offset,
		);
	}
	// The public result is the complete target for pure callers; renderers may
	// request only the visible slice to keep pointer work bounded.
	if (input.visibleStartIndex === undefined) {
		if (allTargetIndices) targetIndices.push(...allTargetIndices);
		else {
			for (let index = rangeStart; index < rangeEnd; index += 1) {
				targetIndices.push(index);
			}
		}
	} else {
		targetIndices.push(...visibleTargetIndices);
	}

	const rowHeight = Math.max(1, safeNumber(input.rowHeight, 1));
	const scrollTop = Math.max(0, safeNumber(input.scrollTop));
	const viewportHeight = Math.max(0, safeNumber(input.viewportHeight));
	const width = Math.max(0, safeNumber(input.contentWidth));
	const segments: ScopePreviewSegment[] = [];
	for (let position = 0; position < visibleTargetIndices.length; position += 1) {
		const index = visibleTargetIndices[position];
		const row = rowAt(index);
		if (!row) continue;
		const measuredTop = input.topAt?.(index) ?? input.tops?.[index];
		const measuredHeight = input.heightAt?.(index) ?? input.heights?.[index];
		const rawTop =
			measuredTop !== undefined ? measuredTop - scrollTop : index * rowHeight - scrollTop;
		const rawBottom =
			rawTop + (measuredHeight !== undefined ? measuredHeight : rowHeight);
		if (rawBottom <= 0 || rawTop >= viewportHeight) continue;
		const top = Math.max(0, rawTop);
		const bottom = Math.min(viewportHeight, rawBottom);
		const left = Math.min(width, leftForRow(row, input));
		const right = Math.max(left, width - Math.max(0, input.rowInset));
		const fullPosition = allTargetIndices
			? sortedPosition(allTargetIndices, index)
			: index - rangeStart;
		const previousTarget = allTargetIndices
			? allTargetIndices[fullPosition - 1]
			: index > rangeStart
				? index - 1
				: undefined;
		const nextTarget = allTargetIndices
			? allTargetIndices[fullPosition + 1]
			: index + 1 < rangeEnd
				? index + 1
				: undefined;
		const targetContinuesAbove = effectiveMode === 'parent'
			? index > rangeStart
			: previousTarget === index - 1;
		const targetContinuesBelow = effectiveMode === 'parent'
			? index + 1 < rangeEnd
			: nextTarget === index + 1;
		segments.push({
			index,
			top,
			height: Math.max(0, bottom - top),
			left,
			width: right - left,
			openTop:
				rawTop < 0 ||
					targetContinuesAbove,
			openBottom:
				rawBottom > viewportHeight ||
					targetContinuesBelow,
		});
	}
	return { targetIndices, segments };
}
