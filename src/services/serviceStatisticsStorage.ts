import type {
	CachedFileStats,
	StatisticsSnapshot,
} from './serviceStatisticsCache';

const DB_SCHEMA_VERSION = 1;
const FILE_STORE = 'files';
const SNAPSHOT_STORE = 'snapshots';

interface SnapshotRecord {
	signature: string;
	snapshot: StatisticsSnapshot;
}

export interface PersistedStatisticsCache {
	fileStats: CachedFileStats[];
	snapshots: SnapshotRecord[];
}

export interface StatisticsCacheStorage {
	initialize(): Promise<void>;
	load(): Promise<PersistedStatisticsCache>;
	putFileStats(stats: CachedFileStats): Promise<void>;
	deleteFileStats(path: string): Promise<void>;
	clearFileStats(): Promise<void>;
	putSnapshot(signature: string, snapshot: StatisticsSnapshot): Promise<void>;
	clearSnapshots(): Promise<void>;
	clear(): Promise<void>;
	close?(): void;
}

export type StatisticsStorageOption =
	| StatisticsCacheStorage
	| Map<string, unknown>;

function isStatsStorage(
	storage: StatisticsStorageOption,
): storage is StatisticsCacheStorage {
	return typeof (storage as StatisticsCacheStorage).initialize === 'function';
}

function cloneFileStats(stats: CachedFileStats): CachedFileStats {
	return {
		...stats,
		props: [...stats.props],
		values: [...stats.values],
		tags: [...stats.tags],
	};
}

function cloneSnapshot(snapshot: StatisticsSnapshot): StatisticsSnapshot {
	return { ...snapshot };
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function normalizeFileStats(value: unknown): CachedFileStats | null {
	if (!value || typeof value !== 'object') return null;
	const candidate = value as Partial<CachedFileStats>;
	if (typeof candidate.path !== 'string') return null;
	if (typeof candidate.mtime !== 'number') return null;
	if (typeof candidate.size !== 'number') return null;
	if (typeof candidate.links !== 'number') return null;
	if (typeof candidate.words !== 'number') return null;
	if (!isStringArray(candidate.props)) return null;
	if (!isStringArray(candidate.values)) return null;
	if (!isStringArray(candidate.tags)) return null;
	return cloneFileStats(candidate as CachedFileStats);
}

function normalizeSnapshot(value: unknown): StatisticsSnapshot | null {
	if (!value || typeof value !== 'object') return null;
	const candidate = value as Partial<StatisticsSnapshot>;
	const numericKeys: Array<keyof StatisticsSnapshot> = [
		'folders',
		'files',
		'props',
		'values',
		'tags',
		'links',
		'words',
		'cacheHits',
		'filesRead',
		'durationMs',
	];
	for (const key of numericKeys) {
		if (typeof candidate[key] !== 'number') return null;
	}
	return cloneSnapshot(candidate as StatisticsSnapshot);
}

class MapStatisticsCacheStorage implements StatisticsCacheStorage {
	constructor(
		private readonly map: Map<string, unknown>,
		private readonly key: string,
	) {}

	async initialize(): Promise<void> {}

	async load(): Promise<PersistedStatisticsCache> {
		const fileStats: CachedFileStats[] = [];
		const snapshots: SnapshotRecord[] = [];
		const filePrefix = this.filePrefix();
		const snapshotPrefix = this.snapshotPrefix();

		for (const [key, value] of this.map.entries()) {
			if (key.startsWith(filePrefix)) {
				const normalized = normalizeFileStats(value);
				if (normalized) fileStats.push(normalized);
			} else if (key.startsWith(snapshotPrefix)) {
				const signature = key.slice(snapshotPrefix.length);
				const snapshot = normalizeSnapshot(value);
				if (snapshot && signature) {
					snapshots.push({ signature, snapshot });
				}
			}
		}

		return { fileStats, snapshots };
	}

	async putFileStats(stats: CachedFileStats): Promise<void> {
		this.map.set(this.fileKey(stats.path), cloneFileStats(stats));
	}

	async deleteFileStats(path: string): Promise<void> {
		this.map.delete(this.fileKey(path));
	}

	async clearFileStats(): Promise<void> {
		this.deleteByPrefix(this.filePrefix());
	}

	async putSnapshot(
		signature: string,
		snapshot: StatisticsSnapshot,
	): Promise<void> {
		this.map.set(this.snapshotKey(signature), cloneSnapshot(snapshot));
	}

	async clearSnapshots(): Promise<void> {
		this.deleteByPrefix(this.snapshotPrefix());
	}

	async clear(): Promise<void> {
		this.deleteByPrefix(`${this.key}:`);
	}

	private deleteByPrefix(prefix: string): void {
		for (const key of [...this.map.keys()]) {
			if (key.startsWith(prefix)) this.map.delete(key);
		}
	}

	private fileKey(path: string): string {
		return `${this.filePrefix()}${path}`;
	}

	private filePrefix(): string {
		return `${this.key}:file:`;
	}

	private snapshotKey(signature: string): string {
		return `${this.snapshotPrefix()}${signature}`;
	}

	private snapshotPrefix(): string {
		return `${this.key}:snapshot:`;
	}
}

class IndexedDBStatisticsCacheStorage implements StatisticsCacheStorage {
	private db: IDBDatabase | null = null;
	private initPromise: Promise<void> | null = null;

	constructor(private readonly dbName: string) {}

	async initialize(): Promise<void> {
		if (this.db) return;
		if (this.initPromise) return this.initPromise;
		const initPromise = new Promise<void>((resolve, reject) => {
			const request = indexedDB.open(this.dbName, DB_SCHEMA_VERSION);

			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(FILE_STORE)) {
					db.createObjectStore(FILE_STORE, { keyPath: 'path' });
				}
				if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
					db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'signature' });
				}
			};

			request.onsuccess = () => {
				this.db = request.result;
				this.db.onversionchange = () => {
					this.close();
				};
				resolve();
			};

			request.onerror = () => {
				reject(request.error ?? new Error('Failed to open statistics cache'));
			};
		}).finally(() => {
			this.initPromise = null;
		});
		this.initPromise = initPromise;
		return initPromise;
	}

	async load(): Promise<PersistedStatisticsCache> {
		await this.initialize();
		const [rawFileStats, rawSnapshots] = await Promise.all([
			this.getAll(FILE_STORE),
			this.getAll(SNAPSHOT_STORE),
		]);
		const fileStats = rawFileStats
			.map(normalizeFileStats)
			.filter((stats): stats is CachedFileStats => stats !== null);
		const snapshots: SnapshotRecord[] = [];

		for (const rawSnapshot of rawSnapshots) {
			if (!rawSnapshot || typeof rawSnapshot !== 'object') continue;
			const record = rawSnapshot as Partial<SnapshotRecord>;
			if (typeof record.signature !== 'string') continue;
			const snapshot = normalizeSnapshot(record.snapshot);
			if (snapshot) snapshots.push({ signature: record.signature, snapshot });
		}

		return { fileStats, snapshots };
	}

	async putFileStats(stats: CachedFileStats): Promise<void> {
		await this.put(FILE_STORE, cloneFileStats(stats));
	}

	async deleteFileStats(path: string): Promise<void> {
		await this.delete(FILE_STORE, path);
	}

	async clearFileStats(): Promise<void> {
		await this.clearStore(FILE_STORE);
	}

	async putSnapshot(
		signature: string,
		snapshot: StatisticsSnapshot,
	): Promise<void> {
		await this.put(SNAPSHOT_STORE, {
			signature,
			snapshot: cloneSnapshot(snapshot),
		});
	}

	async clearSnapshots(): Promise<void> {
		await this.clearStore(SNAPSHOT_STORE);
	}

	async clear(): Promise<void> {
		await this.initialize();
		await Promise.all([this.clearFileStats(), this.clearSnapshots()]);
	}

	close(): void {
		this.db?.close();
		this.db = null;
	}

	private async getAll(storeName: string): Promise<unknown[]> {
		const store = await this.objectStore(storeName, 'readonly');
		return new Promise((resolve, reject) => {
			const request = store.getAll();
			request.onsuccess = () => {
				resolve(Array.isArray(request.result) ? request.result : []);
			};
			request.onerror = () => {
				reject(request.error ?? new Error(`Failed to read ${storeName}`));
			};
		});
	}

	private async put(storeName: string, value: unknown): Promise<void> {
		const store = await this.objectStore(storeName, 'readwrite');
		return new Promise((resolve, reject) => {
			const request = store.put(value);
			request.onsuccess = () => resolve();
			request.onerror = () => {
				reject(request.error ?? new Error(`Failed to write ${storeName}`));
			};
		});
	}

	private async delete(storeName: string, key: IDBValidKey): Promise<void> {
		const store = await this.objectStore(storeName, 'readwrite');
		return new Promise((resolve, reject) => {
			const request = store.delete(key);
			request.onsuccess = () => resolve();
			request.onerror = () => {
				reject(request.error ?? new Error(`Failed to delete from ${storeName}`));
			};
		});
	}

	private async clearStore(storeName: string): Promise<void> {
		const store = await this.objectStore(storeName, 'readwrite');
		return new Promise((resolve, reject) => {
			const request = store.clear();
			request.onsuccess = () => resolve();
			request.onerror = () => {
				reject(request.error ?? new Error(`Failed to clear ${storeName}`));
			};
		});
	}

	private async objectStore(
		storeName: string,
		mode: IDBTransactionMode,
	): Promise<IDBObjectStore> {
		await this.initialize();
		if (!this.db) throw new Error('Statistics cache database is not open');
		return this.db.transaction(storeName, mode).objectStore(storeName);
	}
}

export function createStatisticsCacheStorage(
	storageKey: string,
	storage?: StatisticsStorageOption,
): StatisticsCacheStorage | null {
	if (storage) {
		return isStatsStorage(storage)
			? storage
			: new MapStatisticsCacheStorage(storage, storageKey);
	}

	if (typeof indexedDB === 'undefined') return null;
	return new IndexedDBStatisticsCacheStorage(
		`vaultman/statistics-cache/${storageKey}`,
	);
}
