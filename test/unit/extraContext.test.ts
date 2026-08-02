import { describe, expect, it } from 'vitest';

import {
	defaultContextRange,
	extraContextRange,
	showMoreAfter,
	showMoreBefore,
	type ExtraContextCache,
} from '../../src/logic/logicExtraContext';

/**
 * Core's own "show more context", copied rather than invented.
 *
 * `SearchView.setExtraContext(boolean)` flips a flag on the result DOM and each
 * match re-renders through `getMatchExtraPositions`, read from
 * `Desktop/obsidian-web-lab/obsidian/app.js` (Obsidian 1.12.3). It is
 * structural, not a character radius: the match grows to the thing it is inside.
 *
 *   1. the list item it falls in, plus the items that follow under the same
 *      parent — starting at the item's own indentation, not at its bullet
 *   2. otherwise the section it falls in
 *   3. otherwise its line, walking to the newline each way, clamped at 1000
 *
 * The first version of this was a per-node ladder of character radii. That was
 * a wheel we already had.
 */

const LINE_CLAMP = 1000;

function cacheWithSection(start: number, end: number): ExtraContextCache {
	return { sections: [{ position: { start: { offset: start }, end: { offset: end } } }] };
}

describe('falling back to the line', () => {
	const content = ['first line', 'second line here', 'third line'].join('\n');
	const match: [number, number] = [
		content.indexOf('here'),
		content.indexOf('here') + 4,
	];

	it('grows the match to its whole line when the cache says nothing', () => {
		const [from, to] = extraContextRange(content, match, {});
		expect(content.slice(from, to)).toBe('second line here');
	});

	it('starts at the beginning of the file when the match is on line one', () => {
		const first: [number, number] = [0, 5];
		const [from, to] = extraContextRange(content, first, {});
		expect(from).toBe(0);
		expect(content.slice(from, to)).toBe('first line');
	});

	it('stops at the end of the file when the match is on the last line', () => {
		const last: [number, number] = [
			content.indexOf('third'),
			content.indexOf('third') + 5,
		];
		const [, to] = extraContextRange(content, last, {});
		expect(to).toBe(content.length);
	});

	it('clamps a runaway line at a thousand characters each way', () => {
		// Core walks back and forward with a 1000-character budget, so a minified
		// file or a single enormous paragraph cannot drag the whole document into
		// one snippet.
		const huge = 'x'.repeat(5000);
		const middle: [number, number] = [2500, 2504];
		const [from, to] = extraContextRange(huge, middle, {});
		expect(2500 - from).toBeLessThanOrEqual(LINE_CLAMP);
		expect(to - 2500).toBeLessThanOrEqual(LINE_CLAMP);
	});
});

describe('growing to the section that contains the match', () => {
	const content = ['# Heading', '', 'body text with a hit inside', ''].join('\n');
	const hit = content.indexOf('hit');

	it('returns the section bounds when the match is inside one', () => {
		const sectionStart = content.indexOf('body');
		const sectionEnd = sectionStart + 'body text with a hit inside'.length;
		const range = extraContextRange(
			content,
			[hit, hit + 3],
			cacheWithSection(sectionStart, sectionEnd),
		);
		expect(range).toEqual([sectionStart, sectionEnd]);
	});

	it('ignores a section the match is not inside', () => {
		const range = extraContextRange(content, [hit, hit + 3], cacheWithSection(0, 5));
		expect(range[0]).not.toBe(0);
	});
});

describe('growing to the list item that contains the match', () => {
	//        0123456789...
	const content = ['- alpha', '- beta hit', '- gamma', 'after'].join('\n');
	const hit = content.indexOf('hit');
	const itemStart = content.indexOf('- beta');

	function listCache(): ExtraContextCache {
		return {
			listItems: [
				{ position: { start: { offset: 0, col: 0 }, end: { offset: 7 } }, parent: -1 },
				{
					position: { start: { offset: itemStart, col: 0 }, end: { offset: itemStart + 10 } },
					parent: -1,
				},
			],
		};
	}

	it('prefers the list item over the line', () => {
		const [from, to] = extraContextRange(content, [hit, hit + 3], listCache());
		expect(content.slice(from, to)).toBe('- beta hit');
	});

	it('starts at the item’s own indentation, not at its bullet', () => {
		// Core subtracts `start.col`, so a nested item keeps its indentation and
		// the snippet still lines up.
		const nested = ['- alpha', '  - beta hit'].join('\n');
		const nestedStart = nested.indexOf('- beta');
		const cache: ExtraContextCache = {
			listItems: [
				{
					position: { start: { offset: nestedStart, col: 2 }, end: { offset: nested.length } },
					parent: -1,
				},
			],
		};
		const [from] = extraContextRange(nested, [nested.indexOf('hit'), nested.indexOf('hit') + 3], cache);
		expect(from).toBe(nestedStart - 2);
	});

	it('falls through to the line when no item contains the match', () => {
		const afterStart = content.indexOf('after');
		const [from, to] = extraContextRange(
			content,
			[afterStart, afterStart + 5],
			listCache(),
		);
		expect(content.slice(from, to)).toBe('after');
	});
});

describe('the default slice, with extra context off', () => {
	// Core's default is not the line and not the structure — it is a third
	// function, `Ry(content, match, 100)`: walk out from the match, stop at the
	// newline or after 100 characters, whichever comes first, and report whether
	// the walk was cut short.
	//
	// Measured against core's own pane on the same query, its rows ran 11, 34,
	// 122, 32 and 52 characters while ours ran 477 — because the first version of
	// this used the 1000-character clamp belonging to the *extra* context walk.
	const newline = String.fromCharCode(10);

	it('shows the whole line when the line is short', () => {
		const content = ['before line', 'the match is here', 'after line'].join(newline);
		const at = content.indexOf('match');
		const [from, to] = defaultContextRange(content, [at, at + 5]);
		expect(content.slice(from, to)).toBe('the match is here');
	});

	it('stops at a hundred characters on a long line, not at the line end', () => {
		const line = 'a'.repeat(400) + 'MATCH' + 'b'.repeat(400);
		const at = line.indexOf('MATCH');
		const [from, to] = defaultContextRange(line, [at, at + 5]);
		expect(at - from).toBe(100);
		expect(to - (at + 5)).toBe(100);
	});

	it('reports whether each side was cut short', () => {
		const short = ['x', 'hit'].join(newline);
		const at = short.indexOf('hit');
		expect(defaultContextRange(short, [at, at + 3])[2]).toBe(false);
		expect(defaultContextRange(short, [at, at + 3])[3]).toBe(false);

		const long = 'a'.repeat(400) + 'MATCH' + 'b'.repeat(400);
		const hit = long.indexOf('MATCH');
		expect(defaultContextRange(long, [hit, hit + 5])[2]).toBe(true);
		expect(defaultContextRange(long, [hit, hit + 5])[3]).toBe(true);
	});
});

describe('opening one match up, the way core’s two chevrons do', () => {
	// Core gives every match row a `.search-result-hover-button.mod-top` and a
	// `.mod-bottom`. They call `showMoreBefore()` / `showMoreAfter()`, which walk
	// that match's own start and end outward one structural unit at a time and
	// re-render that match alone.
	const newline = String.fromCharCode(10);
	const content = ['line one', 'line two', 'line three', 'line four'].join(newline);
	const at = content.indexOf('three');
	const line: [number, number] = extraContextRange(content, [at, at + 5], {});

	it('takes in the line above, and stops at the top of the file', () => {
		const once = showMoreBefore(content, line, {});
		expect(content.slice(once[0], once[1])).toBe('line two' + newline + 'line three');

		const twice = showMoreBefore(content, once, {});
		expect(twice[0]).toBe(0);

		// Already at the start: nothing moves, so the control can report it.
		expect(showMoreBefore(content, twice, {})).toEqual(twice);
	});

	it('takes in the line below, and stops at the end of the file', () => {
		const once = showMoreAfter(content, line, {});
		expect(content.slice(once[0], once[1])).toBe('line three' + newline + 'line four');
		expect(showMoreAfter(content, once, {})[1]).toBe(content.length);
	});

	it('leaves the other end alone', () => {
		const before = showMoreBefore(content, line, {});
		expect(before[1]).toBe(line[1]);
		const after = showMoreAfter(content, line, {});
		expect(after[0]).toBe(line[0]);
	});
});

describe('finding the containing unit without walking the whole file', () => {
	it('costs the same for a match at the end of a long list as at the start', () => {
		// Core locates the unit with a binary search (`CT`). The first transcription
		// of this scanned every list item for every match, so a note with a few
		// thousand items and a few thousand matches went quadratic — switching the
		// global "show more context" on took six seconds, and switching it off took
		// longer.
		const items = Array.from({ length: 4000 }, (_, i) => ({
			position: { start: { offset: i * 20, col: 0 }, end: { offset: i * 20 + 19 } },
			parent: -1,
		}));
		const cache: ExtraContextCache = { listItems: items };
		const content = 'x'.repeat(4000 * 20);

		const time = (offset: number): number => {
			const started = performance.now();
			for (let i = 0; i < 2000; i += 1) {
				extraContextRange(content, [offset, offset + 2], cache);
			}
			return performance.now() - started;
		};

		const early = time(10);
		const late = time(3990 * 20 + 5);

		// Linear scanning made the late lookup hundreds of times dearer. Pinned
		// loosely so a slow machine does not fail it.
		expect(late).toBeLessThan(Math.max(early * 5, 60));
	});

	it('still finds the right unit at either end', () => {
		const items = Array.from({ length: 500 }, (_, i) => ({
			position: { start: { offset: i * 10, col: 0 }, end: { offset: i * 10 + 9 } },
			parent: -1,
		}));
		const cache: ExtraContextCache = { listItems: items };
		const content = 'y'.repeat(5000);

		expect(extraContextRange(content, [0, 2], cache)[0]).toBe(0);
		expect(extraContextRange(content, [4990, 4992], cache)[0]).toBe(4990);
		expect(extraContextRange(content, [2503, 2505], cache)[0]).toBe(2500);
	});
});
