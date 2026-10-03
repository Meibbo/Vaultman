// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { UnifiedTreeView } from '../../src/components/layout/viewTree';
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.replaceChildren();
});

it('measures sticky placement before writing the virtual rows', () => {
	installObsidianDomPolyfill();
	vi.stubGlobal('activeDocument', document);
	const container = document.body.appendChild(document.createElement('div'));
	Object.defineProperty(container, 'clientHeight', { value: 600 });
	const rowsAtMeasurement: number[] = [];
	vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function () {
		rowsAtMeasurement.push(container.querySelectorAll('.vaultman-tree-row').length);
		return 24;
	});
	const view = new UnifiedTreeView(container);
	view.render({
		nodes: [{ id: 'root', label: 'Root', depth: 0, meta: {}, children: [
			{ id: 'child', label: 'Child', depth: 1, meta: {} },
		] }],
		expandedIds: new Set(['root']),
		stickyParentRows: true,
		onToggle: () => {}, onRowClick: () => {}, onContextMenu: () => {},
	});
	expect(rowsAtMeasurement).toEqual([0]);
	expect(container.querySelector('.vaultman-tree-sticky-layer')?.getAttribute('style')).toContain('top: 24px');
	view.destroy();
});
