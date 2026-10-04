import type { DataAdapter } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';

import { PendingUpdatesStore, type PendingUpdateEntry } from '../../src/services/servicePendingUpdatesStore';

const dir = '.obsidian/plugins/vaultman/pending-updates';

function fixture(disk = new Map<string, string>()) {
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
	return { adapter, disk, store: new PendingUpdatesStore(adapter, dir) };
}

const entry = (id: string, pendingVersion = '2.0.0'): PendingUpdateEntry => ({
	id,
	pendingVersion,
	discoveredAt: 1000,
	checkId: 1,
	schema: 1,
});

describe('pending-updates durable discovery cache (C3)', () => {
	it('rehydrates persisted pending updates after a restart', async () => {
		const f = fixture();
		await f.store.persist([entry('alpha'), entry('beta', '3.0.0')]);

		// When: a new store instance loads the same directory (simulated restart).
		const reloaded = fixture(f.disk).store;
		const pending = await reloaded.load();

		expect([...pending.keys()].sort()).toEqual(['alpha', 'beta']);
		expect(pending.get('alpha')).toMatchObject({ id: 'alpha', pendingVersion: '2.0.0', schema: 1 });
		expect(pending.get('beta')?.pendingVersion).toBe('3.0.0');
	});

	it('quarantines a corrupt snapshot aside and keeps no phantom badges', async () => {
		const f = fixture(new Map([[`${dir}/v1.json`, 'not-json{{{']]));
		const pending = await f.store.load();

		expect([...pending.keys()]).toEqual([]);
		expect(f.disk.has(`${dir}/v1.json`)).toBe(false);
		const quarantined = [...f.disk.keys()].filter((key) => key.startsWith(`${dir}.corrupt-`));
		expect(quarantined).toHaveLength(1);
		expect(f.disk.get(quarantined[0])).toBe('not-json{{{');
	});

	it('recovers a completed pending write when replacement was interrupted', async () => {
		const disk = new Map<string, string>([
			[`${dir}/v1.json`, JSON.stringify({ schema: 1, entries: [entry('stale', '1.5.0')] })],
		]);
		const f = fixture(disk);
		// Given: canonical removed, pending file fully written (crash between remove and rename).
		disk.delete(`${dir}/v1.json`);
		disk.set(`${dir}/v1.json.pending`, JSON.stringify({ schema: 1, entries: [entry('alpha')] }));
		const pending = await f.store.load();

		expect([...pending.keys()]).toEqual(['alpha']);
	});

	it('rejects a wrong top-level schema without superseding a valid canonical file', async () => {
		const canonical = JSON.stringify({ schema: 1, entries: [entry('canonical')] });
		const f = fixture(new Map([
			[`${dir}/v1.json`, canonical],
			[`${dir}/v1.json.pending`, JSON.stringify({ schema: 2, entries: [entry('future')] })],
		]));

		const loaded = await f.store.load();

		expect([...loaded.keys()]).toEqual(['canonical']);
		expect(f.disk.get(`${dir}/v1.json`)).toBe(canonical);
	});

	it('preserves valid canonical bytes when pending read fails transiently', async () => {
		const canonical = JSON.stringify({ schema: 1, entries: [entry('canonical')] });
		const f = fixture(new Map([
			[`${dir}/v1.json`, canonical],
			[`${dir}/v1.json.pending`, JSON.stringify({ schema: 1, entries: [entry('pending')] })],
		]));
		f.adapter.read.mockImplementationOnce(async (path) => {
			if (path.endsWith('.pending')) throw new Error('EACCES');
			return canonical;
		});

		const loaded = await f.store.load();

		expect([...loaded.keys()]).toEqual(['canonical']);
		expect(f.disk.get(`${dir}/v1.json`)).toBe(canonical);
		expect(f.disk.get(`${dir}/v1.json.pending`)).toBeDefined();
	});

	it('preserves canonical bytes when pending recovery cannot remove canonical', async () => {
		const canonical = JSON.stringify({ schema: 1, entries: [entry('canonical')] });
		const pending = JSON.stringify({ schema: 1, entries: [entry('pending')] });
		const f = fixture(new Map([[`${dir}/v1.json`, canonical], [`${dir}/v1.json.pending`, pending]]));
		f.adapter.remove.mockRejectedValueOnce(new Error('EPERM'));

		const loaded = await f.store.load();

		expect([...loaded.keys()]).toEqual(['canonical']);
		expect(f.disk.get(`${dir}/v1.json`)).toBe(canonical);
		expect(f.disk.get(`${dir}/v1.json.pending`)).toBe(pending);
	});

	it('preserves recoverable pending bytes when pending promotion rename fails', async () => {
		const pending = JSON.stringify({ schema: 1, entries: [entry('pending')] });
		const f = fixture(new Map([[`${dir}/v1.json.pending`, pending]]));
		f.adapter.rename.mockRejectedValueOnce(new Error('EIO'));

		const loaded = await f.store.load();

		expect([...loaded.keys()]).toEqual(['pending']);
		expect(f.disk.get(`${dir}/v1.json.pending`)).toBe(pending);
	});

	it('does not discard canonical bytes when canonical read fails transiently', async () => {
		const canonical = JSON.stringify({ schema: 1, entries: [entry('canonical')] });
		const f = fixture(new Map([[`${dir}/v1.json`, canonical]]));
		f.adapter.read.mockRejectedValueOnce(new Error('EACCES'));

		const loaded = await f.store.load();

		expect([...loaded.keys()]).toEqual([]);
		expect(f.disk.get(`${dir}/v1.json`)).toBe(canonical);
	});

	it('leaves malformed bytes in place when quarantine rename fails', async () => {
		const malformed = 'not-json{{{';
		const f = fixture(new Map([[`${dir}/v1.json`, malformed]]));
		f.adapter.rename.mockRejectedValueOnce(new Error('EPERM'));

		await expect(f.store.load()).resolves.toEqual(new Map());
		expect(f.disk.get(`${dir}/v1.json`)).toBe(malformed);
		expect([...f.disk.keys()].some((key) => key.startsWith(`${dir}/v1.json.corrupt-`))).toBe(false);
	});

	it('drops invalid entries while keeping valid ones', async () => {
		const f = fixture(new Map([[`${dir}/v1.json`, JSON.stringify({
			schema: 1,
			entries: [entry('alpha'), { id: '', pendingVersion: 'x' }, { id: 'beta' }, 'junk'],
		})]]));
		const pending = await f.store.load();

		expect([...pending.keys()]).toEqual(['alpha']);
	});
});
