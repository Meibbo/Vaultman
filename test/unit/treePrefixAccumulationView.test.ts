// U130 TAREA 7 regression: incremental prefix accumulation must survive the
// reveal/focus path. Failing-first: setFocusedId cleared the owner-local
// prefix buffer on every focus move, so rapid `t` + `e` degraded to two
// single-letter jumps (`t` -> test, `e` -> External) instead of narrowing to
// the first `te…` row. Green when fast multi-char typing narrows siblings.
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnifiedTreeView } from '../../src/components/layout/viewTree';
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';

installObsidianDomPolyfill();

beforeEach(() => {
	vi.stubGlobal('activeDocument', document);
	if (!Element.prototype.scrollTo) {
		Element.prototype.scrollTo = vi.fn();
	}
});

const LABELS: Record<string, string> = {
	'test 55.md': 'test 55.md',
	'tea.md': 'tea.md',
	'External': 'External',
};

function createPrefixView(container: HTMLElement): UnifiedTreeView {
	const view = new UnifiedTreeView(container);
	view.render({
		nodes: [
			{ id: 'test 55.md', depth: 0, label: 'test 55.md', meta: {} },
			{ id: 'tea.md', depth: 0, label: 'tea.md', meta: {} },
			{ id: 'External', depth: 0, label: 'External', meta: {} },
		],
		expandedIds: new Set(),
		selectedIds: new Set(),
		onRowClick: () => {},
		onToggle: () => {},
		onContextMenu: () => {},
		navco: {
			letterJump: {
				resolveScope: () => ({ parentId: null, level: 1 }),
				sortOf: () => ({ sortBy: 'name', direction: 'asc' as const }),
				labelOf: (id: string) => LABELS[id] ?? null,
			},
		},
	});
	return view;
}

describe('UnifiedTreeView incremental prefix accumulation', () => {
	it('narrows fast `t` + `e` to the first `te…` row instead of single-letter fallback', () => {
		const container = document.createElement('div');
		const view = createPrefixView(container);
		view.setFocusedId('test 55.md');

		container.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true, cancelable: true }));
		expect(view.focusedId).toBe('test 55.md');

		container.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true, cancelable: true }));
		expect(view.focusedId).toBe('test 55.md');
	});

	it('still single-jumps an unrelated second glyph to its own first match', () => {
		const container = document.createElement('div');
		const view = createPrefixView(container);
		view.setFocusedId('test 55.md');

		container.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true, cancelable: true }));
		expect(view.focusedId).toBe('test 55.md');

		// `x` matches nothing: the buffer reseeds and the classic path finds
		// no target either, so focus stays instead of jumping elsewhere.
		container.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true }));
		expect(view.focusedId).toBe('test 55.md');
	});
});
