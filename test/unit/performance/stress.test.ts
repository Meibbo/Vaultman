import { afterEach, describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { createPerfProbe, clearActivePerfProbe, setActivePerfProbe } from '../../../src/dev/perfProbe';
import { createFilesIndex } from '../../../src/index/indexFiles';
import { createPropsIndex } from '../../../src/index/indexProps';
import { createTagsIndex } from '../../../src/index/indexTags';
import { ExplorerService } from '../../../src/services/serviceExplorer.svelte';
import { FilterService } from '../../../src/services/serviceFilter.svelte';
import { PerfMeter, type OpsLogRecord } from '../../../src/services/perfMeter';
import { ViewService } from '../../../src/services/serviceViews.svelte';
import { mockApp, mockTFile, type CachedMetadata } from '../../helpers/obsidian-mocks';
import type { ActiveFilterEntry, IDecorationManager, INodeIndex, NodeBase, QueueChange } from '../../../src/types/typeContracts';

function makeLargeVault(size = 10_000) {
	const metadata = new Map<string, CachedMetadata>();
	const tagCounts: Record<string, number> = {};
	const files = Array.from({ length: size }, (_, index) => {
		const status = ['draft', 'review', 'published'][index % 3];
		const tag = `#topic/${index % 50}`;
		const file = mockTFile(`Notes/Topic-${index % 50}/note-${index}.md`, {
			frontmatter: {
				status,
				priority: (index % 5) + 1,
				tags: ['bulk-generated', tag.replace(/^#/, '')],
			},
		});
		metadata.set(file.path, {
			frontmatter: {
				status,
				priority: (index % 5) + 1,
				tags: ['bulk-generated', tag.replace(/^#/, '')],
			},
			tags: [{ tag }, { tag: '#bulk-generated' }],
		});
		tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
		tagCounts['#bulk-generated'] = (tagCounts['#bulk-generated'] ?? 0) + 1;
		return file;
	});
	const app = mockApp({ files, metadata });
	app.metadataCache.getTags = () => tagCounts;
	return { app, files };
}

describe('large vault performance seams', () => {
	afterEach(() => {
		clearActivePerfProbe();
		PerfMeter.__resetForTests();
	});

	it('builds core explorer indexes for 10k files without the integration vault harness', async () => {
		const { app } = makeLargeVault();
		const filesIndex = createFilesIndex(app);
		const propsIndex = createPropsIndex(app);
		const tagsIndex = createTagsIndex(app);
		const probe = createPerfProbe({ now: () => performance.now() });
		setActivePerfProbe(probe.api);

		const started = performance.now();
		await Promise.all([filesIndex.refresh(), propsIndex.refresh(), tagsIndex.refresh()]);
		const elapsed = performance.now() - started;

		expect(filesIndex.nodes).toHaveLength(10_000);
		expect(propsIndex.byId('status')).toMatchObject({
			fileCount: 10_000,
			valueFrequencies: { draft: 3334, review: 3333, published: 3333 },
		});
		expect(tagsIndex.byId('#bulk-generated')).toMatchObject({ count: 10_000 });
		expect(probe.snapshot().timings['index.node.build'].count).toBe(3);
		expect(elapsed).toBeLessThan(2_000);
	});

	it('keeps full-scan search and render-model generation bounded on 10k files', async () => {
		const { app, files } = makeLargeVault();
		const filesIndex = createFilesIndex(app);
		await filesIndex.refresh();
		const filterService = new FilterService(app, filesIndex);
		const viewService = new ViewService();
		const operations: QueueChange[] = Array.from({ length: 200 }, (_, index) => ({
			id: `op-${index}`,
			group: 'rename_file',
			change: {
				id: `op-${index}`,
				type: 'file_rename',
				action: 'rename',
				details: `Rename ${index}`,
				files: [{ path: files[index].path, basename: files[index].basename } as never],
				newName: `renamed-${index}`,
			} as never,
		}));
		const activeFilters: ActiveFilterEntry[] = [
			{
				id: 'filter-note',
				kind: 'rule',
				rule: {
					id: 'filter-note',
					type: 'rule',
					filterType: 'file_name',
					property: '',
					values: ['note'],
				},
			},
		];

		const searchStarted = performance.now();
		filterService.setSearchFilter('note-9999', '');
		const filtered = filterService.filteredFiles;
		const searchElapsed = performance.now() - searchStarted;

		const modelStarted = performance.now();
		const model = viewService.getModel({
			explorerId: 'files',
			mode: 'tree',
			nodes: files.map((file) => ({
				id: file.path,
				label: file.basename,
				path: file.path,
				basename: file.basename,
			})),
			operations,
			activeFilters,
			getDecorationContext: (node) => ({
				kind: 'file',
				filePath: node.path,
				basename: node.basename,
			}),
		});
		const modelElapsed = performance.now() - modelStarted;

		expect(filtered.map((file) => file.path)).toEqual(['Notes/Topic-49/note-9999.md']);
		expect(searchElapsed).toBeLessThan(200);
		expect(model.rows).toHaveLength(10_000);
		expect(modelElapsed).toBeLessThan(1_000);
		filterService.destroy();
	});

	it('filters 10k ExplorerService nodes through normalized search buffers on the timed id path', () => {
		type TestNode = NodeBase & { label: string; path: string };
		const nodes: TestNode[] = Array.from({ length: 10_000 }, (_, index) => ({
			id: `node-${index}`,
			label: `Node ${index}`,
			path: `Folder-${index % 50}/node-${index}.md`,
		}));
		const idx: INodeIndex<TestNode> = {
			get nodes() {
				return nodes;
			},
			get flatIds() {
				return nodes.map((node) => node.id);
			},
			get revision() {
				return 1;
			},
			refresh: () => {},
			subscribe: () => () => {},
			byId: (id) => nodes.find((node) => node.id === id),
			getSearchBuffer: (id) => {
				const node = nodes[Number(id.slice('node-'.length))];
				return node ? `${node.label}\n${node.path}`.toLowerCase() : '';
			},
		};
		const decorate: IDecorationManager = {
			decorate: () => ({ icons: [], badges: [], highlights: [] }),
			subscribe: () => () => {},
		};
		const records: OpsLogRecord[] = [];
		PerfMeter.subscribe((record) => records.push(record));
		const service = new ExplorerService({ index: idx, decorate });

		const started = performance.now();
		service.setSearch('node-9999');
		const filtered = service.filteredNodes;
		const elapsed = performance.now() - started;
		const filteredIdsRecord = records.find(
			(record) => record.label === 'explorer.service.filteredIds',
		);

		expect(filtered.map((node) => node.id)).toEqual(['node-9999']);
		expect(filteredIdsRecord?.durationMs).toBeLessThan(200);
		expect(elapsed).toBeLessThan(200);
	});
});
