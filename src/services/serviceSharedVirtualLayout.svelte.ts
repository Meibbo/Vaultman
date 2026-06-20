/* global $state, $derived */
// serviceSharedVirtualLayout (Svelte 5 SHELL) — the reactive layer of the shared
// render-runtime (V.D, thread A). Wraps the framework-agnostic core
// (serviceSharedVirtualLayout.ts) in runes: $state holds the DOM-driven inputs
// (scrollTop / viewportHeight / rowHeight), $derived computes the visible window,
// rows and total height through the pure core. The core range is AUTHORITATIVE
// (deterministic coverage) — this is what removes viewTree's fallbackFixedVirtualRows
// cover-check, the beta.1 blank-window class of bug.
//
// Slice 1 = Linear (fixed-height) pilot. `attach` is the {@attach} that wires the
// scroll element + ResizeObserver to $state and creates the @tanstack/svelte-virtual
// virtualizer (Option B: TanStack lives in the shell now so slice-2 Geometry is
// additive — variable-height strategy + measureElement-fed Fenwick + a warm
// per-provider measurement registry). The virtualizer's own range is shadowed by the
// core on the fixed path (intentional seam); it drives smooth scrollToIndex today.
// See docs/work/hardening/specs/2026-06-17-vd-shared-render-runtime + ADR 0012 / 05-view-canon.

import { createVirtualizer, type SvelteVirtualizer } from '@tanstack/svelte-virtual';
import { createRafElementRectObserver } from './serviceScroll';
import {
	fixedIndicesInBand,
	fixedScrollOffsetForIndex,
	fixedVisibleRange,
	viewportOverscan,
	type VirtualAlign,
	type VisibleRangeBand,
} from './serviceSharedVirtualLayout';

const DEFAULT_FALLBACK_WIDTH = 320;
const DEFAULT_FALLBACK_HEIGHT = 400;

/** A virtual row in the shape viewTree's `{#each}` renders (mirrors FixedVirtualRow). */
export interface SharedVirtualRow {
	index: number;
	key: string | number;
	start: number;
	size: number;
	end: number;
}

export interface SharedVirtualLayoutOptions {
	/** Reactive row count — read inside `$derived`; pass a getter over view state. */
	rowCount: () => number;
	/** Fixed row-height estimate (px); seeds `rowHeight` before the ResizeObserver reads the CSS var. */
	estimateSize: () => number;
	/** Stable per-index virtual key (preserves focus / inline-rename / scroll across renders). */
	getKey: (index: number) => string | number;
	/** Resolve a node id by index for the geometry box/lasso hit-test. */
	resolveId?: (index: number) => string | null | undefined;
	/** CSS custom property the scroll element exposes the row height on (e.g. `--vm-tree-row-h`). */
	rowHeightVar?: string;
	/** Viewport height used before the element is measured / when `clientHeight` is 0. */
	fallbackViewportHeight?: number;
	/** Viewport width used by the virtualizer's rect observer before measurement. */
	fallbackWidth?: number;
}

/**
 * Per-view reactive layout controller. One instance per mounted view (each view owns
 * its scroll element). The pure-function core is shared logic, not a shared instance;
 * the warm per-provider measurement registry (slice 2) is the shared part.
 */
export class SharedVirtualLayout {
	readonly #options: SharedVirtualLayoutOptions;
	readonly #fallbackViewportHeight: number;
	readonly #fallbackWidth: number;

	#scrollEl: HTMLElement | null = null;
	#virtualizer: SvelteVirtualizer<HTMLElement, HTMLElement> | null = null;

	/** Scroll offset of the viewport (px) — written by the scroll listener at attach time. */
	scrollTop = $state(0);
	/** Viewport height (px) — written by the ResizeObserver at attach time. */
	viewportHeight = $state(0);
	/** Resolved fixed row height (px) — seeded from `estimateSize`, refined from the CSS var. */
	rowHeight = $state(0);

	/** Overscan sized to the viewport (`ceil(viewportH / rowHeight)`), not a magic constant. */
	readonly overscan: number = $derived(viewportOverscan(this.viewportHeight, this.rowHeight));

	/** Authoritative visible window [startIndex, endIndex) + content band, from the pure core. */
	readonly window: VisibleRangeBand = $derived.by(() =>
		fixedVisibleRange({
			scrollTop: this.scrollTop,
			viewportHeight: this.viewportHeight,
			rowHeight: this.rowHeight,
			rowCount: this.#cfg.rowCount(),
			overscan: this.overscan,
		}),
	);

	/** Virtual rows for the current window, in FixedVirtualRow shape. */
	readonly rows: SharedVirtualRow[] = $derived.by(() => {
		const { startIndex, endIndex } = this.window;
		const height = this.rowHeight;
		const getKey = this.#cfg.getKey;
		const out: SharedVirtualRow[] = [];
		for (let index = startIndex; index < endIndex; index += 1) {
			const start = index * height;
			out.push({ index, key: getKey(index), start, size: height, end: start + height });
		}
		return out;
	});

	/** Total scrollable content height (px). */
	readonly totalHeight: number = $derived(Math.max(0, this.#cfg.rowCount()) * this.rowHeight);

	constructor(options: SharedVirtualLayoutOptions) {
		this.#options = options;
		this.#fallbackViewportHeight = options.fallbackViewportHeight ?? DEFAULT_FALLBACK_HEIGHT;
		this.#fallbackWidth = options.fallbackWidth ?? DEFAULT_FALLBACK_WIDTH;
		this.rowHeight = options.estimateSize();
		this.viewportHeight = this.#fallbackViewportHeight;
	}

	/** Options accessor for the $derived fields — avoids a field-init-order read of #options. */
	get #cfg(): SharedVirtualLayoutOptions {
		return this.#options;
	}

	/**
	 * `{@attach}` for the scroll element: syncs scrollTop / viewportHeight / rowHeight into
	 * $state (the core inputs) and creates the @tanstack/svelte-virtual virtualizer (scroll +
	 * measure seam). Returns the teardown. Replaces viewTree's inline createVirtualizer +
	 * observeElementRect $effect + the rowHeight ResizeObserver $effect.
	 */
	attach = (node: HTMLElement): (() => void) => {
		this.#scrollEl = node;

		const syncScroll = (): void => {
			this.scrollTop = node.scrollTop;
			this.viewportHeight = node.clientHeight || this.#fallbackViewportHeight;
		};
		const syncViewport = (): void => {
			this.viewportHeight = node.clientHeight || this.#fallbackViewportHeight;
			const cssVar = this.#options.rowHeightVar;
			if (cssVar) {
				const measured = parseFloat(getComputedStyle(node).getPropertyValue(cssVar));
				if (measured > 0) this.rowHeight = measured;
			}
		};

		node.addEventListener('scroll', syncScroll, { passive: true });
		let resizeObserver: ResizeObserver | undefined;
		if (typeof ResizeObserver !== 'undefined') {
			resizeObserver = new ResizeObserver(() => syncViewport());
			resizeObserver.observe(node);
		}
		syncViewport();
		syncScroll();

		const store = createVirtualizer<HTMLElement, HTMLElement>({
			count: this.#options.rowCount(),
			getScrollElement: () => node,
			getItemKey: (index) => this.#options.getKey(index),
			estimateSize: () => this.rowHeight,
			overscan: this.overscan,
			observeElementRect: createRafElementRectObserver({
				getElement: () => node,
				fallbackWidth: this.#fallbackWidth,
				fallbackHeight: this.#fallbackViewportHeight,
			}),
		});
		const unsubscribe = store.subscribe((instance) => {
			this.#virtualizer = instance;
		});

		return () => {
			node.removeEventListener('scroll', syncScroll);
			resizeObserver?.disconnect();
			unsubscribe();
			this.#virtualizer = null;
			this.#scrollEl = null;
		};
	};

	/** Scroll offset (px) to bring `index` into view per `align`, clamped — delegates to the core. */
	scrollOffsetForIndex(index: number, align: VirtualAlign): number {
		return fixedScrollOffsetForIndex({
			index,
			rowHeight: this.rowHeight,
			viewportHeight: this.viewportHeight,
			scrollTop: this.scrollTop,
			rowCount: this.#options.rowCount(),
			align,
		});
	}

	/**
	 * Reveal `index`: drive the virtualizer's smooth scroll, then pin the deterministic core
	 * offset on the scroll element. Consolidates viewTree's scrollRowIntoView + scrollTopForAlign.
	 */
	scrollToIndex(index: number, align: VirtualAlign): void {
		const node = this.#scrollEl;
		if (!node) return;
		// Read the viewport live (clientHeight) so reveal works even when no scroll/resize event has
		// refreshed $state since the element was last sized — matches viewTree's old scrollRowIntoView.
		const viewportHeight = node.clientHeight || this.#fallbackViewportHeight;
		const current = node.scrollTop;
		const next = fixedScrollOffsetForIndex({
			index,
			rowHeight: this.rowHeight,
			viewportHeight,
			scrollTop: current,
			rowCount: this.#options.rowCount(),
			align,
		});
		if (next === current) return;
		const smoothAlign: Exclude<VirtualAlign, 'auto'> =
			align !== 'auto' ? align : index * this.rowHeight < current ? 'start' : 'end';
		this.#virtualizer?.scrollToIndex(index, { align: smoothAlign, behavior: 'auto' });
		node.scrollTop = next;
		this.scrollTop = next;
		this.viewportHeight = viewportHeight;
		node.dispatchEvent(new Event('scroll'));
	}

	/**
	 * Ids whose rows intersect a content-space y-band — the geometry box/lasso hit-test
	 * that crosses the UNRENDERED virtualized range (no DOM query). Lifts viewTree's
	 * intersectingRowIdsByFixedGeometry into the shared runtime.
	 */
	idsInRect(band: { top: number; bottom: number }): string[] {
		const resolveId = this.#options.resolveId;
		if (!resolveId) return [];
		const { startIndex, endIndex } = fixedIndicesInBand(band, this.rowHeight, this.#options.rowCount());
		const ids: string[] = [];
		for (let index = startIndex; index < endIndex; index += 1) {
			const id = resolveId(index);
			if (id != null) ids.push(id);
		}
		return ids;
	}
}
