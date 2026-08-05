/**
 * U121-027 — relative timestamp copy for the Files time cells.
 *
 * Pure by design: the clock is injected and `translate` is a parameter, so the
 * boundaries are testable without a global clock or i18n state. The call sites
 * that previously each ran their own `new Date(t).toLocaleDateString()` now
 * route through here, which is what keeps the cells and their tooltips in the
 * same mode.
 *
 * Two user-tunable axes (QA 2026-07-31):
 * - `window` bounds how far back relative copy reaches; older cells fall back
 *   to the absolute date. Default '24h' — the original behaviour.
 * - `cutoffs` decide at how many of the current unit the wording switches to
 *   the next one (60 s → minutes, 60 min → hours, 24 h → days, then weeks,
 *   months, quarters, semesters, years). Defaults are the natural boundaries.
 */

export type TimestampMode = 'relative' | 'specific';

/**
 * How far back relative copy reaches. '24h' and '31d' are rolling windows;
 * 'year' means the same calendar year as the injected clock; 'always' never
 * falls back to the absolute date.
 */
export type TimestampRelativeWindow = '24h' | '31d' | 'year' | 'always';

/**
 * Each field reads "switch to <unit> once the age reaches N of the previous
 * unit". Counts below the first cutoff render as "just now".
 */
export interface RelativeTimeCutoffs {
	/** Seconds shown as "just now" before the wording switches to minutes. */
	minuteFromSeconds: number;
	/** Minutes shown before the wording switches to hours. */
	hourFromMinutes: number;
	/** Hours shown before the wording switches to days. */
	dayFromHours: number;
	/** Days shown before the wording switches to weeks. */
	weekFromDays: number;
	/** Weeks shown before the wording switches to months. */
	monthFromWeeks: number;
	/** Months shown before the wording switches to quarters. */
	quarterFromMonths: number;
	/** Quarters shown before the wording switches to semesters. */
	semesterFromQuarters: number;
	/** Semesters shown before the wording switches to years. */
	yearFromSemesters: number;
}

export const DEFAULT_RELATIVE_TIME_CUTOFFS: RelativeTimeCutoffs = {
	minuteFromSeconds: 60,
	hourFromMinutes: 60,
	dayFromHours: 24,
	weekFromDays: 7,
	monthFromWeeks: 5,
	quarterFromMonths: 3,
	semesterFromQuarters: 2,
	yearFromSemesters: 2,
};

export type TimestampTranslate = (
	key: string,
	vars?: Record<string, string | number>,
) => string;

export interface FormatTimestampOptions {
	/** Injected clock. Callers pass `Date.now()`; tests pass a fixed instant. */
	now: number;
	mode: TimestampMode;
	/** Defaults to '24h', the original behaviour. */
	window?: TimestampRelativeWindow;
	/** Partial overrides; unset fields use `DEFAULT_RELATIVE_TIME_CUTOFFS`. */
	cutoffs?: Partial<RelativeTimeCutoffs>;
	hideRelativePredicate?: boolean;
	translate: TimestampTranslate;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
// Calendar-average lengths keep the ladder pure (no timezone math) while
// staying within a day of the calendar for the coarse units.
const YEAR = 365.25 * DAY;
const MONTH = YEAR / 12;
const QUARTER = YEAR / 4;
const SEMESTER = YEAR / 2;

/**
 * The absolute format stays exactly what the cells rendered before this issue,
 * so `specific` mode and the out-of-window fallback are byte-identical to 1.2.0.
 */
export function formatAbsoluteTimestamp(time: number): string {
	return new Date(time).toLocaleDateString();
}

function withinRelativeWindow(
	time: number,
	options: Pick<FormatTimestampOptions, 'now' | 'window'>,
): boolean {
	const age = Math.max(0, options.now - time);
	switch (options.window ?? '24h') {
		case 'always':
			return true;
		case '24h':
			return age < DAY;
		case '31d':
			return age < 31 * DAY;
		case 'year':
			return (
				new Date(time).getFullYear() === new Date(options.now).getFullYear()
			);
	}
}

/**
 * True when this cell's text will go stale on its own — relative mode and still
 * inside the configured window. The explorer ORs this across a pass to decide
 * whether the live ticker has anything to repaint, so an idle vault costs one
 * boolean check per minute instead of a walk.
 */
export function isLiveTimestamp(
	time: number | null | undefined,
	options: Pick<FormatTimestampOptions, 'now' | 'mode' | 'window'>,
): boolean {
	if (options.mode !== 'relative') return false;
	if (time === null || time === undefined) return false;
	if (!Number.isFinite(time) || time <= 0) return false;
	return withinRelativeWindow(time, options);
}

/**
 * How often a relative cell can change wording: once a minute while it reads in
 * minutes, and every coarser bucket is a superset of that. One tick per minute
 * is therefore the coarsest cadence that never shows stale copy.
 */
export const LIVE_TIMESTAMP_TICK_MS = MINUTE;

/** Rungs walked in order; the first whose next-unit count is under its cutoff wins. */
const LADDER = [
	{ unit: MINUTE, singular: 'time.minute_ago', plural: 'time.minutes_ago', cutoff: 'hourFromMinutes' },
	{ unit: HOUR, singular: 'time.hour_ago', plural: 'time.hours_ago', cutoff: 'dayFromHours' },
	{ unit: DAY, singular: 'time.day_ago', plural: 'time.days_ago', cutoff: 'weekFromDays' },
	{ unit: WEEK, singular: 'time.week_ago', plural: 'time.weeks_ago', cutoff: 'monthFromWeeks' },
	{ unit: MONTH, singular: 'time.month_ago', plural: 'time.months_ago', cutoff: 'quarterFromMonths' },
	{ unit: QUARTER, singular: 'time.quarter_ago', plural: 'time.quarters_ago', cutoff: 'semesterFromQuarters' },
	{ unit: SEMESTER, singular: 'time.semester_ago', plural: 'time.semesters_ago', cutoff: 'yearFromSemesters' },
	{ unit: YEAR, singular: 'time.year_ago', plural: 'time.years_ago', cutoff: null },
] as const;

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
	if (!withinRelativeWindow(time, options)) {
		return formatAbsoluteTimestamp(time);
	}

	// A timestamp ahead of the clock is clock skew or a touched mtime, not a
	// negative age. Clamping to "just now" keeps the cell deterministic instead
	// of rendering "-3 hours ago".
	const age = Math.max(0, options.now - time);
	const cutoffs = { ...DEFAULT_RELATIVE_TIME_CUTOFFS, ...options.cutoffs };

	if (age / SECOND < Math.max(1, cutoffs.minuteFromSeconds)) {
		return options.translate('time.just_now');
	}
	for (const rung of LADDER) {
		// Clamped so a shortened cutoff can never print "0 hours ago".
		const count = Math.max(1, Math.floor(age / rung.unit));
		if (rung.cutoff === null || count < Math.max(1, cutoffs[rung.cutoff])) {
			const text = options.translate(count === 1 ? rung.singular : rung.plural, {
				count,
			});
			return options.hideRelativePredicate ? text.replace(/ ago$/i, '').replace(/^hace /i, '') : text;
		}
	}
	// Unreachable: the year rung has no cutoff.
	return formatAbsoluteTimestamp(time);
}
