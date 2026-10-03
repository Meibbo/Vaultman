import type { SasiRegistry } from './logicSasiRegistry';

export const SETTING_SCENE_ACTION_IDS = [
	'check_plugin_updates',
	'update_plugin',
	'update_all_plugins',
	'group_toggle_cascade',
	'go_to_setting_content',
] as const;

const SETTING_SCENE_SURFACE = 'settingScene';

export function registerSettingSceneCatalog(registry: SasiRegistry): void {
	registry.register({
		id: 'plugins',
		axis: 'provider',
		type: 'settingScene',
		catalogKind: 'settingScene',
		labelKey: 'sasi.settingScene.provider.plugins',
		icon: 'lucide-plug',
		supports: [
			{ surface: SETTING_SCENE_SURFACE, panelType: 'panelExplorer' },
			{ surface: SETTING_SCENE_SURFACE, panelType: 'panelContent' },
			{ surface: SETTING_SCENE_SURFACE, context: 'settingScene.toolbar' },
		],
	});

	for (const catalogKind of [
		'node_settings',
		'node_plugin',
		'node_plugin_core',
		'node_plugin_community',
		'node_group',
		'node_group_custom',
		'cell_badge_update',
	] as const) {
		registry.register({
			id: catalogKind,
			axis: 'kind',
			type: catalogKind,
			catalogKind,
			labelKey: `sasi.settingScene.kind.${catalogKind}`,
			icon: catalogKind === 'cell_badge_update' ? 'lucide-badge' : 'lucide-box',
			supports: [{ surface: SETTING_SCENE_SURFACE }],
		});
	}

	for (const catalogKind of [
		'panelExplorer',
		'panelContent',
		'settings-explorer',
		'settings-content',
		'settingScene.toolbar',
		'node_plugin.cmenu',
		'node_group.cmenu',
	] as const) {
		registry.register({
			id: catalogKind,
			axis: 'kind',
			type: catalogKind,
			catalogKind,
			labelKey: `sasi.settingScene.${catalogKind}`,
			icon: 'lucide-panel-top',
			supports: [{ surface: SETTING_SCENE_SURFACE }],
		});
	}

	registry.register({
		id: 'check_plugin_updates',
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.settingScene.action.check_plugin_updates',
		icon: 'lucide-refresh-cw',
		supports: [{ surface: SETTING_SCENE_SURFACE, context: 'settingScene.toolbar' }],
	});
	registry.register({
		id: 'update_plugin',
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.settingScene.action.update_plugin',
		icon: 'lucide-download',
		supports: [
			{ surface: SETTING_SCENE_SURFACE, context: 'node_plugin.cmenu' },
			{ surface: 'cell_badge_update' },
		],
	});
	registry.register({
		id: 'update_all_plugins',
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.settingScene.action.update_all_plugins',
		icon: 'lucide-download-cloud',
		supports: [
			{ surface: SETTING_SCENE_SURFACE, context: 'settingScene.toolbar' },
			{ surface: 'plugins' },
		],
	});
	registry.register({
		id: 'group_toggle_cascade',
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.settingScene.action.group_toggle_cascade',
		icon: 'lucide-toggle-right',
		supports: [{ surface: SETTING_SCENE_SURFACE, context: 'node_group.cmenu' }],
	});
	registry.register({
		id: 'go_to_setting_content',
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.settingScene.action.go_to_setting_content',
		icon: 'lucide-file-search',
		availability: {
			status: 'unavailable',
			reason: {
				code: 'setting_content_executor_blocked',
				labelKey: 'sasi.settingScene.unavailable.content_executor',
			},
		},
		supports: [
			{
				surface: SETTING_SCENE_SURFACE,
				panelType: 'panelContent',
				mode: 'settings-content',
			},
		],
	});
}
