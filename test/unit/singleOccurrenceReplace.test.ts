import { describe, expect, it } from 'vitest';

import { replaceSingleOccurrence } from '../../src/logic/logicSingleOccurrenceReplace';

/**
 * "Replace this occurrence" from a match row's own menu.
 *
 * The queued content replace runs a global regex over the whole file, which is
 * the right thing when the operation came from the Find/Replace row. A match row
 * is one occurrence, and the menu on it means that one — so the offset the
 * snippet already carries decides where.
 *
 * The file can have changed between the search and the queue running, so the
 * text at that offset is checked before anything is written. A stale offset
 * silently rewriting the wrong words is the failure worth guarding.
 */

describe('replacing one occurrence at a known offset', () => {
	const content = 'alpha beta alpha gamma alpha';

	it('replaces only the occurrence at that offset', () => {
		const second = content.indexOf('alpha', 6);
		expect(
			replaceSingleOccurrence(content, second, {
				pattern: 'alpha',
				replacement: 'ALPHA',
				isRegex: false,
				caseSensitive: true,
			}),
		).toBe('alpha beta ALPHA gamma alpha');
	});

	it('leaves the file alone when the text at that offset has moved', () => {
		// Someone edited the note after the search ran. Rewriting whatever now
		// sits at the old offset is the one outcome nobody asked for.
		expect(
			replaceSingleOccurrence('shifted alpha beta', 0, {
				pattern: 'alpha',
				replacement: 'ALPHA',
				isRegex: false,
				caseSensitive: true,
			}),
		).toBeNull();
	});

	it('honours case sensitivity', () => {
		expect(
			replaceSingleOccurrence('Alpha', 0, {
				pattern: 'alpha',
				replacement: 'x',
				isRegex: false,
				caseSensitive: true,
			}),
		).toBeNull();
		expect(
			replaceSingleOccurrence('Alpha', 0, {
				pattern: 'alpha',
				replacement: 'x',
				isRegex: false,
				caseSensitive: false,
			}),
		).toBe('x');
	});

	it('treats a literal pattern literally', () => {
		expect(
			replaceSingleOccurrence('a.c abc', 0, {
				pattern: 'a.c',
				replacement: 'X',
				isRegex: false,
				caseSensitive: true,
			}),
		).toBe('X abc');
	});

	it('anchors a regex at the offset rather than searching from it', () => {
		// Sticky matching: the pattern has to match *here*, not somewhere later,
		// or the menu on one row would edit a different row's match.
		expect(
			replaceSingleOccurrence('xx alpha', 0, {
				pattern: 'a\\w+',
				replacement: 'X',
				isRegex: true,
				caseSensitive: true,
			}),
		).toBeNull();
		expect(
			replaceSingleOccurrence('xx alpha', 3, {
				pattern: 'a\\w+',
				replacement: 'X',
				isRegex: true,
				caseSensitive: true,
			}),
		).toBe('xx X');
	});

	it('supports capture groups in the replacement', () => {
		expect(
			replaceSingleOccurrence('key: value', 0, {
				pattern: '(\\w+): (\\w+)',
				replacement: '$2 -> $1',
				isRegex: true,
				caseSensitive: true,
			}),
		).toBe('value -> key');
	});

	it('refuses an offset outside the file', () => {
		expect(
			replaceSingleOccurrence('short', 99, {
				pattern: 'x',
				replacement: 'y',
				isRegex: false,
				caseSensitive: true,
			}),
		).toBeNull();
	});

	it('reports an invalid regex as no change rather than throwing', () => {
		expect(
			replaceSingleOccurrence('anything', 0, {
				pattern: '(unclosed',
				replacement: 'x',
				isRegex: true,
				caseSensitive: true,
			}),
		).toBeNull();
	});
});
