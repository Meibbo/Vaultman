import { describe, expect, it } from 'vitest';
import {
	fixedIndicesInBand,
	fixedScrollOffsetForIndex,
	fixedVisibleRange,
	viewportOverscan,
} from '../../../src/services/serviceSharedVirtualLayout';

describe('serviceSharedVirtualLayout — Linear fixed core', () => {
	describe('viewportOverscan', () => {
		it('sizes overscan to the viewport (ceil), killing the magic constant', () => {
			expect(viewportOverscan(400, 32)).toBe(13); // ceil(400/32)
			expect(viewportOverscan(96, 24)).toBe(4);
		});

		it('never drops below 1 and tolerates degenerate inputs', () => {
			expect(viewportOverscan(0, 32)).toBe(1);
			expect(viewportOverscan(400, 0)).toBe(400); // estimateSize clamped to 1
			expect(viewportOverscan(-50, 32)).toBe(1);
		});
	});

	describe('fixedVisibleRange', () => {
		it('computes the visible window + content band at the top', () => {
			expect(fixedVisibleRange({ scrollTop: 0, viewportHeight: 100, rowHeight: 20, rowCount: 1000, overscan: 0 })).toEqual({
				startIndex: 0,
				endIndex: 5,
				top: 0,
				bottom: 100,
			});
		});

		it('applies overscan on both sides and reports the band from the indices', () => {
			const r = fixedVisibleRange({ scrollTop: 1000, viewportHeight: 100, rowHeight: 20, rowCount: 1000, overscan: 3 });
			// first visible = floor(1000/20)=50, last = floor(1099/20)=54
			expect(r.startIndex).toBe(47);
			expect(r.endIndex).toBe(58);
			expect(r.top).toBe(47 * 20);
			expect(r.bottom).toBe(58 * 20);
		});

		it('clamps at the list bottom without overscanning past count', () => {
			const r = fixedVisibleRange({ scrollTop: 19_900, viewportHeight: 100, rowHeight: 20, rowCount: 1000, overscan: 5 });
			expect(r.endIndex).toBe(1000);
			expect(r.startIndex).toBeGreaterThanOrEqual(990);
		});

		it('returns an empty window for empty / degenerate lists', () => {
			expect(fixedVisibleRange({ scrollTop: 0, viewportHeight: 100, rowHeight: 20, rowCount: 0, overscan: 2 })).toEqual({
				startIndex: 0,
				endIndex: 0,
				top: 0,
				bottom: 0,
			});
			expect(fixedVisibleRange({ scrollTop: 0, viewportHeight: 100, rowHeight: 0, rowCount: 10, overscan: 2 }).endIndex).toBe(0);
		});
	});

	describe('fixedIndicesInBand (box/lasso hit-test across the unrendered range)', () => {
		it('selects every index intersecting a band far below the rendered window', () => {
			// band over rows 500..503 of a 100k list — must work without DOM
			const r = fixedIndicesInBand({ top: 500 * 20 + 1, bottom: 503 * 20 + 1 }, 20, 100_000);
			expect(r.startIndex).toBe(500);
			expect(r.endIndex).toBe(504);
		});

		it('handles inverted bands and clamps to the list', () => {
			expect(fixedIndicesInBand({ top: 80, bottom: 20 }, 20, 10)).toEqual({ startIndex: 1, endIndex: 4 });
			expect(fixedIndicesInBand({ top: -100, bottom: 50 }, 20, 10)).toEqual({ startIndex: 0, endIndex: 3 });
		});

		it('returns empty when the band misses the list', () => {
			expect(fixedIndicesInBand({ top: 10_000, bottom: 20_000 }, 20, 10)).toEqual({ startIndex: 0, endIndex: 0 });
			expect(fixedIndicesInBand({ top: 0, bottom: 50 }, 20, 0)).toEqual({ startIndex: 0, endIndex: 0 });
		});
	});

	describe('fixedScrollOffsetForIndex', () => {
		const base = { rowHeight: 20, viewportHeight: 100, rowCount: 1000 };

		it('aligns start / center / end and clamps', () => {
			expect(fixedScrollOffsetForIndex({ ...base, index: 50, scrollTop: 0, align: 'start' })).toBe(1000);
			expect(fixedScrollOffsetForIndex({ ...base, index: 50, scrollTop: 0, align: 'center' })).toBe(1000 - 40);
			expect(fixedScrollOffsetForIndex({ ...base, index: 50, scrollTop: 0, align: 'end' })).toBe(1000 - 80);
		});

		it('auto is a no-op when already fully visible, else scrolls to nearest edge', () => {
			expect(fixedScrollOffsetForIndex({ ...base, index: 2, scrollTop: 0, align: 'auto' })).toBe(0);
			expect(fixedScrollOffsetForIndex({ ...base, index: 50, scrollTop: 0, align: 'auto' })).toBe(50 * 20 + 20 - 100);
			expect(fixedScrollOffsetForIndex({ ...base, index: 10, scrollTop: 1000, align: 'auto' })).toBe(200);
		});

		it('clamps to the scrollable max and never goes negative', () => {
			expect(fixedScrollOffsetForIndex({ ...base, index: 999, scrollTop: 0, align: 'start' })).toBe(1000 * 20 - 100);
			expect(fixedScrollOffsetForIndex({ ...base, index: 0, scrollTop: 0, align: 'end' })).toBe(0);
		});
	});
});
