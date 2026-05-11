import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createRafElementRectObserver,
	fallbackFixedVirtualRows,
	scrollFixedIndexIntoView,
} from '../../../src/services/serviceScroll';

describe('serviceScroll', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('computes fixed fallback rows from scroll position, viewport, and overscan', () => {
		const rows = fallbackFixedVirtualRows({
			count: 100,
			rowHeight: 20,
			viewportHeight: 60,
			scrollTop: 200,
			overscan: 2,
			getKey: (index) => `row-${index}`,
		});

		expect(rows.map((row) => row.index)).toEqual([8, 9, 10, 11, 12, 13, 14]);
		expect(rows[0]).toEqual({
			index: 8,
			key: 'row-8',
			start: 160,
			size: 20,
			end: 180,
		});
		expect(rows.at(-1)).toEqual({
			index: 14,
			key: 'row-14',
			start: 280,
			size: 20,
			end: 300,
		});
	});

	it('clamps fixed fallback rows to valid item bounds', () => {
		const rows = fallbackFixedVirtualRows({
			count: 5,
			rowHeight: 20,
			viewportHeight: 40,
			scrollTop: 0,
			overscan: 3,
			getKey: (index) => index,
		});

		expect(rows.map((row) => row.index)).toEqual([0, 1, 2, 3, 4]);
	});

	it('keeps the current scroll top when a fixed row is already fully visible', () => {
		expect(
			scrollFixedIndexIntoView({
				index: 4,
				rowHeight: 20,
				viewportHeight: 100,
				scrollTop: 40,
			}),
		).toBe(40);
	});

	it('aligns fixed rows above or below the viewport into view', () => {
		expect(
			scrollFixedIndexIntoView({
				index: 1,
				rowHeight: 20,
				viewportHeight: 100,
				scrollTop: 80,
			}),
		).toBe(20);
		expect(
			scrollFixedIndexIntoView({
				index: 9,
				rowHeight: 20,
				viewportHeight: 100,
				scrollTop: 20,
			}),
		).toBe(100);
	});

	it('creates a raf-throttled rect observer with fallback dimensions', () => {
		const callbacks: FrameRequestCallback[] = [];
		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
			callbacks.push(cb);
			return callbacks.length;
		});
		vi.stubGlobal('cancelAnimationFrame', vi.fn());

		const cb = vi.fn();
		const observer = createRafElementRectObserver({
			getElement: () =>
				({
					clientWidth: 480,
					clientHeight: 240,
				}) as HTMLElement,
			fallbackWidth: 320,
			fallbackHeight: 400,
		});

		const cleanup = observer({} as never, cb);
		expect(cb).not.toHaveBeenCalled();

		callbacks[0]?.(0);
		expect(cb).toHaveBeenCalledWith({ width: 480, height: 240 });

		cleanup();
	});
});
