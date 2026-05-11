import type { Rect, Virtualizer } from '@tanstack/svelte-virtual';

export interface FixedVirtualRow {
	index: number;
	key: string | number;
	start: number;
	size: number;
	end: number;
}

export interface FallbackFixedVirtualRowsOptions {
	count: number;
	rowHeight: number;
	viewportHeight: number;
	scrollTop: number;
	overscan: number;
	getKey: (index: number) => string | number;
}

export interface ScrollFixedIndexIntoViewOptions {
	index: number;
	rowHeight: number;
	viewportHeight: number;
	scrollTop: number;
}

export interface RafElementRectObserverOptions<TElement extends HTMLElement> {
	getElement: () => TElement | null | undefined;
	fallbackWidth: number;
	fallbackHeight: number;
}

export function fallbackFixedVirtualRows({
	count,
	rowHeight,
	viewportHeight,
	scrollTop,
	overscan,
	getKey,
}: FallbackFixedVirtualRowsOptions): FixedVirtualRow[] {
	if (count <= 0 || rowHeight <= 0) return [];

	const safeViewportHeight = Math.max(0, viewportHeight);
	const safeScrollTop = Math.max(0, scrollTop);
	const safeOverscan = Math.max(0, Math.floor(overscan));
	const visibleStart = Math.min(count - 1, Math.floor(safeScrollTop / rowHeight));
	const visibleCount = Math.max(1, Math.ceil(safeViewportHeight / rowHeight));
	const startIndex = Math.max(0, visibleStart - safeOverscan);
	const endIndex = Math.min(count, startIndex + visibleCount + safeOverscan * 2);

	return Array.from({ length: Math.max(0, endIndex - startIndex) }, (_, offset) => {
		const index = startIndex + offset;
		const start = index * rowHeight;
		return {
			index,
			key: getKey(index),
			start,
			size: rowHeight,
			end: start + rowHeight,
		};
	});
}

export function scrollFixedIndexIntoView({
	index,
	rowHeight,
	viewportHeight,
	scrollTop,
}: ScrollFixedIndexIntoViewOptions): number {
	if (index < 0 || rowHeight <= 0 || viewportHeight <= 0) return scrollTop;

	const rowTop = index * rowHeight;
	const rowBottom = rowTop + rowHeight;
	const viewportBottom = scrollTop + viewportHeight;
	if (rowTop >= scrollTop && rowBottom <= viewportBottom) return scrollTop;

	return rowTop < scrollTop ? rowTop : Math.max(0, rowBottom - viewportHeight);
}

export function createRafElementRectObserver<
	TScrollElement extends HTMLElement,
	TItemElement extends HTMLElement,
>({
	getElement,
	fallbackWidth,
	fallbackHeight,
}: RafElementRectObserverOptions<TScrollElement>): (
	instance: Virtualizer<TScrollElement, TItemElement>,
	cb: (rect: Rect) => void,
) => () => void {
	return (_: Virtualizer<TScrollElement, TItemElement>, cb: (rect: Rect) => void) => {
		let rectFrame: number | null = null;
		const emit = () => {
			const element = getElement();
			cb({
				width: element?.clientWidth || fallbackWidth,
				height: element?.clientHeight || fallbackHeight,
			});
		};
		const schedule = () => {
			if (typeof requestAnimationFrame === 'undefined') {
				emit();
				return;
			}
			if (rectFrame !== null) return;
			rectFrame = requestAnimationFrame(() => {
				rectFrame = null;
				emit();
			});
		};

		schedule();
		const element = getElement();
		if (!element || typeof ResizeObserver === 'undefined') {
			return () => {
				if (rectFrame !== null) cancelAnimationFrame(rectFrame);
			};
		}

		const ro = new ResizeObserver(schedule);
		ro.observe(element);
		return () => {
			if (rectFrame !== null) cancelAnimationFrame(rectFrame);
			ro.disconnect();
		};
	};
}
