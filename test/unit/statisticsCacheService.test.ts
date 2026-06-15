import type { App, CachedMetadata, TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { StatisticsCacheService } from '../../src/services/serviceStatisticsCache';

const vault = {} as Vault;

function makeFolder(path: string): TFolder {
	return {
		children: [],
		isRoot: () => path === '/',
		name: path.split('/').pop() ?? path,
		parent: null,
		path,
		vault,
	} satisfies TFolder;
}

function makeFile(path: string, mtime = 1, size = 10, ctime = 0): TFile {
	const name = path.split('/').pop() ?? path;
	const dot = name.lastIndexOf('.');
	return {
		basename: dot === -1 ? name : name.slice(0, dot),
		extension: dot === -1 ? '' : name.slice(dot + 1),
		name,
		parent: makeFolder(path.includes('/') ? path.split('/').slice(0, -1).join('/') : '/'),
		path,
		stat: { ctime, mtime, size },
		vault,
	} satisfies TFile;
}

function makeApp(
	readCounter: { count: number },
	contentByPath: Record<string, string> = {},
): App {
	return {
		vault: {
			cachedRead: async (file: TFile) => {
				readCounter.count += 1;
				return contentByPath[file.path] ?? 'one two three';
			},
		},
		metadataCache: {
			getFileCache: () =>
				({
					frontmatter: { status: 'done', tags: ['release'] },
					links: [{ link: 'Target' }],
					embeds: [],
					tags: [{ tag: '#inline', position: { start: 0, end: 0 } }],
				}) as unknown as CachedMetadata,
		},
	} as unknown as App;
}

describe('StatisticsCacheService', () => {
	it('keeps file stats cached across repeated consumers until the file changes', async () => {
		const readCounter = { count: 0 };
		const file = makeFile('Notes/a.md');
		const service = new StatisticsCacheService(makeApp(readCounter));

		const first = await service.computeSnapshot({
			files: [file],
			folders: 1,
			scope: 'vault',
		});
		const second = await service.computeSnapshot({
			files: [file],
			folders: 1,
			scope: 'vault',
		});

		expect(first.words).toBe(3);
		expect(second.words).toBe(3);
		expect(readCounter.count).toBe(1);

		service.invalidateFile(file);
		await service.computeSnapshot({
			files: [file],
			folders: 1,
			scope: 'vault',
		});

		expect(readCounter.count).toBe(2);
	});

	it('keeps aggregate cache sensitive to folder totals for the same file set', async () => {
		const readCounter = { count: 0 };
		const file = makeFile('Notes/a.md');
		const service = new StatisticsCacheService(makeApp(readCounter));

		const first = await service.computeSnapshot({
			files: [file],
			folders: 1,
			scope: 'filtered',
		});
		const second = await service.computeSnapshot({
			files: [file],
			folders: 2,
			scope: 'filtered',
		});

		expect(first.folders).toBe(1);
		expect(second.folders).toBe(2);
		expect(readCounter.count).toBe(1);
	});

	it('hydrates cached file stats from persistent storage across service instances', async () => {
		const readCounter = { count: 0 };
		const file = makeFile('Notes/a.md');
		const storage = new Map<string, unknown>();
		const firstService = new StatisticsCacheService(makeApp(readCounter), {
			storage,
			storageKey: 'test-vault',
		});

		await firstService.initializeStorage();
		await firstService.computeSnapshot({
			files: [file],
			folders: 1,
			scope: 'vault',
		});

		const secondService = new StatisticsCacheService(makeApp(readCounter), {
			storage,
			storageKey: 'test-vault',
		});
		await secondService.initializeStorage();
		const second = await secondService.computeSnapshot({
			files: [file],
			folders: 1,
			scope: 'vault',
		});

		expect(second.words).toBe(3);
		expect(second.cacheHits).toBe(1);
		expect(second.filesRead).toBe(0);
		expect(readCounter.count).toBe(1);
	});

	it('persists created and modified timestamps in file-level cache records', async () => {
		const readCounter = { count: 0 };
		const file = makeFile('Notes/a.md', 200, 10, 100);
		const storage = new Map<string, unknown>();
		const service = new StatisticsCacheService(makeApp(readCounter), {
			storage,
			storageKey: 'test-vault',
		});

		await service.initializeStorage();
		await service.computeSnapshot({
			files: [file],
			folders: 1,
			scope: 'vault',
		});

		expect(storage.get('test-vault:file:Notes/a.md')).toMatchObject({
			path: 'Notes/a.md',
			ctime: 100,
			mtime: 200,
		});
	});

	it('hydrates last-good aggregate snapshots from persistent storage', async () => {
		const readCounter = { count: 0 };
		const file = makeFile('Notes/a.md');
		const storage = new Map<string, unknown>();
		const firstService = new StatisticsCacheService(makeApp(readCounter), {
			storage,
			storageKey: 'test-vault',
		});

		await firstService.initializeStorage();
		await firstService.computeSnapshot({
			files: [file],
			folders: 1,
			scope: 'filtered',
		});

		const secondService = new StatisticsCacheService(makeApp(readCounter), {
			storage,
			storageKey: 'test-vault',
		});
		await secondService.initializeStorage();
		const cachedSnapshot = secondService.getLastGoodSnapshot(
			secondService.snapshotSignatureFor([file], 1),
		);

		expect(cachedSnapshot?.files).toBe(1);
		expect(cachedSnapshot?.words).toBe(3);
		expect(cachedSnapshot?.filesRead).toBe(0);
		expect(readCounter.count).toBe(1);
	});

	it('keeps the last-good scope snapshot available after cache invalidation', async () => {
		const readCounter = { count: 0 };
		const file = makeFile('Notes/a.md');
		const service = new StatisticsCacheService(makeApp(readCounter));

		await service.computeSnapshot({
			files: [file],
			folders: 1,
			scope: 'vault',
		});
		service.invalidateFile(file);

		const lastGood = service.getLastGoodSnapshotForScope('vault');
		expect(lastGood?.files).toBe(1);
		expect(lastGood?.words).toBe(3);
		expect(lastGood?.filesRead).toBe(0);
	});

	it('exposes cached per-file word counts that sum to the scoped snapshot total', async () => {
		const readCounter = { count: 0 };
		const first = makeFile('Notes/a.md');
		const second = makeFile('Notes/b.md');
		const service = new StatisticsCacheService(
			makeApp(readCounter, {
				'Notes/a.md': 'one two three',
				'Notes/b.md': 'four five',
			}),
		);

		expect(service.getFileWordCount(first)).toBeNull();

		const snapshot = await service.computeSnapshot({
			files: [first, second],
			folders: 1,
			scope: 'filtered',
		});
		const projectedWords =
			(service.getFileWordCount(first) ?? 0) +
			(service.getFileWordCount(second) ?? 0);

		expect(snapshot.words).toBe(5);
		expect(projectedWords).toBe(snapshot.words);
		expect(readCounter.count).toBe(2);

		service.invalidateFile(first);

		expect(service.getFileWordCount(first)).toBe(3);
		expect(readCounter.count).toBe(2);
	});

	it('keeps last-known file word counts after modify invalidation until refresh completes', async () => {
		const readCounter = { count: 0 };
		const contentByPath = {
			'Notes/a.md': 'one two three',
		};
		const file = makeFile('Notes/a.md', 1, 10);
		const service = new StatisticsCacheService(
			makeApp(readCounter, contentByPath),
		);

		await service.computeSnapshot({
			files: [file],
			folders: 1,
			scope: 'filtered',
		});
		expect(service.getFileWordCount(file)).toBe(3);

		file.stat.mtime = 2;
		file.stat.size = 20;
		contentByPath['Notes/a.md'] = 'one two three four five';
		service.invalidateFile(file);

		expect(service.getFileWordCount(file)).toBe(3);
		expect(readCounter.count).toBe(1);

		const snapshot = await service.computeSnapshot({
			files: [file],
			folders: 1,
			scope: 'filtered',
		});

		expect(snapshot.words).toBe(5);
		expect(service.getFileWordCount(file)).toBe(5);
		expect(readCounter.count).toBe(2);
	});
});
