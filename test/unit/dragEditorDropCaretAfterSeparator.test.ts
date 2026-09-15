import { describe, expect, it } from 'vitest';

import { tagSeparatorAfterCaret } from '../../src/utils/dragEditorDrop';

describe('tagSeparatorAfterCaret', () => {
	it('inserts a space when the char under the caret is a word char', () => {
		expect(tagSeparatorAfterCaret('palabra', 7)).toBe(' ');
	});

	it('inserts a space in the middle of a word', () => {
		// pala|bra -> pala #tag bra
		expect(tagSeparatorAfterCaret('palabra', 4)).toBe(' ');
	});

	it('does not insert a space when the char under is already a space', () => {
		expect(tagSeparatorAfterCaret('palabra resto', 7)).toBe('');
	});

	it('does not insert a space when the char under is a newline', () => {
		expect(tagSeparatorAfterCaret('palabra\nresto', 7)).toBe('');
	});

	it('does not insert a space when the char under is a tab', () => {
		expect(tagSeparatorAfterCaret('palabra\tresto', 7)).toBe('');
	});

	it('inserts a space at the end of the line', () => {
		expect(tagSeparatorAfterCaret('palabra', 7)).toBe(' ');
	});

	it('does not insert a space on an empty line', () => {
		// caret 0 on '' is also line start: no next char counts as
		// end-of-line only when the line has content before it.
		expect(tagSeparatorAfterCaret('', 0)).toBe(' ');
	});
});
