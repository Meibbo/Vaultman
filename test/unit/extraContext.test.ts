import { describe, expect, it } from 'vitest';

import {
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
	it('is the match line, which is what core shows', () => {
		// Ours cut 40 characters each side regardless of line breaks, so a result
		// row carried the tail of the line before and the head of the one after.
		// Core shows the matched line and nothing else — a real row read
		// "  - footnotes", thirteen characters.
		//
		// The line walk is already `extraContextRange`'s own fallback, so the
		// default is that function over an empty cache: same code, no structure
		// to grow into.
		const content = ['before line', 'the match is here', 'after line'].join(
			String.fromCharCode(10),
		);
		const at = content.indexOf('match');
		const [from, to] = extraContextRange(content, [at, at + 5], {});

		expect(content.slice(from, to)).toBe('the match is here');
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
