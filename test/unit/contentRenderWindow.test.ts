import { describe, expect, it } from 'vitest';

import {
	CONTENT_MATCH_WINDOW_STEP,
	CONTENT_WINDOW_STEP,
	grownContentWindow,
	remainingContentFiles,
	shouldGrowContentWindow,
	visibleContentCount,
} from '../../src/logic/logicContentRenderWindow';

/**
 * The caps `MAX_FILES = 200` / `MAX_SNIPPETS = 3` truncated the **results**: a
 * file past the two-hundredth simply was not there, and a file's fourth match
 * did not exist. They are gone from the data.
 *
 * What replaces them is a render window, which truncates only the **document**.
 * Every match is in the model and reachable by scrolling; the window is how many
 * of them have rows right now. This branch has no virtualiser — that is deferred
 * — so the window grows rather than recycling.
 */

describe('how many files currently have rows', () => {
	it('shows the whole result when it fits inside the window', () => {
		expect(visibleContentCount(12, 200)).toBe(12);
	});

	it('never renders more rows than the window allows', () => {
		expect(visibleContentCount(10_000, 200)).toBe(200);
	});

	it('treats a window of zero as the first step, not as nothing', () => {
		// A zero window would render an empty result list for a search that
		// matched, which reads as "no results" — the failure the caps produced in
		// a subtler form.
		expect(visibleContentCount(10_000, 0)).toBe(CONTENT_WINDOW_STEP);
	});
});

describe('what is still waiting to be rendered', () => {
	it('counts the files with no row yet', () => {
		expect(remainingContentFiles(10_000, 200)).toBe(9800);
	});

	it('reports nothing remaining once the window covers the result', () => {
		expect(remainingContentFiles(12, 200)).toBe(0);
		expect(remainingContentFiles(200, 200)).toBe(0);
	});
});

describe('growing the window', () => {
	it('advances by one step and stops at the total', () => {
		expect(grownContentWindow(200, 10_000)).toBe(200 + CONTENT_WINDOW_STEP);
		expect(grownContentWindow(10_000 - 5, 10_000)).toBe(10_000);
		expect(grownContentWindow(10_000, 10_000)).toBe(10_000);
	});

	it('grows when the viewport is near the end of the list', () => {
		// 1000 tall, 800 shown, so the last 200px are the trigger band.
		expect(
			shouldGrowContentWindow({
				scrollTop: 850,
				scrollHeight: 2000,
				clientHeight: 1000,
				total: 10_000,
				windowSize: 200,
			}),
		).toBe(true);
	});

	it('does not grow while the user is far from the end', () => {
		expect(
			shouldGrowContentWindow({
				scrollTop: 0,
				scrollHeight: 2000,
				clientHeight: 1000,
				total: 10_000,
				windowSize: 200,
			}),
		).toBe(false);
	});

	it('does not grow once every file has a row', () => {
		// Otherwise the window keeps counting upwards forever while the user sits
		// at the bottom of a finished list.
		expect(
			shouldGrowContentWindow({
				scrollTop: 1900,
				scrollHeight: 2000,
				clientHeight: 1000,
				total: 150,
				windowSize: 200,
			}),
		).toBe(false);
	});

	it('grows when the list is shorter than its own viewport', () => {
		// A window whose rows do not fill the pane can never be scrolled to its
		// end, so scrolling would never ask for the rest.
		expect(
			shouldGrowContentWindow({
				scrollTop: 0,
				scrollHeight: 400,
				clientHeight: 1000,
				total: 10_000,
				windowSize: 200,
			}),
		).toBe(true);
	});
});

describe('the same window, one level down: matches inside a file', () => {
	it('bounds the matches rendered for an expanded file', () => {
		// Removing `MAX_SNIPPETS` put every match in the model, and file rows are
		// expanded by default — so the first build put 25521 match rows in the
		// document for a common letter. The matches are all still there; only the
		// rendered slice is bounded.
		expect(
			visibleContentCount(5000, CONTENT_MATCH_WINDOW_STEP),
		).toBe(CONTENT_MATCH_WINDOW_STEP);
	});

	it('grows a match window by its own step, not the file step', () => {
		// A file's matches are read one screen at a time; files are scrolled past
		// in bulk. Sharing one step would make the smaller of the two wrong.
		expect(CONTENT_MATCH_WINDOW_STEP).toBeLessThan(CONTENT_WINDOW_STEP);
		expect(
			grownContentWindow(
				CONTENT_MATCH_WINDOW_STEP,
				5000,
				CONTENT_MATCH_WINDOW_STEP,
			),
		).toBe(CONTENT_MATCH_WINDOW_STEP * 2);
	});

	it('stops at the real number of matches', () => {
		expect(grownContentWindow(20, 25, CONTENT_MATCH_WINDOW_STEP)).toBe(25);
		expect(remainingContentFiles(25, 25)).toBe(0);
	});
});
