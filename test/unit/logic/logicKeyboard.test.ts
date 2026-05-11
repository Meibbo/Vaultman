import { describe, expect, it } from 'vitest';
import {
	applyBoxSelection,
	applyKeyboardMove,
	applyPointerSelection,
} from '../../../src/logic/logicKeyboard';
import * as logicKeyboard from '../../../src/logic/logicKeyboard';

describe('logicKeyboard', () => {
	it('replaces selection on a plain row click', () => {
		const next = applyPointerSelection({
			orderedIds: ['a', 'b', 'c'],
			selectedIds: new Set(['a']),
			anchorId: 'a',
			targetId: 'b',
		});

		expect([...next.ids]).toEqual(['b']);
		expect(next.anchorId).toBe('b');
		expect(next.focusedId).toBe('b');
	});

	it('extends a range from the anchor on shift click', () => {
		const next = applyPointerSelection({
			orderedIds: ['a', 'b', 'c', 'd'],
			selectedIds: new Set(['b']),
			anchorId: 'b',
			targetId: 'd',
			range: true,
		});

		expect([...next.ids]).toEqual(['b', 'c', 'd']);
		expect(next.anchorId).toBe('b');
		expect(next.focusedId).toBe('d');
	});

	it('toggles a row while preserving other selected rows', () => {
		const next = applyPointerSelection({
			orderedIds: ['a', 'b', 'c'],
			selectedIds: new Set(['a', 'b']),
			anchorId: 'a',
			targetId: 'b',
			additive: true,
		});

		expect([...next.ids]).toEqual(['a']);
		expect(next.anchorId).toBe('b');
		expect(next.focusedId).toBe('b');
	});

	it('adds a second range from the last focused row on ctrl shift click', () => {
		const next = applyPointerSelection({
			orderedIds: ['a', 'b', 'c', 'd', 'e', 'f'],
			selectedIds: new Set(['a', 'b']),
			anchorId: 'a',
			focusedId: 'b',
			targetId: 'e',
			additive: true,
			range: true,
		});

		expect([...next.ids]).toEqual(['a', 'b', 'c', 'd', 'e']);
		expect(next.anchorId).toBe('a');
		expect(next.focusedId).toBe('e');
	});

	it('moves keyboard focus and extends selection with shift arrows', () => {
		const next = applyKeyboardMove({
			orderedIds: ['a', 'b', 'c', 'd'],
			selectedIds: new Set(['b']),
			anchorId: 'b',
			focusedId: 'b',
			direction: 1,
			range: true,
		});

		expect(next.focusedId).toBe('c');
		expect([...next.ids]).toEqual(['b', 'c']);
		expect(next.anchorId).toBe('b');
	});

	it('adds box-selected rows to the existing selection with ctrl', () => {
		const next = applyBoxSelection({
			orderedIds: ['a', 'b', 'c', 'd'],
			selectedIds: new Set(['a']),
			targetIds: ['c', 'b'],
			additive: true,
		});

		expect([...next.ids]).toEqual(['a', 'b', 'c']);
		expect(next.anchorId).toBe('c');
		expect(next.focusedId).toBe('c');
	});

	it('resolves Cursor-style diff navbar shortcuts', () => {
		const resolve = (
			logicKeyboard as unknown as {
				resolveDiffKeyboardAction?: (input: {
					key: string;
					altKey?: boolean;
					ctrlKey?: boolean;
					metaKey?: boolean;
					shiftKey?: boolean;
				}) => string | null;
			}
		).resolveDiffKeyboardAction;

		expect(resolve?.({ key: ']', altKey: true })).toBe('diff.next-change');
		expect(resolve?.({ key: '[', altKey: true })).toBe('diff.prev-change');
		expect(resolve?.({ key: ']', altKey: true, ctrlKey: true })).toBe('diff.next-file');
		expect(resolve?.({ key: '[', altKey: true, ctrlKey: true })).toBe('diff.prev-file');
		expect(resolve?.({ key: ']', ctrlKey: true })).toBeNull();
	});
});
