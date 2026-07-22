export type FilterPolarity = 'none' | 'inclusive' | 'exclusive';

interface PendingClick<TTarget> {
	target: TTarget;
	startedAt: number;
	timer: unknown;
}

interface DeferredFilterClickOptions<TTarget> {
	onEffect: (target: TTarget, polarity: FilterPolarity) => void;
	thresholdMs?: number;
	setTimer?: (callback: () => void, delayMs: number) => unknown;
	clearTimer?: (timer: unknown) => void;
}

/**
 * Defers an inactive filter click until the double-click window closes.
 *
 * This prevents a fast pair from briefly writing an inclusive rule before it
 * is replaced by an exclusive rule. Active rules are removed immediately; a
 * short tombstone absorbs the browser's second click from that same gesture.
 */
export class DeferredFilterClickCoordinator<TTarget> {
	private readonly thresholdMs: number;
	private readonly onEffect: (
		target: TTarget,
		polarity: FilterPolarity,
	) => void;
	private readonly setTimer: (callback: () => void, delayMs: number) => unknown;
	private readonly clearTimer: (timer: unknown) => void;
	private readonly pending = new Map<string, PendingClick<TTarget>>();
	private readonly recentRemovals = new Map<string, number>();

	constructor(options: DeferredFilterClickOptions<TTarget>) {
		this.thresholdMs = options.thresholdMs ?? 250;
		this.onEffect = options.onEffect;
		this.setTimer =
			options.setTimer ??
			((callback, delayMs) => window.setTimeout(callback, delayMs));
		this.clearTimer =
			options.clearTimer ?? ((timer) => window.clearTimeout(timer as number));
	}

	click(
		key: string,
		target: TTarget,
		current: FilterPolarity,
		now = Date.now(),
	): void {
		this.pruneRecentRemovals(now);
		if (current !== 'none') {
			this.cancel(key);
			this.onEffect(target, 'none');
			this.recentRemovals.set(key, now + this.thresholdMs);
			return;
		}

		const removalExpiresAt = this.recentRemovals.get(key);
		if (removalExpiresAt !== undefined) {
			if (now <= removalExpiresAt) return;
			this.recentRemovals.delete(key);
		}

		const prior = this.pending.get(key);
		if (prior) {
			this.clearTimer(prior.timer);
			this.pending.delete(key);
			if (now - prior.startedAt <= this.thresholdMs) {
				this.onEffect(target, 'exclusive');
				return;
			}

			// A delayed timer may be throttled in a background window. Preserve
			// slow-pair semantics even when it has not had a chance to run.
			this.onEffect(prior.target, 'inclusive');
			this.onEffect(target, 'none');
			return;
		}

		const timer = this.setTimer(() => this.flush(key), this.thresholdMs);
		this.pending.set(key, { target, startedAt: now, timer });
	}

	private pruneRecentRemovals(now: number): void {
		for (const [key, expiresAt] of this.recentRemovals) {
			if (expiresAt < now) this.recentRemovals.delete(key);
		}
	}

	flush(key: string): void {
		const pending = this.pending.get(key);
		if (!pending) return;
		this.pending.delete(key);
		this.onEffect(pending.target, 'inclusive');
	}

	cancel(key: string): void {
		const pending = this.pending.get(key);
		if (!pending) return;
		this.clearTimer(pending.timer);
		this.pending.delete(key);
	}

	dispose(): void {
		for (const pending of this.pending.values()) {
			this.clearTimer(pending.timer);
		}
		this.pending.clear();
		this.recentRemovals.clear();
	}
}

export function filterStateToPolarity(
	state: 'none' | 'included' | 'excluded',
): FilterPolarity {
	if (state === 'included') return 'inclusive';
	if (state === 'excluded') return 'exclusive';
	return 'none';
}
