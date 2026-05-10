import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import { performance } from 'node:perf_hooks';
import PanelExplorer from '../../src/components/containers/panelExplorer.svelte';
import ViewNodeTable from '../../src/components/views/ViewNodeTable.svelte';
import { NodeSelectionService } from '../../src/services/serviceSelection.svelte';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	nodeRowsFromTree,
} from '../../src/services/serviceViewTableAdapter';
import type { VaultmanPlugin } from '../../src/main';
import type { ExplorerProvider } from '../../src/types/typeExplorer';
import type { TreeNode } from '../../src/types/typeNode';

const EXPLORER_ID = 'table-stress';

function manyNodes(count: number): TreeNode[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `node-${index}`,
		label: `Node ${index}`,
		depth: 0,
		meta: {},
		icon: 'lucide-file',
		count: index % 7,
	}));
}

function plugin(): VaultmanPlugin {
	return {
		app: {},
		propertyIndex: { fileCount: 0 },
		operationsIndex: { nodes: [], subscribe: vi.fn(() => vi.fn()) },
		activeFiltersIndex: { subscribe: vi.fn(() => vi.fn()) },
		queueService: { remove: vi.fn(), requestDelete: vi.fn() },
		filterService: { setSelectedFiles: vi.fn() },
		viewService: {
			clearSelection: vi.fn(),
			select: vi.fn(),
			setFocused: vi.fn(),
		},
		selectionService: new NodeSelectionService(),
		settings: {},
	} as unknown as VaultmanPlugin;
}

function provider(nodes: TreeNode[]): ExplorerProvider {
	return {
		id: EXPLORER_ID,
		getTree: vi.fn(() => nodes),
		getFiles: vi.fn(() => []),
		handleNodeClick: vi.fn(),
		handleContextMenu: vi.fn(),
	};
}

describe('ViewNodeTable stress behavior', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		Object.defineProperty(target, 'clientHeight', { value: 420, configurable: true });
		Object.defineProperty(target, 'clientWidth', { value: 900, configurable: true });
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
		target.remove();
		vi.unstubAllGlobals();
	});

	it('opens table mode for a large flat explorer without blocking the component harness', () => {
		const providerStub = provider(manyNodes(5_000));
		const started = performance.now();

		app = mount(PanelExplorer as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: plugin(),
				provider: providerStub,
				viewMode: 'table',
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const elapsed = performance.now() - started;
		expect(providerStub.getTree).toHaveBeenCalledTimes(1);
		expect(target.querySelector('.vm-node-table')).not.toBeNull();
		expect(target.querySelectorAll('.vm-node-table-row').length).toBeLessThan(200);
		expect(elapsed).toBeLessThan(3_000);
	});

	it('mounts raw table rows for a large flat explorer without blocking the component harness', () => {
		const rows = nodeRowsFromTree(manyNodes(1_000));
		const started = performance.now();

		app = mount(ViewNodeTable as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rows,
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				selectedIds: new Set<string>(),
				focusedId: null,
				activeId: null,
				onRowClick: vi.fn(),
				onSecondaryAction: vi.fn(),
				onTertiaryAction: vi.fn(),
				onContextMenu: vi.fn(),
				onRowKeydown: vi.fn(),
				onSelectAll: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const elapsed = performance.now() - started;
		expect(target.querySelector('.vm-node-table')).not.toBeNull();
		expect(target.querySelectorAll('.vm-node-table-row').length).toBeLessThan(200);
		expect(elapsed).toBeLessThan(1_000);
	});
});
