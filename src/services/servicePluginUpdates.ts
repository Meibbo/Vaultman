import { Component, type App } from 'obsidian';

import type { PluginUpdateAdapter } from './serviceOperationQueue';
import type { PluginUpdateItem } from '../types/typeOps';

import {
	detectPluginUpdatesApi, managerFor, stringValue, updateRecord,
	type PluginUpdateAdapterOptions, type PluginUpdateAvailability, type PluginUpdateBadge,
	type PluginUpdateCheckResult, type PluginUpdateInstallResult, type PluginUpdateRecord,
	type UnknownRecord,
} from './pluginUpdatesNative';
import { PendingUpdatesStore, comparePendingVersions } from './servicePendingUpdatesStore';
import { PendingPluginUpdatesCache, pendingUpdateItems, pendingUpdateResult, resolvePendingBadge, resolvePendingBadges, resolvePendingStore } from './pendingUpdateSupport';
export { comparePendingVersions } from './servicePendingUpdatesStore';
export { detectPluginUpdatesApi, PLUGIN_UPDATES_ADAPTER_VERSION } from './pluginUpdatesNative';
export type {
	PluginUpdateAdapterOptions, PluginUpdateAvailability, PluginUpdateBadge,
	PluginUpdateCheckResult, PluginUpdateCheckStatus, PluginUpdateInstallResult,
} from './pluginUpdatesNative';

export interface PluginUpdatesServiceOptions extends PluginUpdateAdapterOptions {
	/**
	 * Durable discovery cache. `undefined` derives one from
	 * `app.vault` (`<configDir>/plugins/<pluginId>/pending-updates/`);
	 * `null` disables persistence (in-memory snapshot only).
	 */
	readonly pendingStore?: PendingUpdatesStore | null;
	readonly pluginId?: string;
}

export class PluginUpdatesService extends Component implements PluginUpdateAdapter {
	private readonly now: () => number;
	private readonly isOnline: () => boolean;
	private readonly throttleMs: number;
	private lastCheckAt: number | undefined;
	private snapshot = new Map<string, PluginUpdateRecord>();
	private readonly unavailableSnapshots = new Set<string>();
	private readonly pendingCache: PendingPluginUpdatesCache;
	private readonly hydratePromise: Promise<void>;
	private readonly activeUpdates = new Map<string, Promise<PluginUpdateInstallResult>>();
	private readonly listeners = new Set<() => void>();
	private checkInFlight: Promise<PluginUpdateCheckResult> | null = null;

	constructor(
		private readonly app: App,
		options: PluginUpdatesServiceOptions = {},
	) {
		super();
		this.now = options.now ?? Date.now;
		this.isOnline = options.isOnline ?? (() =>
			typeof navigator === 'undefined' || navigator.onLine !== false);
		this.throttleMs = Math.max(0, options.throttleMs ?? 30_000);
		const pendingStore = options.pendingStore !== undefined
			? options.pendingStore
			: resolvePendingStore(app, options.pluginId ?? 'vaultman');
		this.pendingCache = new PendingPluginUpdatesCache(pendingStore, (id) => this.getInstalledVersion(id));
		this.hydratePromise = this.pendingCache.hydrate().then(() => this.notifyChanged());
	}

	/** Resolves once the durable discovery cache (when any) has been reconciled. */
	whenHydrated(): Promise<void> {
		return this.hydratePromise;
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
		// U200 polish L1: announce the busy transition so toolbar spinners
		// paint on start, not only when the result lands (mirrors the
		// start/end notifies around single installs in `updatePlugin`).
		this.notifyChanged();
		try {
			return await this.checkInFlight;
		} finally {
			this.checkInFlight = null;
			this.notifyChanged();
		}
	}

	/** U200 polish L1: whether a discovery check is currently running. */
	isCheckInFlight(): boolean {
		return this.checkInFlight !== null;
	}

	private async checkPluginUpdatesOnce(): Promise<PluginUpdateCheckResult> {
		await this.hydratePromise;
		await Promise.all(this.activeUpdates.values());
		const api = this.availability;
		if (!api.available) {
			// C3 retain-then-reconcile: the durable hints survive an
			// unavailable authority; installed>=pending entries are dropped.
			await this.pendingCache.reconcile();
			this.notifyChanged();
			return this.resultFromSnapshot(api);
		}
		if (!this.isOnline()) {
			await this.pendingCache.reconcile();
			this.notifyChanged();
			return this.resultFromSnapshot({
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
			await this.pendingCache.reconcile();
			this.notifyChanged();
			return this.resultFromSnapshot(api);
		}
		try {
			await manager.checkForUpdates(false);
		} catch (error) {
			await this.pendingCache.reconcile();
			this.notifyChanged();
			return this.resultFromSnapshot({
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
			this.unavailableSnapshots.delete(id);
		}
		await this.pendingCache.merge(this.snapshot.values(), now);
		const result = {
			availability: api,
			updates: this.badges(),
			invalidPluginIds,
		};
		this.notifyChanged();
		return result;
	}

	getPluginUpdate(id: string): PluginUpdateBadge | undefined {
		return resolvePendingBadge(
			id,
			this.snapshot.get(id),
			updateRecord(managerFor(this.app)?.updates?.[id]),
			this.pendingCache.get(id),
			this.getInstalledVersion(id),
			this.unavailableSnapshots.has(id),
		);
	}

	getPluginUpdates(): readonly PluginUpdateBadge[] {
		return this.badges();
	}

	snapshotPluginUpdateItems(
		nameForId: (id: string) => string = () => '',
	): readonly PluginUpdateItem[] {
		return pendingUpdateItems(this.badges(), nameForId, this.snapshot, (id) => this.getInstalledVersion(id));
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
		await this.hydratePromise;
		const manager = managerFor(this.app);
		const cached = this.snapshot.get(id);
		const record = updateRecord(manager?.updates?.[id]);
		const installed = this.getInstalledVersion(id);
		if (cached && installed !== undefined && comparePendingVersions(installed, cached.version) >= 0) {
			this.snapshot.delete(id);
			await this.pendingCache.drop(id);
			return { id, status: 'warning', message: 'Plugin is already at or above the requested update' };
		}
		if (!manager?.installPlugin || !cached || !record || record.manifest.id !== id || record.version !== cached.version || installed === undefined || comparePendingVersions(installed, record.version) >= 0) {
			this.snapshot.delete(id);
			this.unavailableSnapshots.add(id);
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
		if (installedVersion !== undefined && comparePendingVersions(installedVersion, record.version) >= 0) {
			this.snapshot.delete(id);
			// installed==target clears the durable hint as well.
			await this.pendingCache.drop(id);
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
		return resolvePendingBadges(this.snapshot, this.pendingCache.entries.keys(), (id) => this.getPluginUpdate(id));
	}

	private resultFromSnapshot(availability: PluginUpdateAvailability): PluginUpdateCheckResult { return pendingUpdateResult(availability, this.badges()); }

	private notifyChanged(): void {
		for (const listener of [...this.listeners]) listener();
	}
}

export function createPluginUpdatesService(
	app: App,
	options?: PluginUpdatesServiceOptions,
): PluginUpdatesService {
	return new PluginUpdatesService(app, options);
}

export const createPluginUpdatesAdapter = createPluginUpdatesService;
