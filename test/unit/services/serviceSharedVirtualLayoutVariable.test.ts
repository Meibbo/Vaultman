import { describe, expect, it } from 'vitest';
import {
	idsInRectVariable,
	laneOffsetForIndex,
	laneRangeForBand,
	measure,
	restore,
	snapshot,
	variableVisibleRange,
	type VariableProviderRegistry,
} from '../../../src/services/serviceSharedVirtualLayout';
import { createVariableProviderRegistry } from '../../../src/services/serviceSharedVirtualLayout';

describe('serviceSharedVirtualLayout — Geometry variable core (slice 2a)', () => {
	describe('variableVisibleRange (per-provider Fenwick, warm across calls)', () => {
		it('computes the visible window + content band for a provider at the top', () => {
			const registry = createVariableProviderRegistry();
			const range = variableVisibleRange(registry, {
				providerId: 'grid:notes',
				scrollTop: 0,
				viewportH: 100,
				rowCount: 1000,
				overscan: 0,
				estimateSize: () => 20,
			});
			expect(range).toEqual({ startIndex: 0, endIndex: 5, top: 0, bottom: 100 });
		});

		it('reuses the same Fenwick instance across calls for the same providerId (warm)', () => {
			const registry = createVariableProviderRegistry();
			variableVisibleRange(registry, {
				providerId: 'p1',
				scrollTop: 0,
				viewportH: 100,
				rowCount: 10,
				overscan: 0,
				estimateSize: () => 20,
			});
			measure(registry, 'p1', 0, 80);
			const range = variableVisibleRange(registry, {
				providerId: 'p1',
				scrollTop: 0,
				viewportH: 100,
				rowCount: 10,
				overscan: 0,
				estimateSize: () => 20,
			});
			// row 0 grew to 80 from the earlier measure(); a later call with the same
			// providerId must NOT rebuild the tree from estimateSize (that would drop the patch).
			// window is [0,2): row 0 (80px) + row 1 (20px) = 100px viewport, exactly covered.
			expect(range.bottom).toBe(80 + 20);
		});

		it('rebuilds when rowCount changes for the provider (data swap / count shrink)', () => {
			const registry = createVariableProviderRegistry();
			variableVisibleRange(registry, {
				providerId: 'p1',
				scrollTop: 0,
				viewportH: 100,
				rowCount: 10,
				overscan: 0,
				estimateSize: () => 20,
			});
			measure(registry, 'p1', 0, 80);
			const range = variableVisibleRange(registry, {
				providerId: 'p1',
				scrollTop: 0,
				viewportH: 100,
				rowCount: 3, // count shrank — stale measured index 0 must not overrun the new tree
				overscan: 0,
				estimateSize: () => 20,
			});
			expect(range.endIndex).toBeLessThanOrEqual(3);
		});

		it('keeps separate providers isolated (no cross-provider bleed)', () => {
			const registry = createVariableProviderRegistry();
			measure(registry, 'a', 0, 999); // patches provider 'a' before it's ever range-queried
			const rangeB = variableVisibleRange(registry, {
				providerId: 'b',
				scrollTop: 0,
				viewportH: 40,
				rowCount: 5,
				overscan: 0,
				estimateSize: () => 20,
			});
			expect(rangeB.bottom).toBe(40); // untouched by provider 'a's measure
		});

		it('finds deep variable-height ranges via the provider Fenwick without O(n) rescans', () => {
			const registry = createVariableProviderRegistry();
			let calls = 0;
			const estimateSize = () => {
				calls += 1;
				return 24;
			};
			// warm the provider once (construction reads estimateSize per row — one-time init)
			variableVisibleRange(registry, {
				providerId: 'deep',
				scrollTop: 0,
				viewportH: 24,
				rowCount: 100_000,
				overscan: 0,
				estimateSize,
			});
			calls = 0;
			const range = variableVisibleRange(registry, {
				providerId: 'deep',
				scrollTop: 99_500 * 24,
				viewportH: 240,
				rowCount: 100_000,
				overscan: 4,
				estimateSize,
			});
			expect(range.startIndex).toBeGreaterThanOrEqual(99_496);
			expect(calls).toBe(0); // warm provider: no re-estimate on a plain range query
		});
	});

	describe('measure (idempotent Fenwick patch)', () => {
		it('patches a provider row size and is idempotent for the same size', () => {
			const registry = createVariableProviderRegistry();
			variableVisibleRange(registry, {
				providerId: 'p',
				scrollTop: 0,
				viewportH: 10,
				rowCount: 4,
				overscan: 0,
				estimateSize: () => 20,
			});
			measure(registry, 'p', 1, 50);
			const once = variableVisibleRange(registry, {
				providerId: 'p',
				scrollTop: 0,
				viewportH: 10,
				rowCount: 4,
				overscan: 0,
				estimateSize: () => 20,
			});
			measure(registry, 'p', 1, 50); // same size again — idempotent, no double-count
			const twice = variableVisibleRange(registry, {
				providerId: 'p',
				scrollTop: 0,
				viewportH: 10,
				rowCount: 4,
				overscan: 0,
				estimateSize: () => 20,
			});
			expect(twice).toEqual(once);
		});

		it('is a no-op for an unknown provider (never auto-creates from a bare measure with no geometry)', () => {
			const registry = createVariableProviderRegistry();
			expect(() => measure(registry, 'ghost', 0, 40)).not.toThrow();
		});
	});

	describe('snapshot / restore (warm cross-view handoff)', () => {
		it('round-trips a provider snapshot into a fresh registry', () => {
			const registry = createVariableProviderRegistry();
			variableVisibleRange(registry, {
				providerId: 'p',
				scrollTop: 0,
				viewportH: 10,
				rowCount: 6,
				overscan: 0,
				estimateSize: () => 20,
			});
			measure(registry, 'p', 2, 90); // row 2: 20 -> 90 (delta +70)
			const snap = snapshot(registry, 'p');
			expect(snap).not.toBeNull();
			expect(snap!.sizes[2]).toBe(90);

			const fresh: VariableProviderRegistry = createVariableProviderRegistry();
			restore(fresh, 'p', snap!);
			// scroll past rows 0,1 (40px) into a viewport that covers row 2's measured height —
			// proves the RESTORED tree carries the patch, not a fresh estimateSize rebuild.
			const range = variableVisibleRange(fresh, {
				providerId: 'p',
				scrollTop: 40,
				viewportH: 10,
				rowCount: 6,
				overscan: 0,
				estimateSize: () => 20, // ignored — restore replaces the warm tree
			});
			expect(range.startIndex).toBe(2);
			expect(range.top).toBe(40);
			expect(range.bottom).toBe(130); // top(2)=40 + size(2)=90
		});

		it('returns null snapshotting an unknown provider', () => {
			const registry = createVariableProviderRegistry();
			expect(snapshot(registry, 'nope')).toBeNull();
		});
	});

	describe('lanes — striped single Fenwick over row-bands', () => {
		it('maps an item index to (lane, bandIndex) for a given laneCount', () => {
			expect(laneOffsetForIndex(0, 3)).toEqual({ band: 0, lane: 0 });
			expect(laneOffsetForIndex(2, 3)).toEqual({ band: 0, lane: 2 });
			expect(laneOffsetForIndex(3, 3)).toEqual({ band: 1, lane: 0 });
			expect(laneOffsetForIndex(7, 3)).toEqual({ band: 2, lane: 1 });
		});

		it('falls back to a single lane (band === index) when laneCount <= 1', () => {
			expect(laneOffsetForIndex(5, 1)).toEqual({ band: 5, lane: 0 });
			expect(laneOffsetForIndex(5, 0)).toEqual({ band: 5, lane: 0 });
		});

		it('maps a band-range query back to the item indices it covers', () => {
			// band 0..2 (exclusive) at laneCount=3 covers items [0,6)
			expect(laneRangeForBand({ startIndex: 0, endIndex: 2 }, 3)).toEqual({
				startIndex: 0,
				endIndex: 6,
			});
			expect(laneRangeForBand({ startIndex: 1, endIndex: 3 }, 3)).toEqual({
				startIndex: 3,
				endIndex: 9,
			});
		});

		it('is the identity mapping for laneCount<=1', () => {
			expect(laneRangeForBand({ startIndex: 2, endIndex: 5 }, 1)).toEqual({
				startIndex: 2,
				endIndex: 5,
			});
		});
	});

	describe('idsInRectVariable (box-select across the unrendered variable+lanes range)', () => {
		it('resolves ids intersecting a content-space band, single lane (table-like)', () => {
			const registry = createVariableProviderRegistry();
			variableVisibleRange(registry, {
				providerId: 'p',
				scrollTop: 0,
				viewportH: 10,
				rowCount: 10,
				overscan: 0,
				estimateSize: () => 20,
			});
			const ids = idsInRectVariable(registry, 'p', {
				band: { top: 21, bottom: 61 },
				laneCount: 1,
				resolveId: (index) => `row-${index}`,
			});
			expect(ids).toEqual(['row-1', 'row-2', 'row-3']);
		});

		it('resolves ids intersecting a band across lanes (grid-like, all lanes in the band)', () => {
			const registry = createVariableProviderRegistry();
			// 9 items, 3 lanes => 3 bands of height 20 each (band = row of tiles)
			variableVisibleRange(registry, {
				providerId: 'g',
				scrollTop: 0,
				viewportH: 10,
				rowCount: 3, // 3 bands
				overscan: 0,
				estimateSize: () => 20,
			});
			const ids = idsInRectVariable(registry, 'g', {
				band: { top: 0, bottom: 20 },
				laneCount: 3,
				resolveId: (index) => `row-${index}`,
			});
			// band 0 covers items [0,3)
			expect(ids).toEqual(['row-0', 'row-1', 'row-2']);
		});

		it('skips indices with no resolvable id', () => {
			const registry = createVariableProviderRegistry();
			variableVisibleRange(registry, {
				providerId: 'p',
				scrollTop: 0,
				viewportH: 10,
				rowCount: 4,
				overscan: 0,
				estimateSize: () => 20,
			});
			const ids = idsInRectVariable(registry, 'p', {
				band: { top: 0, bottom: 60 },
				laneCount: 1,
				resolveId: (index) => (index === 1 ? null : `row-${index}`),
			});
			expect(ids).toEqual(['row-0', 'row-2']);
		});

		it('returns empty for an unknown provider', () => {
			const registry = createVariableProviderRegistry();
			expect(
				idsInRectVariable(registry, 'ghost', {
					band: { top: 0, bottom: 100 },
					laneCount: 1,
					resolveId: (index) => `row-${index}`,
				}),
			).toEqual([]);
		});
	});
});
