import { describe, expect, it, vi } from 'vitest';
import { explorerTags } from '../../../src/components/containers/explorerTags';
import { DecorationManager } from '../../../src/services/serviceDecorate';
import { ViewService } from '../../../src/services/serviceViews.svelte';
import type { VaultmanPlugin } from '../../../src/main';
import type { ExplorerDataPlaneRevisions, ExplorerSnapshot } from '../../../src/types/typeExplorerDataPlane';
import type { TagMeta, TreeNode } from '../../../src/types/typeNode';
import { mockApp, mockTFile, type CachedMetadata, type TFile } from '../../helpers/obsidian-mocks';

type SnapshotBackedTags = explorerTags & {
	getStructuralTree(): TreeNode<TagMeta>[];
	getStructuralRevisions(): ExplorerDataPlaneRevisions;
	getSnapshot(expandedIds: ReadonlySet<string>): ExplorerSnapshot<TagMeta>;
};

function makePlugin(
	tags: string[],
	options: {
		revision?: number;
		getTags?: ReturnType<typeof vi.fn<() => Record<string, number>>>;
	} = {},
): {
	plugin: VaultmanPlugin;
	getTags: ReturnType<typeof vi.fn<() => Record<string, number>>>;
} {
	const file = mockTFile('tags.md', { frontmatter: { tags } });
	const files = [file] as TFile[];
	const meta = new Map<string, CachedMetadata>([[file.path, { frontmatter: { tags } }]]);
	const app = mockApp({ files, metadata: meta });
	const getTags =
		options.getTags ??
		vi.fn(() => Object.fromEntries(tags.map((tag) => [`#${tag}`, 1])));
	(app.metadataCache as unknown as { getTags: () => Record<string, number> }).getTags = getTags;
	const decorationManager = new DecorationManager(app);

	return {
		getTags,
		plugin: {
			app,
			contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
			queueService: { queue: [], add: vi.fn() },
			tagsIndex: {
				nodes: tags.map((tag) => ({
					id: `#${tag}`,
					tag: `#${tag}`,
					count: 1,
					parent: tag.includes('/') ? `#${tag.split('/').slice(0, -1).join('/')}` : undefined,
				})),
				flatIds: tags.map((tag) => `#${tag}`),
				revision: options.revision ?? 4,
				refresh: vi.fn(),
				subscribe: vi.fn(() => vi.fn()),
				byId: vi.fn(),
				getSearchBuffer: vi.fn(() => ''),
			},
			operationsIndex: {
				nodes: [],
				revision: 0,
				refresh: vi.fn(),
				subscribe: vi.fn(),
				byId: vi.fn(),
				getSearchBuffer: vi.fn(() => ''),
			},
			activeFiltersIndex: {
				nodes: [],
				revision: 0,
				refresh: vi.fn(),
				subscribe: vi.fn(),
				byId: vi.fn(),
				getSearchBuffer: vi.fn(() => ''),
			},
			filterService: {
				filteredFiles: files,
				selectedFiles: [],
				hasTagFilter: vi.fn(() => false),
				removeNodeByTag: vi.fn(),
				addNode: vi.fn(),
			},
			decorationManager,
			viewService: new ViewService({ decorationManager }),
			iconicService: { getTagIcon: vi.fn(() => null) },
		} as unknown as VaultmanPlugin,
	};
}

describe('explorerTags snapshot adapter', () => {
	it('builds a structural snapshot with tag ids, parent links, visible order, and domain keys', () => {
		const { plugin } = makePlugin(['z/b', 'z/a', 'a/root'], { revision: 12 });
		const explorer = new explorerTags(plugin) as SnapshotBackedTags;

		explorer.setSortBy('name', 'asc');
		explorer.setSortTarget('children');
		const snapshot = explorer.getSnapshot(new Set(['a', 'z']));

		expect(snapshot.explorerId).toBe('tags');
		expect(snapshot.providerKey).toBe('tags');
		expect(snapshot.sourceRevisions).toEqual({ tagsRevision: 12 });
		expect(snapshot.rows.map((row) => row.id)).toEqual(['a', 'a/root', 'z', 'z/a', 'z/b']);
		expect(snapshot.visibleIds).toEqual(['a', 'a/root', 'z', 'z/a', 'z/b']);
		expect(snapshot.byId.get('z/a')).toMatchObject({
			parentId: 'z',
			childrenIds: [],
			kind: 'tag',
			domainKey: '#z/a',
		});
		expect(snapshot.domainKeyToId.get('#z/b')).toBe('z/b');
		expect(snapshot.projection).toEqual({
			searchTerm: '',
			searchMode: 'all',
			sortBy: 'name',
			sortDirection: 'asc',
			sortTarget: 'children',
		});
	});

	it('records leaf search projection while preserving tag path casing', () => {
		const { plugin } = makePlugin(['Project/Active', 'project/archive', 'Other']);
		const explorer = new explorerTags(plugin) as SnapshotBackedTags;

		explorer.setSearchTerm('Active', 'leaf');
		explorer.setSortBy('count', 'desc');
		const snapshot = explorer.getSnapshot(new Set(['Project/Active']));

		expect(snapshot.rows.map((row) => row.id)).toEqual(['Project/Active']);
		expect(snapshot.byId.get('Project/Active')?.node.meta.tagPath).toBe('Project/Active');
		expect(snapshot.domainKeyToId.get('#Project/Active')).toBe('Project/Active');
		expect(snapshot.projection).toEqual({
			searchTerm: 'Active',
			searchMode: 'leaf',
			sortBy: 'count',
			sortDirection: 'desc',
			sortTarget: 'top',
		});
	});

	it('keeps queue and active-filter revisions decorative for structural snapshots', () => {
		const { plugin, getTags } = makePlugin(['project/active'], { revision: 3 });
		const explorer = new explorerTags(plugin) as SnapshotBackedTags;

		const first = explorer.getSnapshot(new Set(['project']));
		(plugin.operationsIndex as unknown as { nodes: unknown[]; revision: number }).nodes = [
			{ id: 'op-delete-project', group: 'tag', change: { action: 'delete' } },
		];
		(plugin.operationsIndex as unknown as { revision: number }).revision = 99;
		(plugin.activeFiltersIndex as unknown as { nodes: unknown[]; revision: number }).nodes = [
			{ id: 'filter-project', kind: 'rule', rule: { filterType: 'has_tag', values: ['#project'] } },
		];
		(plugin.activeFiltersIndex as unknown as { revision: number }).revision = 42;

		const second = explorer.getSnapshot(new Set(['project']));

		expect(first.rows.map((row) => row.id)).toEqual(['project', 'project/active']);
		expect(second.rows.map((row) => row.id)).toEqual(['project', 'project/active']);
		expect(second.sourceRevisions).toEqual({ tagsRevision: 3 });
		expect(getTags).toHaveBeenCalledTimes(1);
	});

	it('reads the structural tree without invoking ViewService decorations', () => {
		const { plugin } = makePlugin(['project/active']);
		const explorer = new explorerTags(plugin) as SnapshotBackedTags;
		const getModel = vi.spyOn(plugin.viewService, 'getModel');

		expect(explorer.getStructuralTree().map((node) => node.id)).toEqual(['project']);
		expect(getModel).not.toHaveBeenCalled();
	});
});
