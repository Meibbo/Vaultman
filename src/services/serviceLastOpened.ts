import { Component, Events, TFile, type App } from 'obsidian';

import {
	buildFolderRecency,
	countOpenedSince,
	folderRecencyAt,
	lastOpenedAt,
	normalizeLastOpenedRecord,
	pruneMissingPaths,
	startOfDay,
	withDeletedPath,
	withFileOpened,
	withRenamedPath,
	type LastOpenedRecord,
} from '../logic/logicLastOpened';

const STORE_FILE = 'last-opened.json';
const FLUSH_DELAY_MS = 2000;

/**
 * BT5-013: persists the last time each file was opened.
 *
 * The store lives in its own file next to the plugin data instead of inside
 * the settings, so opening a file never rewrites the whole settings payload.
 * Writes are coalesced into one trailing flush per burst, and a final flush
 * runs on unload so the last open of a session is never lost.
 *
 * The service emits a 'change' event (via Obsidian's Events) when:
 *  - loadStore() finishes loading the persisted record
 *  - withFileOpened() updates the record (debounced with the flush)
 */
export class LastOpenedService extends Component {
	private record: LastOpenedRecord = {};
	private loaded = false;
	private dirty = false;
	private flushTimer: ReturnType<typeof setTimeout> | null = null;
	/** BT5-090: folder recency, rebuilt lazily after the record changes. */
	private folderRecency: ReadonlyMap<string, number> | null = null;
	private readonly events = new Events();
	private loadPromise: Promise<void> | null = null;

	constructor(
		private readonly app: App,
		private readonly pluginId: string,
		private readonly flushDelayMs: number = FLUSH_DELAY_MS,
	) {
		super();
	}

	onload(): void {
		this.loadPromise = this.loadStore();
		this._setupMobileFlushListeners();
	}

	onunload(): Promise<void> {
		this._cancelFlush();
		// Await the pending write so Android doesn't cut it off.
		return this.flush();
	}

	/** Subscribe to store changes. Returns an unsubscribe function. */
	onChange(callback: (record: LastOpenedRecord) => void): () => void {
		this.events.on(
			'change',
			callback as unknown as (...data: unknown[]) => unknown,
		);
		return () => this.events.off('change', callback as unknown as (...data: unknown[]) => unknown);
	}

	/** Wait for the initial load to complete. */
	async whenLoaded(): Promise<void> {
		if (this.loadPromise) await this.loadPromise;
	}

	private _storePath(): string {
		return `${this.app.vault.configDir}/plugins/${this.pluginId}/${STORE_FILE}`;
	}

	async loadStore(): Promise<void> {
		try {
			const raw = await this.app.vault.adapter.read(this._storePath());
			this.record = normalizeLastOpenedRecord(JSON.parse(raw));
		} catch {
			// No store yet, or it is unreadable: start from an empty record.
			this.record = {};
		}
		this.loaded = true;
		this.folderRecency = null;
		this._pruneAgainstVault();
		// Notify listeners that the store is loaded.
		this.events.trigger('change', this.record);
	}

	/** Entries whose file vanished while the plugin was off are dead weight. */
	private _pruneAgainstVault(): void {
		const files = this.app.vault.getFiles?.();
		if (!files) return;
		const existing = new Set(files.map((file) => file.path));
		const pruned = pruneMissingPaths(this.record, existing);
		if (Object.keys(pruned).length === Object.keys(this.record).length) return;
		this.record = pruned;
		this._markDirty();
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
		if (!(file instanceof TFile)) return;
		const next = withFileOpened(this.record, file.path, at);
		if (next === this.record) return;
		this.record = next;
		this.folderRecency = null;
		this._markDirty();
		this.events.trigger('change', this.record);
	}

	handleRename(newPath: string, oldPath: string): void {
		const next = withRenamedPath(this.record, oldPath, newPath);
		if (next === this.record) return;
		this.record = next;
		this.folderRecency = null;
		this._markDirty();
		this.events.trigger('change', this.record);
	}

	handleDelete(path: string): void {
		const next = withDeletedPath(this.record, path);
		if (Object.keys(next).length === Object.keys(this.record).length) return;
		this.record = next;
		this.folderRecency = null;
		this._markDirty();
		this.events.trigger('change', this.record);
	}

	private _markDirty(): void {
		this.dirty = true;
		this._scheduleFlush();
	}

	private _scheduleFlush(): void {
		if (this.flushTimer !== null) return;
		this.flushTimer = setTimeout(() => {
			this.flushTimer = null;
			void this._write();
		}, this.flushDelayMs);
	}

	private _cancelFlush(): void {
		if (this.flushTimer === null) return;
		clearTimeout(this.flushTimer);
		this.flushTimer = null;
	}

	async flush(): Promise<void> {
		this._cancelFlush();
		await this._write();
	}

	private async _write(): Promise<void> {
		if (!this.loaded || !this.dirty) return;
		this.dirty = false;
		try {
			await this.app.vault.adapter.write(
				this._storePath(),
				JSON.stringify(this.record),
			);
		} catch (error) {
			this.dirty = true;
			console.warn('Vaultman could not persist the last-opened store', error);
		}
	}

	/** Listen for quit/visibilitychange to flush on mobile where unload is unreliable. */
	private _setupMobileFlushListeners(): void {
		const flushOnSignal = () => {
			void this.flush();
		};
		// Desktop quit event
		this.registerEvent(this.app.workspace.on('quit', flushOnSignal));
		// Android/iOS: `visibilitychange` → hidden is the only signal that the app
		// is being backgrounded (and possibly killed) before `onunload` runs.
		if (typeof document !== 'undefined') {
			const onVisibilityChange = () => {
				if (document.visibilityState === 'hidden') {
					void this.flush();
				}
			};
			document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
			this.register(() => {
				document.removeEventListener('visibilitychange', onVisibilityChange);
			});
		}
	}
}
