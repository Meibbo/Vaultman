// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
	shouldSelectAllInScopeOnKey,
	resolveSelectAllInScope,
} from '../../src/logic/logicSelectionTargets';
import {
	handleTreeKeyboardKey,
	type TreeKeyboardCallbacks,
	type TreeKeyboardRow,
} from '../../src/logic/logicTreeKeyboard';
import {
	parseObsidianFilesClipboard,
	serializeObsidianFilesClipboard,
	registerTreeClipboardHandler,
	routeTreeClipboardEvent,
} from '../../src/logic/logicTreeClipboard';
import { getNativeTreeScopeChords } from '../../src/logic/logicTreeKeyboardAllowlist';

function row(id: string): TreeKeyboardRow {
	return { id, depth: 0, hasChildren: false, isExpanded: false };
}

const ROWS: readonly TreeKeyboardRow[] = [row('a'), row('b'), row('c')];

describe('U200-L4 Symptom 4: Selection and clipboard actions', () => {
	describe('Mod+A select all detection and resolution', () => {
		it('recognizes Mod+A on non-editable elements', () => {
			const div = document.createElement('div');
			const event = { key: 'a', ctrlKey: true, metaKey: false, target: div };
			expect(shouldSelectAllInScopeOnKey(event)).toBe(true);

			const eventUpper = { key: 'A', ctrlKey: false, metaKey: true, target: div };
			expect(shouldSelectAllInScopeOnKey(eventUpper)).toBe(true);
		});

		it('rejects Mod+A on editable inputs and textareas', () => {
			const input = document.createElement('input');
			expect(shouldSelectAllInScopeOnKey({ key: 'a', ctrlKey: true, metaKey: false, target: input })).toBe(false);

			const textarea = document.createElement('textarea');
			expect(shouldSelectAllInScopeOnKey({ key: 'a', ctrlKey: true, metaKey: false, target: textarea })).toBe(false);

			const contentEditable = document.createElement('div');
			contentEditable.setAttribute('contenteditable', 'true');
			expect(shouldSelectAllInScopeOnKey({ key: 'a', ctrlKey: true, metaKey: false, target: contentEditable })).toBe(false);
		});

		it('resolveSelectAllInScope selects all given IDs and sets anchor to the last ID', () => {
			const ids = ['file1.md', 'file2.md', 'folder/'];
			const result = resolveSelectAllInScope(ids);
			expect(Array.from(result.selectedIds)).toEqual(ids);
			expect(result.anchorId).toBe('folder/');
		});

		it('includes Mod+A in getNativeTreeScopeChords', () => {
			const chords = getNativeTreeScopeChords(false);
			const modA = chords.find(c => c.key === 'a' && c.modifiers.includes('Mod'));
			expect(modA).toBeDefined();
		});

		it('handleTreeKeyboardKey dispatches onSelectAll on Mod+A', () => {
			const onSelectAll = vi.fn();
			const callbacks: TreeKeyboardCallbacks = {
				onFocus: vi.fn(),
				onRangeSelect: vi.fn(),
				onToggleExpand: vi.fn(),
				onActivate: vi.fn(),
				onClearSelection: vi.fn(),
				onRename: vi.fn(),
				onSelectAll,
			};

			const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });
			const state = { rows: ROWS, focusedId: 'a', anchorId: 'a' };

			const result = handleTreeKeyboardKey(event, state, callbacks);
			expect(result.handled).toBe(true);
			expect(onSelectAll).toHaveBeenCalledOnce();
		});
	});

	describe('Clipboard serialization and event routing', () => {
		it('serializes and parses obsidian/files clipboard payloads', () => {
			const payload = { operation: 'copy' as const, paths: ['notes/work.md', 'images/photo.png'] };
			const serialized = serializeObsidianFilesClipboard(payload);
			expect(JSON.parse(serialized)).toEqual(payload);

			const parsed = parseObsidianFilesClipboard(serialized);
			expect(parsed).toEqual(payload);
		});

		it('parses cut operation payloads', () => {
			const payload = { operation: 'cut' as const, paths: ['target.md'] };
			const parsed = parseObsidianFilesClipboard(JSON.stringify(payload));
			expect(parsed).toEqual(payload);
		});

		it('rejects malformed clipboard payloads', () => {
			expect(parseObsidianFilesClipboard(null)).toBeNull();
			expect(parseObsidianFilesClipboard('')).toBeNull();
			expect(parseObsidianFilesClipboard('{ invalid json')).toBeNull();
			expect(parseObsidianFilesClipboard(JSON.stringify({ operation: 'unknown', paths: [] }))).toBeNull();
		});

		it('routes clipboard events to active tree handler in frame', () => {
			const frameEl = document.createElement('div');
			const ownerEl = document.createElement('div');
			frameEl.appendChild(ownerEl);
			document.body.appendChild(frameEl);

			const handleCopy = vi.fn((e: ClipboardEvent) => e.preventDefault());
			const handleCut = vi.fn((e: ClipboardEvent) => e.preventDefault());
			const handlePaste = vi.fn((e: ClipboardEvent) => e.preventDefault());

			const unregister = registerTreeClipboardHandler(ownerEl, {
				handleCopy,
				handleCut,
				handlePaste,
			}, () => true);

			const copyEvent = new Event('copy', { cancelable: true }) as ClipboardEvent;
			const handledCopy = routeTreeClipboardEvent('copy', copyEvent, { frameEl });
			expect(handledCopy).toBe(true);
			expect(handleCopy).toHaveBeenCalledOnce();

			const cutEvent = new Event('cut', { cancelable: true }) as ClipboardEvent;
			const handledCut = routeTreeClipboardEvent('cut', cutEvent, { frameEl });
			expect(handledCut).toBe(true);
			expect(handleCut).toHaveBeenCalledOnce();

			const pasteEvent = new Event('paste', { cancelable: true }) as ClipboardEvent;
			const handledPaste = routeTreeClipboardEvent('paste', pasteEvent, { frameEl });
			expect(handledPaste).toBe(true);
			expect(handlePaste).toHaveBeenCalledOnce();

			unregister();
			frameEl.remove();
		});
	});
});
