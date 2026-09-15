import { TFile, type TFolder, type Vault } from 'obsidian';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import {
	compareLastOpenedValues,
	lastOpenedAt,
	normalizeLastOpenedRecord,
	pruneMissingPaths,
	withDeletedPath,
	withFileOpened,
	withRenamedPath,
} from '../../src/logic/logicLastOpened';
import {
	DEFAULT_EXPLORER_SORT_DIR,
	compareFilesForExplorer,
} from '../../src/logic/logicSort';
import { SORT_MENU_OPTIONS } from '../../src/logic/logicSortMenu';
import { cellDef, cellsForExplorer } from '../../src/logic/logicCellRegistry';
import lastOpenedServiceSource from '../../src/services/serviceLastOpened.ts?raw';
import mainSource from '../../src/main.ts?raw';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import { LastOpenedService } from '../../src/services/serviceLastOpened';

const vault = {} as Vault;

function makeFolder(path: string): TFolder {
	return {
		children: [],
		isRoot: () => path === '/',
		name: path === '/' ? '' : (path.split('/').pop() ?? path),
		parent: null,
		path,
		vault,
	} satisfies TFolder;
}

function makeFile(path: string): TFile {
	const lastSlash = path.lastIndexOf('/');
	const fileName = lastSlash === -1 ? path : path.slice(lastSlash + 1);
	const dot = fileName.lastIndexOf('.');
	// A real instance: the service keeps its `instanceof TFile` guard so a
	// preview or a folder can never age a file to "just opened".
	return Object.assign(new TFile(), {
		basename: dot === -1 ? fileName : fileName.slice(0, dot),
		extension: dot === -1 ? '' : fileName.slice(dot + 1),
		name: fileName,
		parent: makeFolder(lastSlash === -1 ? '/' : path.slice(0, lastSlash)),
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault,
	}) as TFile;
}

/** Fake vault adapter that resolves read on the next microtask. */
function makeFakeAdapter(
	initialContent: string | null = null,
): {
	read: ReturnType<typeof vi.fn>;
	write: ReturnType<typeof vi.fn>;
	stored: string;
} {
	let stored = initialContent ?? '';
	return {
		read: vi.fn(async (_path: string) => {
			await new Promise<void>((resolve) => queueMicrotask(resolve));
			if (stored === '') throw new Error('ENOENT');
			return stored;
		}),
		write: vi.fn(async (_path: string, content: string) => {
			stored = content;
		}),
		get stored() {
			return stored;
		},
	};
}

/** Create a minimal App stub with a fake adapter. */
function makeApp(adapter: ReturnType<typeof makeFakeAdapter>, files: string[] = []): any {
	return {
		vault: {
			configDir: '/test-vault/.obsidian',
			adapter,
			getFiles: () => files.map((p) => ({ path: p })),
		},
		workspace: {
			on: vi.fn((_event, cb) => ({ off: () => {}, then: cb })),
		},
		manifest: { id: 'test-plugin' },
	};
}

describe('BT5-013 last opened record', () => {
	it('keeps one timestamp per path instead of an event history', () => {
		let record = withFileOpened({}, 'a.md', 100);
		record = withFileOpened(record, 'a.md', 200);
		record = withFileOpened(record, 'a.md', 300);

		expect(Object.keys(record)).toEqual(['a.md']);
		expect(lastOpenedAt(record, 'a.md')).toBe(300);
	});

	it('records any file type and reports never-opened files as null', () => {
		const record = withFileOpened(
			withFileOpened({}, 'board.canvas', 10),
			'scan.pdf',
			20,
		);

		expect(lastOpenedAt(record, 'board.canvas')).toBe(10);
		expect(lastOpenedAt(record, 'scan.pdf')).toBe(20);
		expect(lastOpenedAt(record, 'never.md')).toBeNull();
	});

	it('ignores empty paths and non-positive timestamps', () => {
		expect(withFileOpened({}, '', 100)).toEqual({});
		expect(withFileOpened({}, 'a.md', 0)).toEqual({});
		expect(withFileOpened({}, 'a.md', Number.NaN)).toEqual({});
	});

	it('migrates the key on rename, including a renamed parent folder', () => {
		const record = withFileOpened(withFileOpened({}, 'old/a.md', 100), 'b.md', 5);

		const renamedFile = withRenamedPath(record, 'old/a.md', 'old/renamed.md');
		expect(lastOpenedAt(renamedFile, 'old/renamed.md')).toBe(100);
		expect(lastOpenedAt(renamedFile, 'old/a.md')).toBeNull();

		const renamedFolder = withRenamedPath(record, 'old', 'new');
		expect(lastOpenedAt(renamedFolder, 'new/a.md')).toBe(100);
		expect(lastOpenedAt(renamedFolder, 'old/a.md')).toBeNull();
		expect(lastOpenedAt(renamedFolder, 'b.md')).toBe(5);
	});

	it('purges the key on delete, including every file under a deleted folder', () => {
		const record = withFileOpened(
			withFileOpened({}, 'notes/a.md', 100),
			'notes.md',
			50,
		);

		const afterFile = withDeletedPath(record, 'notes/a.md');
		expect(lastOpenedAt(afterFile, 'notes/a.md')).toBeNull();

		const afterFolder = withDeletedPath(record, 'notes');
		expect(lastOpenedAt(afterFolder, 'notes/a.md')).toBeNull();
		// A sibling whose path merely starts with the folder name survives.
		expect(lastOpenedAt(afterFolder, 'notes.md')).toBe(50);
	});

	it('drops entries whose file no longer exists when the vault is known', () => {
		const record = withFileOpened(withFileOpened({}, 'a.md', 1), 'gone.md', 2);
		expect(pruneMissingPaths(record, new Set(['a.md']))).toEqual({ 'a.md': 1 });
	});

	it('reads persisted payloads defensively and keeps only path/timestamp', () => {
		expect(
			normalizeLastOpenedRecord({
				'a.md': 100,
				'b.md': '200',
				'c.md': -1,
				'': 300,
				'd.md': { at: 400 },
			}),
		).toEqual({ 'a.md': 100 });
		expect(normalizeLastOpenedRecord(null)).toEqual({});
		expect(normalizeLastOpenedRecord('nope')).toEqual({});
	});

	it('sorts most recent first by default and keeps never-opened deterministic', () => {
		expect(DEFAULT_EXPLORER_SORT_DIR.opened).toBe('desc');
		expect(compareLastOpenedValues(200, 100)).toBeGreaterThan(0);
		expect(compareLastOpenedValues(null, 100)).toBeLessThan(0);
		expect(compareLastOpenedValues(null, null)).toBe(0);

		const recent = makeFile('recent.md');
		const old = makeFile('old.md');
		const never = makeFile('never.md');
		const lastOpenedForFile = (file: TFile) =>
			({ 'recent.md': 200, 'old.md': 100 })[file.path] ?? null;

		const sorted = [never, old, recent].sort((a, b) =>
			compareFilesForExplorer(a, b, 'opened', 'desc', { lastOpenedForFile }),
		);
		expect(sorted.map((file) => file.path)).toEqual([
			'recent.md',
			'old.md',
			'never.md',
		]);
	});

	it('registers the cell and the sort option off by default', () => {
		expect(cellDef('opened')?.sortId).toBe('opened');
		expect(cellDef('opened')?.hoverId).toBe('opened');
		expect(
			cellsForExplorer('files', 'tree').map((definition) => definition.id),
		).toContain('opened');
		expect(
			cellDef('opened')?.supports.every((support) => !support.defaultOn),
		).toBe(true);
		expect(SORT_MENU_OPTIONS.files.map((option) => option.id)).toContain(
			'opened',
		);
	});

	it('coalesces writes and follows the vault lifecycle', () => {
		// One trailing write per burst, never a full settings save per event.
		expect(lastOpenedServiceSource).toContain('private _scheduleFlush()');
		expect(lastOpenedServiceSource).not.toContain('saveData(');
		expect(lastOpenedServiceSource).toContain('vault.adapter.write');
		expect(mainSource).toContain("workspace.on('file-open'");
		expect(mainSource).toContain("vault.on('rename'");
		expect(mainSource).toContain("vault.on('delete'");
		expect(explorerFilesSource).toContain('openedText');
	});
});

describe('BT5-013 last opened is a live recency order', () => {
	it('re-sorts Files the moment a file is opened', () => {
		// A recency order is stale the instant it is not refreshed: opening a
		// note must move it to the top the way a browser history does.
		// U121-027 widened this from a bare early return to a block: any other
		// sort now still repaints the time cells (opening a file bumps Last
		// opened whatever the order is) before returning. The invariant this
		// guards is unchanged — only the 'opened' sort reaches the re-sort.
		expect(explorerFilesSource).toContain(
			"if (normalizeExplorerSortBy(this.sortBy) !== 'opened') {",
		);
		expect(explorerFilesSource).toContain('queueMicrotask(() => {');
	});

	it('does not re-sort while another order is active', () => {
		// The guard returns before scheduling, so no other sort pays for it.
		const handler = explorerFilesSource.slice(
			explorerFilesSource.indexOf('_handleActiveFileChange = '),
			explorerFilesSource.indexOf('private _syncActiveFilePath('),
		);
		expect(handler).toContain('this._syncActiveFilePath(');
		const guardAt = handler.indexOf("!== 'opened') {");
		const scheduleAt = handler.indexOf('queueMicrotask(');
		// Both must be present, or `indexOf` returning -1 would satisfy the
		// ordering check vacuously and this test would stop guarding anything.
		expect(guardAt).toBeGreaterThan(-1);
		expect(scheduleAt).toBeGreaterThan(-1);
		expect(guardAt).toBeLessThan(scheduleAt);
	});
});

describe('BT5-013 service lifecycle and notifications (U130 B-a05)', () => {
	it('exposes onChange and fires it when loadStore resolves (criterion 1)', async () => {
		const adapter = makeFakeAdapter(JSON.stringify({ 'a.md': 100, 'b.md': 200 }));
		const app = makeApp(adapter, ['a.md', 'b.md']);
		const svc = new LastOpenedService(app, 'test-plugin');

		const changes: any[] = [];
		const unsubscribe = svc.onChange((record) => changes.push(record));

		svc.onload();
		await svc.whenLoaded();

		expect(adapter.read).toHaveBeenCalledTimes(1);
		expect(changes).toHaveLength(1);
		expect(changes[0]).toEqual({ 'a.md': 100, 'b.md': 200 });

		unsubscribe();
	});

	it('fires onChange when handleFileOpen updates the record (criterion 1)', async () => {
		const adapter = makeFakeAdapter(null);
		const app = makeApp(adapter, ['new.md']);
		const svc = new LastOpenedService(app, 'test-plugin');

		const changes: any[] = [];
		svc.onChange((record) => changes.push(record));

		svc.onload();
		await svc.whenLoaded();

		// Clear the initial load notification
		changes.length = 0;

		const file = makeFile('new.md');
		svc.handleFileOpen(file, 300);

		// The change event fires immediately (debounce is for write, not notification)
		expect(changes).toHaveLength(1);
		expect(changes[0]).toEqual({ 'new.md': 300 });
	});

	it('fires onChange on rename and delete (criterion 1)', async () => {
		const adapter = makeFakeAdapter(JSON.stringify({ 'old.md': 100, 'other.md': 200 }));
		const app = makeApp(adapter, ['old.md', 'other.md', 'renamed.md']);
		const svc = new LastOpenedService(app, 'test-plugin');

		const changes: any[] = [];
		svc.onChange((record) => changes.push(record));

		svc.onload();
		await svc.whenLoaded();
		changes.length = 0;

		svc.handleRename('renamed.md', 'old.md');
		expect(changes[changes.length - 1]).toEqual({ 'renamed.md': 100, 'other.md': 200 });

		svc.handleDelete('other.md');
		expect(changes[changes.length - 1]).toEqual({ 'renamed.md': 100 });
	});
});

describe('BT5-013 explorer re-renders when store arrives (U130 B-a05 criterion 2)', () => {
	it('explorer receives empty record before load, full record after load', async () => {
		const adapter = makeFakeAdapter(JSON.stringify({ 'a.md': 100 }));
		const app = makeApp(adapter, ['a.md']);
		const svc = new LastOpenedService(app, 'test-plugin');

		const snapshots: any[] = [];
		svc.onChange((record) => snapshots.push(record));

		// Before load: no notification yet
		expect(snapshots).toHaveLength(0);

		svc.onload();
		await svc.whenLoaded();

		// After load: received the full record
		expect(snapshots).toHaveLength(1);
		expect(snapshots[0]).toEqual({ 'a.md': 100 });
	});
});

describe('BT5-013 robust flush on unload and mobile (U130 B-a05 criterion 3)', () => {
	it('onunload awaits the pending write', async () => {
		const adapter = makeFakeAdapter(null);
		const app = makeApp(adapter, ['test.md']);
		const svc = new LastOpenedService(app, 'test-plugin');

		svc.onload();
		await svc.whenLoaded();

		const file = makeFile('test.md');
		svc.handleFileOpen(file, 500);

		// onunload should await the flush
		await svc.onunload();

		expect(adapter.write).toHaveBeenCalled();
		const written = JSON.parse(adapter.stored);
		expect(written).toEqual({ 'test.md': 500 });
	});

	it('registers quit and visibilitychange listeners for mobile flush', async () => {
		const adapter = makeFakeAdapter(null);
		const app = makeApp(adapter, []);
		const svc = new LastOpenedService(app, 'test-plugin');

		svc.onload();
		await svc.whenLoaded();

		// The listeners are registered via registerEvent/register
		// We verify by checking that workspace.on was called for 'quit'
		expect(app.workspace.on).toHaveBeenCalledWith('quit', expect.any(Function));

	});

	it('flushes the pending write when the document goes hidden (Android backgrounding)', async () => {
		const listeners = new Map<string, () => void>();
		const fakeDocument = {
			visibilityState: 'visible' as DocumentVisibilityState,
			addEventListener: vi.fn((type: string, cb: () => void) => listeners.set(type, cb)),
			removeEventListener: vi.fn((type: string) => listeners.delete(type)),
		};
		vi.stubGlobal('document', fakeDocument);
		try {
			const adapter = makeFakeAdapter(null);
			const app = makeApp(adapter, ['test.md']);
			const svc = new LastOpenedService(app, 'test-plugin');
			svc.onload();
			await svc.whenLoaded();
			expect(listeners.has('visibilitychange')).toBe(true);

			svc.handleFileOpen(makeFile('test.md'), 500);
			expect(adapter.write).not.toHaveBeenCalled();

			fakeDocument.visibilityState = 'hidden';
			listeners.get('visibilitychange')!();
			await Promise.resolve();
			await Promise.resolve();
			expect(adapter.write).toHaveBeenCalledTimes(1);
			expect(JSON.parse(adapter.stored)).toEqual({ 'test.md': 500 });

			svc.unload();
			expect(listeners.has('visibilitychange')).toBe(false);
		} finally {
			vi.unstubAllGlobals();
		}
	});
});

describe('BT5-013 roundtrip: N opens -> flush -> new service -> loadStore -> N opens present (U130 B-a05 criterion 4)', () => {
	it('persists and restores multiple file opens across service instances', async () => {
		const adapter = makeFakeAdapter(null);
		const app = makeApp(adapter, ['a.md', 'b.md', 'c.md']);

		// First service instance: open N files
		const svc1 = new LastOpenedService(app, 'test-plugin');
		svc1.onload();
		await svc1.whenLoaded();

		const files = ['a.md', 'b.md', 'c.md'].map((p) => makeFile(p));
		files.forEach((f, i) => svc1.handleFileOpen(f, 1000 + i * 100));

		// Explicit flush (simulates quit/visibilitychange)
		await svc1.flush();
		await svc1.onunload();

		// Second service instance with same adapter (simulates restart)
		const svc2 = new LastOpenedService(app, 'test-plugin');
		const restored: any[] = [];
		svc2.onChange((r) => restored.push(r));

		svc2.onload();
		await svc2.whenLoaded();

		expect(adapter.read).toHaveBeenCalledTimes(2); // once per service load
		expect(restored).toHaveLength(1);
		expect(restored[0]).toEqual({
			'a.md': 1000,
			'b.md': 1100,
			'c.md': 1200,
		});

		// Verify the data is queryable
		expect(svc2.getLastOpened(files[0])).toBe(1000);
		expect(svc2.getLastOpened(files[1])).toBe(1100);
		expect(svc2.getLastOpened(files[2])).toBe(1200);
	});
});

describe('BT5-013 negative guards (U130 B-a05)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('has no synchronous writes on file open (debounce preserved)', async () => {
		const adapter = makeFakeAdapter(null);
		const app = makeApp(adapter);
		const svc = new LastOpenedService(app, 'test-plugin');

		svc.onload();
		await svc.whenLoaded();

		const file = makeFile('test.md');
		svc.handleFileOpen(file, 100);

		// Write should not have happened yet (debounced)
		expect(adapter.write).not.toHaveBeenCalled();

		// Fast-forward past debounce
		await vi.advanceTimersByTimeAsync(2100);

		expect(adapter.write).toHaveBeenCalledTimes(1);
	});

	it('has no void this.loadStore() fire-and-forget', () => {
		// The source should not contain 'void this.loadStore()'
		expect(lastOpenedServiceSource).not.toContain('void this.loadStore()');
		// Instead it should retain the promise
		expect(lastOpenedServiceSource).toContain('this.loadPromise = this.loadStore()');
	});
});