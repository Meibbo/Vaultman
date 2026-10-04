import { translate } from '../i18n/index';
import type { App } from 'obsidian';
import type { PluginUpdateItem } from '../types/typeOps';
import type { PluginUpdateAvailability, PluginUpdateCheckResult } from './pluginUpdatesNative';
import type { PluginUpdateBadge, PluginUpdateRecord } from './pluginUpdatesNative';
import { PendingUpdatesStore, type PendingUpdateEntry, type PendingUpdatesAdapter } from './servicePendingUpdatesStore';
import { comparePendingVersions, isPendingVersion } from './servicePendingUpdatesStore';

/** Cache discovery hints only; the native plugin manager still authorizes installs. */
export class PendingPluginUpdatesCache {
	readonly entries = new Map<string, PendingUpdateEntry>();
	private checkId = 0;

	constructor(
		private readonly store: PendingUpdatesStore | null,
		private readonly installedVersion: (id: string) => string | undefined,
	) {}

	get(id: string): PendingUpdateEntry | undefined {
		return this.entries.get(id);
	}

	async hydrate(): Promise<void> {
		if (!this.store) return;
		try {
			for (const [id, entry] of await this.store.load()) this.entries.set(id, entry);
			await this.reconcile();
		} catch (error) {
			console.warn('Vaultman could not load pending plugin updates; discovery cache starts empty', error);
		}
	}

	async merge(records: Iterable<PluginUpdateRecord>, discoveredAt: number): Promise<void> {
		this.checkId += 1;
		for (const record of records) {
			const id = record.manifest.id;
			const installed = this.installedVersion(id);
			if (installed === undefined || !isPendingVersion(record.version) || comparePendingVersions(installed, record.version) >= 0) continue;
			const old = this.entries.get(id);
			if (old && comparePendingVersions(old.pendingVersion, record.version) > 0) continue;
			this.entries.set(id, {
				id,
				pendingVersion: record.version,
				discoveredAt,
				checkId: this.checkId,
				schema: 1,
			});
		}
		await this.reconcile();
		await this.persist();
	}

	async reconcile(): Promise<void> {
		let changed = false;
		for (const [id, entry] of this.entries) {
			const installed = this.installedVersion(id);
			if (installed !== undefined && comparePendingVersions(installed, entry.pendingVersion) >= 0) {
				this.entries.delete(id);
				changed = true;
			}
		}
		if (changed) await this.persist();
	}

	async drop(id: string): Promise<void> {
		if (this.entries.delete(id)) await this.persist();
	}

	private async persist(): Promise<void> {
		if (!this.store) return;
		try {
			await this.store.persist(this.entries.values());
		} catch (error) {
			console.warn('Vaultman could not persist pending plugin updates', error);
		}
	}
}

/** Keep the check action available at zero while gating only update-all. */
export function isPluginUpdateToolbarActionVisible(id: string, eligibleCount: number): boolean {
	return id !== 'update_all_plugins' || eligibleCount > 0;
}

/** Carry the actual target version into the row's accessible tooltip label. */
export function pluginUpdateTargetLabel(version: string): string {
	return translate('addons.update_to', { version });
}

export function resolvePendingStore(app: App, pluginId: string): PendingUpdatesStore | null {
	const vault = (app as unknown as { vault?: { configDir?: unknown; adapter?: PendingUpdatesAdapter } }).vault;
	const configDir = typeof vault?.configDir === 'string' ? vault.configDir : undefined;
	const adapter = vault?.adapter;
	if (!configDir || !adapter || typeof adapter.exists !== 'function') return null;
	return new PendingUpdatesStore(adapter, `${configDir}/plugins/${pluginId}/pending-updates`);
}

export function resolvePendingBadge(
	id: string,
	snapshot: PluginUpdateRecord | undefined,
	native: PluginUpdateRecord | undefined,
	cached: PendingUpdateEntry | undefined,
	installed: string | undefined,
	suppressed: boolean,
): PluginUpdateBadge | undefined {
	if (suppressed || installed === undefined) return undefined;
	const nativeBadge = snapshot && native?.version === snapshot.version && native.manifest.id === id && comparePendingVersions(installed, snapshot.version) < 0
		? { id, version: snapshot.version } : undefined;
	const cachedBadge = cached && comparePendingVersions(installed, cached.pendingVersion) < 0
		? { id, version: cached.pendingVersion } : undefined;
	if (!nativeBadge) return cachedBadge;
	if (!cachedBadge) return nativeBadge;
	return comparePendingVersions(nativeBadge.version, cachedBadge.version) >= 0 ? nativeBadge : cachedBadge;
}

export function resolvePendingBadges(
	snapshot: Map<string, PluginUpdateRecord>,
	cachedIds: Iterable<string>,
	resolve: (id: string) => PluginUpdateBadge | undefined,
): PluginUpdateBadge[] {
	return [...new Set([...snapshot.keys(), ...cachedIds])]
		.sort((left, right) => left.localeCompare(right))
		.flatMap((id) => { const badge = resolve(id); return badge ? [badge] : []; });
}

export function pendingUpdateItems(
	badges: readonly PluginUpdateBadge[],
	nameForId: (id: string) => string,
	snapshot: Map<string, PluginUpdateRecord>,
	installedVersion: (id: string) => string | undefined,
): PluginUpdateItem[] {
	return badges.map((badge) => ({
		id: badge.id,
		name: nameForId(badge.id) || snapshot.get(badge.id)?.manifest.name || badge.id,
		fromVersion: installedVersion(badge.id) ?? '',
		toVersion: badge.version,
	}));
}

export function pendingUpdateResult(
	availability: PluginUpdateAvailability,
	updates: PluginUpdateBadge[],
): PluginUpdateCheckResult {
	return { availability, updates, invalidPluginIds: [] };
}
