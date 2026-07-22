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

export function canToggleCommunityPlugin(meta: PluginMeta): boolean {
	return meta.pluginId.length > 0;
}

export function canUninstallCommunityPlugin(meta: PluginMeta): boolean {
	return canToggleCommunityPlugin(meta) && !meta.isVaultman;
}

export async function toggleCommunityPlugin(
	app: App,
	meta: PluginMeta,
): Promise<boolean> {
	if (!canToggleCommunityPlugin(meta)) return false;
	return setCommunityPluginEnabled(app, meta.pluginId, !meta.enabled);
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
