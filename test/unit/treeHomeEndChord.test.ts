// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isTreeHomeEndChord } from '../../src/logic/logicTreeHomeEnd';

function keyEvent(key: string, init?: KeyboardEventInit): KeyboardEvent {
	return new KeyboardEvent('keydown', { key, ...init });
}

describe('Tree Home/End chord validator (isTreeHomeEndChord)', () => {
	describe('Linux / Windows platform (isMacOS = false)', () => {
		it('recognizes plain Home and End as sibling-level chords', () => {
			expect(isTreeHomeEndChord(keyEvent('Home'), false)).toEqual({
				isHomeEnd: true,
				isWholeExplorer: false,
				key: 'Home',
			});
			expect(isTreeHomeEndChord(keyEvent('End'), false)).toEqual({
				isHomeEnd: true,
				isWholeExplorer: false,
				key: 'End',
			});
		});

		it('recognizes Ctrl+Home and Ctrl+End as whole-explorer chords', () => {
			expect(isTreeHomeEndChord(keyEvent('Home', { ctrlKey: true }), false)).toEqual({
				isHomeEnd: true,
				isWholeExplorer: true,
				key: 'Home',
			});
			expect(isTreeHomeEndChord(keyEvent('End', { ctrlKey: true }), false)).toEqual({
				isHomeEnd: true,
				isWholeExplorer: true,
				key: 'End',
			});
		});

		it('rejects Meta chords on Linux/Windows (bubbles to OS/platform)', () => {
			expect(isTreeHomeEndChord(keyEvent('Home', { metaKey: true }), false)).toBeNull();
			expect(isTreeHomeEndChord(keyEvent('End', { metaKey: true }), false)).toBeNull();
		});

		it('rejects Alt and Shift modifiers', () => {
			expect(isTreeHomeEndChord(keyEvent('Home', { altKey: true }), false)).toBeNull();
			expect(isTreeHomeEndChord(keyEvent('End', { shiftKey: true }), false)).toBeNull();
			expect(isTreeHomeEndChord(keyEvent('Home', { ctrlKey: true, altKey: true }), false)).toBeNull();
			expect(isTreeHomeEndChord(keyEvent('End', { ctrlKey: true, shiftKey: true }), false)).toBeNull();
		});

		it('rejects non-Home/End keys and composing/IME', () => {
			expect(isTreeHomeEndChord(keyEvent('ArrowUp'), false)).toBeNull();
			expect(isTreeHomeEndChord(keyEvent('a'), false)).toBeNull();
			expect(isTreeHomeEndChord(keyEvent('Home', { isComposing: true }), false)).toBeNull();
		});
	});

	describe('macOS platform (isMacOS = true)', () => {
		it('recognizes plain Home and End as sibling-level chords', () => {
			expect(isTreeHomeEndChord(keyEvent('Home'), true)).toEqual({
				isHomeEnd: true,
				isWholeExplorer: false,
				key: 'Home',
			});
			expect(isTreeHomeEndChord(keyEvent('End'), true)).toEqual({
				isHomeEnd: true,
				isWholeExplorer: false,
				key: 'End',
			});
		});

		it('recognizes Cmd+Home (Meta) and Cmd+End as whole-explorer chords', () => {
			expect(isTreeHomeEndChord(keyEvent('Home', { metaKey: true }), true)).toEqual({
				isHomeEnd: true,
				isWholeExplorer: true,
				key: 'Home',
			});
			expect(isTreeHomeEndChord(keyEvent('End', { metaKey: true }), true)).toEqual({
				isHomeEnd: true,
				isWholeExplorer: true,
				key: 'End',
			});
		});

		it('rejects Ctrl chords on macOS (Ctrl remains non-tree modifier)', () => {
			expect(isTreeHomeEndChord(keyEvent('Home', { ctrlKey: true }), true)).toBeNull();
			expect(isTreeHomeEndChord(keyEvent('End', { ctrlKey: true }), true)).toBeNull();
		});

		it('rejects Alt and Shift modifiers on macOS', () => {
			expect(isTreeHomeEndChord(keyEvent('Home', { altKey: true }), true)).toBeNull();
			expect(isTreeHomeEndChord(keyEvent('End', { shiftKey: true }), true)).toBeNull();
			expect(isTreeHomeEndChord(keyEvent('Home', { metaKey: true, altKey: true }), true)).toBeNull();
		});
	});
});
