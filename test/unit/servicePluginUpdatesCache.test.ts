import type { App, DataAdapter } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';

import { createPluginUpdatesService } from '../../src/services/servicePluginUpdates';
import { PendingUpdatesStore } from '../../src/services/servicePendingUpdatesStore';

type FakeManager = Record<string, unknown>;

const dir = '.obsidian/plugins/vaultman/pending-updates';

function memoryAdapter(disk: Map<string, string>) {
	return {
		exists: async (path: string) => disk.has(path),
		read: async (path: string) => {
			const value = disk.get(path);
			if (value === undefined) throw new Error('ENOENT');
			return value;
		},
		write: async (path: string, value: string) => { disk.set(path, value); },
		rename: async (source: string, target: string) => {
			if (disk.has(target)) throw new Error('Destination file already exists!');
			const content = disk.get(source);
			if (content === undefined) throw new Error('ENOENT');
			disk.set(target, content);
			disk.delete(source);
		},
		mkdir: async (path: string) => { disk.set(path, ''); },
		remove: async (path: string) => { disk.delete(path); },
		rmdir: async (path: string) => {
			for (const key of disk.keys()) if (key === path || key.startsWith(`${path}/`)) disk.delete(key);
		},
		list: async (path: string) => ({ files: [...disk.keys()].filter((key) => key.startsWith(`${path}/`)), folders: [] }),
	} satisfies Pick<DataAdapter, 'exists' | 'read' | 'write' | 'rename' | 'mkdir' | 'remove' | 'rmdir' | 'list'>;
}

function appWith(plugins?: FakeManager): App {
	return { plugins } as unknown as App;
}

function manager(overrides: FakeManager = {}): FakeManager {
	return {
		manifests: {
			alpha: { id: 'alpha', name: 'Alpha', version: '1.0.0' },
			beta: { id: 'beta', name: 'Beta', version: '1.0.0' },
		},
		updates: {
			alpha: {
				repo: 'owner/alpha',
				version: '2.0.0',
				manifest: { id: 'alpha', name: 'Alpha', version: '2.0.0' },
			},
		},
		checkForUpdates: vi.fn(),
		installPlugin: vi.fn(),
		...overrides,
	};
}

function wiredService(plugins: FakeManager, disk = new Map<string, string>(), options: { online?: () => boolean } = {}) {
	const store = new PendingUpdatesStore(memoryAdapter(disk), dir);
	const service = createPluginUpdatesService(appWith(plugins), {
		throttleMs: 0,
		pendingStore: store,
		...(options.online ? { isOnline: options.online } : {}),
	});
	return { service, store, disk };
}

describe('plugin updates durable discovery cache lifecycle (C3)', () => {
	it('keeps durable bytes after a restart warning with an empty native updates map', async () => {
		const disk = new Map<string, string>();
		const first = wiredService(manager(), disk);
		await first.service.checkPluginUpdates();
		const before = disk.get(`${dir}/v1.json`);
		const restartedPlugins = manager({ updates: {}, installPlugin: vi.fn() });
		const restarted = wiredService(restartedPlugins, disk);
		await restarted.service.whenHydrated();

		const result = await restarted.service.updatePlugin('alpha');

		expect(result.status).toBe('warning');
		expect(restartedPlugins.installPlugin).not.toHaveBeenCalled();
		expect(disk.get(`${dir}/v1.json`)).toBe(before);
	});

	it('does not badge a downgrade or clear the newer installed evidence', async () => {
		const plugins = manager({
			manifests: { alpha: { id: 'alpha', name: 'Alpha', version: '3.0.0' } },
		});
		const { service } = wiredService(plugins);

		const result = await service.checkPluginUpdates();

		expect(result.updates).toEqual([]);
		expect(service.getPluginUpdate('alpha')).toBeUndefined();
	});

	it('retains durable bytes when installed-version evidence is unavailable', async () => {
		const disk = new Map<string, string>();
		const initial = wiredService(manager(), disk);
		await initial.service.checkPluginUpdates();
		const before = disk.get(`${dir}/v1.json`);
		const missingManager = wiredService(manager({ manifests: {}, updates: {} }), disk);
		await missingManager.service.whenHydrated();
		await missingManager.service.checkPluginUpdates();

		expect(disk.get(`${dir}/v1.json`)).toBe(before);

		const restored = wiredService(manager({ updates: {} }), disk);
		await restored.service.whenHydrated();
		expect(restored.service.getPluginUpdate('alpha')).toEqual({ id: 'alpha', version: '2.0.0' });
	});

	it('retains badges when a later check goes offline', async () => {
		let online = true;
		const plugins = manager();
		const { service } = wiredService(plugins, new Map(), { online: () => online });
		await service.checkPluginUpdates();
		expect(service.getPluginUpdates()).toEqual([{ id: 'alpha', version: '2.0.0' }]);

		online = false;
		const result = await service.checkPluginUpdates();

		expect(result.availability.status).toBe('offline');
		expect(result.updates).toEqual([{ id: 'alpha', version: '2.0.0' }]);
		expect(service.getPluginUpdate('alpha')).toEqual({ id: 'alpha', version: '2.0.0' });
	});

	it('retains badges when a later global check fails', async () => {
		const plugins = manager({ checkForUpdates: vi.fn() });
		const { service } = wiredService(plugins);
		await service.checkPluginUpdates();
		vi.mocked(plugins.checkForUpdates as () => Promise<void>).mockRejectedValueOnce(new Error('network failed'));

		const result = await service.checkPluginUpdates();

		expect(result.availability.status).toBe('failed');
		expect(result.updates).toEqual([{ id: 'alpha', version: '2.0.0' }]);
	});

	it('rehydrates badges after a restart without a fresh native check', async () => {
		const disk = new Map<string, string>();
		const plugins = manager();
		const first = wiredService(plugins, disk);
		await first.service.checkPluginUpdates();
		expect(first.disk.has(`${dir}/v1.json`)).toBe(true);

		// When: restart loses the native updates map but keeps the disk cache.
		const restartedPlugins = manager({ updates: {} });
		const second = wiredService(restartedPlugins, disk);
		await second.service.whenHydrated();

		expect(second.service.getPluginUpdates()).toEqual([{ id: 'alpha', version: '2.0.0' }]);
	});

	it('keeps a stable target pending over a prerelease install during hydration', async () => {
		const disk = new Map<string, string>();
		const store = new PendingUpdatesStore(memoryAdapter(disk), dir);
		await store.persist([{ id: 'alpha', pendingVersion: '1.3.0', discoveredAt: 1000, checkId: 1, schema: 1 }]);
		const plugins = manager({
			manifests: { alpha: { id: 'alpha', name: 'Alpha', version: '1.3.0-beta.9' } },
			updates: {},
		});
		const { service } = wiredService(plugins, disk);

		await service.whenHydrated();

		expect(service.getPluginUpdate('alpha')).toEqual({ id: 'alpha', version: '1.3.0' });
	});

	it('counts an installed version newer than the target as completed after install', async () => {
		const disk = new Map<string, string>();
		const plugins = manager({
			installPlugin: vi.fn(async () => {
				(plugins.manifests as Record<string, { id: string; name: string; version: string }>).alpha.version = '3.0.0';
			}),
		});
		const { service } = wiredService(plugins, disk);
		await service.checkPluginUpdates();

		const result = await service.updatePlugin('alpha');

		expect(result).toMatchObject({ status: 'success', installedVersion: '3.0.0' });
		expect(service.getPluginUpdate('alpha')).toBeUndefined();
		expect(JSON.parse(disk.get(`${dir}/v1.json`) ?? '{}').entries).toEqual([]);
	});

	it('clears a cached pending update once installed reaches the target', async () => {
		const disk = new Map<string, string>();
		const plugins = manager();
		const first = wiredService(plugins, disk);
		await first.service.checkPluginUpdates();

		// When: alpha was updated to the pending target out of band.
		const updatedPlugins = manager({
			manifests: { alpha: { id: 'alpha', name: 'Alpha', version: '2.0.0' } },
			updates: {},
		});
		const second = wiredService(updatedPlugins, disk);
		await second.service.whenHydrated();

		expect(second.service.getPluginUpdates()).toEqual([]);
	});

	it('lets a newer native discovery supersede a stale cached version', async () => {
		const disk = new Map<string, string>();
		const stale = new PendingUpdatesStore(memoryAdapter(disk), dir);
		await stale.persist([{ id: 'alpha', pendingVersion: '1.5.0', discoveredAt: 500, checkId: 0, schema: 1 }]);

		const plugins = manager();
		const { service, store } = wiredService(plugins, disk);
		const result = await service.checkPluginUpdates();

		expect(result.updates).toEqual([{ id: 'alpha', version: '2.0.0' }]);
		expect((await store.load()).get('alpha')).toMatchObject({ pendingVersion: '2.0.0' });
	});

	it('never lets the cache authorize an install without live native authority', async () => {
		const disk = new Map<string, string>();
		const plugins = manager();
		const first = wiredService(plugins, disk);
		await first.service.checkPluginUpdates();

		const restartedPlugins = manager({ updates: {}, installPlugin: vi.fn() });
		const second = wiredService(restartedPlugins, disk);
		await second.service.whenHydrated();
		expect(second.service.getPluginUpdates()).toHaveLength(1);

		const result = await second.service.updatePlugin('alpha');
		expect(result.status).toBe('warning');
		expect(restartedPlugins.installPlugin).not.toHaveBeenCalled();
	});
});
