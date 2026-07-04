import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
import ViewNodeTable from '../../src/components/views/ViewNodeTable.svelte';
import ViewNodeScrollJankHarness from './ViewNodeScrollJankHarness.svelte';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	nodeRowsFromTree,
} from '../../src/services/serviceViewTableAdapter';
import type { TextMeasureService } from '../../src/services/serviceTextMeasure';
import type { TreeNode } from '../../src/types/typeNode';

type VirtualizerOptions = {
	count?: number;
	getItemKey?: (index: number) => string | number;
	estimateSize?: (index: number) => number;
};

const virtualizerStats = vi.hoisted(() => ({
	setOptionsCalls: 0,
	measureCalls: 0,
}));

type ScrollJankHarness = {
	setTableColumnWidth(width: number): void;
	setGridSizePresetId(id: 'small' | 'medium' | 'large' | 'extra-large'): void;
};

vi.mock('@tanstack/svelte-virtual', () => ({
	createVirtualizer: vi.fn((options: VirtualizerOptions) => {
		let current = options;
		const subscribers = new Set<(value: any) => void>();
		const instance = {
			getVirtualItems: () => {
				const count = Math.min(current.count ?? 0, 32);
				let start = 0;
				return Array.from({ length: count }, (_, index) => {
					const size = current.estimateSize?.(index) ?? 32;
					const item = {
						index,
						key: current.getItemKey?.(index) ?? index,
						start,
						size,
						end: start + size,
					};
					start += size;
					return item;
				});
			},
			getTotalSize: () => Math.max(0, current.count ?? 0) * 32,
			scrollToIndex: vi.fn(),
			measure: () => {
				virtualizerStats.measureCalls += 1;
			},
			setOptions: (next: VirtualizerOptions) => {
				virtualizerStats.setOptionsCalls += 1;
				current = { ...current, ...next };
				for (const run of subscribers) run(instance);
			},
		};
		return {
			subscribe(run: (value: typeof instance) => void) {
				subscribers.add(run);
				run(instance);
				return () => {
					subscribers.delete(run);
				};
			},
		};
	}),
}));

function manyNodes(count: number): TreeNode[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `node-${index}`,
		label: `Long table node ${index}: ${'wrap context '.repeat(10)}`,
		depth: 0,
		meta: {},
		icon: 'lucide-file',
	}));
}

function measureStub(): TextMeasureService {
	return {
		cacheMisses: 0,
		measure: vi.fn(() => ({ lineCount: 3, height: 54 })),
		measureRowHeight: vi.fn(() => 72),
		invalidate: vi.fn(),
		invalidateAll: vi.fn(),
		clear: vi.fn(),
	};
}

describe('ViewNode scroll jank guardrails', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		vi.useFakeTimers();
		target = document.createElement('div');
		document.body.appendChild(target);
		virtualizerStats.setOptionsCalls = 0;
		virtualizerStats.measureCalls = 0;
		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
			cb(0);
			return 1;
		});
		vi.stubGlobal('cancelAnimationFrame', vi.fn());
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe(): void {}
				disconnect(): void {}
			},
		);
	});

	afterEach(() => {
		if (app) void unmount(app);
		app = null;
		target.remove();
		vi.clearAllTimers();
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	// V.D slice 2b: ViewNodeTable no longer drives its own @tanstack/svelte-virtual instance (full
	// migration to the shared SharedVariableVirtualLayout registry, which has no TanStack
	// setOptions seam on the variable-height path) — so counting `setOptions` calls on the mocked
	// module no longer observes anything table does; the anti-thrash class of bug this guarded
	// against (a `setOptions` feedback loop from an un-`untrack`'d $effect) is now structurally
	// unreachable for table, since there is no `setOptions` to call. Retargeted to the
	// locked-contract behavior the call-count was a proxy for: measuring visible rows must not
	// remount row DOM (stable identity) or change the rendered row count on a redundant reactive
	// pass — the observable anti-thrash guarantee, independent of virtualizer internals.
	it('does not remount table rows or change the rendered window on a redundant reactive pass', () => {
		app = mount(ViewNodeTable as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rows: nodeRowsFromTree(manyNodes(10_000)),
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				selectedIds: new Set<string>(),
				measure: measureStub(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});

		flushSync();
		const firstRow = target.querySelector('.vm-node-table-row[data-id]');
		const rowCount = target.querySelectorAll('.vm-node-table-row').length;
		flushSync();

		expect(target.querySelector('.vm-node-table-row[data-id]')).toBe(firstRow);
		expect(target.querySelectorAll('.vm-node-table-row').length).toBe(rowCount);
	});

	it('does not reconfigure the grid virtualizer when visible tile measurements change', () => {
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: manyNodes(10_000),
				selectedIds: new Set<string>(),
				measure: {
					measure: vi.fn(() => 72),
					clear: vi.fn(),
				},
				onTileClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});

		flushSync();
		const callsAfterMount = virtualizerStats.setOptionsCalls;
		flushSync();

		expect(callsAfterMount).toBeLessThanOrEqual(3);
		expect(virtualizerStats.setOptionsCalls).toBe(callsAfterMount);
	});

	it('defers table row measurement changes until scroll is idle', () => {
		const measure = measureStub();
		const measureRowHeight = vi.mocked(measure.measureRowHeight);
		app = mount(ViewNodeScrollJankHarness as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				mode: 'table',
				nodes: manyNodes(10_000),
				measure,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});

		flushSync();
		const initialMeasureCalls = measureRowHeight.mock.calls.length;
		const table = target.querySelector('.vm-node-table') as HTMLDivElement;
		table.scrollTop = 3200;
		table.dispatchEvent(new Event('scroll'));
		flushSync();
		(app as unknown as ScrollJankHarness).setTableColumnWidth(320);
		flushSync();

		expect(measureRowHeight.mock.calls.length).toBe(initialMeasureCalls);

		vi.advanceTimersByTime(120);
		flushSync();

		expect(measureRowHeight.mock.calls.length).toBeGreaterThan(initialMeasureCalls);
	});

	it('defers grid row measurement changes until scroll is idle', () => {
		const measure = {
			measure: vi.fn(() => 72),
			clear: vi.fn(),
		};
		app = mount(ViewNodeScrollJankHarness as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				mode: 'grid',
				nodes: manyNodes(10_000),
				measure,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});

		flushSync();
		const initialMeasureCalls = measure.measure.mock.calls.length;
		const grid = target.querySelector('.vm-node-grid') as HTMLDivElement;
		grid.scrollTop = 3200;
		grid.dispatchEvent(new Event('scroll'));
		flushSync();
		(app as unknown as ScrollJankHarness).setGridSizePresetId('large');
		flushSync();

		expect(measure.measure.mock.calls.length).toBe(initialMeasureCalls);

		vi.advanceTimersByTime(120);
		flushSync();

		expect(measure.measure.mock.calls.length).toBeGreaterThan(initialMeasureCalls);
	});
});
