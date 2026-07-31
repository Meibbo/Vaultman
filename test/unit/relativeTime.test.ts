import { describe, expect, it } from 'vitest';

import {
	DEFAULT_RELATIVE_TIME_CUTOFFS,
	formatTimestampCell,
	isLiveTimestamp,
	LIVE_TIMESTAMP_TICK_MS,
	type RelativeTimeCutoffs,
	type TimestampRelativeWindow,
} from '../../src/logic/logicRelativeTime';

/**
 * U121-027. The clock is injected, never read from Date.now(), so every boundary
 * below is deterministic.
 */
const NOW = Date.UTC(2026, 6, 29, 12, 0, 0);
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Echoes the key plus its interpolated count so tests assert routing, not copy. */
const translate = (key: string, vars?: Record<string, string | number>): string =>
	vars && 'count' in vars ? `${key}:${vars.count}` : key;

const relative = (time: number | null | undefined, now: number = NOW) =>
	formatTimestampCell(time, { now, mode: 'relative', translate });

const specific = (time: number | null | undefined, now: number = NOW) =>
	formatTimestampCell(time, { now, mode: 'specific', translate });

describe('U121-027 relative timestamp cells', () => {
	it('uses relative copy under 24 hours in relative mode', () => {
		expect(relative(NOW - 30 * SECOND)).toBe('time.just_now');
		expect(relative(NOW - 5 * MINUTE)).toBe('time.minutes_ago:5');
		expect(relative(NOW - 3 * HOUR)).toBe('time.hours_ago:3');
	});

	it('falls back to the absolute format at or above 24 hours', () => {
		const absolute = new Date(NOW - DAY).toLocaleDateString();
		expect(relative(NOW - DAY)).toBe(absolute);
		expect(relative(NOW - 400 * DAY)).toBe(
			new Date(NOW - 400 * DAY).toLocaleDateString(),
		);
	});

	it('keeps boundaries deterministic', () => {
		// Exactly 60s is a minute, exactly 60min is an hour, exactly 24h is absolute.
		// Count 1 takes the singular key so translations can decline properly.
		expect(relative(NOW - 60 * SECOND)).toBe('time.minute_ago:1');
		expect(relative(NOW - 60 * MINUTE)).toBe('time.hour_ago:1');
		expect(relative(NOW - (DAY - SECOND))).toBe('time.hours_ago:23');
		expect(relative(NOW - DAY)).toBe(new Date(NOW - DAY).toLocaleDateString());
	});

	it('clamps future timestamps to just now instead of emitting negatives', () => {
		expect(relative(NOW + HOUR)).toBe('time.just_now');
		expect(relative(NOW + 400 * DAY)).toBe('time.just_now');
	});

	it('returns undefined for missing or impossible timestamps', () => {
		expect(relative(null)).toBeUndefined();
		expect(relative(undefined)).toBeUndefined();
		expect(relative(0)).toBeUndefined();
		expect(relative(-1)).toBeUndefined();
		expect(relative(Number.NaN)).toBeUndefined();
		expect(relative(Number.POSITIVE_INFINITY)).toBeUndefined();
	});

	it('always uses the absolute format in specific mode', () => {
		expect(specific(NOW - 30 * SECOND)).toBe(
			new Date(NOW - 30 * SECOND).toLocaleDateString(),
		);
		expect(specific(NOW - 3 * HOUR)).toBe(new Date(NOW - 3 * HOUR).toLocaleDateString());
		expect(specific(null)).toBeUndefined();
	});
});

describe('U121-027 live-timestamp guard', () => {
	const relativeMode = { now: NOW, mode: 'relative' as const };
	const specificMode = { now: NOW, mode: 'specific' as const };

	it('marks sub-24h timestamps as live in relative mode', () => {
		expect(isLiveTimestamp(NOW - 30 * SECOND, relativeMode)).toBe(true);
		expect(isLiveTimestamp(NOW - 23 * HOUR, relativeMode)).toBe(true);
	});

	it('does not mark anything live once the cell shows a fixed date', () => {
		// At/over 24h the cell renders an absolute date, which never goes stale.
		expect(isLiveTimestamp(NOW - DAY, relativeMode)).toBe(false);
		expect(isLiveTimestamp(NOW - 400 * DAY, relativeMode)).toBe(false);
	});

	it('never reports live in specific mode, so an absolute vault skips the tick', () => {
		expect(isLiveTimestamp(NOW - 30 * SECOND, specificMode)).toBe(false);
		expect(isLiveTimestamp(NOW - 3 * HOUR, specificMode)).toBe(false);
	});

	it('treats unusable timestamps as not live', () => {
		expect(isLiveTimestamp(null, relativeMode)).toBe(false);
		expect(isLiveTimestamp(undefined, relativeMode)).toBe(false);
		expect(isLiveTimestamp(0, relativeMode)).toBe(false);
		expect(isLiveTimestamp(Number.NaN, relativeMode)).toBe(false);
	});

	it('counts a future timestamp as live, since it still reads "just now"', () => {
		expect(isLiveTimestamp(NOW + HOUR, relativeMode)).toBe(true);
	});

	it('ticks at most once a minute, the coarsest cadence that never shows stale copy', () => {
		expect(LIVE_TIMESTAMP_TICK_MS).toBe(MINUTE);
	});
});

/** QA 2026-07-31: window + unit-cutoff options. */
const WEEK = 7 * DAY;
const YEAR = 365.25 * DAY;
const MONTH = YEAR / 12;

const windowed = (
	time: number,
	window: TimestampRelativeWindow,
	cutoffs?: Partial<RelativeTimeCutoffs>,
) => formatTimestampCell(time, { now: NOW, mode: 'relative', window, cutoffs, translate });

describe('U121-027 relative window', () => {
	it('defaults to the original 24h behaviour when window is omitted', () => {
		expect(relative(NOW - 25 * HOUR)).toBe(
			new Date(NOW - 25 * HOUR).toLocaleDateString(),
		);
	});

	it('extends relative copy to 31 days', () => {
		expect(windowed(NOW - 25 * HOUR, '31d')).toBe('time.day_ago:1');
		expect(windowed(NOW - 6 * DAY, '31d')).toBe('time.days_ago:6');
		expect(windowed(NOW - 31 * DAY, '31d')).toBe(
			new Date(NOW - 31 * DAY).toLocaleDateString(),
		);
	});

	it('bounds the year window by calendar year, not by rolling days', () => {
		// NOW is 2026-07-29; January of the same year stays relative, while
		// December of the previous year — fewer days away than "this year"
		// spans — falls back to the absolute date.
		const january = Date.UTC(2026, 0, 10, 12, 0, 0);
		const lastDecember = Date.UTC(2025, 11, 20, 12, 0, 0);
		// 200 days back: past two quarters, so the ladder reads it as a semester.
		expect(windowed(january, 'year')).toBe('time.semester_ago:1');
		expect(windowed(lastDecember, 'year')).toBe(
			new Date(lastDecember).toLocaleDateString(),
		);
	});

	it('never falls back to the absolute date without a limit', () => {
		expect(windowed(NOW - 3 * YEAR, 'always')).toBe('time.years_ago:3');
	});

	it('walks every rung of the unit ladder with the default cutoffs', () => {
		const cases: [number, string][] = [
			[NOW - 2 * DAY, 'time.days_ago:2'],
			[NOW - 10 * DAY, 'time.week_ago:1'],
			[NOW - 4 * WEEK, 'time.weeks_ago:4'],
			[NOW - 6 * WEEK, 'time.month_ago:1'],
			[NOW - 2.5 * MONTH, 'time.months_ago:2'],
			[NOW - 4 * MONTH, 'time.quarter_ago:1'],
			[NOW - 7 * MONTH, 'time.semester_ago:1'],
			[NOW - 1.2 * YEAR, 'time.year_ago:1'],
		];
		for (const [time, expected] of cases) {
			expect(windowed(time, 'always')).toBe(expected);
		}
	});

	it('marks cells live exactly while they are inside the window', () => {
		const live = (time: number, window: TimestampRelativeWindow) =>
			isLiveTimestamp(time, { now: NOW, mode: 'relative', window });
		expect(live(NOW - 25 * HOUR, '24h')).toBe(false);
		expect(live(NOW - 25 * HOUR, '31d')).toBe(true);
		expect(live(NOW - 3 * YEAR, 'always')).toBe(true);
		expect(live(Date.UTC(2025, 11, 20), 'year')).toBe(false);
	});
});

describe('U121-027 unit cutoffs', () => {
	it('ships natural defaults', () => {
		expect(DEFAULT_RELATIVE_TIME_CUTOFFS).toEqual({
			minuteFromSeconds: 60,
			hourFromMinutes: 60,
			dayFromHours: 24,
			weekFromDays: 7,
			monthFromWeeks: 5,
			quarterFromMonths: 3,
			semesterFromQuarters: 2,
			yearFromSemesters: 2,
		});
	});

	it('honours per-unit overrides', () => {
		// "Just now" stretched to two minutes.
		expect(
			windowed(NOW - 90 * SECOND, 'always', { minuteFromSeconds: 120 }),
		).toBe('time.just_now');
		// Hours arrive at 30 minutes instead of 60.
		expect(
			windowed(NOW - 45 * MINUTE, 'always', { hourFromMinutes: 30 }),
		).toBe('time.hour_ago:1');
		// Days can be pushed out to 48 hours.
		expect(
			windowed(NOW - 30 * HOUR, 'always', { dayFromHours: 48 }),
		).toBe('time.hours_ago:30');
	});

	it('clamps so a shortened cutoff never prints a zero count', () => {
		expect(
			windowed(NOW - 45 * MINUTE, 'always', { hourFromMinutes: 30 }),
		).not.toContain(':0');
	});
});
