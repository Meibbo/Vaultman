import { describe, expect, it, vi } from 'vitest';

import { VaultmanPlugin } from '../../src/main';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
import { DEFAULT_SETTINGS, type VaultmanSettings } from '../../src/types/typeSettings';
import type { ThemePreset } from '../../src/types/typeThemePreset';

const customPreset: ThemePreset = {
	source: 'custom',
	id: 'focus',
	displayName: 'Focus',
	extends: 'vaultman',
	useNativeDom: false,
	chrome: {
		popupBgOpacity: 0.8,
		popupBackdropBlur: '2px',
		popupBgTint: 0.1,
	},
	density: { rowHeight: '30px', rowPaddingY: '3px', iconSize: '15px' },
	dock: { visible: true, presentation: 'bar' },
	tabs: { visible: true, presentation: 'top-tabs', kind: 'embedded' },
	toolbar: { buttons: 'full' },
	viewModes: ['tree', 'list'],
	nodeElements: {
		icon: true,
		label: true,
		detail: true,
		media: false,
		badges: { ops: true, filters: false, warnings: true, inherited: false, counts: false },
		actions: true,
	},
	lockNodeElementVisibility: true,
	unload: ['navigation:hide', 'explorerProviders:dispose'],
	layout: { mode: 'fixed' },
	workspaceId: 'unit',
};

describe('VaultmanPlugin theme settings sync', () => {
	it('syncs live ThemeService state into settings before saving', async () => {
		const settings = structuredClone(DEFAULT_SETTINGS) as VaultmanSettings;
		const themeService = new ThemeService();
		themeService.registerCustomPreset(customPreset);
		themeService.setPreset('native');
		const saveData = vi.fn(async () => {});

		await VaultmanPlugin.prototype.saveSettings.call({
			settings,
			themeService,
			saveData,
		});

		expect(settings.elasticUi.themePresetId).toBe('native');
		expect(settings.elasticUi.customPresets).toEqual([customPreset]);
		expect(saveData).toHaveBeenCalledWith(settings);
	});

	it('disposes ThemeService runtime styles on unload', () => {
		const dispose = vi.fn();

		VaultmanPlugin.prototype.onunload.call({
			themeService: { dispose },
			uninstallPerfProbe: undefined,
			opsLogService: { dispose: vi.fn() },
			filterService: { destroy: vi.fn() },
		});

		expect(dispose).toHaveBeenCalledOnce();
	});
});
