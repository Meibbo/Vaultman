import { describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import { mockApp, mockTFile, type CachedMetadata, type TFile } from '../../helpers/obsidian-mocks';
import { explorerProps } from '../../../src/components/containers/explorerProps';
import { DecorationManager } from '../../../src/services/serviceDecorate';
import { ViewService } from '../../../src/services/serviceViews.svelte';
import { showInputModal } from '../../../src/utils/inputModal';
import type { VaultmanPlugin } from '../../../src/main';
import type {
	ActiveFilterEntry,
	IPropsIndex,
	PropNode,
	QueueChange,
} from '../../../src/types/typeContracts';

vi.mock('../../../src/utils/inputModal', () => ({
	showInputModal: vi.fn(),
}));

function makePropsIndex(app: App, subscribe = vi.fn(() => vi.fn())): IPropsIndex {
	const nodes = propsNodesFromApp(app);
	return {
		nodes,
		revision: 1,
		refresh: vi.fn(),
		subscribe,
		byId: (id: string) => nodes.find((node) => node.id === id),
	};
}

function propsNodesFromApp(app: App): PropNode[] {
	const acc = new Map<string, { values: Map<string, number>; files: Set<string> }>();
	for (const file of app.vault.getMarkdownFiles()) {
		const fm = app.metadataCache.getFileCache(file)?.frontmatter;
		if (!fm) continue;
		for (const [property, value] of Object.entries(fm)) {
			if (property === 'position') continue;
			let entry = acc.get(property);
			if (!entry) {
				entry = { values: new Map(), files: new Set() };
				acc.set(property, entry);
			}
			entry.files.add(file.path);
			for (const raw of Array.isArray(value) ? value : [value]) {
				if (raw == null) continue;
				const key = propValueKey(raw);
				entry.values.set(key, (entry.values.get(key) ?? 0) + 1);
			}
		}
	}
	return Array.from(acc.entries()).map(([property, entry]) => ({
		id: property,
		property,
		values: Array.from(entry.values.keys()),
		valueFrequencies: Object.fromEntries(entry.values),
		fileCount: entry.files.size,
	}));
}

function propValueKey(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return value.toString();
	}
	return JSON.stringify(value) ?? '';
}

function makePlugin(overrides: Partial<VaultmanPlugin> = {}): VaultmanPlugin {
	const a = mockTFile('a.md', { frontmatter: { status: 'draft', owner: 'vic' } });
	const b = mockTFile('b.md', { frontmatter: { status: 'done' } });
	const files = [a, b] as TFile[];
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { status: 'draft', owner: 'vic' } }],
		[b.path, { frontmatter: { status: 'done' } }],
	]);
	const app = mockApp({ files, metadata: meta });
	(
		app.metadataCache as unknown as { getAllPropertyInfos: () => Record<string, { type: string }> }
	).getAllPropertyInfos = () => ({
		status: { type: 'text' },
		owner: { type: 'text' },
	});

	const decorationManager = new DecorationManager(app);
	const addNode = vi.fn();
	const removeNodeByProperty = vi.fn();
	const pluginApp = overrides.app ?? app;
	return {
		app: pluginApp,
		contextMenuService: { registerAction: vi.fn() },
		queueService: { queue: [], add: vi.fn() },
		operationsIndex: { nodes: [], refresh: vi.fn(), subscribe: vi.fn(), byId: vi.fn() },
		activeFiltersIndex: { nodes: [], refresh: vi.fn(), subscribe: vi.fn(), byId: vi.fn() },
		filterService: {
			filteredFiles: files,
			addNode,
			removeNodeByProperty,
			hasPropFilter: vi.fn(() => false),
			hasValueFilter: vi.fn(() => false),
		},
		decorationManager,
		viewService: new ViewService({ decorationManager }),
		iconicService: { getIcon: vi.fn(() => null) },
		propsIndex: makePropsIndex(pluginApp),
		...overrides,
	} as unknown as VaultmanPlugin;
}

describe('explorerProps search', () => {
	it('starts a prop rename handoff from the registered context menu action', async () => {
		vi.mocked(showInputModal).mockClear();
		const startRenameHandoff = vi.fn();
		const plugin = makePlugin();
		const explorer = new explorerProps(plugin, { startRenameHandoff });
		const statusNode = explorer.getTree().find((node) => node.id === 'status');
		const renameAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'prop.rename')?.[0];

		await renameAction.run({ nodeType: 'prop', node: statusNode, surface: 'panel' });

		expect(showInputModal).not.toHaveBeenCalled();
		expect(startRenameHandoff).toHaveBeenCalledOnce();
		expect(startRenameHandoff.mock.calls[0][0]).toMatchObject({
			status: 'editing',
			sourceKind: 'prop',
			original: 'status',
			propName: 'status',
			files: plugin.app.vault.getMarkdownFiles(),
			scope: 'filtered',
		});
	});

	it('starts a value rename handoff from the registered context menu action', async () => {
		vi.mocked(showInputModal).mockClear();
		const startRenameHandoff = vi.fn();
		const plugin = makePlugin();
		const explorer = new explorerProps(plugin, { startRenameHandoff });
		const valueNode = explorer
			.getTree()
			.find((node) => node.id === 'status')
			?.children?.find((node) => node.label === 'draft');
		const renameAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'value.rename')?.[0];

		await renameAction.run({ nodeType: 'value', node: valueNode, surface: 'panel' });

		expect(showInputModal).not.toHaveBeenCalled();
		expect(startRenameHandoff).toHaveBeenCalledOnce();
		expect(startRenameHandoff.mock.calls[0][0]).toMatchObject({
			status: 'editing',
			sourceKind: 'value',
			original: 'draft',
			propName: 'status',
			oldValue: 'draft',
			files: [plugin.app.vault.getMarkdownFiles()[0]],
			scope: 'filtered',
		});
	});

	it('filters property nodes by the shared filter search term', () => {
		const explorer = new explorerProps(makePlugin());

		explorer.setSearchTerm('owner', 'all');
		const tree = explorer.getTree();

		expect(tree.map((node) => node.id)).toEqual(['owner']);
		expect(tree[0].highlights).toEqual([{ start: 0, end: 5 }]);
	});

	it('filters value nodes when search mode is leaf', () => {
		const explorer = new explorerProps(makePlugin());

		explorer.setSearchTerm('draft', 'leaf');
		const tree = explorer.getTree();

		expect(tree.map((node) => node.id)).toEqual(['status']);
		expect(tree[0].children?.map((node) => node.label)).toEqual(['draft']);
	});

	it('does not project active filter layers onto matching value nodes by default', () => {
		const activeFilters: ActiveFilterEntry[] = [
			{
				id: 'filter-status-draft',
				kind: 'rule',
				rule: {
					id: 'filter-status-draft',
					type: 'rule',
					filterType: 'specific_value',
					property: 'status',
					values: ['draft'],
				},
			},
		];
		const plugin = makePlugin({
			activeFiltersIndex: {
				nodes: activeFilters,
				refresh: vi.fn(),
				subscribe: vi.fn(),
				byId: vi.fn(),
			},
			operationsIndex: {
				nodes: [] as QueueChange[],
				refresh: vi.fn(),
				subscribe: vi.fn(),
				byId: vi.fn(),
			},
		});
		const explorer = new explorerProps(plugin);

		const tree = explorer.getTree();
		const valueNode = tree
			.find((node) => node.id === 'status')
			?.children?.find((node) => node.label === 'draft');

		expect(valueNode?.cls).not.toContain('is-active-filter');
		expect(valueNode?.badges ?? []).not.toContainEqual(
			expect.objectContaining({
				text: 'specific value',
				icon: 'lucide-filter',
				color: 'blue',
			}),
		);
		expect(valueNode?.highlights).toBeUndefined();
	});

	it('projects active filter layers onto matching value nodes when enabled', () => {
		const activeFilters: ActiveFilterEntry[] = [
			{
				id: 'filter-status-draft',
				kind: 'rule',
				rule: {
					id: 'filter-status-draft',
					type: 'rule',
					filterType: 'specific_value',
					property: 'status',
					values: ['draft'],
				},
			},
		];
		const plugin = makePlugin({
			activeFiltersIndex: {
				nodes: activeFilters,
				refresh: vi.fn(),
				subscribe: vi.fn(),
				byId: vi.fn(),
			},
			operationsIndex: {
				nodes: [] as QueueChange[],
				refresh: vi.fn(),
				subscribe: vi.fn(),
				byId: vi.fn(),
			},
		});
		plugin.viewService = new ViewService({
			decorationManager: plugin.decorationManager,
			showMatchedFilterDecorations: () => true,
		});
		const explorer = new explorerProps(plugin);

		const tree = explorer.getTree();
		const valueNode = tree
			.find((node) => node.id === 'status')
			?.children?.find((node) => node.label === 'draft');

		expect(valueNode?.cls).toContain('is-active-filter');
		expect(valueNode?.badges).toContainEqual(
			expect.objectContaining({
				text: 'specific value',
				icon: 'lucide-filter',
				color: 'blue',
			}),
		);
		expect(valueNode?.highlights).toEqual([{ start: 0, end: 5 }]);
	});

	it('queues value deletion for list values without rewriting unrelated properties', () => {
		const file = mockTFile('list.md', {
			frontmatter: { tags: ['project', 'archive'], owner: 'vic' },
		});
		const files = [file] as TFile[];
		const meta = new Map<string, CachedMetadata>([
			[file.path, { frontmatter: { tags: ['project', 'archive'], owner: 'vic' } }],
		]);
		const app = mockApp({ files, metadata: meta });
		(
			app.metadataCache as unknown as {
				getAllPropertyInfos: () => Record<string, { type: string }>;
			}
		).getAllPropertyInfos = () => ({
			tags: { type: 'list' },
			owner: { type: 'text' },
		});
		const decorationManager = new DecorationManager(app);
		const add = vi.fn();
		const plugin = makePlugin({
			app,
			queueService: { queue: [], add },
			filterService: { filteredFiles: files, addNode: vi.fn() },
			decorationManager,
			viewService: new ViewService({ decorationManager }),
		});
		const explorer = new explorerProps(plugin);
		const valueNode = explorer
			.getTree()
			.find((node) => node.id === 'tags')
			?.children?.find((node) => node.label === 'project');
		expect(valueNode).toBeTruthy();

		explorer.handleContextMenu = vi.fn();
		// Invoke the registered action directly through the context menu mock.
		const deleteAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'value.delete')?.[0];
		deleteAction.run({ node: valueNode });

		expect(add).toHaveBeenCalledOnce();
		const change = add.mock.calls[0][0];
		expect(change.files).toEqual([file]);
		expect(change.logicFunc(file, { tags: ['project', 'archive'], owner: 'vic' })).toEqual({
			tags: ['archive'],
		});
		expect(change.logicFunc(file, { tags: ['archive'], owner: 'vic' })).toBeNull();
	});

	it('applies property delete context menu action to selected property nodes', () => {
		const plugin = makePlugin();
		const explorer = new explorerProps(plugin);
		const tree = explorer.getTree();
		const statusNode = tree.find((node) => node.id === 'status');
		const ownerNode = tree.find((node) => node.id === 'owner');
		const deleteAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'prop.delete')?.[0];

		deleteAction.run({
			nodeType: 'prop',
			node: statusNode,
			selectedNodes: [statusNode, ownerNode],
			surface: 'panel',
		});

		expect(plugin.queueService.add).toHaveBeenCalledTimes(2);
		expect(
			(plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls.map(
				([change]) => change.property,
			),
		).toEqual(['status', 'owner']);
	});

	it('applies property type changes to selected property nodes', () => {
		const plugin = makePlugin();
		const explorer = new explorerProps(plugin);
		const tree = explorer.getTree();
		const statusNode = tree.find((node) => node.id === 'status');
		const ownerNode = tree.find((node) => node.id === 'owner');
		const typeAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'prop.type-number')?.[0];

		typeAction.run({
			nodeType: 'prop',
			node: statusNode,
			selectedNodes: [statusNode, ownerNode],
			surface: 'panel',
		});

		expect(plugin.queueService.add).toHaveBeenCalledTimes(2);
		expect(
			(plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls.map(
				([change]) => [change.property, change.action],
			),
		).toEqual([
			['status', 'change_type'],
			['owner', 'change_type'],
		]);
	});

	it('applies value delete context menu action to selected value nodes', () => {
		const plugin = makePlugin();
		const explorer = new explorerProps(plugin);
		const statusValues =
			explorer.getTree().find((node) => node.id === 'status')?.children ?? [];
		const draftNode = statusValues.find((node) => node.label === 'draft');
		const doneNode = statusValues.find((node) => node.label === 'done');
		const deleteAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'value.delete')?.[0];

		deleteAction.run({
			nodeType: 'value',
			node: draftNode,
			selectedNodes: [draftNode, doneNode],
			surface: 'panel',
		});

		expect(plugin.queueService.add).toHaveBeenCalledTimes(2);
		expect(
			(plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls.map(
				([change]) => change.details,
			),
		).toEqual(['Delete value "draft" from "status"', 'Delete value "done" from "status"']);
	});

	it('adds an add-mode quick-action badge that queues a property add operation', () => {
		const plugin = makePlugin();
		const explorer = new explorerProps(plugin);
		explorer.setAddMode(true);

		const ownerNode = explorer.getTree().find((node) => node.id === 'owner');
		const addBadge = ownerNode?.badges?.find(
			(badge) => badge.quickAction && badge.icon === 'lucide-plus',
		);

		expect(addBadge).toBeTruthy();
		addBadge?.onClick?.();

		expect(plugin.queueService.add).toHaveBeenCalledOnce();
		expect((plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
			type: 'property',
			property: 'owner',
			action: 'add',
		});
	});

	it('routes set hover badges for prop and value nodes', () => {
		const openPropSetIsland = vi.fn();
		const plugin = makePlugin();
		const explorer = new explorerProps(plugin, { openPropSetIsland }) as explorerProps & {
			handleHoverBadge?: (node: ReturnType<explorerProps['getTree']>[number], kind: string) => void;
		};
		const statusNode = explorer.getTree().find((node) => node.id === 'status');
		const draftNode = statusNode?.children?.find((node) => node.label === 'draft');

		expect(statusNode).toBeTruthy();
		expect(draftNode).toBeTruthy();
		expect(typeof explorer.handleHoverBadge).toBe('function');

		explorer.handleHoverBadge?.(statusNode!, 'set');
		explorer.handleHoverBadge?.(draftNode!, 'set');

		expect(openPropSetIsland).toHaveBeenCalledWith('status');
		expect(plugin.queueService.add).toHaveBeenCalledOnce();
		const change = (plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(change).toMatchObject({
			type: 'property',
			action: 'set',
			property: 'status',
			value: 'draft',
		});
	});

	it('routes the secondary action to content search for prop and value nodes', () => {
		const openContentSearchHook = vi.fn();
		const plugin = makePlugin({ openContentSearchHook } as Partial<VaultmanPlugin>);
		const explorer = new explorerProps(plugin);
		const statusNode = explorer.getTree().find((node) => node.id === 'status');
		const draftNode = statusNode?.children?.find((node) => node.label === 'draft');

		explorer.handleNodeSecondaryAction?.(statusNode!);
		explorer.handleNodeSecondaryAction?.(draftNode!);

		expect(openContentSearchHook).toHaveBeenNthCalledWith(1, 'status');
		expect(openContentSearchHook).toHaveBeenNthCalledWith(2, 'draft');
	});

	it('queues ctxmenu delete for properties whose indexed name casing differs from frontmatter', () => {
		const file = mockTFile('bench.md', { frontmatter: { pressBarBench: 1820 } });
		const files = [file] as TFile[];
		const meta = new Map<string, CachedMetadata>([
			[file.path, { frontmatter: { pressBarBench: 1820 } }],
		]);
		const app = mockApp({ files, metadata: meta });
		(
			app.metadataCache as unknown as {
				getAllPropertyInfos: () => Record<string, { type: string }>;
			}
		).getAllPropertyInfos = () => ({
			pressbarbench: { type: 'number' },
		});
		const decorationManager = new DecorationManager(app);
		const add = vi.fn();
		const plugin = makePlugin({
			app,
			queueService: { queue: [], add },
			filterService: { filteredFiles: files, addNode: vi.fn() },
			decorationManager,
			viewService: new ViewService({ decorationManager }),
		});
		const explorer = new explorerProps(plugin);
		const propNode = explorer.getTree().find((node) => node.label === 'pressBarBench');
		const deleteAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'prop.delete')?.[0];

		deleteAction.run({ nodeType: 'prop', node: propNode, surface: 'panel' });

		expect(add).toHaveBeenCalledOnce();
		const change = add.mock.calls[0][0];
		expect(change.files).toEqual([file]);
		expect(change.logicFunc(file, { pressBarBench: 1820 })).toEqual({
			_DELETE_PROP: 'pressBarBench',
		});
	});

	it('rebuilds property tree after Obsidian metadata changes outside the provider', () => {
		const file = mockTFile('stale.md', { frontmatter: { pressBarBench: 1820 } });
		const files = [file] as TFile[];
		const meta = new Map<string, CachedMetadata>([
			[file.path, { frontmatter: { pressBarBench: 1820 } }],
		]);
		let propertyInfos: Record<string, { type: string }> = {
			pressbarbench: { type: 'number' },
		};
		const app = mockApp({ files, metadata: meta });
		(
			app.metadataCache as unknown as {
				getAllPropertyInfos: () => Record<string, { type: string }>;
			}
		).getAllPropertyInfos = () => propertyInfos;
		const decorationManager = new DecorationManager(app);
		let notifyPropsChanged: (() => void) | undefined;
		let propsNodes = propsNodesFromApp(app);
		let revision = 1;
		const explorer = new explorerProps(
			makePlugin({
				app,
				propsIndex: {
					get nodes() {
						return propsNodes;
					},
					get revision() {
						return revision;
					},
					refresh: vi.fn(),
					subscribe: vi.fn((callback: () => void) => {
						notifyPropsChanged = callback;
						return vi.fn();
					}),
					byId: (id: string) => propsNodes.find((node) => node.id === id),
				},
				filterService: { filteredFiles: files, addNode: vi.fn() },
				decorationManager,
				viewService: new ViewService({ decorationManager }),
			}),
		);

		expect(explorer.getTree().map((node) => node.label)).toEqual(['pressBarBench']);

		meta.set(file.path, { frontmatter: {} });
		propertyInfos = {
			pressbarbench: { type: 'number' },
		};
		propsNodes = propsNodesFromApp(app);
		revision += 1;
		notifyPropsChanged?.();

		expect(explorer.getTree().map((node) => node.label)).toEqual([]);
	});

	it('toggles property and value filters instead of adding duplicates', () => {
		const addNode = vi.fn();
		const removeNodeByProperty = vi.fn();
		const plugin = makePlugin({
			filterService: {
				filteredFiles: [],
				addNode,
				removeNodeByProperty,
				hasPropFilter: vi.fn((prop: string) => prop === 'status'),
				hasValueFilter: vi.fn((prop: string, value: string) => prop === 'owner' && value === 'vic'),
			},
		});
		const explorer = new explorerProps(plugin);
		const tree = explorer.getTree();
		const statusNode = tree.find((node) => node.label === 'status');
		const ownerValueNode = tree
			.find((node) => node.label === 'owner')
			?.children?.find((node) => node.label === 'vic');
		const doneValueNode = tree
			.find((node) => node.label === 'status')
			?.children?.find((node) => node.label === 'done');

		explorer.handleNodeClick(statusNode!);
		explorer.handleNodeClick(ownerValueNode!);
		explorer.handleNodeClick(doneValueNode!);

		expect(removeNodeByProperty).toHaveBeenCalledWith('status');
		expect(removeNodeByProperty).toHaveBeenCalledWith('owner', 'vic');
		expect(addNode).toHaveBeenCalledTimes(1);
		expect(addNode).toHaveBeenCalledWith(
			expect.objectContaining({
				filterType: 'specific_value',
				property: 'status',
				values: ['done'],
			}),
		);
	});

	it('can sort child value rows without reordering top-level properties', () => {
		const explorer = new explorerProps(makePlugin());

		explorer.setSortBy('name', 'asc');
		explorer.setSortTarget('children');
		const tree = explorer.getTree();

		expect(tree.map((node) => node.id)).toEqual(['status', 'owner']);
		expect(tree.find((node) => node.id === 'status')?.children?.map((node) => node.label)).toEqual([
			'done',
			'draft',
		]);
	});
});
