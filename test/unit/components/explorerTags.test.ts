import { describe, expect, it, vi } from 'vitest';
import { mockApp, mockTFile, type CachedMetadata, type TFile } from '../../helpers/obsidian-mocks';
import { explorerTags } from '../../../src/components/containers/explorerTags';
import { DecorationManager } from '../../../src/services/serviceDecorate';
import { ViewService } from '../../../src/services/serviceViews.svelte';
import { showInputModal } from '../../../src/utils/inputModal';
import type { VaultmanPlugin } from '../../../src/main';
import type { ActiveFilterEntry, QueueChange } from '../../../src/types/typeContracts';
import type { FnRRenameHandoff } from '../../../src/types/typeFnR';

vi.mock('../../../src/utils/inputModal', () => ({
	showInputModal: vi.fn(),
}));

function makePlugin(
	activeFilters: ActiveFilterEntry[] = [],
	tags: string[] = ['project'],
): VaultmanPlugin {
	const file = mockTFile('a.md', { frontmatter: { tags } });
	const files = [file] as TFile[];
	const meta = new Map<string, CachedMetadata>([[file.path, { frontmatter: { tags } }]]);
	const app = mockApp({ files, metadata: meta });
	(app.metadataCache as unknown as { getTags: () => Record<string, number> }).getTags = () =>
		Object.fromEntries(tags.map((tag) => [`#${tag}`, 1]));
	const decorationManager = new DecorationManager(app);

	return {
		app,
		contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
		queueService: { queue: [], add: vi.fn() },
		tagsIndex: { refresh: vi.fn(), subscribe: vi.fn(() => vi.fn()), byId: vi.fn() },
		operationsIndex: {
			nodes: [] as QueueChange[],
			refresh: vi.fn(),
			subscribe: vi.fn(),
			byId: vi.fn(),
		},
		activeFiltersIndex: {
			nodes: activeFilters,
			refresh: vi.fn(),
			subscribe: vi.fn(),
			byId: vi.fn(),
		},
		filterService: {
			filteredFiles: files,
			hasTagFilter: vi.fn(() => true),
			removeNodeByTag: vi.fn(),
			addNode: vi.fn(),
		},
		decorationManager,
		viewService: new ViewService({
			decorationManager,
			showMatchedFilterDecorations: () => activeFilters.length > 0,
		}),
		iconicService: { getTagIcon: vi.fn(() => null) },
	} as unknown as VaultmanPlugin;
}

describe('explorerTags', () => {
	it('projects active tag filters from ViewService onto matching tag rows', () => {
		const explorer = new explorerTags(
			makePlugin([
				{
					id: 'filter-project',
					kind: 'rule',
					rule: {
						id: 'filter-project',
						type: 'rule',
						filterType: 'has_tag',
						property: '',
						values: ['#project'],
					},
				},
			]),
		);

		const tree = explorer.getTree();

		expect(tree[0].cls).toContain('is-active-filter');
		expect(tree[0].badges).toContainEqual(
			expect.objectContaining({
				text: 'has tag',
				icon: 'lucide-filter',
				color: 'blue',
			}),
		);
		expect(tree[0].highlights).toEqual([{ start: 0, end: 7 }]);
	});

	it('queues tag deletion instead of editing files immediately', async () => {
		const plugin = makePlugin([], ['project', 'archive']);
		const explorer = new explorerTags(plugin);
		const projectNode = explorer.getTree().find((node) => node.meta.tagPath === 'project');
		const deleteAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'tag.delete')?.[0];

		await deleteAction.run({ node: projectNode });

		expect(plugin.queueService.add).toHaveBeenCalledOnce();
		const change = (plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(change.type).toBe('tag');
		expect(change.action).toBe('delete');
		expect(change.files).toEqual(plugin.app.vault.getMarkdownFiles());
		expect(
			change.logicFunc(plugin.app.vault.getMarkdownFiles()[0], { tags: ['project', 'archive'] }),
		).toEqual({
			tags: ['archive'],
		});
	});

	it('starts a tag rename handoff from the registered context menu action', async () => {
		const plugin = makePlugin([], ['project', 'archive']);
		const startRenameHandoff = vi.fn<(handoff: FnRRenameHandoff) => void>();
		const explorer = new explorerTags(plugin, { startRenameHandoff });
		const projectNode = explorer.getTree().find((node) => node.meta.tagPath === 'project');
		const renameAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'tag.rename')?.[0];

		expect(projectNode).toBeTruthy();
		expect(renameAction).toBeTruthy();

		await renameAction.run({
			nodeType: 'tag',
			node: projectNode,
			surface: 'panel',
		});

		expect(showInputModal).not.toHaveBeenCalled();
		expect(plugin.queueService.add).not.toHaveBeenCalled();
		expect(startRenameHandoff).toHaveBeenCalledWith({
			status: 'editing',
			sourceKind: 'tag',
			original: 'project',
			replacement: '',
			files: plugin.app.vault.getMarkdownFiles(),
			scope: 'filtered',
		});
	});

	it('direct tag action still toggles the tag filter', () => {
		const plugin = makePlugin([], ['project']);
		const explorer = new explorerTags(plugin);
		const projectNode = explorer.getTree().find((node) => node.meta.tagPath === 'project');

		explorer.handleNodeClick(projectNode!);

		expect(plugin.filterService.removeNodeByTag).toHaveBeenCalledWith('#project');
		expect(plugin.filterService.addNode).not.toHaveBeenCalled();
	});

	it('applies tag delete context menu action to selected tag nodes', async () => {
		const plugin = makePlugin([], ['project', 'archive']);
		const explorer = new explorerTags(plugin);
		const tree = explorer.getTree();
		const projectNode = tree.find((node) => node.meta.tagPath === 'project');
		const archiveNode = tree.find((node) => node.meta.tagPath === 'archive');
		const deleteAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'tag.delete')?.[0];

		await deleteAction.run({
			nodeType: 'tag',
			node: projectNode,
			selectedNodes: [projectNode, archiveNode],
			surface: 'panel',
		});

		expect(plugin.queueService.add).toHaveBeenCalledTimes(2);
		expect(
			(plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls.map(
				([change]) => change.tag,
			),
		).toEqual(['project', 'archive']);
	});

	it('adds an add-mode quick-action badge that queues a tag add operation', () => {
		const plugin = makePlugin([], ['project']);
		const explorer = new explorerTags(plugin);
		explorer.setAddMode(true);

		const projectNode = explorer.getTree().find((node) => node.meta.tagPath === 'project');
		const addBadge = projectNode?.badges?.find(
			(badge) => badge.quickAction && badge.icon === 'lucide-plus',
		);

		expect(addBadge).toBeTruthy();
		addBadge?.onClick?.();

		expect(plugin.queueService.add).toHaveBeenCalledOnce();
		const change = (plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(change).toMatchObject({
			type: 'tag',
			action: 'add',
			tag: 'project',
			files: plugin.app.vault.getMarkdownFiles(),
		});
	});

	it('routes set and delete hover badges to tag queue operations', () => {
		const plugin = makePlugin([], ['project', 'archive']);
		const explorer = new explorerTags(plugin) as explorerTags & {
			handleHoverBadge?: (node: ReturnType<explorerTags['getTree']>[number], kind: string) => void;
		};
		const projectNode = explorer.getTree().find((node) => node.meta.tagPath === 'project');

		expect(projectNode).toBeTruthy();
		expect(typeof explorer.handleHoverBadge).toBe('function');

		explorer.handleHoverBadge?.(projectNode!, 'set');
		explorer.handleHoverBadge?.(projectNode!, 'delete');

		expect(plugin.queueService.add).toHaveBeenCalledTimes(2);
		expect(
			(plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls.map(
				([change]) => change.action,
			),
		).toEqual(['add', 'delete']);
	});

	it('routes the secondary action to content search for tag nodes', () => {
		const openContentSearchHook = vi.fn();
		const plugin = makePlugin([], ['project']);
		(plugin as VaultmanPlugin & { openContentSearchHook?: (term: string) => void }).openContentSearchHook =
			openContentSearchHook;
		const explorer = new explorerTags(plugin);
		const projectNode = explorer.getTree().find((node) => node.meta.tagPath === 'project');

		explorer.handleNodeSecondaryAction?.(projectNode!);

		expect(openContentSearchHook).toHaveBeenCalledWith('#project');
	});

	it('rebuilds tag tree after Obsidian metadata changes outside the provider', () => {
		const file = mockTFile('tagged.md', { frontmatter: { tags: ['project'] } });
		const files = [file] as TFile[];
		const meta = new Map<string, CachedMetadata>([
			[file.path, { frontmatter: { tags: ['project'] } }],
		]);
		let tagInfos: Record<string, number> = { '#project': 1 };
		const app = mockApp({ files, metadata: meta });
		(app.metadataCache as unknown as { getTags: () => Record<string, number> }).getTags = () =>
			tagInfos;
		const decorationManager = new DecorationManager(app);
		let notifyTagsChanged: (() => void) | undefined;
		const plugin = makePlugin();
		Object.assign(plugin, {
			app,
			tagsIndex: {
				refresh: vi.fn(),
				subscribe: vi.fn((callback: () => void) => {
					notifyTagsChanged = callback;
					return vi.fn();
				}),
				byId: vi.fn(),
			},
			filterService: {
				filteredFiles: files,
				hasTagFilter: vi.fn(() => false),
				removeNodeByTag: vi.fn(),
				addNode: vi.fn(),
			},
			decorationManager,
			viewService: new ViewService({ decorationManager }),
		});
		const explorer = new explorerTags(plugin);

		expect(explorer.getTree().map((node) => node.meta.tagPath)).toEqual(['project']);

		tagInfos = {};
		notifyTagsChanged?.();

		expect(explorer.getTree().map((node) => node.meta.tagPath)).toEqual([]);
	});

	it('can sort nested tags without reordering root tags', () => {
		const plugin = makePlugin([], ['z/b', 'z/a', 'a/root']);
		const baseline = new explorerTags(plugin).getTree().map((node) => node.label);
		const explorer = new explorerTags(plugin);

		explorer.setSortBy('name', 'asc');
		explorer.setSortTarget('children');
		const tree = explorer.getTree();
		const z = tree.find((node) => node.label === 'z');

		expect(tree.map((node) => node.label)).toEqual(baseline);
		expect(z?.children?.map((node) => node.label)).toEqual(['a', 'b']);
	});
});
