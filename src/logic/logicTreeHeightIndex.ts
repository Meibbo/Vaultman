/**
 * U130 native polish: shared variable-height index for the tree.
 *
 * Native theme CSS can change padding, font metrics and wrapping, so the old
 * `index * rowHeight` formula is incorrect under compatible styling. The
 * index keeps one measured height per stable occurrence key (surviving
 * splices and re-renders), falls back to an estimate offscreen, and answers
 * every geometry question — window, spacer, reveal, sticky, scope preview —
 * from the same prefix sums with logarithmic offset lookup. Only mounted
 * slots are ever measured, via grouped ResizeObserver entries; nothing here
 * reads layout synchronously per row on render or scroll.
 */

export interface TreeHeightAnchor {
	key: string;
	/** Pixels from the anchor row's top to the viewport top. */
	offsetWithin: number;
}

/** Sub-pixel churn from zoom/rounding must not invalidate the world. */
export const HEIGHT_EPSILON_PX = 0.5;

/** Bound for the per-key measurement cache (stable keys persist collapsed). */
export const MAX_MEASURED_KEYS = 20000;

/** Samples needed before the measured mean replaces the static estimate. */
export const ADAPTIVE_FALLBACK_MIN_SAMPLES = 8;

export class TreeHeightIndex {
	private estimate: number;
	private keys: string[] = [];
	private heights: number[] = [];
	private fenwick: Float64Array = new Float64Array(1);
	private readonly keyIndex = new Map<string, number>();
	private readonly measured = new Map<string, number>();
	/**
	 * U200 L1: running mean of every accepted measurement. Unknown keys
	 * (cold expand, first paint) start here instead of the static density
	 * pitch: under compatible theming the real row box (26.89px en
	 * Comet) difiere del pitch (28px) y ese +1.1px/fila es el estirón
	 * visible antes de la corrección del ResizeObserver.
	 */
	private measuredMean = 0;
	private measuredSamples = 0;

	constructor(estimate: number) {
		this.estimate = Math.max(1, estimate);
	}

	getEstimate(): number {
		return this.estimate;
	}

	setEstimate(estimate: number): void {
		const next = Math.max(1, estimate);
		if (next === this.estimate) return;
		this.estimate = next;
		this.rebuild();
	}

	rowCount(): number {
		return this.keys.length;
	}

	/**
	 * Adopt a new flattened order. Measured heights follow their stable keys;
	 * unknown keys (new slices, first paint) use the estimate. Offscreen rows
	 * are never scanned or measured here.
	 */
	setRows(keys: readonly string[]): void {
		this.keys = [...keys];
		this.keyIndex.clear();
		for (let index = 0; index < this.keys.length; index += 1) {
			const key = this.keys[index];
			if (key !== undefined && !this.keyIndex.has(key)) {
				this.keyIndex.set(key, index);
			}
		}
		this.rebuild();
	}

	/** Record a mounted slot's entry height. Returns `true` when geometry moved. */
	setMeasured(key: string, height: number): boolean {
		if (!Number.isFinite(height) || height <= 0) return false;
		// U200 L1: feed the adaptive fallback before the epsilon early-out
		// so repeated identical reports still count as evidence.
		this.measuredSamples += 1;
		this.measuredMean += (height - this.measuredMean) / this.measuredSamples;
		const prev = this.measured.get(key);
		if (prev !== undefined && Math.abs(prev - height) < HEIGHT_EPSILON_PX) {
			return false;
		}
		if (!this.measured.has(key) && this.measured.size >= MAX_MEASURED_KEYS) {
			// Oldest-first eviction keeps the cache bounded in huge vaults;
			// evicted keys simply re-measure on next mount.
			const oldest = this.measured.keys().next();
			if (!oldest.done) this.measured.delete(oldest.value);
		}
		this.measured.set(key, height);
		const at = this.keyIndex.get(key);
		if (at === undefined) return false;
		const previousHeight = this.heights[at] ?? this.estimate;
		if (Math.abs(previousHeight - height) < HEIGHT_EPSILON_PX) {
			return false;
		}
		this.heights[at] = height;
		this.addToFenwick(at, height - previousHeight);
		return true;
	}

	/** Forget one key (row removed). Keeps the map bounded. */
	deleteKey(key: string): void {
		this.measured.delete(key);
	}

	heightForIndex(index: number): number {
		return this.heights[index] ?? this.unknownFallback();
	}

	topForIndex(index: number): number {
		if (index <= 0) return 0;
		if (index >= this.keys.length) return this.totalHeight();
		return this.prefixSum(index);
	}

	totalHeight(): number {
		return this.prefixSum(this.keys.length);
	}

	/** Logarithmic: first index whose bottom edge passes `offset`. */
	indexForOffset(offset: number): number {
		const n = this.keys.length;
		if (n === 0) return 0;
		const target = Math.max(0, offset);
		let index = 0;
		let sum = 0;
		let bit = 1;
		while (bit < n) bit <<= 1;
		for (bit >>= 1; bit > 0; bit >>= 1) {
			const next = index + bit;
			const nextSum = sum + (this.fenwick[next] ?? 0);
			if (next <= n && nextSum <= target) {
				index = next;
				sum = nextSum;
			}
		}
		return Math.min(n - 1, index);
	}

	/**
	 * Capture what the viewport points at so a theme/font/width invalidation
	 * can restore it. The anchor is a stable key, never an index.
	 */
	anchorForOffset(scrollTop: number): TreeHeightAnchor | null {
		if (this.keys.length === 0) return null;
		const index = this.indexForOffset(scrollTop);
		const key = this.keys[index];
		if (key === undefined) return null;
		return { key, offsetWithin: scrollTop - this.topForIndex(index) };
	}

	/** Scroll offset that restores a captured anchor under new geometry. */
	offsetForAnchor(anchor: TreeHeightAnchor): number | null {
		const index = this.keyIndex.get(anchor.key);
		if (index === undefined) return null;
		return Math.max(0, this.topForIndex(index) + anchor.offsetWithin);
	}

	/** Theme/font/width changed: cached geometry is stale, the anchor survives. */
	invalidateAll(): void {
		this.measured.clear();
		this.rebuild();
	}

	/**
	 * U200 L1: prior for unknown keys. The static density pitch until
	 * enough mounted slots reported, then their running mean. Deliberately
	 * NOT reset by `invalidateAll()`: it is only a prior and re-converges
	 * within a window render either way. `getEstimate()` (density pitch
	 * for sticky math) is untouched.
	 */
	unknownFallback(): number {
		return this.measuredSamples >= ADAPTIVE_FALLBACK_MIN_SAMPLES
			? this.measuredMean
			: this.estimate;
	}

	indexOfKey(key: string): number {
		return this.keyIndex.get(key) ?? -1;
	}

	private rebuild(): void {
		this.heights = this.keys.map(
			(key) => this.measured.get(key) ?? this.unknownFallback(),
		);
		this.fenwick = new Float64Array(this.heights.length + 1);
		for (let index = 0; index < this.heights.length; index += 1) {
			this.addToFenwick(index, this.heights[index] ?? this.estimate);
		}
	}

	private addToFenwick(index: number, delta: number): void {
		for (let cursor = index + 1; cursor < this.fenwick.length; cursor += cursor & -cursor) {
			this.fenwick[cursor] = (this.fenwick[cursor] ?? 0) + delta;
		}
	}

	private prefixSum(count: number): number {
		let sum = 0;
		for (let cursor = Math.min(count, this.heights.length); cursor > 0; cursor -= cursor & -cursor) {
			sum += this.fenwick[cursor] ?? 0;
		}
		return sum;
	}
}

/**
 * Read a ResizeObserver entry's height without touching layout. Prefers the
 * grouped `borderBoxSize`, falls back to `contentRect` — both are computed
 * measurements the observer already provides.
 */
export function readObserverEntryHeight(entry: ResizeObserverEntry): number {
	const border = (entry as { borderBoxSize?: readonly { blockSize: number }[] })
		.borderBoxSize?.[0]?.blockSize;
	if (typeof border === 'number' && Number.isFinite(border) && border > 0) {
		return border;
	}
	const rect = entry.contentRect?.height;
	return typeof rect === 'number' && Number.isFinite(rect) && rect > 0 ? rect : 0;
}
