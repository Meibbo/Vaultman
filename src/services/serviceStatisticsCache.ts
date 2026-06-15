import { Component, Events, TFile, type App } from 'obsidian';
import { vaultmanPerfMonitor } from '../utils/performanceMonitor';
import {
	createStatisticsCacheStorage,
	type StatisticsCacheStorage,
	type StatisticsStorageOption,
} from './serviceStatisticsStorage';

export type StatisticsScope = 'vault' | 'filtered' | 'selected';

export interface CachedFileStats {
	path: string;
	ctime: number;
	mtime: number;
	size: number;
	links: number;
	words: number;
	props: string[];
	values: string[];
	tags: string[];
}

export interface StatisticsSnapshot {
	folders: number;
	files: number;
	props: number;
	values: number;
	tags: number;
	links: number;
	words: number;
	cacheHits: number;
	filesRead: number;
	durationMs: number;
}

export interface StatisticsComputeOptions {
	files: TFile[];
	folders: number;
	scope: StatisticsScope;
	onPartial?: (snapshot: StatisticsSnapshot) => void;
	shouldContinue?: () => boolean;
}

export interface StatisticsCacheServiceOptions {
	storage?: StatisticsStorageOption;
	storageKey?: string;
}

export class StatisticsCacheService extends Component {
	private readonly app: App;
	private readonly events = new Events();
	private readonly storage: StatisticsCacheStorage | null;
	private fileStatsCache = new Map<string, CachedFileStats>();
	private aggregateStatsCache = new Map<string, StatisticsSnapshot>();
	private scopeStatsCache = new Map<StatisticsScope, StatisticsSnapshot>();
	private storageInitialized = false;
	private storageInitPromise: Promise<void> | null = null;

	constructor(app: App, options: StatisticsCacheServiceOptions = {}) {
		super();
		this.app = app;
		this.storage = createStatisticsCacheStorage(
			options.storageKey ?? this.defaultStorageKey(app),
			options.storage,
		);
	}

	onload(): void {
		void this.initializeStorage();
		this.registerEvent(
			this.app.metadataCache.on('changed', (file) => {
				if (file instanceof TFile) this.invalidateFile(file);
			}),
		);
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile) this.invalidateFile(file);
			}),
		);
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (file instanceof TFile) this.invalidateFile(file);
			}),
		);
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile) this.deleteCachedPath(file.path);
			}),
		);
		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				if (typeof oldPath === 'string') this.deleteCachedPath(oldPath);
				if (file instanceof TFile) this.invalidateFile(file);
			}),
		);
	}

	onunload(): void {
		this.storage?.close?.();
	}

	on(name: 'changed', callback: () => void): void {
		this.events.on(name, callback);
	}

	off(name: 'changed', callback: () => void): void {
		this.events.off(name, callback);
	}

	signatureFor(files: TFile[]): string {
		let hash = 2166136261;
		for (const file of files) {
			hash = this.hashString(hash, file.path);
			hash = this.hashString(hash, String(file.stat.ctime));
			hash = this.hashString(hash, String(file.stat.mtime));
			hash = this.hashString(hash, String(file.stat.size));
		}
		return `${files.length}:${hash >>> 0}`;
	}

	snapshotSignatureFor(files: TFile[], folders: number): string {
		return `${this.signatureFor(files)}:folders=${folders}`;
	}

	invalidateFile(file: TFile): void {
		this.fileStatsCache.delete(file.path);
		this.invalidateAggregates();
	}

	deleteCachedPath(path: string): void {
		this.fileStatsCache.delete(path);
		this.invalidateAggregates();
		void this.deletePersistedPath(path);
	}

	clear(): void {
		this.fileStatsCache.clear();
		this.scopeStatsCache.clear();
		this.invalidateAggregates();
		void this.storage?.clear();
	}

	async initializeStorage(): Promise<void> {
		if (!this.storage) return;
		if (this.storageInitialized) return;
		if (this.storageInitPromise) return this.storageInitPromise;

		this.storageInitPromise = (async () => {
			try {
				await this.storage?.initialize();
				const persisted = await this.storage?.load();
				for (const stats of persisted?.fileStats ?? []) {
					this.fileStatsCache.set(stats.path, stats);
				}
				for (const { signature, snapshot } of persisted?.snapshots ?? []) {
					const scope = this.scopeFromSnapshotKey(signature);
					if (scope) {
						this.scopeStatsCache.set(scope, snapshot);
					} else {
						this.aggregateStatsCache.set(signature, snapshot);
					}
				}
				this.storageInitialized = true;
			} catch (error) {
				console.warn(
					'[Vaultman] Statistics persistent cache unavailable; using memory cache',
					error,
				);
				this.storageInitialized = true;
			}
		})().finally(() => {
			this.storageInitPromise = null;
		});

		return this.storageInitPromise;
	}

	getLastGoodSnapshot(signature: string): StatisticsSnapshot | null {
		const snapshot = this.aggregateStatsCache.get(signature);
		return this.snapshotForDisplay(snapshot);
	}

	getLastGoodSnapshotForScope(scope: StatisticsScope): StatisticsSnapshot | null {
		const snapshot = this.scopeStatsCache.get(scope);
		return this.snapshotForDisplay(snapshot);
	}

	getFileTimes(file: TFile): { ctime: number; mtime: number } {
		const cached = this.fileStatsCache.get(file.path);
		if (this.isFreshCachedStats(file, cached)) {
			return {
				ctime: cached.ctime,
				mtime: cached.mtime,
			};
		}
		return {
			ctime: file.stat.ctime,
			mtime: file.stat.mtime,
		};
	}

	getFileWordCount(file: TFile): number | null {
		const cached = this.fileStatsCache.get(file.path);
		if (this.isFreshCachedStats(file, cached)) return cached.words;
		return null;
	}

	private snapshotForDisplay(
		snapshot: StatisticsSnapshot | undefined,
	): StatisticsSnapshot | null {
		if (!snapshot) return null;
		return {
			...snapshot,
			filesRead: 0,
			durationMs: 0,
		};
	}

	async computeSnapshot({
		files,
		folders,
		scope,
		onPartial,
		shouldContinue,
	}: StatisticsComputeOptions): Promise<StatisticsSnapshot> {
		await this.initializeStorage();
		const signature = this.snapshotSignatureFor(files, folders);
		const cachedSnapshot = this.aggregateStatsCache.get(signature);
		if (cachedSnapshot) {
			return {
				...cachedSnapshot,
				cacheHits: files.length,
				filesRead: 0,
				durationMs: 0,
			};
		}

		const started = performance.now();
		let cacheHits = 0;
		let filesRead = 0;
		let totalLinks = 0;
		let totalWords = 0;
		const props = new Set<string>();
		const values = new Set<string>();
		const tags = new Set<string>();

		await vaultmanPerfMonitor.measureAsync(
			'statistics.compute',
			async () => {
				for (let index = 0; index < files.length; index += 1) {
					if (shouldContinue && !shouldContinue()) return;
					const file = files[index];
					let fileStats = this.fileStatsCache.get(file.path);
					if (this.isFreshCachedStats(file, fileStats)) {
						cacheHits += 1;
					} else {
						const content = await this.app.vault.cachedRead(file);
						fileStats = {
							path: file.path,
							ctime: file.stat.ctime,
							mtime: file.stat.mtime,
							size: file.stat.size,
							words: this.countWords(content),
							...this.collectFileMetadata(file),
						};
						this.fileStatsCache.set(file.path, fileStats);
						void this.persistFileStats(fileStats);
						filesRead += 1;
					}

					totalLinks += fileStats.links;
					totalWords += fileStats.words;
					for (const prop of fileStats.props) props.add(prop);
					for (const value of fileStats.values) values.add(value);
					for (const tag of fileStats.tags) tags.add(tag);

					if ((index + 1) % 25 === 0) {
						await new Promise((resolve) => window.setTimeout(resolve, 0));
					}

					if ((index + 1) % 500 === 0) {
						onPartial?.(
							this.createSnapshot({
								folders,
								files: files.length,
								props,
								values,
								tags,
								totalLinks,
								totalWords,
								cacheHits,
								filesRead,
								started,
							}),
						);
					}
				}
			},
			{ scope, files: files.length },
		);

		const snapshot = this.createSnapshot({
			folders,
			files: files.length,
			props,
			values,
			tags,
			totalLinks,
			totalWords,
			cacheHits,
			filesRead,
			started,
		});
		if (!shouldContinue || shouldContinue()) {
			this.aggregateStatsCache.set(signature, snapshot);
			this.scopeStatsCache.set(scope, snapshot);
			void this.persistSnapshot(signature, snapshot);
			void this.persistSnapshot(this.scopeSnapshotKey(scope), snapshot);
		}
		return snapshot;
	}

	private invalidateAggregates(): void {
		this.aggregateStatsCache.clear();
		this.events.trigger('changed');
	}

	private async persistFileStats(stats: CachedFileStats): Promise<void> {
		if (!this.storage) return;
		await this.initializeStorage();
		await this.storage.putFileStats(stats);
	}

	private async persistSnapshot(
		signature: string,
		snapshot: StatisticsSnapshot,
	): Promise<void> {
		if (!this.storage) return;
		await this.initializeStorage();
		await this.storage.putSnapshot(signature, snapshot);
	}

	private async deletePersistedPath(path: string): Promise<void> {
		if (!this.storage) return;
		await this.initializeStorage();
		await this.storage.deleteFileStats(path);
	}

	private countWords(content: string): number {
		const withoutFrontmatter = content.replace(/^---[\s\S]*?---\s*/, '');
		const words = withoutFrontmatter.trim().match(/\S+/g);
		return words?.length ?? 0;
	}

	private collectFileMetadata(
		file: TFile,
	): Omit<CachedFileStats, 'path' | 'ctime' | 'mtime' | 'size' | 'words'> {
		const props = new Set<string>();
		const values = new Set<string>();
		const tags = new Set<string>();
		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter ?? {};

		for (const [key, rawValue] of Object.entries(frontmatter)) {
			if (key === 'position') continue;
			props.add(key);
			const rawValues = Array.isArray(rawValue) ? rawValue : [rawValue];
			for (const value of rawValues) {
				if (value === undefined || value === null) continue;
				values.add(`${key}:${String(value)}`);
			}
		}

		const frontmatterTags = frontmatter.tags as unknown;
		const normalizedFrontmatterTags = Array.isArray(frontmatterTags)
			? frontmatterTags
			: typeof frontmatterTags === 'string'
				? [frontmatterTags]
				: [];
		for (const tag of normalizedFrontmatterTags) {
			const clean = String(tag).replace(/^#/, '');
			if (clean) tags.add(clean);
		}
		for (const tagCache of cache?.tags ?? []) {
			const clean = tagCache.tag.replace(/^#/, '');
			if (clean) tags.add(clean);
		}

		return {
			links: (cache?.links?.length ?? 0) + (cache?.embeds?.length ?? 0),
			props: [...props],
			values: [...values],
			tags: [...tags],
		};
	}

	private isFreshCachedStats(
		file: TFile,
		cached: CachedFileStats | undefined,
	): cached is CachedFileStats {
		return (
			!!cached &&
			cached.ctime === file.stat.ctime &&
			cached.mtime === file.stat.mtime &&
			cached.size === file.stat.size
		);
	}

	private hashString(seed: number, value: string): number {
		let hash = seed;
		for (let index = 0; index < value.length; index += 1) {
			hash ^= value.charCodeAt(index);
			hash = Math.imul(hash, 16777619);
		}
		return hash >>> 0;
	}

	private scopeSnapshotKey(scope: StatisticsScope): string {
		return `scope:${scope}`;
	}

	private scopeFromSnapshotKey(key: string): StatisticsScope | null {
		if (!key.startsWith('scope:')) return null;
		const scope = key.slice('scope:'.length);
		return scope === 'vault' || scope === 'filtered' || scope === 'selected'
			? scope
			: null;
	}

	private defaultStorageKey(app: App): string {
		const candidate = app as App & {
			appId?: string;
			vault?: App['vault'] & { getName?: () => string };
		};
		const appId = candidate.appId;
		if (typeof appId === 'string' && appId.trim()) return appId.trim();
		const vaultName = candidate.vault?.getName?.();
		if (vaultName && vaultName.trim()) return vaultName.trim();
		return 'default';
	}

	private createSnapshot({
		folders,
		files,
		props,
		values,
		tags,
		totalLinks,
		totalWords,
		cacheHits,
		filesRead,
		started,
	}: {
		folders: number;
		files: number;
		props: Set<string>;
		values: Set<string>;
		tags: Set<string>;
		totalLinks: number;
		totalWords: number;
		cacheHits: number;
		filesRead: number;
		started: number;
	}): StatisticsSnapshot {
		return {
			folders,
			files,
			props: props.size,
			values: values.size,
			tags: tags.size,
			links: totalLinks,
			words: totalWords,
			cacheHits,
			filesRead,
			durationMs: performance.now() - started,
		};
	}
}
