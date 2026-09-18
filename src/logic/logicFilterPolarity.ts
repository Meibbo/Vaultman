export type FilterPolarity = 'none' | 'inclusive' | 'exclusive';

interface PendingClick<TTarget> {
	target: TTarget;
	from: FilterPolarity;
	to: FilterPolarity;
	startedAt: number;
	timer: unknown;
}

function oppositePolarity(polarity: FilterPolarity): FilterPolarity {
	return polarity === 'inclusive' ? 'exclusive' : 'inclusive';
}

interface DeferredFilterClickOptions<TTarget> {
	onEffect: (target: TTarget, polarity: FilterPolarity) => void;
	thresholdMs?: number;
	setTimer?: (callback: () => void, delayMs: number) => unknown;
	clearTimer?: (timer: unknown) => void;
}

/**
 * Defers every filter click until the double-click window closes.
 *
 * A fast pair from `none` collapses into a single `exclusive` effect instead
 * of briefly writing `inclusive` first. A fast pair on an active rule toggles
 * its polarity atomically (`inclusive` <-> `exclusive`) with a single effect.
 * A lone click on an active rule commits its removal (`none`) when the window
 * closes. A short tombstone after a committed removal absorbs the browser's
 * ghost second click from that same gesture.
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

		const prior = this.pending.get(key);
		if (prior) {
			if (prior.from === 'none') {
				if (current === 'none') {
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
					this.recentRemovals.set(key, now + this.thresholdMs);
					return;
				}
				// The rule became active externally while activation was pending:
				// drop the stale pending and treat this click as an active one.
				this.clearTimer(prior.timer);
				this.pending.delete(key);
			} else {
				if (current === prior.from) {
					if (now - prior.startedAt <= this.thresholdMs) {
						this.clearTimer(prior.timer);
						this.pending.delete(key);
						this.onEffect(target, oppositePolarity(prior.from));
						return;
					}
					// Slow second click on the same active rule with a throttled
					// timer: commit the pending removal, then arm a fresh one so
					// the lone-click semantics survive without doubling effects.
					this.clearTimer(prior.timer);
					this.pending.delete(key);
					this.onEffect(prior.target, 'none');
					this.recentRemovals.set(key, now + this.thresholdMs);
					const timer = this.setTimer(
						() => this.flush(key),
						this.thresholdMs,
					);
					this.pending.set(key, {
						target,
						from: current,
						to: 'none',
						startedAt: now,
						timer,
					});
					return;
				}
				if (current === 'none') {
					// Ghost second click observed while the removal is still
					// deferred: absorb it so a single gesture stays terminal.
					return;
				}
				// External polarity flip while removal was pending: drop the
				// stale pending and re-arm for the new active polarity.
				this.clearTimer(prior.timer);
				this.pending.delete(key);
			}
		}

		if (current !== 'none') {
			const timer = this.setTimer(() => this.flush(key), this.thresholdMs);
			this.pending.set(key, {
				target,
				from: current,
				to: 'none',
				startedAt: now,
				timer,
			});
			return;
		}

		const removalExpiresAt = this.recentRemovals.get(key);
		if (removalExpiresAt !== undefined) {
			if (now <= removalExpiresAt) return;
			this.recentRemovals.delete(key);
		}

		const timer = this.setTimer(() => this.flush(key), this.thresholdMs);
		this.pending.set(key, {
			target,
			from: 'none',
			to: 'inclusive',
			startedAt: now,
			timer,
		});
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
		this.onEffect(pending.target, pending.to);
		if (pending.to === 'none') {
			// Deterministic tombstone anchored to the deferred window instead of
			// the wall clock, so fake-timer harnesses share the same semantics.
			this.recentRemovals.set(
				key,
				pending.startedAt + this.thresholdMs * 2,
			);
		}
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
