import { describe, expect, it, vi } from 'vitest';

import {
	hasPluginSettingsTab,
	openPluginSettings,
} from '../../src/logic/logicAddonCells';

describe('add-on cell settings adapter', () => {
	it('detects registered plugin setting tabs by their runtime id', () => {
		const app = {
			setting: {
				pluginTabs: {
					first: { id: 'alpha', name: 'Alpha' },
					second: { id: 'beta', name: 'Beta' },
				},
			},
		} as never;

		expect(hasPluginSettingsTab(app, 'alpha')).toBe(true);
		expect(hasPluginSettingsTab(app, 'missing')).toBe(false);
	});

	it('opens only registered plugin setting tabs', () => {
		const open = vi.fn();
		const openTabById = vi.fn();
		const app = {
			setting: {
				pluginTabs: [{ id: 'alpha', name: 'Alpha' }],
				open,
				openTabById,
			},
		} as never;

		expect(openPluginSettings(app, 'missing')).toBe(false);
		expect(open).not.toHaveBeenCalled();
		expect(openPluginSettings(app, 'alpha')).toBe(true);
		expect(open).toHaveBeenCalledOnce();
		expect(openTabById).toHaveBeenCalledWith('alpha');
	});

	it('detects and toggles core plugins via internalPlugins API', async () => {
		const enable = vi.fn().mockResolvedValue(undefined);
		const disable = vi.fn();
		const requestSaveConfig = vi.fn();
		const app = {
			internalPlugins: {
				plugins: {
					canvas: { enabled: false, enable, disable },
					bookmarks: { enabled: true, enable, disable },
				},
				getPluginById: (id: string) => {
					if (id === 'canvas') return { enabled: false, enable, disable };
					if (id === 'bookmarks') return { enabled: true, enable, disable };
					return null;
				},
				requestSaveConfig,
			},
		} as never;

		const { isCorePlugin, toggleCorePlugin, togglePlugin } = await import('../../src/logic/logicAddonCells');

		expect(isCorePlugin(app, 'canvas')).toBe(true);
		expect(isCorePlugin(app, 'dataview')).toBe(false);

		// Enable core plugin
		const enabledRes = await toggleCorePlugin(app, 'canvas', true);
		expect(enabledRes).toBe(true);
		expect(enable).toHaveBeenCalledWith(true);
		expect(requestSaveConfig).toHaveBeenCalled();

		// Disable core plugin
		const disabledRes = await toggleCorePlugin(app, 'bookmarks', false);
		expect(disabledRes).toBe(true);
		expect(disable).toHaveBeenCalledWith(true);

		// Unified togglePlugin on core plugin
		const toggleRes = await togglePlugin(app, {
			pluginId: 'canvas',
			name: 'Canvas',
			enabled: false,
			loaded: true,
			isVaultman: false,
		});
		expect(toggleRes).toBe(true);
	});
});
