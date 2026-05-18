import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeCards from '../../src/components/views/ViewNodeCards.svelte';
import ViewNodeTable from '../../src/components/views/ViewNodeTable.svelte';
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

vi.mock('@tanstack/svelte-virtual', () => ({
	createVirtualizer: vi.fn((options: VirtualizerOptions) => {
		let current = options;
		const instance = {
			getVirtualItems: () => [],
			getTotalSize: () => 0,
			scrollToIndex: vi.fn(),
			measure: vi.fn(),
			setOptions: (next: VirtualizerOptions) => {
				current = { ...current, ...next };
			},
			options: () => current,
		};
		return {
			subscribe(run: (value: typeof instance) => void) {
				run(instance);
				return () => {};
			},
		};
	}),
}));

function manyNodes(count: number): TreeNode[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `node-${index}`,
		label: `Node ${index}`,
		depth: 0,
		meta: {},
		icon: 'lucide-file',
	}));
}

const measure: TextMeasureService = {
	cacheMisses: 0,
	measure: vi.fn(() => ({ lineCount: 1, height: 20 })),
	measureRowHeight: vi.fn(() => 32),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	clear: vi.fn(),
};

describe('variable-height scroll fallbacks', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
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
		if (app) void unmount(app);
		app = null;
		target.remove();
		vi.unstubAllGlobals();
	});

	it('renders table fallback rows around a deep scroll target', () => {
		const nodes = manyNodes(2_000);
		app = mount(ViewNodeTable as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rows: nodeRowsFromTree(nodes),
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				scrollTarget: { id: 'node-1900', serial: 1 },
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				measure,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const rows = target.querySelectorAll('.vm-node-table-row[data-id]');
		expect(rows.length).toBeGreaterThan(0);
		expect(rows.length).toBeLessThan(80);
		expect(target.querySelector('[data-id="node-1900"]')).not.toBeNull();
		expect(target.querySelector('[data-id="node-0"]')).toBeNull();
	});

	it('keeps cards fallback rendering bounded around a deep scroll target', () => {
		const nodes = manyNodes(2_000);
		app = mount(ViewNodeCards as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				providerId: 'files',
				nodes,
				visibleFields: ['icon', 'text'],
				scrollTarget: { id: 'node-1900', serial: 1 },
				onCardClick: vi.fn(),
				onContextMenu: vi.fn(),
				measure,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const cards = target.querySelectorAll('.vm-node-card[data-id]');
		expect(cards.length).toBeGreaterThan(0);
		expect(cards.length).toBeLessThan(120);
		expect(target.querySelector('[data-id="node-1900"]')).not.toBeNull();
		expect(target.querySelector('[data-id="node-0"]')).toBeNull();
	});
});
