import { Component, type App } from 'obsidian';

import type { PluginUpdateAdapter } from './serviceOperationQueue';
import type { PluginUpdateItem } from '../types/typeOps';

import {
	detectPluginUpdatesApi, managerFor, stringValue, updateRecord,
	type PluginUpdateAdapterOptions, type PluginUpdateAvailability, type PluginUpdateBadge,
	type PluginUpdateCheckResult, type PluginUpdateInstallResult, type PluginUpdateRecord,
	type UnknownRecord,
} from './pluginUpdatesNative';
export { detectPluginUpdatesApi, PLUGIN_UPDATES_ADAPTER_VERSION } from './pluginUpdatesNative';
export type {
	PluginUpdateAdapterOptions, PluginUpdateAvailability, PluginUpdateBadge,
	PluginUpdateCheckResult, PluginUpdateCheckStatus, PluginUpdateInstallResult,
} from './pluginUpdatesNative';

export class PluginUpdatesService extends Component implements PluginUpdateAdapter {
	private readonly now: () => number;
	private readonly isOnline: () => boolean;
	private readonly throttleMs: number;
	private lastCheckAt: number | undefined;
	private snapshot = new Map<string, PluginUpdateRecord>();
	private readonly activeUpdates = new Map<string, Promise<PluginUpdateInstallResult>>();
	private readonly listeners = new Set<() => void>();
	private checkInFlight: Promise<PluginUpdateCheckResult> | null = null;

	constructor(
		private readonly app: App,
		options: PluginUpdateAdapterOptions = {},
	) {
		super();
		this.now = options.now ?? Date.now;
		this.isOnline = options.isOnline ?? (() =>
			typeof navigator === 'undefined' || navigator.onLine !== false);
		this.throttleMs = Math.max(0, options.throttleMs ?? 30_000);
	}

	get availability(): PluginUpdateAvailability {
		return detectPluginUpdatesApi(this.app);
	}

	onChanged(callback: () => void): () => void {
		this.listeners.add(callback);
		return () => this.listeners.delete(callback);
	}

	async checkPluginUpdates(): Promise<PluginUpdateCheckResult> {
		if (this.checkInFlight) return this.checkInFlight;
		this.checkInFlight = this.checkPluginUpdatesOnce();
		try {
			return await this.checkInFlight;
		} finally {
			this.checkInFlight = null;
		}
	}

	private async checkPluginUpdatesOnce(): Promise<PluginUpdateCheckResult> {
		await Promise.all(this.activeUpdates.values());
		const api = this.availability;
		if (!api.available) {
			this.snapshot.clear();
			this.notifyChanged();
			return this.emptyResult(api);
		}
		if (!this.isOnline()) {
			this.snapshot.clear();
			this.notifyChanged();
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
			this.notifyChanged();
			return this.emptyResult(api);
		}
		try {
			await manager.checkForUpdates(false);
		} catch (error) {
			this.snapshot.clear();
			this.notifyChanged();
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
		const result = {
			availability: api,
			updates: this.badges(),
			invalidPluginIds,
		};
		this.notifyChanged();
		return result;
	}

	getPluginUpdate(id: string): PluginUpdateBadge | undefined {
		const record = this.snapshot.get(id);
		const native = updateRecord(managerFor(this.app)?.updates?.[id]);
		const installed = this.getInstalledVersion(id);
		return record && native?.version === record.version && native.manifest.id === id && installed !== undefined && installed !== record.version
			? { id, version: record.version } : undefined;
	}

	getPluginUpdates(): readonly PluginUpdateBadge[] {
		return this.badges();
	}

	snapshotPluginUpdateItems(
		nameForId: (id: string) => string = () => '',
	): readonly PluginUpdateItem[] {
		return this.badges().map((update) => ({
			id: update.id,
			name: nameForId(update.id) || this.snapshot.get(update.id)?.manifest.name || update.id,
			fromVersion: this.getInstalledVersion(update.id) ?? '',
			toVersion: update.version,
		}));
	}

	getAvailability(): PluginUpdateAvailability {
		return this.availability;
	}

	isUpdating(id: string): boolean {
		return this.activeUpdates.has(id);
	}

	async waitForCheck(): Promise<void> {
		if (this.checkInFlight) await this.checkInFlight;
	}

	async updatePlugin(id: string): Promise<PluginUpdateInstallResult> {
		const pending = this.activeUpdates.get(id);
		if (pending) return pending;
		const run = Promise.resolve().then(() => this.installUpdate(id));
		this.activeUpdates.set(id, run);
		this.notifyChanged();
		try {
			return await run;
		} finally {
			this.activeUpdates.delete(id);
			this.notifyChanged();
		}
	}

	private async installUpdate(id: string): Promise<PluginUpdateInstallResult> {
		const manager = managerFor(this.app);
		const cached = this.snapshot.get(id);
		const record = updateRecord(manager?.updates?.[id]);
		const installed = this.getInstalledVersion(id);
		if (!manager?.installPlugin || !cached || !record || record.manifest.id !== id || record.version !== cached.version || installed === undefined || installed === record.version) {
			this.snapshot.delete(id);
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
			this.snapshot.delete(id);
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
		return this.snapshot.get(id)?.version === toVersion &&
			(this.activeUpdates.has(id) || this.getPluginUpdate(id)?.version === toVersion);
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
			.flatMap(([id]) => { const update = this.getPluginUpdate(id); return update ? [update] : []; });
	}

	private emptyResult(availability: PluginUpdateAvailability): PluginUpdateCheckResult {
		return { availability, updates: [], invalidPluginIds: [] };
	}

	private resultFromSnapshot(
		availability: PluginUpdateAvailability,
	): PluginUpdateCheckResult {
		return { availability, updates: this.badges(), invalidPluginIds: [] };
	}

	private notifyChanged(): void {
		for (const listener of [...this.listeners]) listener();
	}
}

export function createPluginUpdatesService(
	app: App,
	options?: PluginUpdateAdapterOptions,
): PluginUpdatesService {
	return new PluginUpdatesService(app, options);
}

export const createPluginUpdatesAdapter = createPluginUpdatesService;
