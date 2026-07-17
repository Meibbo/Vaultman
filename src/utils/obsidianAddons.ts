import type { App } from 'obsidian';

type MaybePromise<T> = T | Promise<T>;

interface ObsidianCustomCss {
	snippets?: string[];
	enabledSnippets?: Set<string>;
	setCssEnabledStatus?: (
		snippet: string,
		enabled: boolean,
	) => MaybePromise<void>;
	getSnippetsFolder?: () => string;
	requestLoadSnippets?: () => MaybePromise<void>;
}

interface ObsidianCommunityPluginManifest {
	id: string;
	name: string;
	version?: string;
	author?: string;
	description?: string;
	isDesktopOnly?: boolean;
}

interface ObsidianCommunityPluginManager {
	manifests?: Record<string, ObsidianCommunityPluginManifest>;
	enabledPlugins?: Set<string>;
	plugins?: Record<string, { _loaded?: boolean }>;
	enablePluginAndSave?: (id: string) => MaybePromise<void>;
	enablePlugin?: (id: string) => MaybePromise<void>;
	disablePluginAndSave?: (id: string) => MaybePromise<void>;
	disablePlugin?: (id: string) => MaybePromise<void>;
}

interface ExtendedApp extends App {
	customCss?: ObsidianCustomCss;
	plugins?: ObsidianCommunityPluginManager;
}

export interface CssSnippetEntry {
	name: string;
	enabled: boolean;
	installedTime?: number;
	updatedTime?: number;
}

export interface CommunityPluginEntry {
	pluginId: string;
	name: string;
	version?: string;
	author?: string;
	description?: string;
	isDesktopOnly?: boolean;
	enabled: boolean;
	loaded: boolean;
	installedTime?: number;
	updatedTime?: number;
}

interface AddonFileTimes {
	installedTime?: number;
	updatedTime?: number;
}

const addonTimeCache = new WeakMap<
	object,
	Map<string, Promise<AddonFileTimes>>
>();

function addonTimes(app: App, path: string): Promise<AddonFileTimes> {
	let appCache = addonTimeCache.get(app);
	if (!appCache) {
		appCache = new Map();
		addonTimeCache.set(app, appCache);
	}
	const cached = appCache.get(path);
	if (cached) return cached;
	const pending = (async () => {
		try {
			const stat = await app.vault?.adapter?.stat?.(path);
			return stat ? { installedTime: stat.ctime, updatedTime: stat.mtime } : {};
		} catch {
			return {};
		}
	})();
	appCache.set(path, pending);
	return pending;
}

function extendedApp(app: App): ExtendedApp {
	return app as ExtendedApp;
}

function normalizeSnippetName(value: string): string {
	const normalizedPath = value.trim().replace(/\\/g, '/');
	return (normalizedPath.split('/').pop() ?? normalizedPath).replace(
		/\.css$/i,
		'',
	);
}

export async function listCssSnippetEntries(
	app: App,
): Promise<CssSnippetEntry[]> {
	const customCss = extendedApp(app).customCss;
	let names = customCss?.snippets;
	if (!Array.isArray(names) || names.length === 0) {
		const folder =
			customCss?.getSnippetsFolder?.() ?? `${app.vault.configDir}/snippets`;
		try {
			const listed = await app.vault.adapter.list(folder);
			names = listed.files.filter((path) =>
				path.toLowerCase().endsWith('.css'),
			);
		} catch {
			names = [];
		}
	}

	const enabled = new Set(
		[...(customCss?.enabledSnippets ?? [])].map(normalizeSnippetName),
	);
	const folder =
		customCss?.getSnippetsFolder?.() ?? `${app.vault.configDir}/snippets`;
	return Promise.all(
		[...new Set(names.map(normalizeSnippetName).filter(Boolean))]
			.sort((a, b) => a.localeCompare(b))
			.map(async (name) => ({
				name,
				enabled: enabled.has(name),
				...(await addonTimes(app, `${folder}/${name}.css`)),
			})),
	);
}

export async function setCssSnippetEnabled(
	app: App,
	name: string,
	enabled: boolean,
): Promise<boolean> {
	const customCss = extendedApp(app).customCss;
	if (!customCss?.setCssEnabledStatus) return false;
	await customCss.setCssEnabledStatus(name, enabled);
	await customCss.requestLoadSnippets?.();
	return true;
}

export async function listCommunityPluginEntries(
	app: App,
): Promise<CommunityPluginEntry[]> {
	const manager = extendedApp(app).plugins;
	const manifests = manager?.manifests ?? {};
	const enabled = manager?.enabledPlugins ?? new Set<string>();
	const runtime = manager?.plugins ?? {};
	const configDir = app.vault.configDir;
	const entries = await Promise.all(
		Object.values(manifests)
			.filter((manifest) => Boolean(manifest.id && manifest.name))
			.map(async (manifest) => ({
				pluginId: manifest.id,
				name: manifest.name,
				version: manifest.version,
				author: manifest.author,
				description: manifest.description,
				isDesktopOnly: manifest.isDesktopOnly,
				enabled: enabled.has(manifest.id),
				loaded: runtime[manifest.id]?._loaded ?? false,
				...(await addonTimes(
					app,
					`${configDir}/plugins/${manifest.id}/manifest.json`,
				)),
			})),
	);
	return entries.sort(
		(a, b) =>
			a.name.localeCompare(b.name) || a.pluginId.localeCompare(b.pluginId),
	);
}

export async function setCommunityPluginEnabled(
	app: App,
	id: string,
	enabled: boolean,
): Promise<boolean> {
	const manager = extendedApp(app).plugins;
	if (!manager) return false;
	if (enabled) {
		const enable = manager.enablePluginAndSave ?? manager.enablePlugin;
		if (!enable) return false;
		await enable.call(manager, id);
		return true;
	}
	const disable = manager.disablePluginAndSave ?? manager.disablePlugin;
	if (!disable) return false;
	await disable.call(manager, id);
	return true;
}
