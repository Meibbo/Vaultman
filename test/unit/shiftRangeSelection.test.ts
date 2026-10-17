// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
	handleTreeKeyboardKey,
	type TreeKeyboardCallbacks,
	type TreeKeyboardRow,
} from '../../src/logic/logicTreeKeyboard';
import { isTreeHomeEndChord, resolveTreeHomeEndTarget } from '../../src/logic/logicTreeHomeEnd';
import { isTreePageChord, resolveTreePageTarget } from '../../src/logic/logicTreePageJump';
import { getNativeTreeScopeChords } from '../../src/logic/logicTreeKeyboardAllowlist';
import { updateFileSelection } from '../../src/logic/logicNodeSelection';
import { resolveContextClickSelection } from '../../src/logic/logicSelectionTargets';

function row(id: string, depth = 0): TreeKeyboardRow {
	return { id, depth, hasChildren: false, isExpanded: false };
}

const ROWS: readonly TreeKeyboardRow[] = [
	row('a'),
	row('b'),
	row('c'),
	row('d'),
	row('e'),
	row('f'),
	row('g'),
	row('h'),
	row('i'),
	row('j'),
];

describe('U200-L4 Symptom 3: Shift range selection', () => {
	it('includes Shift+Space in getNativeTreeScopeChords', () => {
		const chords = getNativeTreeScopeChords(false);
		const shiftSpace = chords.find(c => c.key === ' ' && c.modifiers.includes('Shift'));
		expect(shiftSpace).toBeDefined();
	});

	it('Shift+Space calls onRangeSelect and preserves anchorId', () => {
		const onRangeSelect = vi.fn();
		const onActivate = vi.fn();
		const callbacks: TreeKeyboardCallbacks = {
			onFocus: vi.fn(),
			onRangeSelect,
			onToggleExpand: vi.fn(),
			onActivate,
			onClearSelection: vi.fn(),
			onRename: vi.fn(),
		};

		const event = new KeyboardEvent('keydown', { key: ' ', shiftKey: true });
		const state = {
			rows: ROWS,
			focusedId: 'c',
			anchorId: 'a',
		};

		const result = handleTreeKeyboardKey(event, state, callbacks);
		expect(result.handled).toBe(true);
		expect(onRangeSelect).toHaveBeenCalledWith('a', 'c', { additive: false });
		expect(onActivate).not.toHaveBeenCalled();
		expect(result.next.anchorId).toBe('a');
		expect(result.next.focusedId).toBe('c');
	});

	it('Ctrl+Shift+Space calls onRangeSelect with additive: true', () => {
		const onRangeSelect = vi.fn();
		const callbacks: TreeKeyboardCallbacks = {
			onFocus: vi.fn(),
			onRangeSelect,
			onToggleExpand: vi.fn(),
			onActivate: vi.fn(),
			onClearSelection: vi.fn(),
			onRename: vi.fn(),
		};

		const event = new KeyboardEvent('keydown', { key: ' ', shiftKey: true, ctrlKey: true });
		const state = {
			rows: ROWS,
			focusedId: 'c',
			anchorId: 'a',
		};

		const result = handleTreeKeyboardKey(event, state, callbacks);
		expect(result.handled).toBe(true);
		expect(onRangeSelect).toHaveBeenCalledWith('a', 'c', { additive: true });
		expect(result.next.anchorId).toBe('a');
	});

	it('Ctrl+Shift+ArrowDown calls onRangeSelect with additive: true', () => {
		const onRangeSelect = vi.fn();
		const callbacks: TreeKeyboardCallbacks = {
			onFocus: vi.fn(),
			onRangeSelect,
			onToggleExpand: vi.fn(),
			onActivate: vi.fn(),
			onClearSelection: vi.fn(),
			onRename: vi.fn(),
		};

		const event = new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, ctrlKey: true });
		const state = {
			rows: ROWS,
			focusedId: 'a',
			anchorId: 'a',
		};

		const result = handleTreeKeyboardKey(event, state, callbacks);
		expect(result.handled).toBe(true);
		expect(onRangeSelect).toHaveBeenCalledWith('a', 'b', { additive: true });
	});

	it('Shift+Home/End chords recognize shiftKey and resolve target', () => {
		const homeEvent = new KeyboardEvent('keydown', { key: 'Home', shiftKey: true });
		const homeChord = isTreeHomeEndChord(homeEvent, false);
		expect(homeChord).toEqual({
			isHomeEnd: true,
			isWholeExplorer: false,
			shiftKey: true,
			key: 'Home',
		});

		const target = resolveTreeHomeEndTarget({
			key: 'Home',
			isWholeExplorer: false,
			rows: ROWS,
			focusedId: 'e',
		});
		expect(target).toBe('a');
	});

	it('Shift+PageUp/PageDown chords recognize shiftKey and resolve target', () => {
		const pageDownEvent = new KeyboardEvent('keydown', { key: 'PageDown', shiftKey: true });
		const pageChord = isTreePageChord(pageDownEvent);
		expect(pageChord).toEqual({
			isPage: true,
			shiftKey: true,
			key: 'PageDown',
		});

		const target = resolveTreePageTarget({
			key: 'PageDown',
			rows: ROWS,
			focusedId: 'b',
			firstVisibleIndex: 0,
			visibleCount: 5,
		});
		expect(target).toBe('e');
	});

	it('updateFileSelection replaces range when additive is falsy', () => {
		const paths = ['a', 'b', 'c', 'd', 'e', 'f'];
		const result = updateFileSelection(
			{ selectedPaths: new Set(['a', 'b']), anchorPath: 'd' },
			paths,
			'f',
			'range',
			false,
		);
		expect(Array.from(result.selectedPaths)).toEqual(['d', 'e', 'f']);
		expect(result.anchorPath).toBe('d');
	});

	it('updateFileSelection retains existing selection and unions range when additive is true', () => {
		const paths = ['a', 'b', 'c', 'd', 'e', 'f'];
		const result = updateFileSelection(
			{ selectedPaths: new Set(['a', 'b']), anchorPath: 'd' },
			paths,
			'f',
			'range',
			true,
		);
		expect(Array.from(result.selectedPaths).sort()).toEqual(['a', 'b', 'd', 'e', 'f']);
		expect(result.anchorPath).toBe('d');
	});

	it('resolveContextClickSelection retains existing selection and unions range with ctrl+shift', () => {
		const paths = ['a', 'b', 'c', 'd', 'e', 'f'];
		const result = resolveContextClickSelection({
			selectedIds: new Set(['a', 'b']),
			anchorId: 'd',
			orderedVisibleIds: paths,
			invokedId: 'f',
			modifiers: { shiftKey: true, ctrlKey: true },
		});
		expect(Array.from(result.selectedIds).sort()).toEqual(['a', 'b', 'd', 'e', 'f']);
		expect(result.anchorId).toBe('d');
	});

	it('ArrowDown and ArrowUp preserve existing anchorId when navigating without Shift', () => {
		const callbacks: TreeKeyboardCallbacks = {
			onFocus: vi.fn(),
			onRangeSelect: vi.fn(),
			onToggleExpand: vi.fn(),
			onActivate: vi.fn(),
			onClearSelection: vi.fn(),
			onRename: vi.fn(),
		};

		const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: false });
		const state = {
			rows: ROWS,
			focusedId: 'b',
			anchorId: 'b',
		};

		const downResult = handleTreeKeyboardKey(downEvent, state, callbacks);
		expect(downResult.handled).toBe(true);
		expect(downResult.next.focusedId).toBe('c');
		expect(downResult.next.anchorId).toBe('b');

		const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: false });
		const upResult = handleTreeKeyboardKey(upEvent, downResult.next, callbacks);
		expect(upResult.handled).toBe(true);
		expect(upResult.next.focusedId).toBe('b');
		expect(upResult.next.anchorId).toBe('b');
	});

	it('navigating with arrows preserves anchor for subsequent Ctrl+Shift+Space range selection', () => {
		const onRangeSelect = vi.fn();
		const callbacks: TreeKeyboardCallbacks = {
			onFocus: vi.fn(),
			onRangeSelect,
			onToggleExpand: vi.fn(),
			onActivate: vi.fn(),
			onClearSelection: vi.fn(),
			onRename: vi.fn(),
		};

		// 1. Shift+Space on 'b' establishes anchor 'b'
		const selectB = handleTreeKeyboardKey(
			new KeyboardEvent('keydown', { key: ' ', shiftKey: true }),
			{ rows: ROWS, focusedId: 'b', anchorId: null },
			callbacks,
		);
		expect(selectB.next.anchorId).toBe('b');
		expect(onRangeSelect).toHaveBeenCalledWith('b', 'b', { additive: false });

		// 2. Navigate down with ArrowDown twice to 'd' without Shift
		const step1 = handleTreeKeyboardKey(
			new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: false }),
			selectB.next,
			callbacks,
		);
		expect(step1.next.focusedId).toBe('c');
		expect(step1.next.anchorId).toBe('b');

		const step2 = handleTreeKeyboardKey(
			new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: false }),
			step1.next,
			callbacks,
		);
		expect(step2.next.focusedId).toBe('d');
		expect(step2.next.anchorId).toBe('b');

		// 3. Ctrl+Shift+Space on 'd' triggers range selection from 'b' to 'd' with additive: true
		const rangeResult = handleTreeKeyboardKey(
			new KeyboardEvent('keydown', { key: ' ', shiftKey: true, ctrlKey: true }),
			step2.next,
			callbacks,
		);
		expect(rangeResult.handled).toBe(true);
		expect(onRangeSelect).toHaveBeenCalledWith('b', 'd', { additive: true });
		expect(rangeResult.next.anchorId).toBe('b');
	});
});

