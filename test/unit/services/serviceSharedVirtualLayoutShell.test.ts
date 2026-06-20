import { describe, expect, it } from 'vitest';
import { SharedVirtualLayout } from '../../../src/services/serviceSharedVirtualLayout.svelte';

// Headless tests of the Svelte 5 shell's REACTIVE composition: mutating $state
// (scrollTop / viewportHeight / rowHeight) must recompute the window/rows/totalHeight
// through the pure core (serviceSharedVirtualLayout). The pure range math itself is
// already covered by serviceSharedVirtualLayout.test.ts; here we prove the wiring.

interface LayoutOverrides {
	rowCount?: number | (() => number);
	rowHeight?: number;
	resolveId?: (index: number) => string | null | undefined;
}

function makeLayout(over: LayoutOverrides = {}): SharedVirtualLayout {
	const rowCount = over.rowCount ?? 1000;
	const rowHeight = over.rowHeight ?? 20;
	const layout = new SharedVirtualLayout({
		rowCount: () => (typeof rowCount === 'function' ? rowCount() : rowCount),
		estimateSize: () => rowHeight,
		getKey: (index) => `row-${index}`,
		resolveId: over.resolveId ?? ((index) => `row-${index}`),
	});
	layout.rowHeight = rowHeight;
	layout.viewportHeight = 100;
	layout.scrollTop = 0;
	return layout;
}

describe('SharedVirtualLayout — Svelte 5 shell reactive composition', () => {
	it('derives the visible window from the pure core (fixed range) at the top', () => {
		const layout = makeLayout();
		// overscan = ceil(100/20) = 5; firstVisible 0, lastVisible floor(99/20)=4
		expect(layout.overscan).toBe(5);
		expect(layout.window.startIndex).toBe(0);
		expect(layout.window.endIndex).toBe(10);
	});

	it('emits rows in the FixedVirtualRow shape viewTree renders', () => {
		const layout = makeLayout();
		expect(layout.rows.length).toBe(10);
		expect(layout.rows[0]).toEqual({ index: 0, key: 'row-0', start: 0, size: 20, end: 20 });
		expect(layout.rows[3]).toEqual({ index: 3, key: 'row-3', start: 60, size: 20, end: 80 });
	});

	it('recomputes the window reactively when scrollTop changes', () => {
		const layout = makeLayout();
		layout.scrollTop = 1000;
		// firstVisible 50, lastVisible 54, overscan 5 => [45, 60)
		expect(layout.window.startIndex).toBe(45);
		expect(layout.window.endIndex).toBe(60);
		expect(layout.rows[0].index).toBe(45);
		expect(layout.rows[0].start).toBe(900);
	});

	it('recomputes overscan reactively when the viewport grows', () => {
		const layout = makeLayout({ rowHeight: 32 });
		layout.viewportHeight = 400;
		expect(layout.overscan).toBe(13); // ceil(400/32)
	});

	it('totalHeight = rowCount * rowHeight', () => {
		expect(makeLayout().totalHeight).toBe(20_000);
	});

	it('idsInRect resolves ids across the UNRENDERED range (geometry hit-test, no DOM)', () => {
		const layout = makeLayout({ rowCount: 100_000 });
		const ids = layout.idsInRect({ top: 500 * 20 + 1, bottom: 503 * 20 + 1 });
		expect(ids).toEqual(['row-500', 'row-501', 'row-502', 'row-503']);
	});

	it('idsInRect skips indices with no resolvable id', () => {
		const layout = makeLayout({ resolveId: (index) => (index === 1 ? null : `row-${index}`) });
		expect(layout.idsInRect({ top: 0, bottom: 60 })).toEqual(['row-0', 'row-2']);
	});

	it('scrollOffsetForIndex delegates to the core align math', () => {
		const layout = makeLayout();
		expect(layout.scrollOffsetForIndex(50, 'start')).toBe(1000);
		expect(layout.scrollOffsetForIndex(50, 'end')).toBe(920);
		expect(layout.scrollOffsetForIndex(2, 'auto')).toBe(0);
	});

	it('yields an empty window and zero height for an empty list', () => {
		const layout = makeLayout({ rowCount: 0 });
		expect(layout.rows).toEqual([]);
		expect(layout.window.endIndex).toBe(0);
		expect(layout.totalHeight).toBe(0);
	});
});
