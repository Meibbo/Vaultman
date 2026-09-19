import type { App } from 'obsidian';

import type { PluginUpdateAdapter } from './serviceOperationQueue';

type UnknownRecord = Record<string, unknown>;

export const PLUGIN_UPDATES_ADAPTER_VERSION = 1;

export type PluginUpdateCheckStatus =
	| 'available'
	| 'disabled'
	| 'offline'
	| 'throttled'
	| 'failed';

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
	id: string;
	name: string;
	version?: string;
}

interface PluginUpdateRecord {
	repo: string;
	version: string;
	manifest: PluginUpdateManifest;
}

interface PluginManagerWithUpdates extends UnknownRecord {
	updates?: UnknownRecord;
	manifests?: UnknownRecord;
	checkForUpdates?: (automatic: boolean) => void | Promise<void>;
	installPlugin?: (
		repo: string,
		version: string,
		manifest: PluginUpdateManifest,
	) => void | Promise<void>;
}

interface AppWithPluginManager extends App {
	plugins?: PluginManagerWithUpdates;
}

function managerFor(app: App): PluginManagerWithUpdates | undefined {
	const manager = (app as AppWithPluginManager).plugins;
	return manager && typeof manager === 'object' ? manager : undefined;
}

function stringValue(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function updateRecord(value: unknown): PluginUpdateRecord | undefined {
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
			id,
			name,
			...(stringValue(manifestRecord.version)
				? { version: stringValue(manifestRecord.version) }
				: {}),
		},
	};
}

function managerVersion(manager: PluginManagerWithUpdates): string | undefined {
	return stringValue(manager.version) ?? stringValue(manager.appVersion);
}

export function detectPluginUpdatesApi(app: App): PluginUpdateAvailability {
	const manager = managerFor(app);
	if (!manager?.checkForUpdates || !manager.installPlugin) {
		return {
			available: false,
			status: 'disabled',
			reason: 'Obsidian plugin update API is unavailable',
			managerVersion: manager ? managerVersion(manager) : undefined,
		};
	}
	return {
		available: true,
		status: 'available',
		managerVersion: managerVersion(manager),
	};
}

export class PluginUpdatesService implements PluginUpdateAdapter {
	private readonly now: () => number;
	private readonly isOnline: () => boolean;
	private readonly throttleMs: number;
	private lastCheckAt: number | undefined;
	private snapshot = new Map<string, PluginUpdateRecord>();

	constructor(
		private readonly app: App,
		options: PluginUpdateAdapterOptions = {},
	) {
		this.now = options.now ?? Date.now;
		this.isOnline = options.isOnline ?? (() =>
			typeof navigator === 'undefined' || navigator.onLine !== false);
		this.throttleMs = Math.max(0, options.throttleMs ?? 30_000);
	}

	get availability(): PluginUpdateAvailability {
		return detectPluginUpdatesApi(this.app);
	}

	async checkPluginUpdates(): Promise<PluginUpdateCheckResult> {
		const api = this.availability;
		if (!api.available) {
			this.snapshot.clear();
			return this.emptyResult(api);
		}
		if (!this.isOnline()) {
			this.snapshot.clear();
			return this.emptyResult({
				...api,
				available: false,
				status: 'offline',
				reason: 'Plugin updates require an online connection',
			});
		}

		const now = this.now();
		if (this.lastCheckAt !== undefined && now - this.lastCheckAt < this.throttleMs) {
			return this.resultFromSnapshot({
				...api,
				status: 'throttled',
				reason: 'Plugin update check is throttled',
				retryAt: this.lastCheckAt + this.throttleMs,
			});
		}

		const manager = managerFor(this.app);
		if (!manager?.checkForUpdates) {
			this.snapshot.clear();
			return this.emptyResult(api);
		}
		try {
			await manager.checkForUpdates(false);
		} catch (error) {
			this.snapshot.clear();
			return this.emptyResult({
				...api,
				available: false,
				status: 'failed',
				reason: error instanceof Error ? error.message : 'Plugin update check failed',
			});
		}

		this.lastCheckAt = now;
		this.snapshot = new Map();
		const invalidPluginIds: string[] = [];
		for (const [id, value] of Object.entries(manager.updates ?? {})) {
			const record = updateRecord(value);
			if (!record || record.manifest.id !== id) {
				invalidPluginIds.push(id);
				continue;
			}
			this.snapshot.set(id, record);
		}
		return {
			availability: api,
			updates: this.badges(),
			invalidPluginIds,
		};
	}

	getPluginUpdate(id: string): PluginUpdateBadge | undefined {
		const record = this.snapshot.get(id);
		return record ? { id, version: record.version } : undefined;
	}

	getPluginUpdates(): readonly PluginUpdateBadge[] {
		return this.badges();
	}

	getAvailability(): PluginUpdateAvailability {
		return this.availability;
	}

	async updatePlugin(id: string): Promise<PluginUpdateInstallResult> {
		const manager = managerFor(this.app);
		const record = this.snapshot.get(id);
		if (!manager?.installPlugin || !record) {
			return { id, status: 'warning', message: 'Update is no longer available' };
		}
		try {
			await manager.installPlugin(record.repo, record.version, record.manifest);
		} catch (error) {
			return {
				id,
				status: 'error',
				message: error instanceof Error ? error.message : 'Plugin installation failed',
			};
		}
		const installedVersion = this.getInstalledVersion(id);
		if (installedVersion === record.version) {
			return { id, status: 'success', installedVersion };
		}
		if (installedVersion === undefined) {
			return {
				id,
				status: 'warning',
				message: 'Plugin disappeared after update',
			};
		}
		return {
			id,
			status: 'warning',
			installedVersion,
			message: 'Plugin version did not reach the requested update',
		};
	}

	hasUpdate(id: string, toVersion: string): boolean {
		return this.snapshot.get(id)?.version === toVersion;
	}

	async installPlugin(id: string): Promise<void> {
		const result = await this.updatePlugin(id);
		if (result.status === 'error') throw new Error(result.message ?? 'Plugin installation failed');
	}

	getInstalledVersion(id: string): string | undefined {
		const manager = managerFor(this.app);
		const manifest = manager?.manifests?.[id];
		return manifest && typeof manifest === 'object'
			? stringValue((manifest as UnknownRecord).version)
			: undefined;
	}

	private badges(): PluginUpdateBadge[] {
		return [...this.snapshot.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([id, record]) => ({ id, version: record.version }));
	}

	private emptyResult(availability: PluginUpdateAvailability): PluginUpdateCheckResult {
		return { availability, updates: [], invalidPluginIds: [] };
	}

	private resultFromSnapshot(
		availability: PluginUpdateAvailability,
	): PluginUpdateCheckResult {
		return { availability, updates: this.badges(), invalidPluginIds: [] };
	}
}

export function createPluginUpdatesService(
	app: App,
	options?: PluginUpdateAdapterOptions,
): PluginUpdatesService {
	return new PluginUpdatesService(app, options);
}

export const createPluginUpdatesAdapter = createPluginUpdatesService;
