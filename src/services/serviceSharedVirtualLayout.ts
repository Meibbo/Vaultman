// serviceSharedVirtualLayout — framework-agnostic geometry/hit-test CORE for the
// shared render-runtime (V.D, thread A). Pure functions over numbers: NO DOM, NO Svelte,
// testable in isolation. The Svelte 5 shell (serviceSharedVirtualLayout.svelte.ts) wires
// these to @tanstack/svelte-virtual + pretext; viewTree (Linear pilot) consumes the shell,
// dropping its inline createVirtualizer fallback + intersectingRowIds + TREE_OVERSCAN=10.
//
// Slice 1 = the Linear (fixed-height) path (unchanged below, kept bit-for-bit).
//
// Slice 2a = the Geometry (variable-height + lanes) path, added here. Builds on
// createExplorerVariableGeometry (serviceExplorerScrollGeometry.ts, Fenwick tree) via a
// per-provider REGISTRY (`VariableProviderRegistry`): every mounted Geometry view shares the
// same warm Fenwick for a given `providerId` (Q1: config change = swap strategy params, NOT
// remount/re-measure — the registry is what stays warm across that swap). `measure()` patches
// in O(log n); `variableVisibleRange()` queries in O(log n); NEVER an O(n) scan.
//
// Lanes (columns) structure — chosen deliberately, see the docblock above
// `laneOffsetForIndex`/`laneRangeForBand` for the justification: a SINGLE striped Fenwick over
// row-BANDS (not one Fenwick per lane, not a 2D structure). This mirrors the existing
// ViewNodeGrid/Cards/Table pattern already in the repo (`buildGridRows`/`buildCardRows` chunk
// `columnCount` items into a row, then run one `createExplorerVariableGeometry` over the
// row-bands) — slice 2a formalizes that existing convention as shared, tested primitives
// instead of three near-duplicate inline implementations.
//
// docs/work/hardening/specs/2026-06-17-vd-shared-render-runtime + ADR 0012 / 05-view-canon.

import {
	createExplorerVariableGeometry,
	type ExplorerVariableGeometry,
} from './serviceExplorerScrollGeometry';

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

// ---------------------------------------------------------------------------------------
// Geometry (variable-height + lanes) core — slice 2a.
// ---------------------------------------------------------------------------------------

/** Visible window + content band, keyed to the LOCKED contract's `variableVisibleRange` shape. */
export interface VariableVisibleRangeResult {
	startIndex: number;
	endIndex: number;
	top: number;
	bottom: number;
}

export interface VariableVisibleRangeInput {
	providerId: string;
	scrollTop: number;
	viewportH: number;
	rowCount: number;
	overscan: number;
	/** Per-index size estimate — only read when the provider's Fenwick is (re)built. */
	estimateSize: (index: number) => number;
}

/** Opaque snapshot of one provider's warm Fenwick geometry, for cross-view/cross-registry handoff. */
export interface VariableProviderSnapshot {
	rowCount: number;
	sizes: number[];
}

interface VariableProviderEntry {
	rowCount: number;
	geometry: ExplorerVariableGeometry;
}

/**
 * Per-provider warm-geometry registry — the runtime home for N mounted Geometry views sharing
 * one Fenwick per `providerId` (Q1/Q2). Opaque to callers; construct via
 * `createVariableProviderRegistry()`, thread through `measure`/`variableVisibleRange`/
 * `snapshot`/`restore`/`idsInRectVariable`. Framework-agnostic (no Svelte) — the `.svelte.ts`
 * shell wraps ONE shared instance behind `createContext` so config changes (mode/orientation)
 * swap strategy params without dropping the warm tree.
 */
export interface VariableProviderRegistry {
	readonly entries: Map<string, VariableProviderEntry>;
}

export function createVariableProviderRegistry(): VariableProviderRegistry {
	return { entries: new Map() };
}

/**
 * Visible window + content band for `providerId`, backed by a warm per-provider Fenwick
 * (`createExplorerVariableGeometry`). O(log n) per call once the provider exists. The provider's
 * tree is (re)built from `estimateSize` only on first sight OR when `rowCount` changes for that
 * provider (data swap / count shrink) — an existing tree with the SAME rowCount is reused as-is,
 * so `measure()` patches made between calls are never silently dropped by a rebuild.
 */
export function variableVisibleRange(
	registry: VariableProviderRegistry,
	{ providerId, scrollTop, viewportH, rowCount, overscan, estimateSize }: VariableVisibleRangeInput,
): VariableVisibleRangeResult {
	const geometry = geometryFor(registry, providerId, rowCount, estimateSize);
	return geometry.visibleRange({ scrollTop, viewportHeight: viewportH, overscan });
}

/** Resolves (building if absent/stale) the warm geometry for `providerId`. */
function geometryFor(
	registry: VariableProviderRegistry,
	providerId: string,
	rowCount: number,
	estimateSize: (index: number) => number,
): ExplorerVariableGeometry {
	const existing = registry.entries.get(providerId);
	const safeRowCount = Math.max(0, Math.floor(rowCount));
	if (existing && existing.rowCount === safeRowCount) return existing.geometry;

	const geometry = createExplorerVariableGeometry({ rowCount: safeRowCount, estimateSize });
	registry.entries.set(providerId, { rowCount: safeRowCount, geometry });
	return geometry;
}

/**
 * Patches `providerId`'s Fenwick at `index` — O(log n), idempotent for the same size (the
 * underlying geometry already no-ops a zero-delta patch). No-op for a provider that has never
 * been seen by `variableVisibleRange` (nothing to build a bare patch against; mirrors the
 * contract's "warm cross-view" framing — measurement always follows a range query that
 * establishes the provider).
 */
export function measure(
	registry: VariableProviderRegistry,
	providerId: string,
	index: number,
	size: number,
): void {
	registry.entries.get(providerId)?.geometry.measure(index, size);
}

/** Layout snapshot for `providerId` — `null` if the provider has never been established. */
export function snapshot(
	registry: VariableProviderRegistry,
	providerId: string,
): VariableProviderSnapshot | null {
	const entry = registry.entries.get(providerId);
	if (!entry) return null;
	const sizes = Array.from({ length: entry.rowCount }, (_, index) =>
		entry.geometry.sizeForIndex(index),
	);
	return { rowCount: entry.rowCount, sizes };
}

/**
 * Restores `providerId`'s warm geometry from a snapshot — cross-view handoff (mount a second
 * Geometry view on the same provider without re-measuring from scratch). Replaces any existing
 * entry for `providerId` in `registry` outright.
 */
export function restore(
	registry: VariableProviderRegistry,
	providerId: string,
	snap: VariableProviderSnapshot,
): void {
	const geometry = createExplorerVariableGeometry({
		rowCount: snap.rowCount,
		estimateSize: (index) => snap.sizes[index] ?? 0,
	});
	registry.entries.set(providerId, { rowCount: snap.rowCount, geometry });
}

/** An item's lane (column) position within its row-band, for a striped single Fenwick. */
export interface LaneOffset {
	/** Row-band index — what the Fenwick actually indexes (see module docblock). */
	band: number;
	/** Column position within the band, `[0, laneCount)`. */
	lane: number;
}

/**
 * Maps an item index to `(band, lane)` for `laneCount` columns. `laneCount <= 1` is the identity
 * single-lane case (`band === index`, `lane === 0`) — the Linear/table-like path.
 */
export function laneOffsetForIndex(index: number, laneCount: number): LaneOffset {
	const lanes = Math.max(1, Math.floor(laneCount));
	if (lanes <= 1) return { band: index, lane: 0 };
	return { band: Math.floor(index / lanes), lane: index % lanes };
}

/**
 * Maps a half-open row-BAND range `[startIndex, endIndex)` back to the item-index range it
 * spans (every lane in every covered band). Inverse of `laneOffsetForIndex` at the range level —
 * used to turn a Fenwick band-range query into the set of rendered item indices.
 */
export function laneRangeForBand(band: VisibleRange, laneCount: number): VisibleRange {
	const lanes = Math.max(1, Math.floor(laneCount));
	if (lanes <= 1) return { startIndex: band.startIndex, endIndex: band.endIndex };
	return {
		startIndex: band.startIndex * lanes,
		endIndex: band.endIndex * lanes,
	};
}

export interface IdsInRectVariableInput {
	/** Content-space y-band (px) to hit-test — same space as `variableVisibleRange`'s top/bottom. */
	band: { top: number; bottom: number };
	/** Column count; `<=1` = single lane (Linear/table-like variable height, no lanes). */
	laneCount: number;
	/** Resolve an item id by its flat index (post lane-expansion). */
	resolveId: (index: number) => string | null | undefined;
}

/**
 * Ids whose rows/tiles intersect a content-space y-band for a VARIABLE-height + lanes provider —
 * the Geometry analogue of `fixedIndicesInBand`. Geometry-based (Fenwick `indexForOffset`), not
 * DOM-based: works across the unrendered virtualized range. Every lane within an intersecting
 * band is included (a box that clips a row of tiles selects the whole row's tiles, matching
 * today's ViewNodeGrid/Cards DOM-rect hit-test semantics — the box is drawn against band extents,
 * not per-tile pixel columns).
 */
export function idsInRectVariable(
	registry: VariableProviderRegistry,
	providerId: string,
	{ band, laneCount, resolveId }: IdsInRectVariableInput,
): string[] {
	const entry = registry.entries.get(providerId);
	if (!entry) return [];

	const lo = Math.max(0, Math.min(band.top, band.bottom));
	const hi = Math.max(band.top, band.bottom);
	const geometry = entry.geometry;
	if (entry.rowCount <= 0 || hi < 0 || lo >= geometry.totalSize()) return [];

	const startBand = geometry.indexForOffset(lo);
	const endBand = geometry.indexForOffset(Math.max(lo, hi - 1e-9)) + 1;
	const bandRange = {
		startIndex: Math.max(0, Math.min(entry.rowCount, startBand)),
		endIndex: Math.max(0, Math.min(entry.rowCount, endBand)),
	};

	const itemRange = laneRangeForBand(bandRange, laneCount);
	const ids: string[] = [];
	for (let index = itemRange.startIndex; index < itemRange.endIndex; index += 1) {
		const id = resolveId(index);
		if (id != null) ids.push(id);
	}
	return ids;
}
