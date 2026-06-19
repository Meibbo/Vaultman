// serviceSharedVirtualLayout — framework-agnostic geometry/hit-test CORE for the
// shared render-runtime (V.D, thread A). Pure functions over numbers: NO DOM, NO Svelte,
// testable in isolation. The Svelte 5 shell (serviceSharedVirtualLayout.svelte.ts) wires
// these to @tanstack/svelte-virtual + pretext; viewTree (Linear pilot) consumes the shell,
// dropping its inline createVirtualizer fallback + intersectingRowIds + TREE_OVERSCAN=10.
//
// Slice 1 = the Linear (fixed-height) path. The variable-height path (Geometry, slice 2)
// reuses createExplorerVariableGeometry from serviceExplorerScrollGeometry. See
// docs/work/hardening/specs/2026-06-17-vd-shared-render-runtime + ADR 0012 / 05-view-canon.

export type VirtualAlign = 'start' | 'center' | 'end' | 'auto';

/** Half-open visible window [startIndex, endIndex). */
export interface VisibleRange {
	startIndex: number;
	endIndex: number;
}

/** Visible window plus its content-space y-band (px). */
export interface VisibleRangeBand extends VisibleRange {
	top: number;
	bottom: number;
}

export interface FixedRangeInput {
	scrollTop: number;
	viewportHeight: number;
	rowHeight: number;
	rowCount: number;
	overscan: number;
}

export interface FixedScrollInput {
	index: number;
	rowHeight: number;
	viewportHeight: number;
	scrollTop: number;
	rowCount: number;
	align: VirtualAlign;
}

/**
 * Overscan sized to the viewport — `ceil(viewportHeight / estimateSize)`, min 1.
 * Replaces the magic `TREE_OVERSCAN=10`: a tall viewport gets enough overscan to
 * cover a programmatic jump, a short one stays cheap.
 */
export function viewportOverscan(viewportHeight: number, estimateSize: number): number {
	const h = Math.max(0, viewportHeight);
	const s = Math.max(1, estimateSize);
	return Math.max(1, Math.ceil(h / s));
}

/**
 * Fixed-height visible window [startIndex, endIndex) + its content band, in O(1).
 * Mirrors fallbackFixedVirtualRows' range math without materializing row objects.
 */
export function fixedVisibleRange({
	scrollTop,
	viewportHeight,
	rowHeight,
	rowCount,
	overscan,
}: FixedRangeInput): VisibleRangeBand {
	const count = Math.max(0, Math.floor(rowCount));
	if (count <= 0 || rowHeight <= 0) return { startIndex: 0, endIndex: 0, top: 0, bottom: 0 };

	const safeTop = Math.max(0, scrollTop);
	const safeViewport = Math.max(0, viewportHeight);
	const safeOverscan = Math.max(0, Math.floor(overscan));
	const firstVisible = Math.min(count - 1, Math.floor(safeTop / rowHeight));
	const lastVisible = Math.min(
		count - 1,
		Math.floor(Math.max(safeTop, safeTop + safeViewport - 1) / rowHeight),
	);
	const startIndex = Math.max(0, firstVisible - safeOverscan);
	const endIndex = Math.min(count, lastVisible + safeOverscan + 1);
	return { startIndex, endIndex, top: startIndex * rowHeight, bottom: endIndex * rowHeight };
}

/**
 * Indices intersecting a content-space y-band (fixed height) — the geometry-based
 * box/lasso hit-test that crosses the UNRENDERED virtualized range (NOT a DOM query).
 * Lifts viewTree.intersectingRowIdsByFixedGeometry into the shared core.
 */
export function fixedIndicesInBand(
	band: { top: number; bottom: number },
	rowHeight: number,
	rowCount: number,
): VisibleRange {
	const count = Math.max(0, Math.floor(rowCount));
	if (count <= 0 || rowHeight <= 0) return { startIndex: 0, endIndex: 0 };

	const lo = Math.max(0, Math.min(band.top, band.bottom));
	const hi = Math.max(band.top, band.bottom);
	if (hi < 0 || lo >= count * rowHeight) return { startIndex: 0, endIndex: 0 };

	const startIndex = Math.max(0, Math.min(count - 1, Math.floor(lo / rowHeight)));
	const endIndex = Math.min(count, Math.floor(Math.max(0, hi - 1e-9) / rowHeight) + 1);
	return { startIndex, endIndex: Math.max(startIndex, endIndex) };
}

/**
 * Scroll offset (px) to bring `index` into view per `align` (fixed height), clamped to
 * the scrollable range. `auto` = no-op when already fully visible, else nearest edge.
 * Consolidates viewTree.scrollTopForAlign + serviceScroll.scrollFixedIndexIntoView.
 */
export function fixedScrollOffsetForIndex({
	index,
	rowHeight,
	viewportHeight,
	scrollTop,
	rowCount,
	align,
}: FixedScrollInput): number {
	if (index < 0 || rowHeight <= 0 || viewportHeight <= 0) return scrollTop;

	const rowTop = index * rowHeight;
	const rowBottom = rowTop + rowHeight;
	const maxTop = Math.max(0, Math.max(0, rowCount) * rowHeight - viewportHeight);

	let raw: number;
	if (align === 'start') {
		raw = rowTop;
	} else if (align === 'center') {
		raw = rowTop - Math.max(0, viewportHeight - rowHeight) / 2;
	} else if (align === 'end') {
		raw = rowTop - Math.max(0, viewportHeight - rowHeight);
	} else {
		if (rowTop >= scrollTop && rowBottom <= scrollTop + viewportHeight) return scrollTop;
		raw = rowTop < scrollTop ? rowTop : rowBottom - viewportHeight;
	}
	return Math.max(0, Math.min(raw, maxTop));
}
