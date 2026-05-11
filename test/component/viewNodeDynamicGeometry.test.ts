import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
import ViewNodeTable from '../../src/components/views/ViewNodeTable.svelte';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	nodeRowsFromTree,
} from '../../src/services/serviceViewTableAdapter';
import type { TreeNode } from '../../src/types/typeNode';

class FakeRowMeasure {
	readonly calls: Array<{ id: string; text: string; width: number; minHeight: number }> = [];

	measure(input: { id: string; text: string; width: number; minHeight: number; paddingBlock: number }): number {
		this.calls.push(input);
		const lineCount = Math.max(1, Math.ceil(input.text.length / Math.max(8, input.width / 8)));
		return Math.max(input.minHeight, lineCount * 11.25 + input.paddingBlock + 0.5);
	}

	clear(): void {}
}

function longNodes(count: number): TreeNode[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `node-${index}`,
		label: `Adopted Header ${index}: ${'nested inherited context '.repeat(8)}`,
		depth: 0,
		meta: {},
		icon: 'lucide-file',
	}));
}

describe('ViewNode dynamic geometry', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;
	let resizeCallbacks: ResizeObserverCallback[] = [];

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		resizeCallbacks = [];
		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
			cb(0);
			return 1;
		});
		vi.stubGlobal('cancelAnimationFrame', vi.fn());
		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(private readonly cb: ResizeObserverCallback) {
					resizeCallbacks.push(cb);
				}
				observe(): void {}
				disconnect(): void {}
			},
		);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
	});

	function triggerResize(): void {
		for (const cb of resizeCallbacks) cb([], {} as ResizeObserver);
		flushSync();
	}

	it('measures multiline table rows without remounting row DOM during width changes', () => {
		const measure = new FakeRowMeasure();
		const rows = nodeRowsFromTree(longNodes(10_000));
		app = mount(ViewNodeTable as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rows,
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				selectedIds: new Set<string>(),
				measure,
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const table = target.querySelector<HTMLElement>('.vm-node-table')!;
		const firstRow = target.querySelector<HTMLElement>('.vm-node-table-row[data-id]')!;
		const rowCount = target.querySelectorAll('.vm-node-table-row').length;
		expect(rowCount).toBeGreaterThan(0);
		expect(rowCount).toBeLessThan(250);
		expect(measure.calls.some((call) => call.text.includes('Adopted Header'))).toBe(true);
		expect(
			[...target.querySelectorAll<HTMLElement>('.vm-node-table-row')].some((row) =>
				/--vm-node-table-y:\s*\d+\.\d+px/.test(row.getAttribute('style') ?? ''),
			),
		).toBe(true);

		Object.defineProperty(table, 'clientWidth', { value: 360, configurable: true });
		triggerResize();

		expect(target.querySelector<HTMLElement>('.vm-node-table-row[data-id]')).toBe(firstRow);
		table.scrollTop = 4000;
		table.dispatchEvent(new Event('scroll'));
		flushSync();
		expect(target.querySelectorAll('.vm-node-table-row').length).toBeGreaterThan(0);
	});

	it('measures multiline grid rows without remounting tile DOM during width changes', () => {
		const measure = new FakeRowMeasure();
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: longNodes(10_000),
				selectedIds: new Set<string>(),
				measure,
				onTileClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const grid = target.querySelector<HTMLElement>('.vm-node-grid')!;
		const firstTile = target.querySelector<HTMLElement>('.vm-node-grid-tile[data-id]')!;
		const rowCount = target.querySelectorAll('.vm-node-grid-row').length;
		expect(rowCount).toBeGreaterThan(0);
		expect(rowCount).toBeLessThan(250);
		expect(measure.calls.some((call) => call.text.includes('Adopted Header'))).toBe(true);
		expect(
			[...target.querySelectorAll<HTMLElement>('.vm-node-grid-row')].some((row) =>
				/--vm-node-grid-y:\s*\d+\.\d+px/.test(row.getAttribute('style') ?? ''),
			),
		).toBe(true);

		Object.defineProperty(grid, 'clientWidth', { value: 320, configurable: true });
		triggerResize();

		expect(target.querySelector<HTMLElement>('.vm-node-grid-tile[data-id]')).toBe(firstTile);
		grid.scrollTop = 4000;
		grid.dispatchEvent(new Event('scroll'));
		flushSync();
		expect(target.querySelectorAll('.vm-node-grid-row').length).toBeGreaterThan(0);
	});
});
