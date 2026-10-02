import type { NativeSettingsSearchGroup } from '../types/typeSettingsSearch';

export interface SettingPageCache {
	readonly signature: string;
	readonly plugins: Map<string, NativeSettingsSearchGroup[]>;
	coverage?: NativeSettingsSearchGroup[];
}

const caches = new WeakMap<object, SettingPageCache>();

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/** Share native coverage across explorers, never across distinct app instances. */
export function settingPageCacheFor(app: unknown): SettingPageCache | null {
	if (!isRecord(app)) return null;
	const rawTabs = isRecord(app.setting) ? app.setting.pluginTabs : undefined;
	const tabs: readonly unknown[] = Array.isArray(rawTabs)
		? rawTabs : isRecord(rawTabs) ? Object.values(rawTabs) : [];
	const signature = tabs.map(tab => isRecord(tab)
		? `${String(tab.id ?? '')}:${String(tab.name ?? '')}:${String(tab.icon ?? '')}`
		: '::').sort().join('|');
	const existing = caches.get(app);
	if (existing?.signature === signature) return existing;
	const cache: SettingPageCache = { signature, plugins: new Map() };
	caches.set(app, cache);
	return cache;
}
