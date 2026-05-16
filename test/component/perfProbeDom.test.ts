import { describe, expect, it } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import {
	clearActivePerfProbe,
	createPerfProbe,
	setActivePerfProbe,
} from '../../src/dev/perfProbe';
import ViewTree from '../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../src/types/typeNode';

describe('perf probe DOM scenarios', () => {
	it('runs a filters search scenario against the active DOM', async () => {
		document.body.innerHTML = '<input class="vm-filters-search-input" value="" />';
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });

		const result = await probe.api.run('filters-search', { query: 'status' });

		expect(result.scenario).toBe('filters-search');
		expect((document.querySelector('.vm-filters-search-input') as HTMLInputElement).value).toBe(
			'status',
		);
		expect(result.counters['scenario.filters-search'].count).toBe(1);
	});

	it('runs a tree scroll scenario against a mounted ViewTree component', async () => {
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });
		setActivePerfProbe(probe.api);
		const target = document.createElement('div');
		document.body.appendChild(target);
		const nodes: TreeNode[] = Array.from({ length: 40 }, (_, index) => ({
			id: `node-${index}`,
			label: `Node ${index}`,
		}));
		const app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				expandedIds: new Set<string>(),
				onToggle: () => {},
				onRowClick: () => {},
				onContextMenu: () => {},
				icon: () => ({ update: () => {} }),
			},
		});
		flushSync();

		const result = await probe.api.run('tree-scroll');

		expect(result.scenario).toBe('tree-scroll');
		expect(result.counters['scenario.tree-scroll'].count).toBe(1);
		expect(result.counters['viewTree.scroll'].count).toBeGreaterThan(0);
		expect(result.counters['viewTree.scroll'].totalRows).toBe(
			40 * result.counters['viewTree.scroll'].count,
		);
		await unmount(app);
		target.remove();
		clearActivePerfProbe();
	});

	it('runs a filter select scenario against the first tree row', async () => {
		let clicks = 0;
		document.body.innerHTML = '<button class="vm-tree-virtual-row">status</button>';
		document.querySelector('.vm-tree-virtual-row')?.addEventListener('click', () => {
			clicks += 1;
		});
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });

		const result = await probe.api.run('filter-select');

		expect(result.scenario).toBe('filter-select');
		expect(result.counters['scenario.filter-select'].count).toBe(1);
		expect(clicks).toBe(1);
	});

	it('runs an operation badges scenario against undoable badges', async () => {
		let clicks = 0;
		document.body.innerHTML = '<button class="vm-badge is-undoable"></button>';
		document.querySelector('.vm-badge')?.addEventListener('click', () => {
			clicks += 1;
		});
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });

		const result = await probe.api.run('operation-badges');

		expect(result.scenario).toBe('operation-badges');
		expect(result.counters['scenario.operation-badges'].count).toBe(1);
		expect(clicks).toBe(1);
	});

	it('runs files list scroll jump as a direct jump against a guarded list scroller', async () => {
		let scrolls = 0;
		document.body.innerHTML = '<div class="vm-view-list"></div>';
		const list = document.querySelector<HTMLElement>('.vm-view-list');
		expect(list).toBeTruthy();
		Object.defineProperty(list, 'clientHeight', { value: 100, configurable: true });
		Object.defineProperty(list, 'scrollHeight', { value: 1_000, configurable: true });
		list?.addEventListener('scroll', () => {
			scrolls += 1;
		});
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });

		const result = await probe.api.run('files-list-10k-scroll-jump', { steps: 5 });

		expect(result.scenario).toBe('files-list-10k-scroll-jump');
		expect(result.counters['scenario.files-list-10k-scroll-jump']).toMatchObject({
			count: 1,
			totalNodes: 10_000,
			totalRows: 10_000,
			totalFiles: 10_000,
		});
		expect(list?.scrollTop).toBe(900);
		expect(scrolls).toBe(1);
	});

	it('runs explorer scroll burst live as repeated visible jumps with a report', async () => {
		let scrolls = 0;
		document.body.innerHTML = `
			<div class="vm-view-list">
				<div class="vm-view-list-inner">
					<div class="vm-view-list-row" data-id="node-0">
						<span class="vm-view-list-label">Node 0</span>
					</div>
				</div>
			</div>
		`;
		const list = document.querySelector<HTMLElement>('.vm-view-list');
		const row = document.querySelector<HTMLElement>('.vm-view-list-row');
		expect(list).toBeTruthy();
		expect(row).toBeTruthy();
		Object.defineProperty(list, 'clientHeight', { value: 100, configurable: true });
		Object.defineProperty(list, 'scrollHeight', { value: 1_100, configurable: true });
		list?.addEventListener('scroll', () => {
			scrolls += 1;
			const index = Math.round((list.scrollTop / 1_000) * 100);
			row!.dataset.id = `node-${index}`;
			row!.textContent = `Node ${index}`;
		});
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });

		const result = await probe.api.run('explorer-scroll-burst-live', {
			view: 'list',
			jumps: 5,
			visualDelayMs: 0,
			overlay: false,
		});

		expect(result.scenario).toBe('explorer-scroll-burst-live');
		expect(result.scrollBurst).toMatchObject({
			view: 'list',
			jumpCount: 5,
			blankFrameCount: 0,
			blankWindowOver100ms: 0,
			blankWindowOver250ms: 0,
			passed: true,
		});
		expect(result.scrollBurst?.samples).toHaveLength(5);
		expect(result.scrollBurst?.samples.at(-1)?.visibleRowCount).toBeGreaterThan(0);
		expect(scrolls).toBe(5);
	});

	it('marks explorer scroll burst blank when no row text paints after jumps', async () => {
		document.body.innerHTML = '<div class="vm-view-list"></div>';
		const list = document.querySelector<HTMLElement>('.vm-view-list');
		expect(list).toBeTruthy();
		Object.defineProperty(list, 'clientHeight', { value: 100, configurable: true });
		Object.defineProperty(list, 'scrollHeight', { value: 1_100, configurable: true });
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });

		const result = await probe.api.run('explorer-scroll-burst-live', {
			view: 'list',
			jumps: 3,
			visualDelayMs: 0,
			overlay: false,
		});

		expect(result.scrollBurst).toMatchObject({
			view: 'list',
			jumpCount: 3,
			blankFrameCount: 3,
			passed: false,
		});
		expect(result.scrollBurst?.samples.every((sample) => sample.blank)).toBe(true);
	});

	it('shows a live explorer scroll smoke overlay with final status', async () => {
		document.body.innerHTML = `
			<div class="vm-tree-virtual-outer">
				<div class="vm-tree-virtual-inner">
					<div class="vm-tree-virtual-row" data-id="node-0">Node 0</div>
				</div>
			</div>
		`;
		const tree = document.querySelector<HTMLElement>('.vm-tree-virtual-outer');
		expect(tree).toBeTruthy();
		Object.defineProperty(tree, 'clientHeight', { value: 100, configurable: true });
		Object.defineProperty(tree, 'scrollHeight', { value: 1_100, configurable: true });
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });

		await probe.api.run('explorer-scroll-burst-live', {
			view: 'tree',
			jumps: 2,
			visualDelayMs: 0,
			overlay: true,
		});

		const overlay = document.querySelector<HTMLElement>('.vm-scroll-smoke-overlay');
		expect(overlay?.textContent).toContain('tree');
		expect(overlay?.textContent).toContain('PASS');
	});

	it('runs platform menu and tree visual scenarios when matching DOM exists', async () => {
		let menuClicks = 0;
		let presetClicks = 0;
		let boxEvents = 0;
		document.body.innerHTML = `
			<button data-node-field="media"></button>
			<button data-vm-view-preset="native"></button>
			<div class="vm-tree-virtual-outer">
				<div class="vm-tree-row-surface is-active-filter"></div>
				<div class="is-active-filter"><div class="vm-tree-row-surface"></div></div>
			</div>
		`;
		document.querySelector('[data-node-field="media"]')?.addEventListener('click', () => {
			menuClicks += 1;
		});
		document.querySelector('[data-vm-view-preset="native"]')?.addEventListener('click', () => {
			presetClicks += 1;
		});
		document.querySelector('.vm-tree-virtual-outer')?.addEventListener('pointermove', () => {
			boxEvents += 1;
		});
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });

		await probe.api.run('view-menu-element-toggle');
		await probe.api.run('view-mode-native-preset-restore');
		await probe.api.run('tree-box-selection');
		const result = await probe.api.run('tree-filtered-highlight');

		expect(menuClicks).toBe(1);
		expect(presetClicks).toBe(1);
		expect(boxEvents).toBe(1);
		expect(result.counters['scenario.tree-filtered-highlight.matches'].totalRows).toBe(2);
	});
});
