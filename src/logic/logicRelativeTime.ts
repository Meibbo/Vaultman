/**
 * U121-027 — relative timestamp copy for the Files time cells.
 *
 * Pure by design: the clock is injected and `translate` is a parameter, so the
 * boundaries are testable without a global clock or i18n state. The four call
 * sites that previously each ran their own `new Date(t).toLocaleDateString()`
 * now route through here, which is what keeps the cells and their tooltips in
 * the same mode.
 */

export type TimestampMode = 'relative' | 'specific';

export type TimestampTranslate = (
	key: string,
	vars?: Record<string, string | number>,
) => string;

export interface FormatTimestampOptions {
	/** Injected clock. Callers pass `Date.now()`; tests pass a fixed instant. */
	now: number;
	mode: TimestampMode;
	translate: TimestampTranslate;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * The absolute format stays exactly what the cells rendered before this issue,
 * so `specific` mode and the >= 24h fallback are byte-identical to 1.2.0.
 */
export function formatAbsoluteTimestamp(time: number): string {
	return new Date(time).toLocaleDateString();
}

/**
 * Returns `undefined` for anything that is not a usable instant, which is the
 * signal the cells already use to render blank (BT5-013: a never-opened file
 * must not show a fake epoch).
 */
export function formatTimestampCell(
	time: number | null | undefined,
	options: FormatTimestampOptions,
): string | undefined {
	if (time === null || time === undefined) return undefined;
	if (!Number.isFinite(time) || time <= 0) return undefined;

	if (options.mode === 'specific') return formatAbsoluteTimestamp(time);

	// A timestamp ahead of the clock is clock skew or a touched mtime, not a
	// negative age. Clamping to "just now" keeps the cell deterministic instead
	// of rendering "-3 hours ago".
	const age = Math.max(0, options.now - time);

	if (age >= DAY) return formatAbsoluteTimestamp(time);
	if (age < MINUTE) return options.translate('time.just_now');
	if (age < HOUR) {
		const count = Math.floor(age / MINUTE);
		return options.translate(count === 1 ? 'time.minute_ago' : 'time.minutes_ago', {
			count,
		});
	}

	const count = Math.floor(age / HOUR);
	return options.translate(count === 1 ? 'time.hour_ago' : 'time.hours_ago', { count });
}
