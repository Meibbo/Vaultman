export interface ClickBurstScheduler {
	setTimeout(callback: () => void, delayMs: number): number;
	clearTimeout(id: number): void;
	now(): number;
}

const browserScheduler: ClickBurstScheduler = {
	setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
	clearTimeout: (id) => window.clearTimeout(id),
	now: () => Date.now(),
};

interface PendingPrimary {
	at: number;
	timer: number;
	primary: () => void;
}

/**
 * Single coordinator for the click-burst grammar shared by every explorer.
 *
 * A continuous burst — two clicks on the same target inside the threshold —
 * resolves to exactly one secondary gesture with zero spurious primaries.
 * Two slow clicks resolve to two complete primaries; nothing is ever
 * swallowed by a pending timer. Clicks on different targets stay independent.
 * A single click still commits after the threshold, so it is deferred but
 * never suppressed indefinitely. Teardown (`cancel`/`dispose`, e.g. on
 * instance change) clears pending timers without late callbacks.
 */
export class ClickBurstGesture {
	private readonly pending = new Map<string, PendingPrimary>();
	private readonly scheduler: ClickBurstScheduler;
	private readonly thresholdMs: number;

	constructor(
		scheduler: ClickBurstScheduler = browserScheduler,
		thresholdMs = 250,
	) {
		this.scheduler = scheduler;
		this.thresholdMs = thresholdMs;
	}

	click(
		key: string,
		now: number = this.scheduler.now(),
		primary: () => void,
		secondary?: () => void,
	): void {
		if (!secondary) {
			this.flushKey(key);
			primary();
			return;
		}
		const prior = this.pending.get(key);
		if (prior) {
			this.clearTimer(key, prior);
			if (now - prior.at <= this.thresholdMs) {
				this.flushOthers(key);
				secondary();
				return;
			}
			// Slow pair: the first primary completes now, before the second
			// click starts its own window. Event timestamps define the burst,
			// not a throttled event loop, so nothing is swallowed here.
			prior.primary();
		}
		this.flushOthers(key);
		const timer = this.scheduler.setTimeout(() => {
			this.pending.delete(key);
			primary();
		}, this.thresholdMs);
		this.pending.set(key, { at: now, timer, primary });
	}

	/** Drop every pending primary without firing. Safe on teardown. */
	cancel(): void {
		for (const [key, prior] of this.pending) {
			this.clearTimer(key, prior);
		}
		this.pending.clear();
	}

	/** Alias for owners that dispose coordinators on unload. */
	dispose(): void {
		this.cancel();
	}

	private flushKey(key: string): void {
		const prior = this.pending.get(key);
		if (!prior) return;
		this.clearTimer(key, prior);
		this.pending.delete(key);
		prior.primary();
	}

	private flushOthers(exceptKey: string): void {
		for (const [key, prior] of [...this.pending]) {
			if (key === exceptKey) continue;
			this.clearTimer(key, prior);
			this.pending.delete(key);
			prior.primary();
		}
	}

	private clearTimer(key: string, prior: PendingPrimary): void {
		this.scheduler.clearTimeout(prior.timer);
		this.pending.delete(key);
	}
}
