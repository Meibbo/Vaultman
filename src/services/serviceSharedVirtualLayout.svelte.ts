/* global $state, $derived */
// serviceSharedVirtualLayout (Svelte 5 SHELL) — the reactive layer of the shared
// render-runtime (V.D, thread A). Wraps the framework-agnostic core
// (serviceSharedVirtualLayout.ts) in runes: $state holds the DOM-driven inputs
// (scrollTop / viewportHeight / rowHeight), $derived computes the visible window,
// rows and total height through the pure core. The core range is AUTHORITATIVE
// (deterministic coverage) — this is what removes viewTree's fallbackFixedVirtualRows
// cover-check, the beta.1 blank-window class of bug.
//
// Slice 1 = Linear (fixed-height) pilot (SharedVirtualLayout below, UNCHANGED). `attach` is
// the {@attach} that wires the scroll element + ResizeObserver to $state and creates the
// @tanstack/svelte-virtual virtualizer (Option B: TanStack lives in the shell now so slice-2
// Geometry is additive). The virtualizer's own range is shadowed by the core on the fixed
// path (intentional seam); it drives smooth scrollToIndex today.
//
// Slice 2a = Geometry (variable-height + lanes) strategy (SharedVariableVirtualLayout below,
// NEW). Same discipline as the fixed path: the pure core (serviceSharedVirtualLayout.ts,
// `variableVisibleRange` over the per-provider `VariableProviderRegistry`) is AUTHORITATIVE
// for the window — DOM wiring (`measureElement`-fed size cache, scroll/resize) goes through
// `{@attach}`, never `$effect` (that discipline is the beta.1 fix; slice 2a does not invert
// it). `estimateSize` is sourced from pretext (serviceTextMeasure, via the caller — this shell
// stays measurement-engine-agnostic and only takes a getter) and overscan is
// `ceil(viewportH / estimateSize)` per the locked contract. The `createContext` pair
// (`getSharedGeometryRegistry`/`setSharedGeometryRegistry`) is the Q2 warm per-provider
// registry: N mounted Geometry views that call `setSharedGeometryRegistry` once near the
// explorer root share ONE `VariableProviderRegistry`, so a config change (mode/orientation)
// swaps a view's strategy params (e.g. `laneCount`) on the SAME registry entry instead of
// remounting/re-measuring (Q1).
//
// See docs/work/hardening/specs/2026-06-17-vd-shared-render-runtime + ADR 0012 / 05-view-canon.

import { createContext } from 'svelte';
import { createVirtualizer, type SvelteVirtualizer } from '@tanstack/svelte-virtual';
import { createRafElementRectObserver } from './serviceScroll';
import {
	fixedIndicesInBand,
	fixedScrollOffsetForIndex,
	fixedVisibleRange,
	idsInRectVariable,
	measure as measureVariableProvider,
	restore as restoreVariableProvider,
	snapshot as snapshotVariableProvider,
	variableVisibleRange,
	viewportOverscan,
	type VariableProviderRegistry,
	type VariableProviderSnapshot,
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

// -------------------------------------------------------------------------------------
// Geometry (variable-height + lanes) strategy — slice 2a.
// -------------------------------------------------------------------------------------

const DEFAULT_MEASURE_IDLE_MS = 96;

/** A virtual row/tile in the SharedVirtualRow shape, plus its lane position. */
export interface SharedVariableVirtualRow extends SharedVirtualRow {
	lane: number;
}

export interface SharedVariableVirtualLayoutOptions {
	/** The provider this view's warm Fenwick lives under — shared across N mounted views. */
	providerId: string;
	/** The warm per-provider registry (own instance, or the shared one from context — Q2). */
	registry: VariableProviderRegistry;
	/** Reactive row count — read inside `$derived`; pass a getter over view state. */
	rowCount: () => number;
	/** Per-index size estimate (px), sourced from pretext by the caller — only read on (re)build. */
	estimateSize: (index: number) => number;
	/** Column count for the Geometry lanes strategy; `1` (default) = single lane. */
	laneCount?: number | (() => number);
	/** Stable per-index virtual key (preserves focus / inline-rename / scroll across renders). */
	getKey: (index: number) => string | number;
	/** Resolve a node id by index for the geometry box/lasso hit-test. */
	resolveId?: (index: number) => string | null | undefined;
	/** Viewport height used before the element is measured / when `clientHeight` is 0. */
	fallbackViewportHeight?: number;
	/** Debounce window (ms) for `measureElement`-driven Fenwick patches during active scroll. */
	measureIdleMs?: number;
}

/**
 * Per-view reactive layout controller for the VARIABLE-height + lanes strategy (Geometry:
 * grid/cards/masonry/table). Same shape discipline as `SharedVirtualLayout` (fixed path): the
 * pure core is AUTHORITATIVE for the window, DOM wiring goes through `{@attach}`. The Fenwick
 * itself lives in `registry` (per `providerId`) so it survives this instance being torn down —
 * that's the warm cross-view/cross-config handoff (Q1/Q2), not a per-instance cache.
 */
export class SharedVariableVirtualLayout {
	readonly #options: SharedVariableVirtualLayoutOptions;
	readonly #fallbackViewportHeight: number;
	readonly #measureIdleMs: number;

	#measuredEls = new Map<number, HTMLElement>();
	#measureIdleTimer: ReturnType<typeof setTimeout> | null = null;
	#measureScrollActive = $state(false);

	/** Scroll offset of the viewport (px) — written by the scroll listener at attach time. */
	scrollTop = $state(0);
	/** Viewport height (px) — written by the ResizeObserver at attach time. */
	viewportHeight = $state(0);
	/** Column count for the lanes strategy — swappable on the SAME instance (Q1: no remount). */
	laneCount = $state(1);

	/** Overscan sized to the viewport (`ceil(viewportH / estimateSize(0))`), not a magic constant. */
	readonly overscan: number = $derived(
		viewportOverscan(this.viewportHeight, this.#cfg.estimateSize(0)),
	);

	/** Authoritative visible window [startIndex, endIndex) + content band, from the pure core. */
	readonly window: VisibleRangeBand = $derived.by(() => {
		const lanes = this.#resolvedLaneCount();
		const bandRange = variableVisibleRange(this.#options.registry, {
			providerId: this.#options.providerId,
			scrollTop: this.scrollTop,
			viewportH: this.viewportHeight,
			rowCount: bandCountFor(this.#cfg.rowCount(), lanes),
			overscan: this.overscan,
			estimateSize: (bandIndex) => this.#cfg.estimateSize(bandIndex * lanes),
		});
		return bandRange;
	});

	/** Virtual rows (one per lane per band) for the current window. */
	readonly rows: SharedVariableVirtualRow[] = $derived.by(() => {
		const lanes = this.#resolvedLaneCount();
		const { startIndex, endIndex } = this.window;
		const getKey = this.#cfg.getKey;
		const rowCount = this.#cfg.rowCount();
		const geometry = geometryHandle(this.#options.registry, this.#options.providerId);
		const out: SharedVariableVirtualRow[] = [];
		for (let band = startIndex; band < endIndex; band += 1) {
			const start = geometry ? geometry.topForIndex(band) : 0;
			const size = geometry ? geometry.sizeForIndex(band) : this.#cfg.estimateSize(band * lanes);
			for (let lane = 0; lane < lanes; lane += 1) {
				const index = band * lanes + lane;
				if (index >= rowCount) break;
				out.push({ index, key: getKey(index), start, size, end: start + size, lane });
			}
		}
		return out;
	});

	/** Total scrollable content height (px), from the provider's warm Fenwick. */
	readonly totalHeight: number = $derived.by(() => {
		const geometry = geometryHandle(this.#options.registry, this.#options.providerId);
		return geometry ? geometry.totalSize() : 0;
	});

	constructor(options: SharedVariableVirtualLayoutOptions) {
		this.#options = options;
		this.#fallbackViewportHeight = options.fallbackViewportHeight ?? DEFAULT_FALLBACK_HEIGHT;
		this.#measureIdleMs = options.measureIdleMs ?? DEFAULT_MEASURE_IDLE_MS;
		this.laneCount = resolveLaneCount(options.laneCount);
		this.viewportHeight = this.#fallbackViewportHeight;
		// Establish the provider's warm geometry immediately so `measure()` calls made before
		// the first `window` read (e.g. from a restored snapshot's consumer) are never dropped.
		void this.window;
	}

	get #cfg(): SharedVariableVirtualLayoutOptions {
		return this.#options;
	}

	#resolvedLaneCount(): number {
		return Math.max(1, Math.floor(this.laneCount));
	}

	/**
	 * `{@attach}` for the scroll element: syncs scrollTop / viewportHeight into $state and wires
	 * a debounced `ResizeObserver`-driven `measureElement` path per rendered row (row → Fenwick
	 * patch via `measure()`). DOM wiring only — NOT `$effect` (the beta.1 discipline: `$effect`
	 * for DOM causes setOptions feedback loops; `{@attach}` ties lifecycle to the element).
	 */
	attach = (node: HTMLElement): (() => void) => {
		const syncScroll = (): void => {
			this.scrollTop = node.scrollTop;
			this.viewportHeight = node.clientHeight || this.#fallbackViewportHeight;
			this.#markMeasureScrollActive();
		};
		const syncViewport = (): void => {
			this.viewportHeight = node.clientHeight || this.#fallbackViewportHeight;
		};

		node.addEventListener('scroll', syncScroll, { passive: true });
		let resizeObserver: ResizeObserver | undefined;
		if (typeof ResizeObserver !== 'undefined') {
			resizeObserver = new ResizeObserver(() => syncViewport());
			resizeObserver.observe(node);
		}
		syncViewport();
		syncScroll();

		return () => {
			node.removeEventListener('scroll', syncScroll);
			resizeObserver?.disconnect();
			if (this.#measureIdleTimer !== null) clearTimeout(this.#measureIdleTimer);
			this.#measureIdleTimer = null;
			this.#measuredEls.clear();
		};
	};

	/**
	 * `{@attach}` for a single rendered row/tile element: wires a `ResizeObserver` that patches
	 * the provider Fenwick via `measure()` whenever the element's real size changes (deferred to
	 * idle — never synchronous measurement thrash mid-scroll, per the TanStack failure-mode
	 * table). `bandIndex` is the row-BAND this element belongs to (not the flat item index — the
	 * Fenwick indexes bands; see the module docblock in serviceSharedVirtualLayout.ts).
	 */
	measureRow = (bandIndex: number): ((node: HTMLElement) => () => void) => {
		return (node: HTMLElement) => {
			this.#measuredEls.set(bandIndex, node);
			const ro =
				typeof ResizeObserver === 'undefined'
					? undefined
					: new ResizeObserver(() => this.#scheduleMeasure(bandIndex, node));
			ro?.observe(node);
			this.#scheduleMeasure(bandIndex, node);
			return () => {
				ro?.disconnect();
				this.#measuredEls.delete(bandIndex);
			};
		};
	};

	#scheduleMeasure(bandIndex: number, node: HTMLElement): void {
		if (this.#measureScrollActive) return;
		const size = node.offsetHeight;
		if (size > 0) this.measure(bandIndex, size);
	}

	#markMeasureScrollActive(): void {
		this.#measureScrollActive = true;
		if (this.#measureIdleTimer !== null) clearTimeout(this.#measureIdleTimer);
		this.#measureIdleTimer = setTimeout(() => {
			this.#measureIdleTimer = null;
			this.#measureScrollActive = false;
			for (const [bandIndex, node] of this.#measuredEls) this.#scheduleMeasure(bandIndex, node);
		}, this.#measureIdleMs);
	}

	/** Patches the provider Fenwick at `bandIndex` — O(log n), idempotent for the same size. */
	measure(bandIndex: number, size: number): void {
		measureVariableProvider(this.#options.registry, this.#options.providerId, bandIndex, size);
	}

	/** Layout snapshot for this provider — for warm cross-view handoff. */
	snapshot(): VariableProviderSnapshot | null {
		return snapshotVariableProvider(this.#options.registry, this.#options.providerId);
	}

	/** Restores this provider's warm geometry from a snapshot (e.g. from a sibling view). */
	restore(snap: VariableProviderSnapshot): void {
		restoreVariableProvider(this.#options.registry, this.#options.providerId, snap);
	}

	/**
	 * Ids whose rows/tiles intersect a content-space y-band — the Geometry box/lasso hit-test
	 * across the UNRENDERED variable+lanes range (no DOM query).
	 */
	idsInRect(band: { top: number; bottom: number }): string[] {
		const resolveId = this.#options.resolveId;
		if (!resolveId) return [];
		return idsInRectVariable(this.#options.registry, this.#options.providerId, {
			band,
			laneCount: this.#resolvedLaneCount(),
			resolveId,
		});
	}
}

function resolveLaneCount(laneCount: number | (() => number) | undefined): number {
	if (laneCount === undefined) return 1;
	const value = typeof laneCount === 'function' ? laneCount() : laneCount;
	return Math.max(1, Math.floor(value));
}

function bandCountFor(rowCount: number, laneCount: number): number {
	const lanes = Math.max(1, Math.floor(laneCount));
	return Math.max(0, Math.ceil(Math.max(0, rowCount) / lanes));
}

/** Reads the live geometry handle for a provider without patching it (band top/size lookups). */
function geometryHandle(
	registry: VariableProviderRegistry,
	providerId: string,
): { topForIndex(index: number): number; sizeForIndex(index: number): number; totalSize(): number } | null {
	return registry.entries.get(providerId)?.geometry ?? null;
}

/**
 * `createContext` warm per-provider measurement registry (Q2, slice-2 commitment): a type-safe
 * `[get, set]` pair over ONE shared `VariableProviderRegistry`. Call `setSharedGeometryRegistry`
 * once near the explorer root (e.g. `ViewHost`) with a registry created via
 * `createVariableProviderRegistry()`; every mounted `SharedVariableVirtualLayout` in that
 * subtree calls `getSharedGeometryRegistry()` and passes the SAME registry as its `registry`
 * option, so switching a view's mode/orientation (= new `SharedVariableVirtualLayout` instance,
 * same `providerId`) reuses the warm Fenwick instead of re-measuring from scratch. Both calls
 * must run during component initialization (Svelte context rule) — this module only defines the
 * pair; wiring happens in the `.svelte` consumer.
 */
export const [getSharedGeometryRegistry, setSharedGeometryRegistry] =
	createContext<VariableProviderRegistry>();
