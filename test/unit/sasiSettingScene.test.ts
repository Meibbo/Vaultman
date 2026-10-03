import { describe, expect, it } from 'vitest';

import { registerSettingSceneCatalog } from '../../src/logic/logicSasiSettingScene';
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { createSasiProvider } from '../../src/services/serviceSasiProvider';

const ACTION_IDS = [
	'check_plugin_updates',
	'update_plugin',
	'update_all_plugins',
	'browse_community_plugins',
	'open_restricted_mode',
	'group_toggle_cascade',
	'go_to_setting_content',
];

describe('U130 Slice C SASI settingScene catalog', () => {
	it('lists provider, scene kinds, panels, modes and contexts separately', () => {
		const registry = createSasiRegistry();
		registerSettingSceneCatalog(registry);

		expect(registry.list('provider').map((entry) => entry.id)).toEqual(['plugins']);
		expect(registry.list('kind').map((entry) => entry.id)).toEqual([
			'node_settings',
			'node_plugin',
			'node_plugin_core',
			'node_plugin_community',
			'node_group',
			'node_group_custom',
			'cell_badge_update',
			'panelExplorer',
			'panelContent',
			'settings-explorer',
			'settings-content',
			'settingScene.toolbar',
			'node_plugin.cmenu',
			'node_group.cmenu',
		]);
		expect(registry.list('function').map((entry) => entry.id)).toEqual(ACTION_IDS);
	});

	it('keeps all settingScene actions as Action and excludes cell placement', () => {
		const registry = createSasiRegistry();
		registerSettingSceneCatalog(registry);

		expect(registry.listActions().map((entry) => entry.id)).toEqual(ACTION_IDS);
		expect(registry.listOperations()).toEqual([]);
		expect(registry.list('kind').find((entry) => entry.id === 'cell_badge_update')).toMatchObject({
		axis: 'kind',
		catalogKind: 'cell_badge_update',
	});
	});

	it('preserves structured unavailable state for blocked content navigation', () => {
		const registry = createSasiRegistry();
		registerSettingSceneCatalog(registry);

		expect(registry.resolve('go_to_setting_content')).toEqual({
		def: expect.objectContaining({
			kind: 'action',
			availability: {
				status: 'unavailable',
				reason: {
					code: 'setting_content_executor_blocked',
					labelKey: 'sasi.settingScene.unavailable.content_executor',
				},
			},
		}) as unknown,
		available: false,
		});
	});

	it('exposes supports and availability through the SASI provider', () => {
		const registry = createSasiRegistry();
		registerSettingSceneCatalog(registry);
		const provider = createSasiProvider(registry);

		const actions = provider.nodesFor('function');
		expect(actions.find((node) => node.id === 'check_plugin_updates')).toMatchObject({
			availability: { status: 'available' },
			supports: [
				{ surface: 'settingScene', context: 'settingScene.toolbar' },
			],
		});
		expect(actions.find((node) => node.id === 'update_plugin')?.supports).toEqual([
			{ surface: 'settingScene', context: 'node_plugin.cmenu' },
			{ surface: 'cell_badge_update' },
		]);
		expect(actions.find((node) => node.id === 'go_to_setting_content')).toMatchObject({
			availability: { status: 'unavailable' },
		});
	});
});
