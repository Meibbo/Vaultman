import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PanelExplorer from '../../src/components/containers/panelExplorer.svelte';
import { NodeSelectionService } from '../../src/services/serviceSelection.svelte';
import { ViewService } from '../../src/services/serviceViews.svelte';
import type { VaultmanPlugin } from '../../src/main';
import type { ExplorerProvider, ExplorerViewMode } from '../../src/types/typeExplorer';
import type { ExplorerSnapshot } from '../../src/types/typeExplorerDataPlane';
import type { FileMeta, PropMeta, TreeNode } from '../../src/types/typeNode';
import type { IViewService } from '../../src/types/typeViews';
import { mockTFile } from '../helpers/obsidian-mocks';

const EXPLORER_ID = 'selection-test';
type TestNodeMouseAction = 'select' | 'filter' | 'open' | 'node-note' | 'delete';
type ExplorerDataPlaneServiceLike = {
	snapshot(explorerId: string): ExplorerSnapshot | undefined;
	subscribe(explorerId: string, cb: () => void): () => void;
};

function nodes(): TreeNode[] {
	return [
		{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
		{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-file' },
	];
}

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

function largeNestedNodes(): TreeNode[] {
	return [
		...nestedNodes(),
		...Array.from({ length: 8 }, (_, index) => ({
			id: `leaf-${index}`,
			label: `Leaf ${index}`,
			depth: 0,
			meta: {},
			icon: 'lucide-file',
		})),
	];
}

function manyFlatNodes(count = 40): TreeNode[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `node-${index}`,
		label: `Node ${index}`,
		depth: 0,
		meta: {},
		icon: 'lucide-file',
	}));
}

function plugin(
	selectionService = new NodeSelectionService(),
	viewService: VaultmanPlugin['viewService'] = {
		clearSelection: vi.fn(),
		select: vi.fn(),
		setFocused: vi.fn(),
	} as unknown as VaultmanPlugin['viewService'],
): VaultmanPlugin {
	return {
		app: {},
		propertyIndex: { fileCount: 0 },
		operationsIndex: { nodes: [], subscribe: vi.fn(() => vi.fn()) },
		activeFiltersIndex: { subscribe: vi.fn(() => vi.fn()) },
		queueService: { remove: vi.fn(), requestDelete: vi.fn() },
		filterService: { setSelectedFiles: vi.fn() },
		viewService,
		selectionService,
	} as unknown as VaultmanPlugin;
}

function provider(overrides: Partial<ExplorerProvider> = {}): ExplorerProvider {
	return {
		id: EXPLORER_ID,
		getTree: vi.fn(() => nodes()),
		getFiles: vi.fn(() => []),
		handleNodeClick: vi.fn(),
		handleContextMenu: vi.fn(),
		...overrides,
	};
}

function makeFilesSnapshot(visibleIds: string[]): ExplorerSnapshot {
	const rows = visibleIds.map((id, index) => {
		const node: TreeNode = {
			id,
			label: id,
			depth: 0,
			meta: {},
			icon: 'lucide-file',
		};
		return {
			id,
			label: id,
			depth: 0,
			parentId: null,
			childrenIds: [],
			node,
			kind: 'file' as const,
			path: id,
			index,
		};
	});
	return {
		explorerId: 'files',
		providerKey: 'files',
		revision: 1,
		structureRevision: 1,
		rows,
		tree: rows.map((row) => row.node),
		visibleIds,
		byId: new Map(rows.map((row) => [row.id, row])),
		idToIndex: new Map(visibleIds.map((id, index) => [id, index])),
		pathToId: new Map(visibleIds.map((id) => [id, id])),
		folderPathToId: new Map(),
		domainKeyToId: new Map(),
		projection: {
			searchTerm: '',
			searchMode: 'all',
			sortBy: 'name',
			sortDirection: 'asc',
			sortTarget: 'top',
		},
		sourceRevisions: { filesRevision: 1 },
	};
}

function snapshotHarness(initial?: ExplorerSnapshot): {
	service: ExplorerDataPlaneServiceLike;
	publish(snapshot: ExplorerSnapshot): void;
} {
	let current = initial;
	const subscribers = new Set<() => void>();
	return {
		service: {
			snapshot: vi.fn((explorerId: string) => (explorerId === 'files' ? current : undefined)),
			subscribe: vi.fn((explorerId: string, cb: () => void) => {
				if (explorerId === 'files') subscribers.add(cb);
				return () => {
					subscribers.delete(cb);
				};
			}),
		},
		publish(snapshot: ExplorerSnapshot) {
			current = snapshot;
			for (const cb of subscribers) cb();
		},
	};
}

describe('PanelExplorer tree selection adapter', () => {
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

	function renderPanel(
		options: {
			selectionService?: NodeSelectionService;
			provider?: ExplorerProvider;
			viewMode?: ExplorerViewMode;
			gridHierarchyMode?: 'folder' | 'inline';
			nodeMouseActions?: {
				primary: TestNodeMouseAction;
				secondary: TestNodeMouseAction;
				tertiary: TestNodeMouseAction;
			};
			nodeExpansionCommand?: unknown;
			onNodeExpansionSummaryChange?: (summary: unknown) => void;
			explorerDataPlaneService?: ExplorerDataPlaneServiceLike;
		} = {},
	) {
		const selectionService = options.selectionService ?? new NodeSelectionService();
		const pluginStub = plugin(selectionService);
		pluginStub.settings = {
			...pluginStub.settings,
			gridHierarchyMode: options.gridHierarchyMode,
			nodeMouseActions: options.nodeMouseActions,
		};
		if (options.explorerDataPlaneService) {
			(
				pluginStub as VaultmanPlugin & {
					explorerDataPlaneService: ExplorerDataPlaneServiceLike;
				}
			).explorerDataPlaneService = options.explorerDataPlaneService;
		}
		const providerStub = options.provider ?? provider();
		app = mount(PanelExplorer as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: pluginStub,
				provider: providerStub,
				viewMode: options.viewMode ?? 'tree',
				nodeExpansionCommand: options.nodeExpansionCommand,
				onNodeExpansionSummaryChange: options.onNodeExpansionSummaryChange,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();
		return { pluginStub, providerStub, selectionService };
	}

	it('row-slot click selects through the node selection service without activating the node', () => {
		const { pluginStub, providerStub, selectionService } = renderPanel();

		(target.querySelector('[data-id="alpha"]') as HTMLElement).click();
		flushSync();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['alpha']);
		expect(pluginStub.viewService.clearSelection).toHaveBeenCalled();
		expect(pluginStub.viewService.select).toHaveBeenCalledWith(EXPLORER_ID, 'alpha', 'add');
		expect(pluginStub.viewService.setFocused).toHaveBeenCalledWith(EXPLORER_ID, 'alpha');
		expect(providerStub.handleNodeClick).not.toHaveBeenCalled();
	});

	it('can map primary node click to add-to-filter/provider activation from settings', () => {
		const { providerStub, selectionService } = renderPanel({
			nodeMouseActions: { primary: 'filter', secondary: 'open', tertiary: 'delete' },
		});

		(target.querySelector('[data-id="alpha"]') as HTMLElement).click();
		flushSync();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['alpha']);
		expect(providerStub.handleNodeClick).toHaveBeenCalledOnce();
		expect(providerStub.handleNodeClick).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'alpha' }),
		);
	});

	it('label click selects without running the provider secondary action', () => {
		const { providerStub, selectionService } = renderPanel();

		(target.querySelector('[data-id="beta"] .vm-tree-label') as HTMLElement).click();
		flushSync();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['beta']);
		expect(providerStub.handleNodeClick).not.toHaveBeenCalled();
	});

	it('label double click runs the provider secondary action', () => {
		const { providerStub, selectionService } = renderPanel();
		const label = target.querySelector('[data-id="beta"] .vm-tree-label') as HTMLElement;

		label.click();
		label.click();
		flushSync();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['beta']);
		expect(providerStub.handleNodeClick).toHaveBeenCalledOnce();
		expect(providerStub.handleNodeClick).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'beta' }),
		);
	});

	it('row surface double click runs the provider secondary action', () => {
		const { providerStub, selectionService } = renderPanel();
		const row = target.querySelector('[data-id="beta"]') as HTMLElement;

		row.click();
		row.click();
		flushSync();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['beta']);
		expect(providerStub.handleNodeClick).toHaveBeenCalledOnce();
		expect(providerStub.handleNodeClick).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'beta' }),
		);
	});

	it('Alt click routes the node tertiary action through delete conflict handling', () => {
		const { pluginStub, providerStub, selectionService } = renderPanel({
			provider: provider({ handleHoverBadge: vi.fn() }),
		});

		(target.querySelector('[data-id="beta"] .vm-tree-label') as HTMLElement).dispatchEvent(
			new MouseEvent('click', { bubbles: true, altKey: true }),
		);
		flushSync();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual([]);
		expect(pluginStub.queueService.requestDelete).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeId: 'beta',
				nodeLabel: 'Beta',
			}),
		);
		expect(providerStub.handleNodeClick).not.toHaveBeenCalled();
	});

	it('middle click routes the node tertiary action through delete conflict handling', () => {
		const { pluginStub, providerStub, selectionService } = renderPanel({
			provider: provider({ handleHoverBadge: vi.fn() }),
		});

		(target.querySelector('[data-id="beta"] .vm-tree-label') as HTMLElement).dispatchEvent(
			new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }),
		);
		flushSync();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual([]);
		expect(pluginStub.queueService.requestDelete).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeId: 'beta',
				nodeLabel: 'Beta',
			}),
		);
		expect(providerStub.handleNodeClick).not.toHaveBeenCalled();
	});

	it('outside document click clears node selection for the active explorer', () => {
		const { selectionService } = renderPanel();

		(target.querySelector('[data-id="alpha"]') as HTMLElement).click();
		flushSync();
		document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();

		const snapshot = selectionService.snapshot(EXPLORER_ID);
		expect([...snapshot.ids]).toEqual([]);
		expect(snapshot.anchorId).toBeNull();
		expect(snapshot.focusedId).toBeNull();
	});

	it('Escape clears node selection through the window handler', () => {
		const { selectionService } = renderPanel();

		(target.querySelector('[data-id="alpha"]') as HTMLElement).click();
		flushSync();
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		flushSync();

		const snapshot = selectionService.snapshot(EXPLORER_ID);
		expect([...snapshot.ids]).toEqual([]);
		expect(snapshot.anchorId).toBeNull();
		expect(snapshot.focusedId).toBeNull();
	});

	it('grid tile click selects provider tree nodes through the same node selection service', () => {
		const file = mockTFile('Notes/Alpha.md');
		const fileNode: TreeNode<FileMeta> = {
			id: file.path,
			label: file.basename,
			depth: 0,
			icon: 'lucide-file',
			meta: { file, isFolder: false, folderPath: 'Notes' },
		};
		const { pluginStub, selectionService } = renderPanel({
			viewMode: 'grid',
			provider: provider({
				id: 'files',
				getTree: vi.fn(() => [fileNode]),
				getFiles: vi.fn(() => []),
			}),
		});

		(target.querySelector('[data-id="Notes/Alpha.md"]') as HTMLElement).click();
		flushSync();

		expect([...selectionService.snapshot('files').ids]).toEqual(['Notes/Alpha.md']);
		expect(pluginStub.viewService.select).toHaveBeenCalledWith('files', 'Notes/Alpha.md', 'add');
		expect(pluginStub.filterService.setSelectedFiles).toHaveBeenCalledWith([file]);
	});

	it('files tree prune uses snapshot.visibleIds when a data-plane snapshot is present', () => {
		const selectionService = new NodeSelectionService();
		const pruneSpy = vi.spyOn(selectionService, 'prune');
		const { service } = snapshotHarness(makeFilesSnapshot(['snapshot-a.md', 'snapshot-b.md']));

		renderPanel({
			selectionService,
			explorerDataPlaneService: service,
			provider: provider({ id: 'files', getTree: vi.fn(() => nodes()) }),
		});

		expect(pruneSpy).toHaveBeenCalledWith('files', ['snapshot-a.md', 'snapshot-b.md']);
	});

	it('files tree prune reacts when the data-plane service publishes a snapshot', () => {
		const selectionService = new NodeSelectionService();
		const pruneSpy = vi.spyOn(selectionService, 'prune');
		const harness = snapshotHarness();

		renderPanel({
			selectionService,
			explorerDataPlaneService: harness.service,
			provider: provider({ id: 'files', getTree: vi.fn(() => nodes()) }),
		});

		expect(pruneSpy).toHaveBeenCalledWith('files', ['alpha', 'beta']);

		harness.publish(makeFilesSnapshot(['published-a.md']));
		flushSync();

		expect(pruneSpy).toHaveBeenCalledWith('files', ['published-a.md']);
	});

	it('files tree prune falls back to recursive visible ids when the service is absent', () => {
		const selectionService = new NodeSelectionService();
		const pruneSpy = vi.spyOn(selectionService, 'prune');

		renderPanel({
			selectionService,
			provider: provider({ id: 'files', getTree: vi.fn(() => nodes()) }),
		});

		expect(pruneSpy).toHaveBeenCalledWith('files', ['alpha', 'beta']);
	});

	it('non-files tree prune ignores files snapshots and keeps recursive visible ids', () => {
		const selectionService = new NodeSelectionService();
		const pruneSpy = vi.spyOn(selectionService, 'prune');
		const { service } = snapshotHarness(makeFilesSnapshot(['snapshot-a.md']));

		renderPanel({
			selectionService,
			explorerDataPlaneService: service,
			provider: provider({ id: 'tags', getTree: vi.fn(() => nodes()) }),
		});

		expect(pruneSpy).toHaveBeenCalledWith('tags', ['alpha', 'beta']);
		expect(pruneSpy).not.toHaveBeenCalledWith('tags', ['snapshot-a.md']);
	});

	it('grid mode reflects node ids already selected in the shared selection service', () => {
		const selectionService = new NodeSelectionService();
		selectionService.selectPointer(EXPLORER_ID, ['alpha', 'beta'], 'beta');

		renderPanel({ viewMode: 'grid', selectionService });

		expect(target.querySelector('[data-id="beta"]')?.getAttribute('aria-selected')).toBe('true');
		expect(target.querySelector('[data-id="alpha"]')?.getAttribute('aria-selected')).toBe('false');
	});

	it('table mode renders provider tree nodes instead of fallback copy', () => {
		renderPanel({ viewMode: 'table' });

		expect(target.querySelector('.vm-node-table')).not.toBeNull();
		expect(target.textContent).toContain('Alpha');
		expect(target.textContent).not.toContain('Table view not available');
	});

	it('table row click selects through the shared node selection service', () => {
		const { pluginStub, selectionService } = renderPanel({ viewMode: 'table' });

		(target.querySelector('[data-id="beta"]') as HTMLElement).click();
		flushSync();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['beta']);
		expect(pluginStub.viewService.select).toHaveBeenCalledWith(EXPLORER_ID, 'beta', 'add');
	});

	it('cards mode renders provider nodes and selects cards through the shared node selection service', () => {
		const { pluginStub, selectionService } = renderPanel({
			viewMode: 'cards',
			provider: provider({
				getTree: vi.fn(() => nodes()),
			}),
		});

		(target.querySelector('[data-id="beta"]') as HTMLElement).click();
		flushSync();

		expect(target.querySelector('.vm-node-cards')).not.toBeNull();
		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['beta']);
		expect(pluginStub.viewService.select).toHaveBeenCalledWith(EXPLORER_ID, 'beta', 'add');
	});

	it('table mode uses provider-specific property columns', () => {
		const propTree: TreeNode<PropMeta>[] = [
			{
				id: 'status',
				label: 'status',
				count: 3,
				depth: 0,
				meta: { propName: 'status', propType: 'list', isValueNode: false },
				children: [
					{
						id: 'status::draft',
						label: 'draft',
						count: 2,
						depth: 1,
						meta: {
							propName: 'status',
							propType: 'list',
							isValueNode: true,
							rawValue: 'draft',
						},
					},
				],
			},
		];

		renderPanel({
			viewMode: 'table',
			provider: provider({
				id: 'props',
				getTree: vi.fn(() => propTree),
			}),
		});

		expect(target.querySelector('[data-vm-table-header="nodeKind"]')?.textContent).toContain(
			'Kind',
		);
		expect(target.querySelector('[data-vm-table-header="propType"]')?.textContent).toContain(
			'Type',
		);
		expect(target.querySelector('[data-vm-table-cell="status:nodeKind"]')?.textContent).toContain(
			'Property',
		);
		expect(
			target.querySelector('[data-vm-table-cell="status::draft:nodeKind"]')?.textContent,
		).toContain('Value');
		expect(target.querySelector('[data-vm-table-cell="status:propType"]')?.textContent).toContain(
			'list',
		);
	});

	it('table context menu receives same-type selected nodes', () => {
		const providerStub = provider({
			getNodeType: vi.fn((node) => (node.id === 'alpha' || node.id === 'beta' ? 'file' : 'tag')),
		});
		const { selectionService } = renderPanel({ viewMode: 'table', provider: providerStub });
		selectionService.selectPointer(EXPLORER_ID, ['alpha', 'beta'], 'alpha');
		selectionService.selectPointer(EXPLORER_ID, ['alpha', 'beta'], 'beta', { additive: true });
		flushSync();

		(target.querySelector('[data-id="beta"]') as HTMLElement).dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true }),
		);

		expect(providerStub.handleContextMenu).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'beta' }),
			expect.any(MouseEvent),
			[expect.objectContaining({ id: 'alpha' }), expect.objectContaining({ id: 'beta' })],
		);
	});

	it('cards context menu receives same-type selected nodes', () => {
		const providerStub = provider({
			getNodeType: vi.fn((node) => (node.id === 'alpha' || node.id === 'beta' ? 'file' : 'tag')),
		});
		const { selectionService } = renderPanel({ viewMode: 'cards', provider: providerStub });
		selectionService.selectPointer(EXPLORER_ID, ['alpha', 'beta'], 'alpha');
		selectionService.selectPointer(EXPLORER_ID, ['alpha', 'beta'], 'beta', { additive: true });
		flushSync();

		(target.querySelector('[data-id="beta"]') as HTMLElement).dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true }),
		);

		expect(providerStub.handleContextMenu).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'beta' }),
			expect.any(MouseEvent),
			[expect.objectContaining({ id: 'alpha' }), expect.objectContaining({ id: 'beta' })],
		);
	});

	it('hover badge actions receive same-type selected nodes for box and multi-selection scopes', () => {
		const handleHoverBadge = vi.fn();
		const { selectionService } = renderPanel({
			provider: provider({ handleHoverBadge }),
		});

		(target.querySelector('[data-id="alpha"]') as HTMLElement).click();
		(target.querySelector('[data-id="beta"]') as HTMLElement).dispatchEvent(
			new MouseEvent('click', { bubbles: true, ctrlKey: true }),
		);
		flushSync();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['alpha', 'beta']);

		(target.querySelector('[data-id="beta"] [data-hover-kind="set"]') as HTMLElement).click();
		flushSync();

		expect(handleHoverBadge).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'beta' }),
			'set',
			[expect.objectContaining({ id: 'alpha' }), expect.objectContaining({ id: 'beta' })],
		);
	});

	it('grid folder mode shows root parents without flattening descendants', () => {
		renderPanel({
			viewMode: 'grid',
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
		});

		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();
		expect(target.querySelector('[data-id="sibling"]')).not.toBeNull();
		expect(target.querySelector('[data-id="child"]')).toBeNull();
	});

	it('grid inline mode shows root tiles with chevrons and expands children in place', () => {
		const providerStub = provider({ getTree: vi.fn(() => nestedNodes()) });
		renderPanel({
			viewMode: 'grid',
			gridHierarchyMode: 'inline',
			provider: providerStub,
		});

		expect(target.querySelector('.vm-grid-nav-toolbar')).toBeNull();
		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();
		expect(target.querySelector('[data-id="sibling"]')).not.toBeNull();
		expect(target.querySelector('[data-id="child"]')).toBeNull();

		(target.querySelector('[data-vm-node-grid-toggle="parent"]') as HTMLElement).click();
		flushSync();

		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();
		expect(target.querySelector('[data-id="sibling"]')).not.toBeNull();
		expect(target.querySelector('[data-vm-node-grid-inline-panel="parent"]')).not.toBeNull();
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();
		expect(providerStub.handleNodeClick).not.toHaveBeenCalled();
	});

	it('grid inline keyboard expands and collapses parent tiles without folder navigation', () => {
		renderPanel({
			viewMode: 'grid',
			gridHierarchyMode: 'inline',
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
		});

		const parent = target.querySelector('[data-id="parent"]') as HTMLElement;
		parent.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		flushSync();

		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('true');
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();

		parent.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
		flushSync();

		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('false');
		expect(target.querySelector('[data-id="child"]')).toBeNull();
	});

	it('grid folder mode opens parent tiles into their child nodes and keeps leaf activation', () => {
		const providerStub = provider({ getTree: vi.fn(() => nestedNodes()) });
		renderPanel({ viewMode: 'grid', provider: providerStub });

		const parentTile = target.querySelector('[data-id="parent"]') as HTMLElement;
		parentTile.click();
		parentTile.click();
		flushSync();

		expect(target.querySelector('[data-id="parent"]')).toBeNull();
		expect(target.querySelector('[data-id="sibling"]')).toBeNull();
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();
		expect(providerStub.handleNodeClick).not.toHaveBeenCalled();

		const childTile = target.querySelector('[data-id="child"]') as HTMLElement;
		childTile.click();
		childTile.click();
		flushSync();

		expect(providerStub.handleNodeClick).toHaveBeenCalledOnce();
		expect(providerStub.handleNodeClick).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'child' }),
		);
	});

	it('grid folder navigation toolbar supports up, back, forward, refresh, and root crumbs', () => {
		renderPanel({
			viewMode: 'grid',
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
		});

		expect(target.querySelector('.vm-grid-nav-toolbar')).not.toBeNull();
		const parentTile = target.querySelector('[data-id="parent"]') as HTMLElement;
		parentTile.click();
		parentTile.click();
		flushSync();
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();

		(target.querySelector('[data-vm-grid-nav="up"]') as HTMLButtonElement).click();
		flushSync();
		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();
		expect(target.querySelector('[data-id="child"]')).toBeNull();

		(target.querySelector('[data-vm-grid-nav="back"]') as HTMLButtonElement).click();
		flushSync();
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();

		(target.querySelector('[data-vm-grid-nav="forward"]') as HTMLButtonElement).click();
		flushSync();
		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();

		const parentTileAgain = target.querySelector('[data-id="parent"]') as HTMLElement;
		parentTileAgain.click();
		parentTileAgain.click();
		flushSync();
		(target.querySelector('[data-vm-grid-crumb="root"]') as HTMLButtonElement).click();
		flushSync();
		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();

		(target.querySelector('[data-vm-grid-nav="refresh"]') as HTMLButtonElement).click();
		flushSync();
		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();
	});

	it('grid folder keyboard navigation opens parents and moves through history', () => {
		renderPanel({
			viewMode: 'grid',
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
		});

		(target.querySelector('[data-id="parent"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
		);
		flushSync();
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();

		(target.querySelector('[data-id="child"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }),
		);
		flushSync();
		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();
		expect(target.querySelector('[data-id="child"]')).toBeNull();

		(target.querySelector('[data-id="parent"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
		);
		flushSync();
		(target.querySelector('[data-id="child"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true }),
		);
		flushSync();
		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();

		(target.querySelector('[data-id="parent"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true }),
		);
		flushSync();
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();
	});

	it('does not refresh provider trees from reactive ViewService decoration when selecting a row', () => {
		const selectionService = new NodeSelectionService();
		const viewService = new ViewService();
		const sourceNodes = nodes();
		let forbidSelectionRefresh = false;
		const providerStub = provider({
			getTree: vi.fn(() => {
				if (forbidSelectionRefresh) {
					throw new Error('provider tree refreshed from selection mirror');
				}
				const model = viewService.getModel({
					explorerId: EXPLORER_ID,
					mode: 'tree',
					nodes: sourceNodes,
				});
				return model.rows.map((row) => ({
					...row.node,
					cls: row.cls,
					meta: {
						layers: row.layers,
					},
				}));
			}),
		});
		const pluginStub = plugin(selectionService, viewService as unknown as IViewService);
		app = mount(PanelExplorer as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: pluginStub,
				provider: providerStub,
				viewMode: 'tree',
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		forbidSelectionRefresh = true;
		expect(() => {
			(target.querySelector('[data-id="alpha"]') as HTMLElement).click();
			flushSync();
		}).not.toThrow();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['alpha']);
		expect([
			...viewService.getModel({ explorerId: EXPLORER_ID, mode: 'tree', nodes: sourceNodes })
				.selection.ids,
		]).toEqual(['alpha']);
		expect(providerStub.getTree).toHaveBeenCalledTimes(1);
	});

	it('ArrowLeft on a child moves selection and focus to its parent, then collapses the parent', () => {
		const { selectionService } = renderPanel({
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
		});

		(target.querySelector('[data-id="child"]') as HTMLElement).click();
		flushSync();
		(target.querySelector('[data-id="child"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
		);
		flushSync();

		let snapshot = selectionService.snapshot(EXPLORER_ID);
		expect([...snapshot.ids]).toEqual(['parent']);
		expect(snapshot.focusedId).toBe('parent');
		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('true');

		(target.querySelector('[data-id="parent"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
		);
		flushSync();

		snapshot = selectionService.snapshot(EXPLORER_ID);
		expect([...snapshot.ids]).toEqual(['parent']);
		expect(snapshot.focusedId).toBe('parent');
		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('false');
		expect(target.querySelector('[data-id="child"]')).toBeNull();
	});

	it('ArrowRight on a collapsed parent expands it without activating the provider', () => {
		const providerStub = provider({ getTree: vi.fn(() => largeNestedNodes()) });
		const { selectionService } = renderPanel({ provider: providerStub });
		const parent = target.querySelector('[data-id="parent"]') as HTMLElement;

		expect(parent.getAttribute('aria-expanded')).toBe('false');
		expect(target.querySelector('[data-id="child"]')).toBeNull();

		parent.click();
		flushSync();
		parent.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		flushSync();

		expect(selectionService.snapshot(EXPLORER_ID).focusedId).toBe('parent');
		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('true');
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();
		expect(providerStub.handleNodeClick).not.toHaveBeenCalled();
	});

	it('ArrowLeft uses the keyboard-focused node even when DOM focus is still on the previous row', () => {
		const { selectionService } = renderPanel({
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
		});
		const parent = target.querySelector('[data-id="parent"]') as HTMLElement;

		parent.click();
		flushSync();
		parent.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		flushSync();

		expect(selectionService.snapshot(EXPLORER_ID).focusedId).toBe('child');

		parent.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
		flushSync();

		const snapshot = selectionService.snapshot(EXPLORER_ID);
		expect([...snapshot.ids]).toEqual(['parent']);
		expect(snapshot.focusedId).toBe('parent');
		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('true');
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();
	});

	it('ArrowRight on a leaf preserves selection without activating the provider', () => {
		const providerStub = provider();
		const { selectionService } = renderPanel({ provider: providerStub });

		(target.querySelector('[data-id="alpha"]') as HTMLElement).click();
		flushSync();
		(target.querySelector('[data-id="alpha"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
		);
		flushSync();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['alpha']);
		expect(selectionService.snapshot(EXPLORER_ID).focusedId).toBe('alpha');
		expect(providerStub.handleNodeClick).not.toHaveBeenCalled();
	});

	it('PageDown and PageUp move keyboard focus instead of scrolling once a node is active', () => {
		const { selectionService } = renderPanel();
		const alpha = target.querySelector('[data-id="alpha"]') as HTMLElement;

		alpha.click();
		flushSync();

		const down = new KeyboardEvent('keydown', {
			key: 'PageDown',
			bubbles: true,
			cancelable: true,
		});
		alpha.dispatchEvent(down);
		flushSync();

		expect(down.defaultPrevented).toBe(true);
		expect(selectionService.snapshot(EXPLORER_ID).focusedId).toBe('beta');

		const up = new KeyboardEvent('keydown', {
			key: 'PageUp',
			bubbles: true,
			cancelable: true,
		});
		alpha.dispatchEvent(up);
		flushSync();

		expect(up.defaultPrevented).toBe(true);
		expect(selectionService.snapshot(EXPLORER_ID).focusedId).toBe('alpha');
	});

	it('PageDown scrolls the virtual tree to keep the new keyboard selection visible', () => {
		const { selectionService } = renderPanel({
			provider: provider({ getTree: vi.fn(() => manyFlatNodes()) }),
		});
		const outer = target.querySelector('.vm-tree-virtual-outer') as HTMLElement;
		Object.defineProperty(outer, 'clientHeight', { value: 96, configurable: true });
		const first = target.querySelector('[data-id="node-0"]') as HTMLElement;

		first.click();
		flushSync();
		const down = new KeyboardEvent('keydown', {
			key: 'PageDown',
			bubbles: true,
			cancelable: true,
		});
		first.dispatchEvent(down);
		flushSync();

		expect(down.defaultPrevented).toBe(true);
		expect(selectionService.snapshot(EXPLORER_ID).focusedId).toBe('node-10');
		expect(outer.scrollTop).toBeGreaterThan(0);
	});

	it('PageDown keeps native scroll behavior when no node is active', () => {
		renderPanel();
		const alpha = target.querySelector('[data-id="alpha"]') as HTMLElement;
		const down = new KeyboardEvent('keydown', {
			key: 'PageDown',
			bubbles: true,
			cancelable: true,
		});

		alpha.dispatchEvent(down);
		flushSync();

		expect(down.defaultPrevented).toBe(false);
	});

	it('collapses all expanded parent nodes from a generic expansion command', () => {
		renderPanel({
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
			nodeExpansionCommand: { serial: 1, action: 'collapse-all' },
		});

		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('false');
		expect(target.querySelector('[data-id="child"]')).toBeNull();
	});

	it('expands all parent nodes from a generic expansion command', () => {
		renderPanel({
			provider: provider({ getTree: vi.fn(() => largeNestedNodes()) }),
			nodeExpansionCommand: { serial: 1, action: 'expand-all' },
		});

		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('true');
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();
	});

	it('reports whether the active explorer can toggle parent expansion', () => {
		const onNodeExpansionSummaryChange = vi.fn();

		renderPanel({
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
			onNodeExpansionSummaryChange,
		});

		expect(onNodeExpansionSummaryChange).toHaveBeenLastCalledWith({
			canToggle: true,
			hasExpandedParents: true,
		});
	});
});
