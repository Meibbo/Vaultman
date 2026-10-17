// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Platform } from 'obsidian';
import { UnifiedTreeView } from '../../src/components/layout/viewTree';
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';

installObsidianDomPolyfill();

beforeEach(() => {
	vi.stubGlobal('activeDocument', document);
	if (!Element.prototype.scrollTo) {
		Element.prototype.scrollTo = vi.fn();
	}
});

function createSampleView(container: HTMLElement, initialSelection = new Set<string>()): UnifiedTreeView {
	const view = new UnifiedTreeView(container);
	view.render({
		nodes: [
			{
				id: 'f1',
				depth: 0,
				label: 'f1',
				meta: {},
				children: [
					{ id: 'f1/child-a.md', depth: 1, label: 'child-a.md', meta: {} },
					{ id: 'f1/child-b.md', depth: 1, label: 'child-b.md', meta: {} },
					{ id: 'f1/child-c.md', depth: 1, label: 'child-c.md', meta: {} },
				],
			},
			{ id: 'f2', depth: 0, label: 'f2', meta: {} },
		],
		expandedIds: new Set(['f1']),
		selectedIds: initialSelection,
		onRowClick: () => {},
		onToggle: () => {},
		onContextMenu: () => {},
	});
	return view;
}

describe('UnifiedTreeView Home/End Navco Integration', () => {
	it('navigates sibling level on Home/End and whole explorer on Ctrl+Home/End', () => {
		const container = document.createElement('div');
		const selectedIds = new Set(['f1/child-b.md']);
		const view = createSampleView(container, selectedIds);

		view.setFocusedId('f1/child-b.md');
		expect(view.focusedId).toBe('f1/child-b.md');

		// Home -> first sibling (f1/child-a.md)
		const homeEvent = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true });
		container.dispatchEvent(homeEvent);
		expect(view.focusedId).toBe('f1/child-a.md');
		expect(homeEvent.defaultPrevented).toBe(true);

		// End -> last sibling (f1/child-c.md)
		const endEvent = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true });
		container.dispatchEvent(endEvent);
		expect(view.focusedId).toBe('f1/child-c.md');
		expect(endEvent.defaultPrevented).toBe(true);

		// Ctrl+Home -> whole explorer first row (f1)
		const ctrlHomeEvent = new KeyboardEvent('keydown', { key: 'Home', ctrlKey: true, bubbles: true, cancelable: true });
		container.dispatchEvent(ctrlHomeEvent);
		expect(view.focusedId).toBe('f1');
		expect(ctrlHomeEvent.defaultPrevented).toBe(true);

		// Ctrl+End -> whole explorer last row (f2)
		const ctrlEndEvent = new KeyboardEvent('keydown', { key: 'End', ctrlKey: true, bubbles: true, cancelable: true });
		container.dispatchEvent(ctrlEndEvent);
		expect(view.focusedId).toBe('f2');
		expect(ctrlEndEvent.defaultPrevented).toBe(true);

		// Selection immutability: selected IDs remained untouched
		expect(selectedIds).toEqual(new Set(['f1/child-b.md']));
	});

	it('preserves multi-selection sets untouched during Home/End navigation', () => {
		const container = document.createElement('div');
		const initialSelection = new Set(['f1', 'f2']);
		const view = createSampleView(container, initialSelection);

		view.setFocusedId('f1/child-b.md');
		const homeEvent = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true });
		container.dispatchEvent(homeEvent);

		expect(view.focusedId).toBe('f1/child-a.md');
		expect(homeEvent.defaultPrevented).toBe(true);
		expect(initialSelection).toEqual(new Set(['f1', 'f2']));
	});

	it('guards against editable targets inside the tree', () => {
		const container = document.createElement('div');
		const input = container.appendChild(document.createElement('input'));
		const view = createSampleView(container);

		view.setFocusedId('f2');
		const homeOnInput = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true });
		input.dispatchEvent(homeOnInput);

		// Tree does not intercept keystrokes originating from editable input
		expect(view.focusedId).toBe('f2');
		expect(homeOnInput.defaultPrevented).toBe(false);
	});

	it('obeys custom Navco keyOverrides before default Home/End handling', () => {
		const container = document.createElement('div');
		const view = new UnifiedTreeView(container);
		const customOverride = vi.fn(() => true);

		view.render({
			nodes: [
				{ id: 'f1', depth: 0, label: 'f1', meta: {} },
				{ id: 'f2', depth: 0, label: 'f2', meta: {} },
			],
			expandedIds: new Set(),
			selectedIds: new Set(),
			navco: {
				keyOverrides: {
					Home: customOverride,
				},
			},
			onRowClick: () => {},
			onToggle: () => {},
			onContextMenu: () => {},
		});

		view.setFocusedId('f2');
		const homeEvent = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true });
		container.dispatchEvent(homeEvent);

		expect(customOverride).toHaveBeenCalledOnce();
		expect(view.focusedId).toBe('f2');
	});

	it('handles missing focus: plain Home/End focus the frame edge, Ctrl+Home/End navigate first/last', () => {
		const container = document.createElement('div');
		const view = createSampleView(container);

		expect(view.focusedId).toBeNull();

		// Plain Home -> focuses the first visible row (never bare scroll)
		const homeEvent = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true });
		container.dispatchEvent(homeEvent);
		expect(view.focusedId).toBe('f1');
		expect(homeEvent.defaultPrevented).toBe(true);

		// Plain End (now focused on f1) -> last sibling at that level
		const endEvent = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true });
		container.dispatchEvent(endEvent);
		expect(view.focusedId).toBe('f2');
		expect(endEvent.defaultPrevented).toBe(true);

		// Ctrl+Home -> focuses first row
		const ctrlHome = new KeyboardEvent('keydown', { key: 'Home', ctrlKey: true, bubbles: true, cancelable: true });
		container.dispatchEvent(ctrlHome);
		expect(view.focusedId).toBe('f1');
		expect(ctrlHome.defaultPrevented).toBe(true);

		// Ctrl+End -> focuses last row
		const ctrlEnd = new KeyboardEvent('keydown', { key: 'End', ctrlKey: true, bubbles: true, cancelable: true });
		container.dispatchEvent(ctrlEnd);
		expect(view.focusedId).toBe('f2');
		expect(ctrlEnd.defaultPrevented).toBe(true);
	});

	it('rejects modifier chords (Alt, Meta on Linux) and composing IME events', () => {
		const container = document.createElement('div');
		const view = createSampleView(container);

		view.setFocusedId('f2');

		// Alt+Home
		const altHome = new KeyboardEvent('keydown', { key: 'Home', altKey: true, bubbles: true, cancelable: true });
		container.dispatchEvent(altHome);
		expect(view.focusedId).toBe('f2');
		expect(altHome.defaultPrevented).toBe(false);

		// Meta+Home (Linux/Win: isMacOS false)
		const metaHome = new KeyboardEvent('keydown', { key: 'Home', metaKey: true, bubbles: true, cancelable: true });
		container.dispatchEvent(metaHome);
		expect(view.focusedId).toBe('f2');
		expect(metaHome.defaultPrevented).toBe(false);

		// IME composing
		const composingHome = new KeyboardEvent('keydown', { key: 'Home', isComposing: true, bubbles: true, cancelable: true });
		container.dispatchEvent(composingHome);
		expect(view.focusedId).toBe('f2');
		expect(composingHome.defaultPrevented).toBe(false);
	});

	it('supports macOS platform conventions (Cmd is whole-explorer, Ctrl is non-tree)', () => {
		const container = document.createElement('div');
		const view = createSampleView(container);

		const origMacOS = (Platform as { isMacOS?: boolean }).isMacOS;
		try {
			(Platform as { isMacOS?: boolean }).isMacOS = true;
			view.setFocusedId('f2');

			// Ctrl+Home on macOS is non-tree (bubbles)
			const ctrlHome = new KeyboardEvent('keydown', { key: 'Home', ctrlKey: true, bubbles: true, cancelable: true });
			container.dispatchEvent(ctrlHome);
			expect(view.focusedId).toBe('f2');
			expect(ctrlHome.defaultPrevented).toBe(false);

			// Cmd+Home (metaKey) on macOS is whole-explorer
			const cmdHome = new KeyboardEvent('keydown', { key: 'Home', metaKey: true, bubbles: true, cancelable: true });
			container.dispatchEvent(cmdHome);
			expect(view.focusedId).toBe('f1');
			expect(cmdHome.defaultPrevented).toBe(true);

			// Cmd+End (metaKey) on macOS is whole-explorer
			const cmdEnd = new KeyboardEvent('keydown', { key: 'End', metaKey: true, bubbles: true, cancelable: true });
			container.dispatchEvent(cmdEnd);
			expect(view.focusedId).toBe('f2');
			expect(cmdEnd.defaultPrevented).toBe(true);
		} finally {
			(Platform as { isMacOS?: boolean }).isMacOS = origMacOS;
		}
	});
});
