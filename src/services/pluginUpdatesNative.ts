import type { App } from 'obsidian';

export type UnknownRecord = Record<string, unknown>;
export const PLUGIN_UPDATES_ADAPTER_VERSION = 1;

export type PluginUpdateCheckStatus = 'available' | 'disabled' | 'offline' | 'throttled' | 'failed';

export interface PluginUpdateAvailability {
	readonly available: boolean;
	readonly status: PluginUpdateCheckStatus;
	readonly reason?: string;
	readonly retryAt?: number;
	readonly managerVersion?: string;
}

export interface PluginUpdateBadge {
	readonly id: string;
	readonly version: string;
}

export interface PluginUpdateCheckResult {
	readonly availability: PluginUpdateAvailability;
	readonly updates: readonly PluginUpdateBadge[];
	readonly invalidPluginIds: readonly string[];
}

export interface PluginUpdateInstallResult {
	readonly id: string;
	readonly status: 'success' | 'warning' | 'error';
	readonly installedVersion?: string;
	readonly message?: string;
}

export interface PluginUpdateAdapterOptions {
	readonly throttleMs?: number;
	readonly now?: () => number;
	readonly isOnline?: () => boolean;
}

interface PluginUpdateManifest {
	readonly [key: string]: unknown;
	readonly id: string;
	readonly name: string;
	readonly version?: string;
}

export interface PluginUpdateRecord {
	readonly repo: string;
	readonly version: string;
	readonly manifest: PluginUpdateManifest;
}

interface PluginManagerWithUpdates extends UnknownRecord {
	updates?: UnknownRecord;
	manifests?: UnknownRecord;
	checkForUpdates?: (automatic: boolean) => void | Promise<void>;
	installPlugin?: (repo: string, version: string, manifest: PluginUpdateManifest) => void | Promise<void>;
}

interface AppWithPluginManager extends App {
	plugins?: PluginManagerWithUpdates;
}

export function managerFor(app: App): PluginManagerWithUpdates | undefined {
	const manager = (app as AppWithPluginManager).plugins;
	return manager && typeof manager === 'object' ? manager : undefined;
}

export function stringValue(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function updateRecord(value: unknown): PluginUpdateRecord | undefined {
	if (!value || typeof value !== 'object') return undefined;
	const record = value as UnknownRecord;
	const manifest = record.manifest;
	if (!manifest || typeof manifest !== 'object') return undefined;
	const manifestRecord = manifest as UnknownRecord;
	const id = stringValue(manifestRecord.id);
	const name = stringValue(manifestRecord.name);
	const repo = stringValue(record.repo);
	const version = stringValue(record.version);
	if (!id || !name || !repo || !version) return undefined;
	return {
		repo,
		version,
		manifest: {
			...manifestRecord,
			id,
			name,
			...(stringValue(manifestRecord.version) ? { version: stringValue(manifestRecord.version) } : {}),
		},
	};
}

export function detectPluginUpdatesApi(app: App): PluginUpdateAvailability {
	const manager = managerFor(app);
	const managerVersion = manager ? stringValue(manager.version) ?? stringValue(manager.appVersion) : undefined;
	if (!manager?.checkForUpdates || !manager.installPlugin) {
		return { available: false, status: 'disabled', reason: 'Obsidian plugin update API is unavailable', managerVersion };
	}
	return { available: true, status: 'available', managerVersion };
}
