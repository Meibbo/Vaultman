import { Component, TFile, type App } from 'obsidian';

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
 */
export class LastOpenedService extends Component {
	private record: LastOpenedRecord = {};
	private loaded = false;
	private dirty = false;
	private flushTimer: number | null = null;
	/** BT5-090: folder recency, rebuilt lazily after the record changes. */
	private folderRecency: ReadonlyMap<string, number> | null = null;

	constructor(
		private readonly app: App,
		private readonly pluginId: string,
		private readonly flushDelayMs: number = FLUSH_DELAY_MS,
	) {
		super();
	}

	onload(): void {
		void this.loadStore();
	}

	onunload(): void {
		this._cancelFlush();
		// Fire-and-forget: unload cannot await, but the write is already queued.
		if (this.dirty) void this._write();
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
		this._markDirty();
	}

	handleRename(newPath: string, oldPath: string): void {
		const next = withRenamedPath(this.record, oldPath, newPath);
		if (next === this.record) return;
		this.record = next;
		this._markDirty();
	}

	handleDelete(path: string): void {
		const next = withDeletedPath(this.record, path);
		if (Object.keys(next).length === Object.keys(this.record).length) return;
		this.record = next;
		this._markDirty();
	}

	private _markDirty(): void {
		this.dirty = true;
		// The record changed, so the derived folder map is stale.
		this.folderRecency = null;
		this._scheduleFlush();
	}

	private _scheduleFlush(): void {
		if (this.flushTimer !== null) return;
		this.flushTimer = window.setTimeout(() => {
			this.flushTimer = null;
			void this._write();
		}, this.flushDelayMs);
	}

	private _cancelFlush(): void {
		if (this.flushTimer === null) return;
		window.clearTimeout(this.flushTimer);
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
}
