/**
 * LeafDetachService — owns the detach/attach state for vaultman tabs and
 * persists it via plugin data (independent of Obsidian's workspace file).
 *
 * Spec: docs/work/hardening/specs/2026-05-07-multifacet-2/04-independent-leaves.md
 * Plan: docs/work/hardening/plans/2026-05-07-multifacet-2/06-independent-leaves.md
 *
 * Design notes:
 * - The service stores state via a host-provided `loadData`/`saveData`
 *   pair (typically the plugin's `Plugin.loadData`/`saveData`). It does
 *   NOT touch Obsidian's workspace layout.
 * - Spawning a leaf is delegated to a host-provided `spawnLeaf(tabId)`
 *   callback so unit tests can inject a stub. The same applies to
 *   `closeLeaf(tabId)`.
 * - `detach`/`attach` are wrapped with `PerfMeter.timeAsync` (deferred
 *   from phase 4).
 * - `restore()` is idempotent: calling it twice spawns at most one leaf
 *   per detached tab. The host should defer this to
 *   `app.workspace.onLayoutReady` so it does not race Obsidian's own
 *   layout replay.
 */

import { PerfMeter } from './perfMeter';
import { ALL_TAB_IDS, DETACHABLE, type TabId } from '../registry/tabRegistry';

export type LeafDetachState = Partial<Record<TabId, boolean>>;

export interface LeafDetachStore {
	loadData(): Promise<unknown>;
	saveData(data: unknown): Promise<void>;
}

export interface LeafDetachHost {
	/**
	 * Spawn a workspace leaf for the given tab id. Should be idempotent
	 * (return existing leaf if already spawned).
	 */
	spawnLeaf(tabId: TabId): Promise<void> | void;
	/** Close any currently-detached leaf for the given tab id. */
	closeLeaf(tabId: TabId): Promise<void> | void;
}

interface LeafDetachOptions {
	store: LeafDetachStore;
	host: LeafDetachHost;
	/** Optional override for testing. */
	now?: () => number;
}

const DATA_KEY = 'independentLeaves';

export class LeafDetachService {
	private readonly store: LeafDetachStore;
	private readonly host: LeafDetachHost;
	private state: LeafDetachState = {};
	private restored = false;
	private readonly listeners = new Set<(state: LeafDetachState) => void>();

	constructor(opts: LeafDetachOptions) {
		this.store = opts.store;
		this.host = opts.host;
	}

	/** Read persisted state from plugin data. */
	async load(): Promise<void> {
		const raw = await this.store.loadData();
		const block = isRecord(raw) ? raw[DATA_KEY] : null;
		this.state = sanitize(block);
		this.notify();
	}

	/** Persist current state to plugin data, preserving any sibling fields. */
	private async save(): Promise<void> {
		const current = (await this.store.loadData()) ?? {};
		const next = { ...(current as Record<string, unknown>), [DATA_KEY]: { ...this.state } };
		await this.store.saveData(next);
	}

	/** Snapshot of the current detached map. */
	getState(): LeafDetachState {
		return { ...this.state };
	}

	subscribe(listener: (state: LeafDetachState) => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	isDetached(tabId: TabId): boolean {
		return this.state[tabId] === true;
	}

	/** Detach the tab into its own workspace leaf. */
	async detach(tabId: TabId): Promise<void> {
		if (!DETACHABLE.has(tabId)) return;
		if (this.state[tabId] === true) return;
		await PerfMeter.timeAsync(
			`leaf:detach:${tabId}`,
			async () => {
				await this.host.spawnLeaf(tabId);
				this.state[tabId] = true;
				await this.save();
				this.notify();
			},
			'service',
			{ tabId },
		);
	}

	/** Re-attach the tab back into the in-panel slot. */
	async attach(tabId: TabId): Promise<void> {
		if (!DETACHABLE.has(tabId)) return;
		if (!this.state[tabId]) return;
		await PerfMeter.timeAsync(
			`leaf:attach:${tabId}`,
			async () => {
				await this.host.closeLeaf(tabId);
				this.state[tabId] = false;
				await this.save();
				this.notify();
			},
			'service',
			{ tabId },
		);
	}

	/**
	 * Replay detached tabs after Obsidian's workspace has loaded.
	 * Idempotent — repeated calls do not double-spawn.
	 */
	async restore(): Promise<void> {
		if (this.restored) return;
		this.restored = true;
		for (const tabId of ALL_TAB_IDS) {
			if (this.state[tabId] === true) {
				await this.host.spawnLeaf(tabId);
			}
		}
	}

	/** Test-only escape hatch; lets a fresh restore run. */
	__resetRestoredForTests(): void {
		this.restored = false;
	}

	private notify(): void {
		const snapshot = this.getState();
		for (const listener of this.listeners) listener({ ...snapshot });
	}
}

function sanitize(raw: unknown): LeafDetachState {
	const out: LeafDetachState = {};
	if (!raw || typeof raw !== 'object') return out;
	const obj = raw as Record<string, unknown>;
	for (const tabId of ALL_TAB_IDS) {
		if (obj[tabId] === true) out[tabId] = true;
	}
	return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object';
}
