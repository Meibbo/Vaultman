import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
import ViewNodeTable from '../../src/components/views/ViewNodeTable.svelte';
import ViewNodeCards from '../../src/components/views/ViewNodeCards.svelte';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	nodeRowsFromTree,
} from '../../src/services/serviceViewTableAdapter';
import type { TreeNode } from '../../src/types/typeNode';

type VirtualizerOptions = {
	count?: number;
	getItemKey?: (index: number) => string | number;
	estimateSize?: (index: number) => number;
};

const virtualizerMock = vi.hoisted(() => ({
	optionSnapshots: [] as VirtualizerOptions[],
	reset() {
		this.optionSnapshots.length = 0;
	},
}));

vi.mock('@tanstack/svelte-virtual', () => ({
	createVirtualizer: vi.fn((options: VirtualizerOptions) => {
		let current = options;
		const instance = {
			getVirtualItems: () =>
				Array.from({ length: current.count ?? 0 }, (_, index) => {
					const size = current.estimateSize?.(index) ?? 32;
					return {
						index,
						key: current.getItemKey?.(index) ?? index,
						start: index * size,
						size,
						end: (index + 1) * size,
					};
				}),
			getTotalSize: () => (current.count ?? 0) * (current.estimateSize?.(0) ?? 32),
			scrollToIndex: vi.fn(),
			setOptions: (next: VirtualizerOptions) => {
				current = { ...current, ...next };
				virtualizerMock.optionSnapshots.push(current);
			},
		};
		virtualizerMock.optionSnapshots.push(current);
		return {
			subscribe(run: (value: typeof instance) => void) {
				run(instance);
				return () => {};
			},
		};
	}),
}));

const flatNodes: TreeNode[] = [
	{
		id: 'parent',
		label: 'Parent',
		depth: 0,
		meta: {},
		children: [{ id: 'child', label: 'Child', depth: 1, meta: {} }],
	},
	{ id: 'sibling', label: 'Sibling', depth: 0, meta: {} },
];

describe('view virtualizer item keys', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		virtualizerMock.reset();
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal(
			'ResizeObserver',
			class {
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
		virtualizerMock.reset();
	});

	function latestOptions(): Required<Pick<VirtualizerOptions, 'getItemKey'>> {
		const latest = virtualizerMock.optionSnapshots[virtualizerMock.optionSnapshots.length - 1];
		expect(latest?.getItemKey).toEqual(expect.any(Function));
		return latest as Required<Pick<VirtualizerOptions, 'getItemKey'>>;
	}

	it('keys ViewTree virtual rows by flat tree node id', () => {
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: flatNodes,
				expandedIds: new Set(['parent']),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const { getItemKey } = latestOptions();

		expect(getItemKey(0)).toBe('parent');
		expect(getItemKey(1)).toBe('child');
		expect(getItemKey(99)).toBe(99);
	});

	it('keys ViewNodeGrid virtual rows by composed row node ids', () => {
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: flatNodes,
				onTileClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const { getItemKey } = latestOptions();

		expect(getItemKey(0)).toBe('parent\u0000sibling');
		expect(getItemKey(99)).toBe(99);
	});

	it('keys ViewNodeTable virtual rows by table row id', () => {
		app = mount(ViewNodeTable as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rows: nodeRowsFromTree(flatNodes),
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const { getItemKey } = latestOptions();

		expect(getItemKey(0)).toBe('parent');
		expect(getItemKey(1)).toBe('child');
		expect(getItemKey(2)).toBe('sibling');
		expect(getItemKey(99)).toBe(99);
	});

	it('keys ViewNodeCards virtual rows by composed card row node ids', () => {
		app = mount(ViewNodeCards as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				providerId: 'tags',
				nodes: flatNodes,
				visibleFields: ['text', 'count'],
				measure: {
					measure: vi.fn(() => ({ height: 18, lineCount: 1 })),
					clear: vi.fn(),
				},
				onCardClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const { getItemKey } = latestOptions();

		expect(getItemKey(0)).toBe('parent\u0000sibling');
		expect(getItemKey(99)).toBe(99);
	});
});
