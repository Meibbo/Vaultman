import type VaultmanPlugin from '../main';
import type { MenuCtx } from '../types/typeCMenu';
import { translate } from '../i18n/index';
import { ConfirmModal } from '../modals/modalConfirm';
import { resolveSelectionTargets } from './logicSelectionTargets';
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
	openPluginSettings,
	pluginSettingTabIds,
	toggleCommunityPlugin,
} from './logicAddonCells';
import type { PluginMeta } from '../types/typeTree';
import { Notice, type App } from 'obsidian';
import { nativeCommunityPluginAction } from './logicPluginNativeActions';

interface InternalApp extends App {
	plugins?: {
		uninstallPlugin(id: string): Promise<void>;
	};
}

export function registerPluginActions(plugin: VaultmanPlugin): void {
	const svc = plugin.contextMenuService;

	svc.registerAction({
		id: 'plugin.config',
		nodeTypes: ['plugin'],
		surfaces: ['panel'],
		label: () => translate('addons.open_settings'),
		icon: 'lucide-settings',
		when: (ctx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			return meta ? pluginSettingTabIds(plugin.app).has(meta.pluginId) : false;
		},
		run: (ctx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			if (meta) openPluginSettings(plugin.app, meta.pluginId);
		},
	});

	svc.registerAction({
		id: 'plugin.update',
		nodeTypes: ['plugin'],
		surfaces: ['panel'],
		label: () => translate('addons.update'),
		icon: 'lucide-download',
		when: (ctx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			return meta ? plugin.pluginUpdatesService.getPluginUpdate(meta.pluginId) !== undefined : false;
		},
		run: async (ctx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			if (!meta) return;
			const result = await plugin.pluginUpdatesService.updatePlugin(meta.pluginId);
			if (result.status !== 'success') new Notice(result.message ?? translate('addons.update_failed'));
		},
	});

	svc.registerAction({
		id: 'plugin.view-details',
		nodeTypes: ['plugin'],
		surfaces: ['panel'],
		label: () => translate('addons.view_details'),
		icon: 'lucide-info',
		when: (ctx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			return !!meta && !!nativeCommunityPluginAction(plugin.app, meta.pluginId, 'lucide-info');
		},
		run: (ctx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			if (meta) nativeCommunityPluginAction(plugin.app, meta.pluginId, 'lucide-info')?.();
		},
	});

	svc.registerAction({
		id: 'plugin.community-page',
		nodeTypes: ['plugin'],
		surfaces: ['panel'],
		label: () => translate('addons.community_page'),
		icon: 'lucide-external-link',
		when: (ctx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			return !!meta && !!nativeCommunityPluginAction(plugin.app, meta.pluginId, 'lucide-globe');
		},
		run: (ctx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			if (meta) nativeCommunityPluginAction(plugin.app, meta.pluginId, 'lucide-globe')?.();
		},
	});

	svc.registerAction({
		id: 'plugin.donate',
		nodeTypes: ['plugin'],
		surfaces: ['panel'],
		label: () => translate('addons.donate'),
		icon: 'lucide-heart-handshake',
		when: (ctx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			return !!meta && !!nativeCommunityPluginAction(plugin.app, meta.pluginId, 'lucide-heart');
		},
		run: (ctx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			if (meta) nativeCommunityPluginAction(plugin.app, meta.pluginId, 'lucide-heart')?.();
		},
	});

	svc.registerAction({
		id: 'plugin.reveal',
		nodeTypes: ['plugin'],
		surfaces: ['panel'],
		label: () => translate('addons.reveal'),
		icon: 'lucide-folder-open',
		when: (ctx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			return !!meta && !!nativeCommunityPluginAction(plugin.app, meta.pluginId, 'lucide-folder-open');
		},
		run: (ctx) => {
			const meta = ctx.node?.meta as PluginMeta | undefined;
			if (meta) nativeCommunityPluginAction(plugin.app, meta.pluginId, 'lucide-folder-open')?.();
		},
	});

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
			// U121-062: acts on the whole selection when the invoked plugin is
			// part of it. This scene showed its checkboxes and ignored them.
			const ids = resolveSelectionTargets(
				meta.pluginId,
				ctx.selectedIds ?? new Set<string>(),
				ctx.orderedIds,
			);
			for (const pluginId of ids) {
				plugin.queueService.addOrRun({
					type: 'plugin_uninstall',
					action: 'uninstall',
					pluginId,
					name: pluginId === meta.pluginId ? meta.name : pluginId,
					details: `Uninstall plugin "${pluginId === meta.pluginId ? meta.name : pluginId}"`,
					files: [],
					customLogic: true,
					logicFunc: () => null,
				});
			}
		},
	});
}
