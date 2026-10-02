import { TFile, type DataAdapter } from 'obsidian';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LastOpenedService } from '../../src/services/serviceLastOpened';

const root = '.obsidian/plugins/vaultman';

function fixture(initial = '{}') {
	const disk = new Map<string, string>([[`${root}/last-opened.json`, initial]]);
	let gateReads = false;
	let releaseReads = () => {};
	const adapter = {
		exists: vi.fn(async (path: string) => disk.has(path)),
		read: vi.fn(async (path: string) => {
			if (gateReads && path.includes('opened-history')) {
				await new Promise<void>((resolve) => { releaseReads = resolve; });
			}
			const value = disk.get(path);
			if (value === undefined) throw new Error('ENOENT');
			return value;
		}),
		write: vi.fn(async (path: string, value: string) => { disk.set(path, value); }),
		rename: vi.fn(async (source: string, target: string) => {
			if (disk.has(target)) throw new Error('Destination file already exists!');
			const content = disk.get(source);
			if (content === undefined) throw new Error('ENOENT');
			disk.set(target, content);
			disk.delete(source);
		}),
		mkdir: vi.fn(async (path: string) => { disk.set(path, ''); }),
		remove: vi.fn(async (path: string) => { disk.delete(path); }),
		rmdir: vi.fn(async (path: string) => {
			for (const key of disk.keys()) if (key === path || key.startsWith(`${path}/`)) disk.delete(key);
		}),
		list: vi.fn(async (path: string) => ({ files: [...disk.keys()].filter((key) => key.startsWith(`${path}/`)), folders: [] })),
	} satisfies Pick<DataAdapter, 'exists' | 'read' | 'write' | 'rename' | 'mkdir' | 'remove' | 'rmdir' | 'list'>;
	const host = {
		vault: { configDir: '.obsidian', adapter, getFiles: () => [] },
		workspace: { on: vi.fn(), onLayoutReady: (cb: () => void) => { cb(); } },
	};
	const service = new LastOpenedService(host, 'vaultman', 60_000);
	return {
		service, host, disk, adapter,
		file: (path: string) => Object.assign(new TFile(), { path }),
		holdHistoryReads: () => { gateReads = true; },
		releaseHistoryReads: () => { gateReads = false; releaseReads(); },
	};
}

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('times-opened aggregate (SASI cell_counter / _timesOpened)', () => {
	it('counts opt-in openings per file while latest stays singular', async () => {
		const f = fixture(); // Given: recording on.
		f.service.setRecordAllOpens(true);
		f.service.onload();
		await f.service.whenLoaded();
		f.service.handleFileOpen(f.file('a.md'), 100); // When: a×2, b×1.
		f.service.handleFileOpen(f.file('a.md'), 200);
		f.service.handleFileOpen(f.file('b.md'), 150);
		expect(await f.service.getOpenCount('a.md')).toBe(2); // Then: aggregate per file...
		expect(await f.service.getOpenCount('b.md')).toBe(1);
		expect(await f.service.getOpenCount('never.md')).toBe(0);
		expect(f.service.getLastOpened(f.file('a.md'))).toBe(200); // ...while latest stays singular.
		f.service.onunload();
	});

	it('records nothing while the toggle is off, latest included', async () => {
		const f = fixture(); // Given: recording off by default.
		f.service.onload();
		await f.service.whenLoaded();
		f.service.handleFileOpen(f.file('a.md'), 100); // When: two opens.
		f.service.handleFileOpen(f.file('a.md'), 200);
		expect(await f.service.getOpenCount('a.md')).toBe(0); // Then: no aggregate...
		expect(f.service.getLastOpened(f.file('a.md'))).toBe(200); // ...but latest still tracked.
		f.service.onunload();
	});

	it('hydrates lazily from pre-existing journal batches', async () => {
		const f = fixture(); // Given: a journal written by an earlier session.
		f.disk.set(`${root}/opened-history`, '');
		f.disk.set(
			`${root}/opened-history/0000000000-writer.json`,
			JSON.stringify([{ path: 'a.md', at: 100 }, { path: 'a.md', at: 200 }, { path: 'b.md', at: 150 }]),
		);
		f.service.onload();
		await f.service.whenLoaded();
		expect(await f.service.getOpenCount('a.md')).toBe(2); // When/then: counted on first request.
		expect(await f.service.getOpenCount('b.md')).toBe(1);
		f.service.onunload();
	});

	it('migrates the aggregate on rename and drops it on delete', async () => {
		const f = fixture();
		f.service.setRecordAllOpens(true);
		f.service.onload();
		await f.service.whenLoaded();
		f.service.handleFileOpen(f.file('a.md'), 100);
		f.service.handleFileOpen(f.file('a.md'), 200);
		expect(await f.service.getOpenCount('a.md')).toBe(2);
		f.service.handleRename('renamed.md', 'a.md'); // When: rename then delete.
		expect(await f.service.getOpenCount('renamed.md')).toBe(2); // Then: count follows the file.
		expect(await f.service.getOpenCount('a.md')).toBe(0);
		f.service.handleDelete('renamed.md');
		expect(await f.service.getOpenCount('renamed.md')).toBe(0);
		f.service.onunload();
	});

	it('restarts the aggregate from zero after a clear', async () => {
		const f = fixture();
		f.service.setRecordAllOpens(true);
		f.service.onload();
		await f.service.whenLoaded();
		f.service.handleFileOpen(f.file('a.md'), 100);
		expect(await f.service.getOpenCount('a.md')).toBe(1);
		await f.service.clearHistory(); // When: explicit clear.
		expect(await f.service.getOpenCount('a.md')).toBe(0); // Then: aggregate restarts.
		f.service.handleFileOpen(f.file('b.md'), 200);
		expect(await f.service.getOpenCount('b.md')).toBe(1);
		f.service.onunload();
	});

	it('discards a hydration that was in flight when the clear landed', async () => {
		const f = fixture(); // Given: journaled history and a gated read.
		f.disk.set(`${root}/opened-history`, '');
		f.disk.set(
			`${root}/opened-history/0000000000-writer.json`,
			JSON.stringify([{ path: 'a.md', at: 100 }]),
		);
		f.service.setRecordAllOpens(true);
		f.service.onload();
		await f.service.whenLoaded();
		f.holdHistoryReads();
		const hydrating = f.service.getOpenCount('a.md'); // When: hydration starts, then clear.
		await Promise.resolve();
		const clearing = f.service.clearHistory();
		f.releaseHistoryReads();
		await Promise.all([hydrating, clearing]);
		expect(await f.service.getOpenCount('a.md')).toBe(0); // Then: stale counts never install.
		f.service.handleFileOpen(f.file('b.md'), 200);
		expect(await f.service.getOpenCount('b.md')).toBe(1);
		f.service.onunload();
	});
});
