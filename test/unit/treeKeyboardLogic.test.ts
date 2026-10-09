// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
	handleTreeKeyboardKey,
	type TreeKeyboardCallbacks,
	type TreeKeyboardRow,
	type TreeKeyboardState,
} from '../../src/logic/logicTreeKeyboard';

const SAMPLE_ROWS: readonly TreeKeyboardRow[] = [
	{ id: 'folder-1', depth: 0, hasChildren: true, isExpanded: true },
	{ id: 'folder-1/file-a.md', depth: 1, hasChildren: false, isExpanded: false },
	{ id: 'folder-1/file-b.md', depth: 1, hasChildren: false, isExpanded: false },
	{ id: 'folder-2', depth: 0, hasChildren: true, isExpanded: false },
	{ id: 'root-file.md', depth: 0, hasChildren: false, isExpanded: false },
];

function createMockCallbacks(overrides?: Partial<TreeKeyboardCallbacks>): {
	callbacks: TreeKeyboardCallbacks;
	spies: Record<string, ReturnType<typeof vi.fn>>;
} {
	const spies = {
		onFocus: vi.fn(),
		onToggleExpand: vi.fn(),
		onActivate: vi.fn(),
		onRangeSelect: vi.fn(),
		onAdditiveSelect: vi.fn(),
		onClearSelection: vi.fn(() => true),
		onRename: vi.fn(),
		onDelete: vi.fn(),
		onCollapseAll: vi.fn(),
		onModStepOpen: vi.fn(),
	};
	const callbacks: TreeKeyboardCallbacks = {
		onFocus: spies.onFocus,
		onToggleExpand: spies.onToggleExpand,
		onActivate: spies.onActivate,
		onRangeSelect: spies.onRangeSelect,
		onAdditiveSelect: spies.onAdditiveSelect,
		onClearSelection: spies.onClearSelection,
		onRename: spies.onRename,
		onDelete: spies.onDelete,
		onCollapseAll: spies.onCollapseAll,
		onModStepOpen: spies.onModStepOpen,
		canRename: () => true,
		...overrides,
	};
	return { callbacks, spies };
}

describe('Tree Keyboard Logic (vanilla Obsidian 1.14.4 parity)', () => {
	describe('ArrowDown and ArrowUp', () => {
		it('moves focus forwards and backwards with plain arrow keys', () => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1',
				anchorId: 'folder-1',
			};

			const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
			const downResult = handleTreeKeyboardKey(downEvent, state, callbacks);
			expect(downResult.handled).toBe(true);
			expect(downResult.next.focusedId).toBe('folder-1/file-a.md');
			expect(spies.onFocus).toHaveBeenCalledWith('folder-1/file-a.md');

			const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
			const upResult = handleTreeKeyboardKey(upEvent, downResult.next, callbacks);
			expect(upResult.handled).toBe(true);
			expect(upResult.next.focusedId).toBe('folder-1');
			expect(spies.onFocus).toHaveBeenCalledWith('folder-1');
		});

		it('opens target file in background on Mod+ArrowDown without moving active focus away (native parity)', () => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1',
				anchorId: 'folder-1',
			};

			const modDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true });
			const result = handleTreeKeyboardKey(modDownEvent, state, callbacks);
			expect(result.handled).toBe(true);
			expect(result.next.focusedId).toBe('folder-1/file-a.md');
			expect(spies.onFocus).toHaveBeenCalledWith('folder-1/file-a.md');
			expect(spies.onModStepOpen).toHaveBeenCalledWith('folder-1/file-a.md');
		});

		it('performs additive step selection on Shift+ArrowDown (native additive steps parity)', () => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1',
				anchorId: 'folder-1',
			};

			const shiftDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true });
			const result = handleTreeKeyboardKey(shiftDownEvent, state, callbacks);
			expect(result.handled).toBe(true);
			expect(spies.onAdditiveSelect).toHaveBeenCalledWith('folder-1', 'folder-1/file-a.md');
		});

		it('does NOT consume Alt+ArrowDown (bubbles to global hotkeys)', () => {
			const { callbacks } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1',
				anchorId: 'folder-1',
			};

			const altDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true });
			const result = handleTreeKeyboardKey(altDownEvent, state, callbacks);
			expect(result.handled).toBe(false);
		});
	});

	describe('ArrowRight', () => {
		it('OPENS the file when focused on a file (FO.prototype.onKeyArrowRight parity)', () => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1/file-a.md',
				anchorId: 'folder-1/file-a.md',
			};

			const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
			const result = handleTreeKeyboardKey(rightEvent, state, callbacks);
			expect(result.handled).toBe(true);
			expect(spies.onActivate).toHaveBeenCalledWith('folder-1/file-a.md', expect.anything());
		});

		it('expands a collapsed folder', () => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-2',
				anchorId: 'folder-2',
			};

			const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
			const result = handleTreeKeyboardKey(rightEvent, state, callbacks);
			expect(result.handled).toBe(true);
			expect(spies.onToggleExpand).toHaveBeenCalledWith('folder-2', true);
		});

		it('focuses the first child of an already expanded folder', () => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1',
				anchorId: 'folder-1',
			};

			const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
			const result = handleTreeKeyboardKey(rightEvent, state, callbacks);
			expect(result.handled).toBe(true);
			expect(result.next.focusedId).toBe('folder-1/file-a.md');
			expect(spies.onFocus).toHaveBeenCalledWith('folder-1/file-a.md');
		});
	});

	describe('ArrowLeft', () => {
		it('collapses an expanded folder', () => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1',
				anchorId: 'folder-1',
			};

			const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
			const result = handleTreeKeyboardKey(leftEvent, state, callbacks);
			expect(result.handled).toBe(true);
			expect(spies.onToggleExpand).toHaveBeenCalledWith('folder-1', false);
		});

		it('moves focus to parent folder when on a collapsed folder', () => {
			const nestedRows: readonly TreeKeyboardRow[] = [
				{ id: 'parent', depth: 0, hasChildren: true, isExpanded: true },
				{ id: 'parent/sub', depth: 1, hasChildren: true, isExpanded: false },
			];
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: nestedRows,
				focusedId: 'parent/sub',
				anchorId: 'parent/sub',
			};

			const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
			const result = handleTreeKeyboardKey(leftEvent, state, callbacks);
			expect(result.handled).toBe(true);
			expect(result.next.focusedId).toBe('parent');
			expect(spies.onFocus).toHaveBeenCalledWith('parent');
		});

		it('collapses parent folder AND moves focus to parent when on a child file (pO.prototype.onKeyArrowLeft parity)', () => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1/file-a.md',
				anchorId: 'folder-1/file-a.md',
			};

			const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
			const result = handleTreeKeyboardKey(leftEvent, state, callbacks);
			expect(result.handled).toBe(true);
			expect(spies.onToggleExpand).toHaveBeenCalledWith('folder-1', false);
			expect(result.next.focusedId).toBe('folder-1');
			expect(spies.onFocus).toHaveBeenCalledWith('folder-1');
		});

		it('collapses all when on a root-level file (native setCollapseAll parity)', () => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'root-file.md',
				anchorId: 'root-file.md',
			};

			const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
			const result = handleTreeKeyboardKey(leftEvent, state, callbacks);
			expect(result.handled).toBe(true);
			expect(spies.onCollapseAll).toHaveBeenCalled();
		});
	});

	describe('Enter, Space, F2, Delete', () => {
		it('triggers inline rename on macOS for Enter (native macOS Enter parity)', () => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1/file-a.md',
				anchorId: 'folder-1/file-a.md',
			};

			const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
			const result = handleTreeKeyboardKey(enterEvent, state, callbacks, undefined, { isMacOS: true });
			expect(result.handled).toBe(true);
			expect(spies.onRename).toHaveBeenCalledWith('folder-1/file-a.md');
			expect(spies.onActivate).not.toHaveBeenCalled();
		});

		it('activates file on non-macOS for Enter', () => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1/file-a.md',
				anchorId: 'folder-1/file-a.md',
			};

			const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
			const result = handleTreeKeyboardKey(enterEvent, state, callbacks, undefined, { isMacOS: false });
			expect(result.handled).toBe(true);
			expect(spies.onActivate).toHaveBeenCalledWith('folder-1/file-a.md', expect.objectContaining({ ctrl: false }));
		});

		it.each([true, false])('activates with the platform Mod key on Enter (macOS=%s)', (isMacOS) => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1/file-a.md',
				anchorId: 'folder-1/file-a.md',
			};

			const modEnterEvent = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: !isMacOS, metaKey: isMacOS });
			const result = handleTreeKeyboardKey(modEnterEvent, state, callbacks, undefined, { isMacOS });
			expect(result.handled).toBe(true);
			expect(spies.onActivate).toHaveBeenCalledWith('folder-1/file-a.md', expect.objectContaining({ ctrl: !isMacOS, meta: isMacOS }));
			expect(spies.onRename).not.toHaveBeenCalled();
		});

		it('activates file or toggles folder on Space', () => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1',
				anchorId: 'folder-1',
			};

			const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
			const result = handleTreeKeyboardKey(spaceEvent, state, callbacks);
			expect(result.handled).toBe(true);
			expect(spies.onActivate).toHaveBeenCalledWith('folder-1', expect.anything());
		});

		it('triggers rename on F2 when available', () => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1/file-a.md',
				anchorId: 'folder-1/file-a.md',
			};

			const f2Event = new KeyboardEvent('keydown', { key: 'F2' });
			const result = handleTreeKeyboardKey(f2Event, state, callbacks);
			expect(result.handled).toBe(true);
			expect(spies.onRename).toHaveBeenCalledWith('folder-1/file-a.md');
		});

		it('prompts deletion on Delete (Win/Linux) and Mod+Backspace (macOS)', () => {
			const { callbacks, spies } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1/file-a.md',
				anchorId: 'folder-1/file-a.md',
			};

			const winDeleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
			const winResult = handleTreeKeyboardKey(winDeleteEvent, state, callbacks, undefined, { isMacOS: false });
			expect(winResult.handled).toBe(true);
			expect(spies.onDelete).toHaveBeenCalledWith('folder-1/file-a.md');

			const macDeleteEvent = new KeyboardEvent('keydown', { key: 'Backspace', metaKey: true });
			const macResult = handleTreeKeyboardKey(macDeleteEvent, state, callbacks, undefined, { isMacOS: true });
			expect(macResult.handled).toBe(true);
			expect(spies.onDelete).toHaveBeenCalledWith('folder-1/file-a.md');

			// Plain Backspace should bubble!
			const plainBackspace = new KeyboardEvent('keydown', { key: 'Backspace' });
			const plainResult = handleTreeKeyboardKey(plainBackspace, state, callbacks);
			expect(plainResult.handled).toBe(false);
		});
	});

	describe('Escape handling', () => {
		it('returns handled: true when selection was cleared', () => {
			const { callbacks, spies } = createMockCallbacks();
			spies.onClearSelection.mockReturnValue(true);
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1',
				anchorId: 'folder-1',
			};

			const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
			const result = handleTreeKeyboardKey(escEvent, state, callbacks);
			expect(result.handled).toBe(true);
			expect(spies.onClearSelection).toHaveBeenCalled();
		});

		it('returns handled: false when selection was already empty so modal can close', () => {
			const { callbacks, spies } = createMockCallbacks();
			spies.onClearSelection.mockReturnValue(false);
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1',
				anchorId: 'folder-1',
			};

			const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
			const result = handleTreeKeyboardKey(escEvent, state, callbacks);
			expect(result.handled).toBe(false);
		});
	});

	describe('Unsupported keys bubble to platform (parity check)', () => {
		it('does not claim Home, End, PageUp, PageDown, or letters', () => {
			const { callbacks } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1',
				anchorId: 'folder-1',
			};

			for (const key of ['Home', 'End', 'PageUp', 'PageDown', 'a', 'z', '1']) {
				const event = new KeyboardEvent('keydown', { key });
				const result = handleTreeKeyboardKey(event, state, callbacks);
				expect(result.handled).toBe(false);
			}
		});

		it('does not claim Mod+A (no select all in native explorer)', () => {
			const { callbacks } = createMockCallbacks();
			const state: TreeKeyboardState = {
				rows: SAMPLE_ROWS,
				focusedId: 'folder-1',
				anchorId: 'folder-1',
			};

			const modA = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });
			const result = handleTreeKeyboardKey(modA, state, callbacks);
			expect(result.handled).toBe(false);
		});
	});
});
