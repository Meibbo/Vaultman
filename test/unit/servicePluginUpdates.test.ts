import type { App } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';

import {
	createPluginUpdatesService,
	detectPluginUpdatesApi,
} from '../../src/services/servicePluginUpdates';

type FakeManager = Record<string, unknown>;

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
