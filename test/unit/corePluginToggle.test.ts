import { describe, expect, it, vi } from 'vitest';

import { toggleCommunityPlugin } from '../../src/logic/logicAddonCells';
import { setCommunityPluginEnabled } from '../../src/utils/obsidianAddons';

function coreAppWithMap() {
	const enable = vi.fn(async (_save?: boolean) => {});
	const disable = vi.fn(async (_save?: boolean) => {});
	const enablePluginAndSave = vi.fn(async (_id: string) => {});
	const disablePluginAndSave = vi.fn(async (_id: string) => {});
	const app = {
		plugins: {
			manifests: {
				alpha: { id: 'alpha', name: 'Alpha' },
			},
			enabledPlugins: new Set(['alpha']),
			plugins: {},
			enablePluginAndSave,
			disablePluginAndSave,
		},
		internalPlugins: {
			plugins: {
				graph: { enabled: false, instance: { name: 'Graph view' }, enable, disable },
			},
		},
		vault: { configDir: 'vault-config', adapter: {} },
	} as never;
	return { app, enable, disable, enablePluginAndSave, disablePluginAndSave };
}

describe('core plugin toggle via setCommunityPluginEnabled', () => {
	it('enables a core plugin through internalPlugins with persistence', async () => {
		const { app, enable } = coreAppWithMap();
		await expect(setCommunityPluginEnabled(app, 'graph', true)).resolves.toBe(
			true,
		);
		expect(enable).toHaveBeenCalledWith(true);
		expect(enable).toHaveBeenCalledTimes(1);
	});

	it('disables a core plugin through internalPlugins with persistence', async () => {
		const { app, disable } = coreAppWithMap();
		await expect(setCommunityPluginEnabled(app, 'graph', false)).resolves.toBe(
			true,
		);
		expect(disable).toHaveBeenCalledWith(true);
		expect(disable).toHaveBeenCalledTimes(1);
	});

	it('resolves core plugins via getPluginById when the map is absent', async () => {
		const enable = vi.fn(async (_save?: boolean) => {});
		const disable = vi.fn(async (_save?: boolean) => {});
		const core = { enabled: true, enable, disable };
		const app = {
			plugins: {
				manifests: { alpha: { id: 'alpha', name: 'Alpha' } },
				enabledPlugins: new Set<string>(),
				plugins: {},
				enablePluginAndSave: vi.fn(async () => {}),
				disablePluginAndSave: vi.fn(async () => {}),
			},
			internalPlugins: {
				getPluginById: vi.fn((id: string) =>
					id === 'backlink' ? core : undefined,
				),
			},
			vault: { configDir: 'vault-config', adapter: {} },
		} as never;

		await expect(setCommunityPluginEnabled(app, 'backlink', true)).resolves.toBe(
			true,
		);
		await expect(setCommunityPluginEnabled(app, 'backlink', false)).resolves.toBe(
			true,
		);
		expect(enable).toHaveBeenCalledWith(true);
		expect(disable).toHaveBeenCalledWith(true);
	});

	it('toggles core plugin stubs through logicAddonCells without returning false', async () => {
		const { app, enable, disable } = coreAppWithMap();
		await expect(
			toggleCommunityPlugin(app, {
				pluginId: 'graph',
				name: 'Graph view',
				enabled: false,
			} as never),
		).resolves.toBe(true);
		expect(enable).toHaveBeenCalledWith(true);
		await expect(
			toggleCommunityPlugin(app, {
				pluginId: 'graph',
				name: 'Graph view',
				enabled: true,
			} as never),
		).resolves.toBe(true);
		expect(disable).toHaveBeenCalledWith(true);
	});

	it('keeps toggling community plugins through the community manager', async () => {
		const { app, enablePluginAndSave, disablePluginAndSave } = coreAppWithMap();
		await expect(setCommunityPluginEnabled(app, 'alpha', false)).resolves.toBe(
			true,
		);
		expect(disablePluginAndSave).toHaveBeenCalledWith('alpha');
		await expect(setCommunityPluginEnabled(app, 'alpha', true)).resolves.toBe(
			true,
		);
		expect(enablePluginAndSave).toHaveBeenCalledWith('alpha');
	});
});
