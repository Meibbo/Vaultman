import { TFile, type DataAdapter } from 'obsidian';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LastOpenedService } from '../../src/services/serviceLastOpened';

const root = '.obsidian/plugins/vaultman';

function fixture(initial = '{"a.md":100,"b.md":200}') {
	const disk = new Map<string, string>([[`${root}/last-opened.json`, initial]]);
	let files: TFile[] = [];
	let ready: (() => void) | undefined;
	const adapter = {
		exists: vi.fn(async (path: string) => disk.has(path)),
		read: vi.fn(async (path: string) => {
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
		vault: { configDir: '.obsidian', adapter, getFiles: () => files },
		workspace: { on: vi.fn(), onLayoutReady: (cb: () => void) => { ready = cb; } },
	};
	// The host owns only the adapter operations used by the service.
	const service = new LastOpenedService(host, 'vaultman', 60_000);
	return { service, host, disk, adapter, file: (path: string) => Object.assign(new TFile(), { path }), layoutReady: () => {
		files = ['a.md', 'b.md', 'c.md'].map((path) => Object.assign(new TFile(), { path }));
		ready?.();
	} };
}

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('last-opened persistence at startup', () => {
	it('recovers a completed pending snapshot when replacement was interrupted', async () => {
		const f = fixture(); // Given: canonical removed, pending file fully written.
		f.disk.delete(`${root}/last-opened.json`);
		f.disk.set(`${root}/last-opened.json.pending`, '{"a.md":500}');
		f.service.onload(); // When: startup resumes the interrupted replacement.
		await f.service.whenLoaded();
		expect(f.service.getLastOpened(f.file('a.md'))).toBe(500); // Then: last opening survives.
		f.service.onunload();
	});
	it('retains disk entries while the vault is still enumerating', async () => {
		// Given: persisted opens and an empty startup file inventory.
		const f = fixture();
		// When: hydration completes before layout restoration.
		f.service.onload();
		await f.service.whenLoaded();
		await f.service.flush();
		// Then: neither the projection nor the durable record is erased.
		expect(f.service.getLastOpened(f.file('a.md'))).toBe(100);
		expect(JSON.parse(f.disk.get(`${root}/last-opened.json`) ?? 'null')).toEqual({ 'a.md': 100, 'b.md': 200 });
		f.service.onunload();
	});

	it('replays an opening received before the disk read resolves', async () => {
		// Given: a stored record and startup still loading.
		const f = fixture();
		// When: an opening arrives before hydration completes.
		f.service.onload();
		f.service.handleFileOpen(f.file('c.md'), 300);
		await f.service.whenLoaded();
		f.layoutReady();
		await f.service.flush();
		// Then: old entries and the early opening survive together.
		expect(JSON.parse(f.disk.get(`${root}/last-opened.json`) ?? 'null')).toEqual({ 'a.md': 100, 'b.md': 200, 'c.md': 300 });
		f.service.onunload();
	});
});

describe('optional opening journal', () => {
	it('keeps only the latest by default and does not create history batches', async () => {
		const f = fixture('{}'); // Given: recording is off by default.
		f.service.onload();
		await f.service.whenLoaded();
		f.service.handleFileOpen(f.file('a.md'), 300); // When: the same file opens twice.
		f.service.handleFileOpen(f.file('a.md'), 400);
		await f.service.flush();
		expect(f.service.getLastOpened(f.file('a.md'))).toBe(400); // Then: latest only.
		expect(await f.service.getHistory()).toEqual([]);
		expect(f.adapter.mkdir).not.toHaveBeenCalled();
		f.service.onunload();
	});

	it('retains every opted-in event including repeated timestamps and pauses without erasing', async () => {
		const f = fixture('{}'); // Given: opt-in capture.
		f.service.setRecordAllOpens(true);
		f.service.onload();
		await f.service.whenLoaded();
		f.service.handleFileOpen(f.file('a.md'), 300); // When: two events followed by opt-out.
		f.service.handleFileOpen(f.file('a.md'), 300);
		f.service.setRecordAllOpens(false);
		f.service.handleFileOpen(f.file('a.md'), 400);
		await f.service.flush();
		const restarted = new LastOpenedService(f.host, 'vaultman');
		restarted.onload();
		await restarted.whenLoaded();
		expect(await restarted.getHistory()).toEqual([{ path: 'a.md', at: 300 }, { path: 'a.md', at: 300 }]);
		expect(restarted.getLastOpened(f.file('a.md'))).toBe(400); // Then: journal and latest independent.
		f.service.onunload();
		restarted.onunload();
	});

	it('does not duplicate a durable journal batch when the snapshot write fails and is retried', async () => {
		const f = fixture('{}'); // Given: opt-in and one snapshot failure after journal success.
		f.service.setRecordAllOpens(true);
		f.service.onload();
		await f.service.whenLoaded();
		let fail = true;
		f.adapter.write.mockImplementation(async (path, content) => {
			if (path.endsWith('/last-opened.json.pending') && fail) { fail = false; throw new Error('snapshot failed'); }
			f.disk.set(path, content);
		});
		f.service.handleFileOpen(f.file('a.md'), 300);
		await expect(f.service.flush()).rejects.toThrow('snapshot failed');
		await f.service.flush(); // When: retry succeeds.
		expect(await f.service.getHistory()).toEqual([{ path: 'a.md', at: 300 }]); // Then: exactly one event.
		f.service.onunload();
	});
});

describe('independent history clear', () => {
	it('does not resurrect a pre-clear journal while snapshot serialization yields', async () => {
		const f = fixture(); // Given: a snapshot writer that yields between entries.
		f.service.setRecordAllOpens(true);
		f.service.onload();
		await f.service.whenLoaded();
		vi.useFakeTimers();
		let clock = 0;
		vi.spyOn(performance, 'now').mockImplementation(() => clock += 5);
		f.service.handleFileOpen(f.file('a.md'), 300);
		const flushing = f.service.flush();
		await Promise.resolve();
		await Promise.resolve();
		const clearing = f.service.clearHistory(); // When: clear crosses an in-flight serialization.
		f.service.handleFileOpen(f.file('b.md'), 400);
		await vi.runAllTimersAsync();
		await Promise.all([flushing, clearing]);
		expect(await f.service.getHistory()).toEqual([{ path: 'b.md', at: 400 }]); // Then: only post-clear history.
		f.service.onunload();
	});
	it('discards pre-clear hydration and retains openings arriving after the clear boundary', async () => {
		const f = fixture(); // Given: startup loading an old snapshot.
		f.disk.set(`${root}/data.json`, '{"language":"es","recordAllFileOpens":true}');
		f.service.setRecordAllOpens(true);
		f.service.onload();
		f.service.handleFileOpen(f.file('a.md'), 300);
		const clear = f.service.clearHistory(); // When: clear followed by a new opening.
		f.service.handleFileOpen(f.file('b.md'), 400);
		await clear;
		expect(f.service.getLastOpened(f.file('a.md'))).toBeNull(); // Then: old entries gone, new event survives.
		expect(f.service.getLastOpened(f.file('b.md'))).toBe(400);
		expect(await f.service.getHistory()).toEqual([{ path: 'b.md', at: 400 }]);
		expect(f.disk.get(`${root}/data.json`)).toBe('{"language":"es","recordAllFileOpens":true}');
		f.service.onunload();
	});

	it('recovers an unreadable snapshot only through an explicit clear', async () => {
		const f = fixture('corrupt JSON'); // Given: unreadable existing data.
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		f.service.onload();
		await expect(f.service.whenLoaded()).rejects.toThrow();
		f.service.handleFileOpen(f.file('a.md'), 300);
		await expect(f.service.flush()).rejects.toThrow();
		expect(f.disk.get(`${root}/last-opened.json`)).toBe('corrupt JSON');
		await f.service.clearHistory(); // When: user deliberately clears the broken store.
		f.service.handleFileOpen(f.file('b.md'), 400);
		await f.service.flush();
		expect(JSON.parse(f.disk.get(`${root}/last-opened.json`) ?? 'null')).toEqual({ 'b.md': 400 });
		f.service.onunload();
	});

	it('holds new persistence behind a failed clear until the user retries', async () => {
		const f = fixture('{}'); // Given: an old journal and a failing directory removal.
		f.service.setRecordAllOpens(true);
		f.service.onload();
		await f.service.whenLoaded();
		f.service.handleFileOpen(f.file('a.md'), 300);
		await f.service.flush();
		f.adapter.rmdir.mockRejectedValueOnce(new Error('clear failed'));
		await expect(f.service.clearHistory()).rejects.toThrow('clear failed');
		f.service.handleFileOpen(f.file('b.md'), 400); // When: an opening follows the failed barrier.
		await expect(f.service.flush()).rejects.toThrow(); // Then: it must not append to old history.
		await f.service.clearHistory();
		expect(await f.service.getHistory()).toEqual([]);
		f.service.onunload();
	});
});

describe('interrupted replacement recovery (Oracle blockers)', () => {
	it('promotes a valid newer pending snapshot beside its canonical file', async () => {
		const f = fixture(); // Given: old canonical + newer complete pending.
		f.disk.set(`${root}/last-opened.json.pending`, '{"a.md":500}');
		f.service.onload(); // When: startup finds both files.
		await f.service.whenLoaded();
		expect(f.service.getLastOpened(f.file('a.md'))).toBe(500); // Then: pending wins and is promoted.
		expect(f.disk.get(`${root}/last-opened.json`)).toBe('{"a.md":500}');
		expect(f.disk.has(`${root}/last-opened.json.pending`)).toBe(false);
		f.service.onunload();
	});

	it('returns the pending batch contents when a batch pending coexists', async () => {
		const f = fixture('{}');
		f.service.setRecordAllOpens(true);
		f.service.onload();
		await f.service.whenLoaded();
		const batch = `${root}/opened-history/0000000000-writer.json`;
		f.disk.set(`${root}/opened-history`, '');
		f.disk.set(batch, JSON.stringify([{ path: 'old.md', at: 100 }]));
		f.disk.set(`${batch}.pending`, JSON.stringify([{ path: 'new.md', at: 200 }]));
		const history = await f.service.getHistory(); // When: canonical + pending batch coexist.
		expect(history).toEqual([{ path: 'new.md', at: 200 }]); // Then: pending wins, no duplication.
		expect(f.disk.get(batch)).toBe(JSON.stringify([{ path: 'new.md', at: 200 }]));
		f.service.onunload();
	});

	it('uses the canonical snapshot and preserves a corrupt pending aside', async () => {
		const f = fixture(); // Given: valid canonical + unreadable pending.
		f.disk.set(`${root}/last-opened.json.pending`, 'corrupt JSON');
		f.service.onload();
		await f.service.whenLoaded();
		expect(f.service.getLastOpened(f.file('a.md'))).toBe(100); // Then: canonical projected.
		const aside = [...f.disk.keys()].find((key) => key.startsWith(`${root}/last-opened.json.corrupt-`));
		expect(aside).toBeDefined(); // And: pending preserved aside, not overwritten.
		expect(f.disk.get(aside!)).toBe('corrupt JSON');
		f.service.onunload();
	});

	it('completes an interrupted clear and removes the marker on startup', async () => {
		const f = fixture(); // Given: a clear interrupted between its stores.
		f.disk.set(`${root}/opened-history-clear.json`, '{}');
		f.disk.set(`${root}/opened-history`, '');
		f.disk.set(`${root}/opened-history/0000000000-writer.json`, JSON.stringify([{ path: 'a.md', at: 100 }]));
		f.service.onload();
		await f.service.whenLoaded();
		expect(f.service.getLastOpened(f.file('a.md'))).toBeNull(); // Then: both stores erased.
		expect(await f.service.getHistory()).toEqual([]);
		expect(f.disk.has(`${root}/opened-history-clear.json`)).toBe(false);
		f.service.onunload();
	});

	it('isolates a throwing change observer so hydration and flush survive', async () => {
		const f = fixture();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		f.service.onChange(() => { throw new Error('observer boom'); });
		f.service.onload();
		await f.service.whenLoaded(); // When: hydration notifies a throwing observer.
		f.service.handleFileOpen(f.file('c.md'), 300);
		await f.service.flush(); // Then: persistence still works.
		expect(JSON.parse(f.disk.get(`${root}/last-opened.json`) ?? 'null')).toEqual({ 'a.md': 100, 'b.md': 200, 'c.md': 300 });
		f.service.onunload();
	});

	it('completes the clear barrier despite a throwing reset observer', async () => {
		const f = fixture();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		f.service.setRecordAllOpens(true);
		f.service.onload();
		await f.service.whenLoaded();
		f.service.handleFileOpen(f.file('a.md'), 300);
		await f.service.flush();
		f.service.onReset(() => { throw new Error('reset boom'); });
		await f.service.clearHistory(); // When: clear notifies a throwing observer.
		expect(await f.service.getHistory()).toEqual([]); // Then: both stores cleared.
		expect(f.service.getLastOpened(f.file('a.md'))).toBeNull();
		expect(f.disk.has(`${root}/opened-history-clear.json`)).toBe(false);
		f.service.onunload();
	});
});
