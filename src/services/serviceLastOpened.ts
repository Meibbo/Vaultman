import { Component, TFile, type App } from 'obsidian';
import { OpenedHistoryStore, type OpenedHistoryAdapter, type OpeningEvent } from './serviceOpenedHistoryStore';
import { serializeLastOpened } from '../logic/logicSerializeLastOpened';

export type LastOpenedHost = {
	readonly vault: Pick<App['vault'], 'configDir' | 'getFiles'> & { readonly adapter: OpenedHistoryAdapter };
	readonly workspace: Pick<App['workspace'], 'on' | 'onLayoutReady'>;
};

import {
	buildFolderRecency,
	countOpenedSince,
	folderRecencyAt,
	lastOpenedAt,
	pruneMissingPaths,
	startOfDay,
	withDeletedPath,
	withRenamedPath,
	type LastOpenedRecord,
} from '../logic/logicLastOpened';

const FLUSH_DELAY_MS = 2000;

/**
 * BT5-013: persists the last time each file was opened.
 *
 * The store lives in its own file next to the plugin data instead of inside
 * the settings, so opening a file never rewrites the whole settings payload.
 * Writes are batched off the activation path. Background/quit/unload signals
 * request an early flush; an OS kill before the write completes cannot be
 * made durable through Obsidian's asynchronous adapter.
 */
export class LastOpenedService extends Component {
	private record: Record<string, number> = {};
	private loaded = false;
	private dirty = false;
	private flushTimer: ReturnType<typeof setTimeout> | null = null;
	/** BT5-090: folder recency, rebuilt lazily after the record changes. */
	private folderRecency: ReadonlyMap<string, number> | null = null;
	private readonly changes = new Set<(record: LastOpenedRecord) => void>();
	private readonly resets = new Set<() => void>();
	private loadPromise: Promise<void> | null = null;
	private readonly store: OpenedHistoryStore;
	private recordAllOpens = false;
	private pendingEvents: OpeningEvent[] = [];
	private earlyMutations: Array<() => void> = [];
	private generation = 0;
	private clearing: Promise<void> | null = null;
	private writing: Promise<void> | null = null;
	private clearBlocked = false;
	/**
	 * Aggregate open counts per path, derived from the opt-in journal.
	 * Null until the first `getOpenCount` hydrates it, so vaults that never
	 * ask pay zero startup or memory cost. Counts follow journal paths:
	 * live renames migrate the aggregate, pre-hydration history keeps the
	 * path it was recorded under.
	 */
	private openCounts: Map<string, number> | null = null;
	private countsPromise: Promise<void> | null = null;

	constructor(
		private readonly app: LastOpenedHost,
		pluginId: string,
		private readonly flushDelayMs: number = FLUSH_DELAY_MS,
	) {
		super();
		this.store = new OpenedHistoryStore(app.vault.adapter, `${app.vault.configDir}/plugins/${pluginId}`);
	}

	onload(): void {
		this.loadPromise = this.loadStore();
		void this.loadPromise.catch((error: unknown) => console.warn('Vaultman could not load opening history; existing data is preserved', error));
		this.app.workspace.onLayoutReady(() => {
			void this.whenLoaded().then(() => {
				if (!this.loaded) return;
				if (this._pruneAgainstVault()) this._notify(true);
			}).catch((error: unknown) => console.warn('Vaultman could not initialize opening history', error));
		});
		this._setupMobileFlushListeners();
	}

	onunload(): void {
		this._cancelFlush();
		// Component cannot await shutdown. Background/quit signals flush earlier.
		this._flushInBackground();
	}

	/** Subscribe to store changes. Returns an unsubscribe function. */
	onChange(callback: (record: LastOpenedRecord) => void): () => void {
		this.changes.add(callback);
		return () => { this.changes.delete(callback); };
	}

	onReset(callback: () => void): () => void {
		this.resets.add(callback);
		return () => { this.resets.delete(callback); };
	}

	setRecordAllOpens(enabled: boolean): void { this.recordAllOpens = enabled; }

	async getHistory(): Promise<readonly OpeningEvent[]> {
		await this.flush();
		return this.store.readHistory();
	}

	/**
	 * How many journaled openings `path` owns, 0 when none. Hydrates from
	 * the persisted journal on first call only; later openings increment
	 * the map live, so this never traverses the journal per call.
	 */
	async getOpenCount(path: string): Promise<number> {
		await this.ensureCounts();
		return this.openCounts?.get(path) ?? 0;
	}

	private ensureCounts(): Promise<void> {
		if (!this.countsPromise) {
			const generation = this.generation;
			const attempt = (async () => {
				// Flush first so unpersisted in-session events are included.
				await this.flush();
				const events = await this.store.readHistory();
				// A clear that landed while hydration was in flight owns the
				// newer generation: its synchronous reset already stands.
				if (generation !== this.generation) return;
				const counts = new Map<string, number>();
				for (const event of events) counts.set(event.path, (counts.get(event.path) ?? 0) + 1);
				if (generation !== this.generation) return;
				this.openCounts = counts;
			})();
			this.countsPromise = attempt;
			// Hydration is lazy and retryable: a later call tries again. Only
			// null out when this attempt is still current, so a newer
			// hydration started by a clear is never discarded by an old error.
			void attempt.catch(() => {
				if (this.countsPromise === attempt) this.countsPromise = null;
			});
		}
		return this.countsPromise;
	}

	/** Establish the boundary immediately: later real openings belong to the new history. */
	clearHistory(): Promise<void> {
		if (this.clearing) return this.clearing;
		this.generation++;
		this.clearBlocked = true;
		this._cancelFlush();
		this.record = {};
		this.earlyMutations = [];
		this.pendingEvents = [];
		this.dirty = false;
		this.folderRecency = null;
		// The aggregate restarts empty with the new generation; a hydration
		// in flight from the previous one is discarded on install.
		this.openCounts = new Map();
		this.countsPromise = null;
		this._notify(true);
		const clear = async () => {
			// An explicit clear is also the recovery action for an unreadable snapshot.
			try { await this.whenLoaded(); } catch { /* The original file is intentionally being cleared. */ }
			await this.store.clear();
			this.loaded = true;
			this.loadPromise = Promise.resolve();
			this.clearBlocked = false;
		};
		this.clearing = clear().finally(() => { this.clearing = null; });
		return this.clearing.then(() => this.flush());
	}

	private _notify(reset = false): void {
		// Preserve snapshot semantics only for consumers that request a record.
		// Each observer is isolated: a throwing UI callback must never reject
		// hydration (loadPromise) or prevent the clear barrier from running.
		if (this.changes.size) {
			const snapshot = { ...this.record };
			for (const callback of this.changes) {
				try {
					callback(snapshot);
				} catch (error) {
					console.warn('Vaultman opening-history observer failed', error);
				}
			}
		}
		if (reset) {
			for (const callback of this.resets) {
				try {
					callback();
				} catch (error) {
					console.warn('Vaultman opening-history reset observer failed', error);
				}
			}
		}
	}

	/** Wait for the initial load to complete. */
	async whenLoaded(): Promise<void> {
		if (this.loadPromise) await this.loadPromise;
	}

	async loadStore(): Promise<void> {
		const generation = this.generation;
		const persisted = await this.store.load();
		if (generation === this.generation) {
			this.record = { ...persisted };
			for (const mutation of this.earlyMutations) mutation();
		}
		this.earlyMutations = [];
		this.loaded = true;
		this.folderRecency = null;
		// Notify listeners that the store is loaded.
		this._notify(true);
	}

	/** Entries whose file vanished while the plugin was off are dead weight. */
	private _pruneAgainstVault(): boolean {
		const files = this.app.vault.getFiles?.();
		if (!files) return false;
		const existing = new Set(files.map((file) => file.path));
		const pruned = pruneMissingPaths(this.record, existing);
		if (Object.keys(pruned).length === Object.keys(this.record).length) return false;
		this.record = { ...pruned };
		this._markDirty();
		return true;
	}

	getLastOpened(file: TFile): number | null {
		return lastOpenedAt(this.record, file.path);
	}

	/**
	 * BT5-090: the newest open of any file beneath `folderPath`, or null when
	 * nothing under it was ever opened. Built once per record change.
	 */
	getFolderLastOpened(folderPath: string): number | null {
		if (!this.folderRecency) {
			this.folderRecency = buildFolderRecency(this.record);
		}
		return folderRecencyAt(this.folderRecency, folderPath);
	}

	/** BT5-037: how many files were last opened today (local midnight). */
	openedTodayCount(now: number = Date.now()): number {
		return countOpenedSince(this.record, startOfDay(now));
	}

	/**
	 * Only a real activation reaches this. Hover previews never emit
	 * `file-open`, so a preview cannot age a file to "just opened".
	 */
	handleFileOpen(file: TFile | null, at: number = Date.now()): void {
		if (!(file instanceof TFile) || !file.path || !Number.isFinite(at) || at <= 0) return;
		const path = file.path;
		const mutation = () => { this.record[path] = at; };
		mutation();
		if (!this.loaded) this.earlyMutations.push(mutation);
		if (this.recordAllOpens) {
			this.pendingEvents.push({ path, at });
			// Live aggregate: pre-hydration events are counted by the first
			// hydration instead, so each opening lands in exactly one place.
			if (this.openCounts) this.openCounts.set(path, (this.openCounts.get(path) ?? 0) + 1);
		}
		this.folderRecency = null;
		this._markDirty();
		this._notify();
	}

	handleRename(newPath: string, oldPath: string): void {
		if (!oldPath || !newPath || oldPath === newPath) return;
		const mutation = () => { this.record = { ...withRenamedPath(this.record, oldPath, newPath) }; };
		mutation();
		if (!this.loaded) this.earlyMutations.push(mutation);
		if (this.openCounts?.has(oldPath)) {
			this.openCounts.set(newPath, (this.openCounts.get(newPath) ?? 0) + (this.openCounts.get(oldPath) ?? 0));
			this.openCounts.delete(oldPath);
		}
		this.folderRecency = null;
		this._markDirty();
		this._notify();
	}

	handleDelete(path: string): void {
		if (!path) return;
		const mutation = () => { this.record = { ...withDeletedPath(this.record, path) }; };
		mutation();
		if (!this.loaded) this.earlyMutations.push(mutation);
		this.openCounts?.delete(path);
		this.folderRecency = null;
		this._markDirty();
		this._notify();
	}

	private _markDirty(): void {
		this.dirty = true;
		this._scheduleFlush();
	}

	private _scheduleFlush(): void {
		if (this.flushTimer !== null) return;
		this.flushTimer = setTimeout(() => {
			this.flushTimer = null;
			this._flushInBackground();
		}, this.flushDelayMs);
	}

	private _cancelFlush(): void {
		if (this.flushTimer === null) return;
		clearTimeout(this.flushTimer);
		this.flushTimer = null;
	}

	async flush(): Promise<void> {
		this._cancelFlush();
		await this.whenLoaded();
		if (this.clearing) await this.clearing;
		if (this.clearBlocked) throw new Error('History clear failed; retry clearing before saving new openings');
		if (this.writing) await this.writing;
		if (!this.loaded || !this.dirty) return;
		this.writing = this._write().finally(() => { this.writing = null; });
		await this.writing;
	}

	private async _write(): Promise<void> {
		const generation = this.generation;
		while (this.dirty && generation === this.generation) {
			this.dirty = false;
			const events = this.pendingEvents.splice(0);
			try {
				const snapshot = await serializeLastOpened(this.record);
				if (generation !== this.generation) return;
				await this.store.persist(snapshot, events);
			} catch (error) {
				if (generation === this.generation) {
					this.dirty = true;
					this.pendingEvents.unshift(...events);
				}
				throw error;
			}
		}
	}

	private _flushInBackground(): void {
		void this.flush().catch((error: unknown) => console.warn('Vaultman could not persist opening history', error));
	}

	/** Listen for quit/visibilitychange to flush on mobile where unload is unreliable. */
	private _setupMobileFlushListeners(): void {
		const flushOnSignal = () => {
			this._flushInBackground();
		};
		// Desktop quit event
		this.registerEvent(this.app.workspace.on('quit', flushOnSignal));
		// Android/iOS: `visibilitychange` → hidden is the only signal that the app
		// is being backgrounded (and possibly killed) before `onunload` runs.
		if (typeof document !== 'undefined') {
			const onVisibilityChange = () => {
				if (document.visibilityState === 'hidden') {
					this._flushInBackground();
				}
			};
			document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
			this.register(() => {
				document.removeEventListener('visibilitychange', onVisibilityChange);
			});
		}
	}
}
