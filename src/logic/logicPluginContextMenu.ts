import type VaultmanPlugin from '../main';
import type { MenuCtx } from '../types/typeCMenu';
import { translate } from '../i18n/index';
import { ConfirmModal } from '../modals/modalConfirm';
import { openAddonIconPicker } from '../modals/modalAddonIconPicker';
import {
	clearAddonIconOverride,
	getAddonIconOverride,
	readAddonIconOverrides,
	setAddonIconOverride,
	writeAddonIconOverrides,
} from './logicAddonIcons';
import {
	canToggleCommunityPlugin,
	canUninstallCommunityPlugin,
	toggleCommunityPlugin,
} from './logicAddonCells';
import type { PluginMeta } from '../types/typeTree';
import type { App } from 'obsidian';

interface InternalApp extends App {
	plugins?: {
		uninstallPlugin(id: string): Promise<void>;
	};
}

export function registerPluginActions(plugin: VaultmanPlugin): void {
	const svc = plugin.contextMenuService;

	svc.registerAction({
		id: 'plugin.change-icon',
		nodeTypes: ['plugin'],
		surfaces: ['panel'],
		label: () => translate('addon.icon.change'),
		icon: 'lucide-image',
		when: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			return !!meta?.pluginId; // Icons can be changed even for Vaultman itself
		},
		run: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			if (!meta || !meta.pluginId) return;
			const overrides = readAddonIconOverrides(plugin.settings);
			const current = getAddonIconOverride(
				overrides,
				'plugin',
				meta.pluginId,
			);
			if (
				plugin.iconicService?.openPluginIconPicker(
					meta.pluginId,
					ctx.event,
					current,
					(icon, color) => {
						writeAddonIconOverrides(
							plugin.settings,
							icon
								? setAddonIconOverride(overrides, 'plugin', meta.pluginId, {
										icon,
										...(color ? { color } : {}),
									})
								: clearAddonIconOverride(overrides, 'plugin', meta.pluginId),
						);
						void plugin.saveSettings();
					},
				)
			) return;
			openAddonIconPicker({
				app: plugin.app,
				name: meta.name,
				hasOverride:
					getAddonIconOverride(overrides, 'plugin', meta.pluginId) !== null,
				onPick: async (icon) => {
					writeAddonIconOverrides(
						plugin.settings,
						setAddonIconOverride(overrides, 'plugin', meta.pluginId, { icon }),
					);
					await plugin.saveSettings();
				},
				onReset: async () => {
					writeAddonIconOverrides(
						plugin.settings,
						clearAddonIconOverride(overrides, 'plugin', meta.pluginId),
					);
					await plugin.saveSettings();
				},
			});
		},
	});

	svc.registerAction({
		id: 'plugin.toggle',
		nodeTypes: ['plugin'],
		surfaces: ['panel'],
		label: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			const next = !meta?.enabled;
			return translate(next ? 'addons.enable' : 'addons.disable');
		},
		icon: 'lucide-power',
		when: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			return meta ? canToggleCommunityPlugin(meta) : false;
		},
		run: async (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			if (!meta) return;
			await toggleCommunityPlugin(plugin.app, meta);
		},
	});

	svc.registerAction({
		id: 'plugin.uninstall',
		nodeTypes: ['plugin'],
		surfaces: ['panel'],
		label: () => 'Uninstall',
		icon: 'lucide-trash-2',
		when: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			return meta ? canUninstallCommunityPlugin(meta) : false;
		},
		run: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			if (!meta || !canUninstallCommunityPlugin(meta)) return;
			const app = plugin.app as InternalApp;

			// U121-076: this action never touched the queue at all, so a plugin
			// could not be reviewed alongside the rest of a staged batch.
			if (plugin.queueService.operationMode === 'bypass') {
				new ConfirmModal(plugin.app, {
					title: 'Confirm uninstall',
					message: `Are you sure you want to uninstall ${meta.name}?`,
					ctaLabel: 'Uninstall',
					onConfirm: async () => {
						if (app.plugins?.uninstallPlugin) {
							await app.plugins.uninstallPlugin(meta.pluginId);
						}
					},
				}).open();
				return;
			}
			plugin.queueService.addOrRun({
				type: 'plugin_uninstall',
				action: 'uninstall',
				pluginId: meta.pluginId,
				name: meta.name,
				details: `Uninstall plugin "${meta.name}"`,
				files: [],
				customLogic: true,
				logicFunc: () => null,
			});
		},
	});
}
