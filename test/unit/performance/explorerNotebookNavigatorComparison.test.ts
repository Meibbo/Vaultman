import { performance } from 'node:perf_hooks';
import { describe, expect, it, vi } from 'vitest';
import { TFile, TFolder, type App } from 'obsidian';
import {
	buildFilePathToIndexMap,
	buildListItems,
} from '../../../../../../../notebook-navigator/src/hooks/listPaneData/listItems.ts';
import { flattenFolderTree } from '../../../../../../../notebook-navigator/src/utils/treeFlattener.ts';
import { createExplorerProjection } from '../../../src/services/serviceExplorerProjection';
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

interface TimedSample<T> {
	value: T;
	durationMs: number;
}

interface NotebookNavigatorSources {
	app: App;
	files: TFile[];
	rootFolder: TFolder;
}

function median(values: readonly number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function timed<T>(run: () => T): TimedSample<T> {
	const started = performance.now();
	const value = run();
	return { value, durationMs: performance.now() - started };
}

function sampleMedian<T>(run: () => TimedSample<T>): TimedSample<T> {
	const samples = Array.from({ length: SAMPLE_RUNS }, run);
	const medianDuration = median(samples.map((sample) => sample.durationMs));
	const winner =
		samples.find((sample) => sample.durationMs === medianDuration) ??
		samples[Math.floor(samples.length / 2)]!;
	return { value: winner.value, durationMs: medianDuration };
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

describe('Notebook Navigator comparison bridge', () => {
	it('runs Notebook Navigator original tree/list builders against 50k sources', () => {
		const sources = makeNotebookNavigatorSources(NODE_COUNT);
		const listSample = sampleMedian(() => measureNotebookNavigatorListPane(sources));
		const treeSample = sampleMedian(() => measureNotebookNavigatorFolderTree(sources));
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
		const notebookSample = sampleMedian(() => measureNotebookNavigatorListPane(sources));
		const vaultmanSample = sampleMedian(() => measureVaultmanProjection(vaultmanRows));
		logBridge('vaultman-vs-notebook-list', {
			notebookMs: notebookSample.durationMs,
			vaultmanMs: vaultmanSample.durationMs,
		});

		expect(vaultmanSample.value.rowLength).toBe(NODE_COUNT);
		expect(vaultmanSample.value.targetIndex).toBe(49_999);
		expect(vaultmanSample.durationMs).toBeLessThan(notebookSample.durationMs);
	}, 30_000);

	it('keeps 50k reveal lookups on direct maps for both implementations', () => {
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
		const notebookLookup = sampleMedian(() => measureRevealLookup(notebookMap, notebookIds));
		const vaultmanLookup = sampleMedian(() => measureRevealLookup(projection.idToIndex, vaultmanIds));
		logBridge('reveal-lookups', {
			notebookMs: notebookLookup.durationMs,
			vaultmanMs: vaultmanLookup.durationMs,
		});

		expect(notebookLookup.value).toBeGreaterThan(0);
		expect(vaultmanLookup.value).toBeGreaterThan(0);
		expect(vaultmanLookup.durationMs).toBeLessThanOrEqual(notebookLookup.durationMs * 1.25);
	}, 30_000);
});
