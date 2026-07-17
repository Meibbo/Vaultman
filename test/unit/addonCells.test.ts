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
});
