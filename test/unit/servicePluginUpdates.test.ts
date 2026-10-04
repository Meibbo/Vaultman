import type { App } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';

import {
	createPluginUpdatesService,
	detectPluginUpdatesApi,
} from '../../src/services/servicePluginUpdates';

type FakeManager = Record<string, unknown>;

function deferred() {
	let resolve: () => void = () => undefined;
	const promise = new Promise<void>((release) => { resolve = release; });
	return { promise, resolve };
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
		installPlugin: vi.fn(async (_repo: string, version: string, manifest: { id: string }) => {
			const manifests = overrides.manifests as FakeManager | undefined;
			if (manifests) manifests[manifest.id] = { id: manifest.id, version };
		}),
		...overrides,
	};
}

describe('private Obsidian plugin updates adapter', () => {
	it('preserves all native manifest fields when installing an update', async () => {
		const manifest = { id: 'alpha', name: 'Alpha', version: '2.0.0', author: 'Author', description: 'Description', minAppVersion: '1.8.0', isDesktopOnly: true, fundingUrl: { GitHub: 'https://github.com/sponsors/example' } };
		const installPlugin = vi.fn();
		const plugins = manager({ installPlugin, updates: { alpha: { repo: 'owner/alpha', version: '2.0.0', manifest } } });
		const service = createPluginUpdatesService(appWith(plugins));
		await service.checkPluginUpdates();
		await service.updatePlugin('alpha');
		expect(installPlugin).toHaveBeenCalledWith('owner/alpha', '2.0.0', manifest);
	});

	it('does not install cached work after native updates disappear', async () => {
		const plugins = manager();
		const service = createPluginUpdatesService(appWith(plugins));
		await service.checkPluginUpdates();
		plugins.updates = {};
		await service.updatePlugin('alpha');
		expect(plugins.installPlugin).not.toHaveBeenCalled();
		expect(service.getPluginUpdate('alpha')).toBeUndefined();
	});

	it('joins an individual update when the batch adapter requests the same plugin', async () => {
		const gate = deferred();
		const manifests = { alpha: { id: 'alpha', name: 'Alpha', version: '1.0.0' } };
		const installPlugin = vi.fn(async () => { await gate.promise; manifests.alpha.version = '2.0.0'; });
		const service = createPluginUpdatesService(appWith(manager({ manifests, installPlugin })));
		await service.checkPluginUpdates();
		const individual = service.updatePlugin('alpha');
		let adapterSettled = false;
		const batchInstall = service.installPlugin('alpha').then(() => { adapterSettled = true; });
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		expect(adapterSettled).toBe(false);
		gate.resolve();
		await Promise.all([individual, batchInstall]);
		expect(installPlugin).toHaveBeenCalledTimes(1);
		expect(service.getInstalledVersion('alpha')).toBe('2.0.0');
	});

	it('waits for the current check before exposing its snapshot to an update-all action', async () => {
		const gate = deferred();
		const plugins = manager({ updates: {}, checkForUpdates: async () => {
			await gate.promise;
			plugins.updates = { alpha: { repo: 'owner/alpha', version: '2.0.0', manifest: { id: 'alpha', name: 'Alpha' } } };
		} });
		const service = createPluginUpdatesService(appWith(plugins));
		const checking = service.checkPluginUpdates();
		const snapshot = service.waitForCheck().then(() => service.snapshotPluginUpdateItems());
		gate.resolve();
		await checking;
		expect(await snapshot).toHaveLength(1);
	});

	it('reports the API as disabled when the manager shape is absent', () => {
		expect(detectPluginUpdatesApi(appWith())).toMatchObject({
			available: false,
			status: 'disabled',
		});
	});

	it('distinguishes offline and does not create update work', async () => {
		const plugins = manager();
		const service = createPluginUpdatesService(appWith(plugins), { isOnline: () => false });

		const result = await service.checkPluginUpdates();

		expect(result.availability.status).toBe('offline');
		expect(result.updates).toEqual([]);
		expect(plugins.checkForUpdates).not.toHaveBeenCalled();
	});

	it('calls only the interactive check and exposes badges from updates[id]', async () => {
		const plugins = manager({
			updates: {
				alpha: {
					repo: 'owner/alpha',
					version: '2.0.0',
					manifest: { id: 'alpha', name: 'Alpha' },
				},
				ghost: {
					repo: 'owner/ghost',
					version: '9.0.0',
					manifest: { id: 'other', name: 'Other' },
				},
			},
		});
		const service = createPluginUpdatesService(appWith(plugins));

		const result = await service.checkPluginUpdates();

		expect(plugins.checkForUpdates).toHaveBeenCalledWith(false);
		expect(result.updates).toEqual([{ id: 'alpha', version: '2.0.0' }]);
		expect(result.invalidPluginIds).toEqual(['ghost']);
		expect(service.getPluginUpdate('beta')).toBeUndefined();
	});

	it('keeps a broken manifest from blocking valid updates', async () => {
		const plugins = manager({
			updates: {
				broken: { repo: 'owner/broken', version: '2.0.0', manifest: {} },
				alpha: {
					repo: 'owner/alpha',
					version: '2.0.0',
					manifest: { id: 'alpha', name: 'Alpha' },
				},
			},
		});
		const service = createPluginUpdatesService(appWith(plugins));

		await expect(service.checkPluginUpdates()).resolves.toMatchObject({
			updates: [{ id: 'alpha', version: '2.0.0' }],
			invalidPluginIds: ['broken'],
		});
	});

	it('clears badges on a global check failure', async () => {
		const plugins = manager({
			checkForUpdates: vi.fn()
				.mockImplementationOnce(() => undefined)
				.mockImplementationOnce(() => { throw new Error('network failed'); }),
		});
		const service = createPluginUpdatesService(appWith(plugins), { throttleMs: 0 });

		await service.checkPluginUpdates();
		const result = await service.checkPluginUpdates();

		expect(result.availability.status).toBe('failed');
		expect(result.updates).toEqual([]);
	});

	it('uses the current update fields and warns when post-state disappears', async () => {
		const plugins = manager();
		const service = createPluginUpdatesService(appWith(plugins));
		await service.checkPluginUpdates();
		vi.mocked(plugins.installPlugin as (repo: string, version: string, manifest: { id: string }) => Promise<void>)
			.mockImplementation(async () => {
				(plugins.manifests as FakeManager).alpha = undefined;
			});

		const result = await service.updatePlugin('alpha');

		expect(plugins.installPlugin).toHaveBeenCalledWith(
			'owner/alpha',
			'2.0.0',
			{ id: 'alpha', name: 'Alpha', version: '2.0.0' },
		);
		expect(result).toMatchObject({ status: 'warning', message: 'Plugin disappeared after update' });
	});

	it('snapshots update items with native manifest names and installed versions', async () => {
		const plugins = manager();
		const service = createPluginUpdatesService(appWith(plugins));
		await service.checkPluginUpdates();

		expect(service.snapshotPluginUpdateItems()).toEqual([
			{ id: 'alpha', name: 'Alpha', fromVersion: '1.0.0', toVersion: '2.0.0' },
		]);
	});

	it('exposes throttle instead of silently checking again', async () => {
		let now = 100;
		const plugins = manager();
		const service = createPluginUpdatesService(appWith(plugins), {
			now: () => now,
			throttleMs: 1000,
		});

		await service.checkPluginUpdates();
		now = 500;
		const result = await service.checkPluginUpdates();

		expect(result.availability).toMatchObject({ status: 'throttled', retryAt: 1100 });
		expect(plugins.checkForUpdates).toHaveBeenCalledTimes(1);
	});
});
