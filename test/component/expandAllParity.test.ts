import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PanelExplorer from '../../src/components/containers/panelExplorer.svelte';
import { NodeSelectionService } from '../../src/services/serviceSelection.svelte';
import type { VaultmanPlugin } from '../../src/main';
import type { ExplorerExpansionSummary, ExplorerProvider } from '../../src/types/typeExplorer';
import type { TreeNode } from '../../src/types/typeNode';

const EXPLORER_ID = 'expand-parity';

function nestedNodes(): TreeNode[] {
	return [
		{
			id: 'parent',
			label: 'Parent',
			depth: 0,
			meta: {},
			icon: 'lucide-folder',
			children: [{ id: 'child', label: 'Child', depth: 1, meta: {}, icon: 'lucide-file' }],
		},
		{ id: 'sibling', label: 'Sibling', depth: 0, meta: {}, icon: 'lucide-file' },
	];
}

function flatNodes(): TreeNode[] {
	return [
		{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
		{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-file' },
	];
}

function plugin(selectionService = new NodeSelectionService()): VaultmanPlugin {
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
		selectionService,
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

describe('expand/collapse-all parity', () => {
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

	function renderPanel(options: {
		nodes: TreeNode[];
		nodeExpansionCommand?: { serial: number; action: 'expand-all' | 'collapse-all' };
		onNodeExpansionSummaryChange?: (summary: ExplorerExpansionSummary) => void;
		selectionService?: NodeSelectionService;
	}) {
		const selectionService = options.selectionService ?? new NodeSelectionService();
		app = mount(PanelExplorer as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: plugin(selectionService),
				provider: provider(options.nodes),
				viewMode: 'list',
				nodeExpansionCommand: options.nodeExpansionCommand,
				onNodeExpansionSummaryChange: options.onNodeExpansionSummaryChange,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();
		return selectionService;
	}

	it('expand-all includes hierarchical rows in list visible ids', () => {
		const selectionService = new NodeSelectionService();
		const pruneSpy = vi.spyOn(selectionService, 'prune');
		const onNodeExpansionSummaryChange = vi.fn();

		renderPanel({
			nodes: nestedNodes(),
			nodeExpansionCommand: { serial: 1, action: 'expand-all' },
			onNodeExpansionSummaryChange,
			selectionService,
		});

		expect(onNodeExpansionSummaryChange).toHaveBeenLastCalledWith({
			canToggle: true,
			hasExpandedParents: true,
		});
		expect(pruneSpy).toHaveBeenLastCalledWith(EXPLORER_ID, ['parent', 'child', 'sibling']);
	});

	it('expand-all is a no-op for flat list providers', () => {
		const selectionService = new NodeSelectionService();
		const pruneSpy = vi.spyOn(selectionService, 'prune');
		const onNodeExpansionSummaryChange = vi.fn();

		renderPanel({
			nodes: flatNodes(),
			nodeExpansionCommand: { serial: 1, action: 'expand-all' },
			onNodeExpansionSummaryChange,
			selectionService,
		});

		expect(onNodeExpansionSummaryChange).toHaveBeenLastCalledWith({
			canToggle: false,
			hasExpandedParents: false,
		});
		expect(pruneSpy).toHaveBeenLastCalledWith(EXPLORER_ID, ['alpha', 'beta']);
	});
});
