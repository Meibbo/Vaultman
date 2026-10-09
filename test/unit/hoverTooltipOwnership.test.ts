// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TreeNode } from '../../src/types/typeTree';
import type { TreeViewOptions } from '../../src/components/layout/viewTree';
import * as obsidian from 'obsidian';
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';

describe('B1/B3: eliminate native/styled hover-tooltip duplication', () => {
	beforeEach(() => {
		installObsidianDomPolyfill();
		vi.stubGlobal('activeDocument', document);
		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
			cb(0);
			return 1;
		});
		vi.stubGlobal('cancelAnimationFrame', () => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		document.body.replaceChildren();
	});

	it('renders hover-action buttons with aria-label but NO native title attribute', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = document.createElement('div');
		Object.defineProperty(container, 'clientHeight', {
			value: 600,
			configurable: true,
		});
		document.body.appendChild(container);
		const view = new UnifiedTreeView(container);

		const node: TreeNode = {
			id: 'prop:alpha',
			label: 'alpha',
			depth: 0,
			meta: {},
			children: [],
			cells: [
				{
					id: 'cell_hover',
					kind: 'cell_hover',
					actions: [
						{ id: 'delete', label: 'Delete property', icon: 'lucide-trash' },
						{ id: 'pin', label: 'Pin property', icon: 'lucide-pin' },
					],
				},
			],
		};

		const opts: TreeViewOptions = {
			nodes: [node],
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		};

		view.render(opts);

		const actions = Array.from(
			container.querySelectorAll<HTMLButtonElement>(
				'.vaultman-cell-hover-action',
			),
		);
		expect(actions.length).toBe(2);

		// Accessible names MUST be preserved
		expect(actions[0].getAttribute('aria-label')).toBe('Delete property');
		expect(actions[1].getAttribute('aria-label')).toBe('Pin property');

		// Native title MUST be eliminated where styled tooltip already owns the button
		expect(actions[0].hasAttribute('title')).toBe(false);
		expect(actions[1].hasAttribute('title')).toBe(false);
	});

	it('clears stale title attribute on virtualized row reuse or recycling', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = document.createElement('div');
		Object.defineProperty(container, 'clientHeight', {
			value: 600,
			configurable: true,
		});
		document.body.appendChild(container);
		const view = new UnifiedTreeView(container);

		const node: TreeNode = {
			id: 'prop:beta',
			label: 'beta',
			depth: 0,
			meta: {},
			children: [],
			cells: [
				{
					id: 'cell_hover',
					kind: 'cell_hover',
					actions: [
						{ id: 'action1', label: 'First Action', icon: 'lucide-star' },
					],
				},
			],
		};

		view.render({
			nodes: [node],
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});

		const row = container.querySelector<HTMLElement>('.vaultman-tree-row');
		expect(row).not.toBeNull();

		// Simulate external mutation / stale title on recycled row element
		row!.setAttribute('title', 'stale-recycled-title');

		// Re-render the tree with updated node
		view.render({
			nodes: [{ ...node, label: 'beta updated' }],
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});

		expect(row!.hasAttribute('title')).toBe(false);
		const actionEl = row!.querySelector('.vaultman-cell-hover-action');
		expect(actionEl).not.toBeNull();
		expect(actionEl!.hasAttribute('title')).toBe(false);
	});

	it('preserves accessible names on toggle and action cells without native title', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = document.createElement('div');
		Object.defineProperty(container, 'clientHeight', {
			value: 600,
			configurable: true,
		});
		document.body.appendChild(container);
		const view = new UnifiedTreeView(container);

		const node: TreeNode = {
			id: 'addon:my-plugin',
			label: 'My Plugin',
			depth: 0,
			meta: {},
			children: [],
			cells: [
				{
					id: 'toggle-cell',
					kind: 'toggle',
					style: 'native',
					label: 'Enable My Plugin',
					enabled: true,
				},
				{
					id: 'action-cell',
					kind: 'action',
					label: 'Configure Plugin',
					icon: 'lucide-settings',
				},
			],
		};

		view.render({
			nodes: [node],
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});

		const toggleCell = container.querySelector('.vaultman-addon-toggle-cell');
		const actionCell = container.querySelector('.vaultman-addon-action-cell');

		expect(toggleCell).not.toBeNull();
		expect(actionCell).not.toBeNull();

		// B3: title-free, accessible name retained
		expect(toggleCell!.getAttribute('aria-label')).toBe('Enable My Plugin');
		expect(toggleCell!.hasAttribute('title')).toBe(false);

		expect(actionCell!.getAttribute('aria-label')).toBe('Configure Plugin');
		expect(actionCell!.hasAttribute('title')).toBe(false);
	});

	it('retains aria-label while tooltipsEnabled suppresses the production tooltip hook', async () => {
		const setTooltip = vi.spyOn(obsidian, 'setTooltip');
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = document.createElement('div');
		Object.defineProperty(container, 'clientHeight', {
			value: 600,
			configurable: true,
		});
		document.body.appendChild(container);
		const view = new UnifiedTreeView(container);

		const node: TreeNode = {
			id: 'prop:gamma',
			label: 'gamma',
			depth: 0,
			meta: {},
			children: [],
			cells: [
				{
					id: 'cell_hover',
					kind: 'cell_hover',
					actions: [{ id: 'act', label: 'Gamma Action', icon: 'lucide-zap' }],
				},
			],
		};

		view.render({
			nodes: [node],
			expandedIds: new Set<string>(),
			tooltipsEnabled: false,
			rowTooltip: () => 'Gamma row tooltip',
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});

		const actionEl = container.querySelector<HTMLElement>(
			'.vaultman-cell-hover-action',
		);
		expect(actionEl).not.toBeNull();
		expect(actionEl!.getAttribute('aria-label')).toBe('Gamma Action');
		expect(actionEl!.hasAttribute('title')).toBe(false);
		expect(setTooltip).not.toHaveBeenCalled();

		view.render({
			nodes: [node],
			expandedIds: new Set<string>(),
			tooltipsEnabled: true,
			rowTooltip: () => 'Gamma row tooltip',
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});
		expect(setTooltip).toHaveBeenCalled();
	});

	it('removes orphaned tooltips from document when tree view is destroyed', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = document.createElement('div');
		document.body.appendChild(container);
		const view = new UnifiedTreeView(container);

		const orphan = document.createElement('div');
		orphan.className = 'tooltip';
		orphan.textContent = 'Orphaned tooltip text';
		document.body.appendChild(orphan);
		expect(document.querySelectorAll('.tooltip').length).toBe(1);

		view.destroy();
		expect(document.querySelectorAll('.tooltip').length).toBe(0);
	});
});
