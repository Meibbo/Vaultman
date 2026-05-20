import { performance } from 'node:perf_hooks';
import { describe, expect, it, vi } from 'vitest';
import { TFile, TFolder, type App } from 'obsidian';
import {
	buildFilePathToIndexMap,
	buildListItems,
} from '@notebook-navigator/src/hooks/listPaneData/listItems.ts';
import { flattenFolderTree } from '@notebook-navigator/src/utils/treeFlattener.ts';
import {
	createExplorerProjection,
	type ExplorerProjection,
} from '../../../src/services/serviceExplorerProjection';
import { createExplorerScrollGeometry } from '../../../src/services/serviceExplorerScrollGeometry';
import {
	fallbackFixedVirtualRows,
	scrollFixedIndexIntoView,
} from '../../../src/services/serviceScroll';
import type { ExplorerRowInput } from '../../../src/services/serviceExplorerRowInput';
import { mockApp } from '../../helpers/obsidian-mocks';
import {
	createExplorerSyntheticDataset,
	type ExplorerSyntheticFileMeta,
} from '../../support/explorerSyntheticDataset';

vi.mock('obsidian', async () => {
	const actual = await vi.importActual<typeof import('../../helpers/obsidian-mocks')>(
		'../../helpers/obsidian-mocks',
	);
	return {
		...actual,
		getLanguage: () => 'en',
	};
});

const NODE_COUNT = 50_000;
const SAMPLE_RUNS = 7;
const REVEAL_LOOKUPS = 1_000;
const SCROLL_JUMPS = 1_000;
const SCROLL_ROW_HEIGHT = 32;
const SCROLL_VIEWPORT_HEIGHT = 640;
const SCROLL_OVERSCAN = 10;
const DIRECT_LOOKUP_BUDGET_MS = 10;
const DIRECT_SCROLL_BUDGET_MS = 50;

interface TimedSample<T> {
	value: T;
	durationMs: number;
}

interface NotebookNavigatorSources {
	app: App;
	files: TFile[];
	rootFolder: TFolder;
}

function timed<T>(run: () => T): TimedSample<T> {
	const started = performance.now();
	const value = run();
	return { value, durationMs: performance.now() - started };
}

function sampleFastest<T>(run: () => TimedSample<T>): TimedSample<T> {
	const samples = Array.from({ length: SAMPLE_RUNS }, run);
	return samples.reduce((best, sample) =>
		sample.durationMs < best.durationMs ? sample : best,
	);
}

function logBridge(label: string, values: Record<string, number>): void {
	if (process.env.VM_PERF_BRIDGE_LOG !== '1') return;
	console.info(`[vm-perf-bridge] ${label}: ${JSON.stringify(values)}`);
}

function makeNotebookNavigatorSources(count: number): NotebookNavigatorSources {
	const app = mockApp() as App;
	const rootFolder = makeFolder('/');
	const files: TFile[] = [];

	for (let index = 0; index < count; index += 1) {
		const folder = makeFolder(`Synthetic/Folder ${index.toString().padStart(5, '0')}`);
		const file = makeFile(`${folder.path}/Note ${index.toString().padStart(5, '0')}.md`, folder);
		folder.parent = rootFolder;
		rootFolder.children.push(folder);
		files.push(file);
	}

	return { app, files, rootFolder };
}

function makeFolder(path: string): TFolder {
	const folder = new TFolder();
	folder.path = path;
	folder.name = path === '/' ? '/' : path.split('/').pop()!;
	folder.children = [];
	return folder;
}

function makeFile(path: string, parent: TFolder): TFile {
	const file = new TFile();
	file.path = path;
	file.name = path.split('/').pop()!;
	file.basename = file.name.replace(/\.md$/, '');
	file.extension = 'md';
	file.parent = parent;
	return file;
}

function measureNotebookNavigatorListPane(sources: NotebookNavigatorSources): TimedSample<{
	listLength: number;
	targetIndex: number | undefined;
}> {
	return timed(() => {
		const listItems = buildListItems({
			app: sources.app,
			dayKey: '2026-05-16',
			fileVisibility: 'documents',
			files: sources.files,
			getDB: () => ({}) as never,
			getFileTimestamps: () => ({ created: 0, modified: 0 }),
			hiddenFileState: new Map(),
			hiddenTags: [],
			listConfig: {
				filterPinnedByFolder: false,
				folderGroupSortOrder: 'alpha-asc',
				groupBy: 'none',
				pinnedGroupExpanded: true,
				pinnedNotes: {},
				showFileTags: false,
				showTags: false,
			},
			searchMetaMap: new Map(),
			selectedFolder: null,
			selectionType: null,
			showHiddenItems: false,
			sortOption: 'filename-asc',
		});
		const filePathToIndex = buildFilePathToIndexMap(listItems);
		return {
			listLength: listItems.length,
			targetIndex: filePathToIndex.get(`Synthetic/Folder 49999/Note 49999.md`),
		};
	});
}

function measureNotebookNavigatorFolderTree(sources: NotebookNavigatorSources): TimedSample<{
	itemLength: number;
	targetIndex: number;
}> {
	return timed(() => {
		const items = flattenFolderTree([sources.rootFolder], new Set(['/']), [], 0, new Set(), {
			defaultSortOrder: 'alpha-asc',
		});
		const targetIndex = items.findIndex((item) => item.path === 'Synthetic/Folder 49999');
		return { itemLength: items.length, targetIndex };
	});
}

function makeVaultmanRowInputs(): ExplorerRowInput<ExplorerSyntheticFileMeta>[] {
	return createExplorerSyntheticDataset({
		nodes: NODE_COUNT,
		shape: 'flat',
		providerId: 'files',
		withMediaDescriptors: false,
	}).rowInputs;
}

function measureVaultmanProjection(
	rowInputs: readonly ExplorerRowInput<ExplorerSyntheticFileMeta>[],
): TimedSample<{
	rowLength: number;
	targetIndex: number | undefined;
}> {
	return timed(() => {
		const projection = createExplorerProjection({
			providerId: 'files',
			viewMode: 'list',
			rowInputs,
			sourceRevision: 1,
		});
		return {
			rowLength: projection.rows.length,
			targetIndex: projection.idToIndex.get('node-49999'),
		};
	});
}

function measureRevealLookup(map: ReadonlyMap<string, number>, ids: readonly string[]): TimedSample<number> {
	return timed(() => {
		let total = 0;
		for (let index = 0; index < REVEAL_LOOKUPS; index += 1) {
			total += map.get(ids[index % ids.length]) ?? -1;
		}
		return total;
	});
}

function measureNotebookNavigatorDirectScrollBridge(
	listItems: readonly { key?: string }[],
	filePathToIndex: ReadonlyMap<string, number>,
	paths: readonly string[],
): TimedSample<number> {
	return timed(() => {
		let renderedTotal = 0;
		for (let jump = 0; jump < SCROLL_JUMPS; jump += 1) {
			const path = paths[jump % paths.length];
			const index = filePathToIndex.get(path);
			if (index === undefined) continue;
			const scrollTop = scrollFixedIndexIntoView({
				index,
				rowHeight: SCROLL_ROW_HEIGHT,
				viewportHeight: SCROLL_VIEWPORT_HEIGHT,
				scrollTop: 0,
			});
			renderedTotal += fallbackFixedVirtualRows({
				count: listItems.length,
				rowHeight: SCROLL_ROW_HEIGHT,
				viewportHeight: SCROLL_VIEWPORT_HEIGHT,
				scrollTop,
				overscan: SCROLL_OVERSCAN,
				getKey: (rowIndex) => listItems[rowIndex]?.key ?? rowIndex,
			}).length;
		}
		return renderedTotal;
	});
}

function measureVaultmanDirectScrollBridge(
	projection: ExplorerProjection<ExplorerSyntheticFileMeta>,
	ids: readonly string[],
): TimedSample<number> {
	const coordinator = createExplorerScrollGeometry({
		idToIndex: projection.idToIndex,
		rowHeight: SCROLL_ROW_HEIGHT,
		rowCount: projection.rows.length,
		revision: projection.rowsRevision,
	});
	return timed(() => {
		let renderedTotal = 0;
		for (let jump = 0; jump < SCROLL_JUMPS; jump += 1) {
			const id = ids[jump % ids.length];
			const target = coordinator.resolve({
				kind: 'id',
				id,
				reason: 'manual-scroll',
				minRevision: projection.rowsRevision,
			});
			if (!target) continue;
			const scrollTop = scrollFixedIndexIntoView({
				index: target.index,
				rowHeight: SCROLL_ROW_HEIGHT,
				viewportHeight: SCROLL_VIEWPORT_HEIGHT,
				scrollTop: 0,
			});
			renderedTotal += fallbackFixedVirtualRows({
				count: projection.rows.length,
				rowHeight: SCROLL_ROW_HEIGHT,
				viewportHeight: SCROLL_VIEWPORT_HEIGHT,
				scrollTop,
				overscan: SCROLL_OVERSCAN,
				getKey: (rowIndex) => projection.visibleIds[rowIndex] ?? rowIndex,
			}).length;
		}
		return renderedTotal;
	});
}

describe('Notebook Navigator comparison bridge', () => {
	it('runs Notebook Navigator original tree/list builders against 50k sources', () => {
		const sources = makeNotebookNavigatorSources(NODE_COUNT);
		const listSample = sampleFastest(() => measureNotebookNavigatorListPane(sources));
		const treeSample = sampleFastest(() => measureNotebookNavigatorFolderTree(sources));
		logBridge('notebook-navigator-original-builders', {
			listMs: listSample.durationMs,
			treeMs: treeSample.durationMs,
		});

		expect(listSample.value.listLength).toBe(NODE_COUNT + 2);
		expect(listSample.value.targetIndex).toBe(50_000);
		expect(treeSample.value.itemLength).toBe(NODE_COUNT + 1);
		expect(treeSample.value.targetIndex).toBe(50_000);
		expect(listSample.durationMs).toBeGreaterThan(0);
		expect(treeSample.durationMs).toBeGreaterThan(0);
	}, 30_000);

	it('requires Vaultman 50k projection to beat the Notebook Navigator list bridge', () => {
		const sources = makeNotebookNavigatorSources(NODE_COUNT);
		const vaultmanRows = makeVaultmanRowInputs();
		const notebookSample = sampleFastest(() => measureNotebookNavigatorListPane(sources));
		const vaultmanSample = sampleFastest(() => measureVaultmanProjection(vaultmanRows));
		logBridge('vaultman-vs-notebook-list', {
			notebookMs: notebookSample.durationMs,
			vaultmanMs: vaultmanSample.durationMs,
		});

		expect(vaultmanSample.value.rowLength).toBe(NODE_COUNT);
		expect(vaultmanSample.value.targetIndex).toBe(49_999);
		expect(vaultmanSample.durationMs).toBeLessThan(notebookSample.durationMs);
	}, 30_000);

	it('keeps 50k reveal lookups within the direct-map budget', () => {
		const sources = makeNotebookNavigatorSources(NODE_COUNT);
		const listItems = buildListItems({
			app: sources.app,
			dayKey: '2026-05-16',
			fileVisibility: 'documents',
			files: sources.files,
			getDB: () => ({}) as never,
			getFileTimestamps: () => ({ created: 0, modified: 0 }),
			hiddenFileState: new Map(),
			hiddenTags: [],
			listConfig: {
				filterPinnedByFolder: false,
				folderGroupSortOrder: 'alpha-asc',
				groupBy: 'none',
				pinnedGroupExpanded: true,
				pinnedNotes: {},
				showFileTags: false,
				showTags: false,
			},
			searchMetaMap: new Map(),
			selectedFolder: null,
			selectionType: null,
			showHiddenItems: false,
			sortOption: 'filename-asc',
		});
		const notebookMap = buildFilePathToIndexMap(listItems);
		const vaultmanRows = makeVaultmanRowInputs();
		const projection = createExplorerProjection({
			providerId: 'files',
			viewMode: 'list',
			rowInputs: vaultmanRows,
			sourceRevision: 1,
		});

		const notebookIds = sources.files.slice(0, REVEAL_LOOKUPS).map((file) => file.path);
		const vaultmanIds = vaultmanRows.slice(0, REVEAL_LOOKUPS).map((row) => row.id);
		const notebookLookup = sampleFastest(() => measureRevealLookup(notebookMap, notebookIds));
		const vaultmanLookup = sampleFastest(() =>
			measureRevealLookup(projection.idToIndex, vaultmanIds),
		);
		logBridge('reveal-lookups', {
			notebookMs: notebookLookup.durationMs,
			vaultmanMs: vaultmanLookup.durationMs,
		});

		expect(notebookLookup.value).toBeGreaterThan(0);
		expect(vaultmanLookup.value).toBeGreaterThan(0);
		expect(notebookLookup.durationMs).toBeLessThanOrEqual(DIRECT_LOOKUP_BUDGET_MS);
		expect(vaultmanLookup.durationMs).toBeLessThanOrEqual(DIRECT_LOOKUP_BUDGET_MS);
	}, 30_000);

	it('keeps direct 50k scroll-jump hot paths within budget', () => {
		const sources = makeNotebookNavigatorSources(NODE_COUNT);
		const listItems = buildListItems({
			app: sources.app,
			dayKey: '2026-05-16',
			fileVisibility: 'documents',
			files: sources.files,
			getDB: () => ({}) as never,
			getFileTimestamps: () => ({ created: 0, modified: 0 }),
			hiddenFileState: new Map(),
			hiddenTags: [],
			listConfig: {
				filterPinnedByFolder: false,
				folderGroupSortOrder: 'alpha-asc',
				groupBy: 'none',
				pinnedGroupExpanded: true,
				pinnedNotes: {},
				showFileTags: false,
				showTags: false,
			},
			searchMetaMap: new Map(),
			selectedFolder: null,
			selectionType: null,
			showHiddenItems: false,
			sortOption: 'filename-asc',
		});
		const notebookMap = buildFilePathToIndexMap(listItems);
		const vaultmanRows = makeVaultmanRowInputs();
		const projection = createExplorerProjection({
			providerId: 'files',
			viewMode: 'list',
			rowInputs: vaultmanRows,
			sourceRevision: 1,
		});
		const notebookPaths = sources.files
			.slice(NODE_COUNT - SCROLL_JUMPS)
			.map((file) => file.path);
		const vaultmanIds = vaultmanRows.slice(NODE_COUNT - SCROLL_JUMPS).map((row) => row.id);

		const notebookScroll = sampleFastest(() =>
			measureNotebookNavigatorDirectScrollBridge(listItems, notebookMap, notebookPaths),
		);
		const vaultmanScroll = sampleFastest(() =>
			measureVaultmanDirectScrollBridge(projection, vaultmanIds),
		);
		logBridge('direct-scroll-jumps', {
			notebookMs: notebookScroll.durationMs,
			vaultmanMs: vaultmanScroll.durationMs,
			notebookRenderedRows: notebookScroll.value,
			vaultmanRenderedRows: vaultmanScroll.value,
		});

		expect(notebookScroll.value).toBeGreaterThan(0);
		expect(vaultmanScroll.value).toBeGreaterThan(0);
		expect(vaultmanScroll.value).toBeLessThanOrEqual(notebookScroll.value);
		expect(notebookScroll.durationMs).toBeLessThanOrEqual(DIRECT_SCROLL_BUDGET_MS);
		expect(vaultmanScroll.durationMs).toBeLessThanOrEqual(DIRECT_SCROLL_BUDGET_MS);
	}, 30_000);
});
