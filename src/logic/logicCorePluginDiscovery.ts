import type { CorePluginStub } from './logicAddonExplorer';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/** Runtime plugins own membership/state; settings tabs only supply tab metadata. */
export function discoverCorePlugins(app: unknown): CorePluginStub[] {
	if (!isRecord(app)) return [];
	const setting = isRecord(app.setting) ? app.setting : undefined;
	const internal = isRecord(app.internalPlugins) ? app.internalPlugins : undefined;
	const plugins = isRecord(internal?.plugins) ? internal.plugins : {};
	const getEnabled = internal?.getEnabledPluginById;
	const entries = new Map<string, CorePluginStub>();
	for (const [pluginId, plugin] of Object.entries(plugins)) {
		if (!isRecord(plugin)) continue;
		const instance = isRecord(plugin.instance) ? plugin.instance : undefined;
		entries.set(pluginId, {
			pluginId,
			name: typeof instance?.name === 'string' ? instance.name : pluginId,
			enabled: typeof plugin.enabled === 'boolean'
				? plugin.enabled
				: typeof getEnabled === 'function'
					? getEnabled.call(internal, pluginId) != null
					: true,
		});
	}
	const rawTabs = setting?.pluginTabs;
	const tabs: readonly unknown[] = Array.isArray(rawTabs)
		? rawTabs
		: isRecord(rawTabs) ? Object.values(rawTabs) : [];
	for (const tab of tabs) {
		if (!isRecord(tab) || typeof tab.id !== 'string' || tab.id === '') continue;
		const existing = entries.get(tab.id);
		entries.set(tab.id, {
			pluginId: tab.id,
			name: typeof tab.name === 'string' && tab.name !== ''
				? tab.name : existing?.name ?? tab.id,
			enabled: existing?.enabled ?? (typeof getEnabled === 'function'
				? getEnabled.call(internal, tab.id) != null : true),
		});
	}
	return [...entries.values()];
}
