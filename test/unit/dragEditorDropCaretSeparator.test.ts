import { describe, expect, it } from 'vitest';

import { tagSeparatorBeforeCaret } from '../../src/utils/dragEditorDrop';

describe('tagSeparatorBeforeCaret', () => {
	it('inserts a space when the char before the caret is a word char', () => {
		expect(tagSeparatorBeforeCaret('palabra', 7)).toBe(' ');
	});

	it('does not insert a space when the char before is already a space', () => {
		expect(tagSeparatorBeforeCaret('palabra ', 8)).toBe('');
	});

	it('does not insert a space when the char before is a newline', () => {
		expect(tagSeparatorBeforeCaret('primera\n', 8)).toBe('');
	});

	it('does not insert a space when the char before is a tab', () => {
		expect(tagSeparatorBeforeCaret('palabra\t', 8)).toBe('');
	});

	it('does not insert a space at the start of the line', () => {
		expect(tagSeparatorBeforeCaret('palabra', 0)).toBe('');
	});

	it('does not insert a space on an empty line', () => {
		expect(tagSeparatorBeforeCaret('', 0)).toBe('');
	});
});