/**
 * Simple debounce utility for performance optimization.
 */
interface DebounceScheduler {
	setTimeout(cb: () => void, ms: number): number;
	clearTimeout(handle: number): void;
}

function defaultScheduler(): DebounceScheduler {
	return {
		setTimeout: (cb, ms) => window.setTimeout(cb, ms),
		clearTimeout: (handle) => window.clearTimeout(handle),
	};
}

export function debounce<TArgs extends unknown[]>(
	fn: (...args: TArgs) => void,
	ms: number,
	scheduler: DebounceScheduler = defaultScheduler(),
): (...args: TArgs) => void {
	let timeout: number | null = null;
	return (...args: TArgs) => {
		if (timeout) scheduler.clearTimeout(timeout);
		timeout = scheduler.setTimeout(() => {
			timeout = null;
			fn(...args);
		}, ms);
	};
}

/**
 * Leading-edge debounce for explorer refresh paths.
 *
 * The first event refreshes immediately so the UI does not sit stale for the
 * debounce window. Further events inside the window collapse into one trailing
 * refresh with the latest arguments, preserving burst protection.
 */
export function leadingDebounce<TArgs extends unknown[]>(
	fn: (...args: TArgs) => void,
	ms: number,
	scheduler: DebounceScheduler = defaultScheduler(),
): (...args: TArgs) => void {
	let timeout: number | null = null;
	let trailingArgs: TArgs | null = null;

	const flushWindow = () => {
		timeout = null;
		if (!trailingArgs) return;
		const args = trailingArgs;
		trailingArgs = null;
		fn(...args);
		timeout = scheduler.setTimeout(flushWindow, ms);
	};

	return (...args: TArgs) => {
		if (!timeout) {
			fn(...args);
			timeout = scheduler.setTimeout(flushWindow, ms);
			return;
		}
		trailingArgs = args;
	};
}
