import type { App } from 'obsidian';
import type { AddonCellStyle } from '../types/typeSettings';
import type { PluginMeta } from '../types/typeTree';
import { setCommunityPluginEnabled } from '../utils/obsidianAddons';

interface RuntimePluginSettingTab {
	id?: string;
	name?: string;
}

interface RuntimeSettingManager {
	pluginTabs?:
		| Record<string, RuntimePluginSettingTab>
		| RuntimePluginSettingTab[];
	open?: () => void;
	openTabById?: (id: string) => unknown;
}

interface AppWithRuntimeSettings extends App {
	setting?: RuntimeSettingManager;
}

function runtimeSettings(app: App): RuntimeSettingManager | undefined {
	return (app as AppWithRuntimeSettings).setting;
}

export function normalizeAddonCellStyle(value: unknown): AddonCellStyle {
	return value === 'badge' ? 'badge' : 'native';
}

interface InternalPluginItem {
	enabled?: boolean;
	enable?: (userEnable?: boolean) => Promise<void> | void;
	disable?: (userDisable?: boolean) => void;
	instance?: unknown;
}

interface InternalPluginManager {
	plugins?: Record<string, InternalPluginItem>;
	getPluginById?: (id: string) => InternalPluginItem | null;
	getEnabledPluginById?: (id: string) => unknown;
	requestSaveConfig?: () => void;
}

interface AppWithInternalPlugins extends App {
	internalPlugins?: InternalPluginManager;
}

export function isCorePlugin(app: App, pluginId: string): boolean {
	const internal = (app as AppWithInternalPlugins).internalPlugins;
	if (!internal) return false;
	if (typeof internal.getPluginById === 'function') {
		return internal.getPluginById(pluginId) != null;
	}
	const plugins = internal.plugins;
	return Boolean(plugins && Object.prototype.hasOwnProperty.call(plugins, pluginId));
}

export function canToggleCommunityPlugin(meta: PluginMeta): boolean {
	return meta.pluginId.length > 0;
}

export function canUninstallCommunityPlugin(meta: PluginMeta): boolean {
	return canToggleCommunityPlugin(meta) && !meta.isVaultman;
}

export async function toggleCorePlugin(
	app: App,
	pluginId: string,
	enabled: boolean,
): Promise<boolean> {
	const internal = (app as AppWithInternalPlugins).internalPlugins;
	if (!internal) return false;
	const plugin =
		typeof internal.getPluginById === 'function'
			? internal.getPluginById(pluginId)
			: internal.plugins?.[pluginId];
	if (!plugin) return false;
	try {
		if (enabled) {
			if (typeof plugin.enable === 'function') {
				await plugin.enable(true);
			}
		} else {
			if (typeof plugin.disable === 'function') {
				plugin.disable(true);
			}
		}
		internal.requestSaveConfig?.();
		return true;
	} catch (err) {
		console.error(`Vaultman: failed to toggle core plugin ${pluginId}`, err);
		return false;
	}
}

export async function toggleCommunityPlugin(
	app: App,
	meta: PluginMeta,
): Promise<boolean> {
	if (!canToggleCommunityPlugin(meta)) return false;
	return setCommunityPluginEnabled(app, meta.pluginId, !meta.enabled);
}

export async function togglePlugin(
	app: App,
	meta: PluginMeta,
): Promise<boolean> {
	if (isCorePlugin(app, meta.pluginId)) {
		return toggleCorePlugin(app, meta.pluginId, !meta.enabled);
	}
	return toggleCommunityPlugin(app, meta);
}

export function pluginSettingTabIds(app: App): Set<string> {
	const pluginTabs = runtimeSettings(app)?.pluginTabs ?? {};
	return new Set(
		Object.values(pluginTabs)
			.map((tab) => tab?.id)
			.filter((id): id is string => typeof id === 'string' && id.length > 0),
	);
}

export function hasPluginSettingsTab(app: App, pluginId: string): boolean {
	return pluginSettingTabIds(app).has(pluginId);
}

export function openPluginSettings(app: App, pluginId: string): boolean {
	if (!hasPluginSettingsTab(app, pluginId)) return false;
	const settings = runtimeSettings(app);
	if (!settings?.open || !settings.openTabById) return false;
	settings.open();
	settings.openTabById(pluginId);
	return true;
}
