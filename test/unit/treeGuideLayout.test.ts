// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnifiedTreeView } from '../../src/components/layout/viewTree';
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.replaceChildren();
});

describe('tree indentation guides during window rendering', () => {
	it('renders nested rows without measuring each partially constructed row', () => {
		// Given a real DOM viewport with several depth levels.
		installObsidianDomPolyfill();
		vi.stubGlobal('activeDocument', document);
		const container = document.body.appendChild(document.createElement('div'));
		Object.defineProperty(container, 'clientHeight', { value: 600 });
		const measure = vi.spyOn(window, 'getComputedStyle');
		const view = new UnifiedTreeView(container);

		// When creating the virtual rows and their nested guide styling.
		view.render({
			nodes: [0, 1, 2].map(depth => ({ id: `row-${depth}`, label: `Row ${depth}`, depth, meta: {} })),
			expandedIds: new Set(),
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
			visibleCells: new Set(['name', 'nested']),
		});

		// Then depth remains available to CSS, without a per-row layout flush.
		expect(container.querySelectorAll('.vaultman-tree-row')).toHaveLength(3);
		expect(container.querySelector('[data-id="row-2"]')?.getAttribute('style')).toContain('--depth: 2');
		expect(measure.mock.calls.filter(([element]) => element.classList.contains('vaultman-tree-row'))).toHaveLength(0);
		view.destroy();
	});
});
