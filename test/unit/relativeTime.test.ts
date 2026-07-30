import { describe, expect, it } from 'vitest';

import {
	formatTimestampCell,
	isLiveTimestamp,
	LIVE_TIMESTAMP_TICK_MS,
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
