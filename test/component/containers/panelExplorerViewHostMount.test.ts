import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PanelExplorer from '../../../src/components/containers/panelExplorer.svelte';
import type { VaultmanPlugin } from '../../../src/main';
import { ThemeService } from '../../../src/services/serviceTheme.svelte';
import type { ExplorerProvider, ExplorerViewMode } from '../../../src/types/typeExplorer';
import type { TreeNode } from '../../../src/types/typeNode';

const populatedNodes: TreeNode[] = [
	{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
	{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag' },
];

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
		themeService: new ThemeService(),
	} as unknown as VaultmanPlugin;
}

function provider(nodes: TreeNode[]): ExplorerProvider {
	return {
		id: 'view-host-mount-test',
		getTree: vi.fn(() => nodes),
		getFiles: vi.fn(() => []),
		handleNodeClick: vi.fn(),
		handleContextMenu: vi.fn(),
	};
}

describe('panelExplorer - ViewHost mount', () => {
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
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
	});

	function renderPanel(viewMode: ExplorerViewMode, nodes: TreeNode[] = populatedNodes): void {
		app = mount(PanelExplorer as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: plugin(),
				provider: provider(nodes),
				viewMode,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();
	}

	it('mounts the ViewHost wrapper for populated platform modes', () => {
		renderPanel('tree');

		expect(target.querySelector('.vm-view-host-container')).not.toBeNull();
		expect(target.querySelector('.vm-tree-virtual-row[data-id="alpha"]')).not.toBeNull();
	});

	it('does not mount ViewHost for markmap mode', () => {
		renderPanel('markmap', [
			{
				id: 'alpha',
				label: 'Alpha',
				depth: 0,
				meta: {},
				children: [{ id: 'beta', label: 'Beta', depth: 1, meta: {} }],
			},
		]);

		expect(target.querySelector('.vm-markmap-container')).not.toBeNull();
		expect(target.querySelector('.vm-view-host-container')).toBeNull();
		expect(target.querySelector('[data-vm-markmap-node="alpha"]')).not.toBeNull();
	});

	it('routes empty platform states outside ViewHost', () => {
		renderPanel('tree', []);

		expect(target.querySelector('.vm-view-host-container')).toBeNull();
		expect(target.querySelector('[data-empty-kind="empty"]')).not.toBeNull();
	});
});
