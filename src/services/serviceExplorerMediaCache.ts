export type ExplorerMediaStatus = 'unprocessed' | 'ready' | 'stale' | 'error';

export type ExplorerMediaTarget =
	| {
			kind: 'file';
			filePath: string;
	  }
	| {
			kind: 'node';
			nodeId: string;
			filePath?: string;
	  };

export interface ExplorerMediaDimensions {
	width: number;
	height: number;
}

export interface ExplorerMediaRecord {
	targetKey: string;
	target: ExplorerMediaTarget;
	status: ExplorerMediaStatus;
	mediaKey: string | null;
	revision?: number;
	sourceMtime?: number;
	sourceHash?: string;
	dimensions?: ExplorerMediaDimensions;
	generatedAt?: number;
	error?: string;
}

export interface ExplorerMediaBlob {
	mediaKey: string;
	bytes: Uint8Array;
	byteLength: number;
	mimeType?: string;
}

export interface ExplorerMediaBlobInput {
	mediaKey: string;
	bytes: Uint8Array;
	mimeType?: string;
}

export interface ExplorerMediaCacheStore {
	getRecord(targetKey: string): Promise<ExplorerMediaRecord | undefined>;
	putRecord(record: ExplorerMediaRecord): Promise<void>;
	deleteRecord(targetKey: string): Promise<void>;
	getBlob(mediaKey: string): Promise<ExplorerMediaBlob | undefined>;
	putBlob(blob: ExplorerMediaBlob): Promise<void>;
	deleteBlob(mediaKey: string): Promise<void>;
}

export interface ExplorerMediaCacheEvent {
	targetKey: string;
	target: ExplorerMediaTarget;
	previousRecord: ExplorerMediaRecord | null;
	currentRecord: ExplorerMediaRecord | null;
	previousStatus: ExplorerMediaStatus | null;
	currentStatus: ExplorerMediaStatus | null;
}

export type ExplorerMediaCacheListener = (event: ExplorerMediaCacheEvent) => void;

export interface ExplorerMediaCacheServiceOptions {
	store: ExplorerMediaCacheStore;
	maxBlobBytes: number;
}

export interface ExplorerMediaBlobRead {
	targetKey: string;
	expectedMediaKey: string;
}

export interface ExplorerVisibleDescriptorBlobInput {
	mediaById: ReadonlyMap<string, ExplorerMediaRecord>;
	visibleIds: readonly string[];
	mediaVisible: boolean;
}

export interface ExplorerMediaLruSnapshot {
	totalBytes: number;
	keys: readonly string[];
}

export function createExplorerMediaTargetKey(target: ExplorerMediaTarget): string {
	if (target.kind === 'file') return `file:${target.filePath}`;
	return `node:${target.nodeId}`;
}

export class MemoryExplorerMediaCacheStore implements ExplorerMediaCacheStore {
	private readonly records = new Map<string, ExplorerMediaRecord>();
	private readonly blobs = new Map<string, ExplorerMediaBlob>();

	async getRecord(targetKey: string): Promise<ExplorerMediaRecord | undefined> {
		const record = this.records.get(targetKey);
		return record ? cloneRecord(record) : undefined;
	}

	async putRecord(record: ExplorerMediaRecord): Promise<void> {
		this.records.set(record.targetKey, cloneRecord(record));
	}

	async deleteRecord(targetKey: string): Promise<void> {
		this.records.delete(targetKey);
	}

	async getBlob(mediaKey: string): Promise<ExplorerMediaBlob | undefined> {
		const blob = this.blobs.get(mediaKey);
		return blob ? cloneBlob(blob) : undefined;
	}

	async putBlob(blob: ExplorerMediaBlob): Promise<void> {
		this.blobs.set(blob.mediaKey, cloneBlob(blob));
	}

	async deleteBlob(mediaKey: string): Promise<void> {
		this.blobs.delete(mediaKey);
	}
}

export class ExplorerMediaCacheService {
	private readonly store: ExplorerMediaCacheStore;
	private readonly maxBlobBytes: number;
	private readonly blobLru = new Map<string, ExplorerMediaBlob>();
	private readonly targetListeners = new Map<string, Set<ExplorerMediaCacheListener>>();
	private lruBytes = 0;

	constructor(options: ExplorerMediaCacheServiceOptions) {
		this.store = options.store;
		this.maxBlobBytes = Math.max(0, options.maxBlobBytes);
	}

	async putRecord(record: ExplorerMediaRecord): Promise<ExplorerMediaRecord> {
		const normalized = cloneRecord(record);
		const previous = await this.store.getRecord(normalized.targetKey);

		await this.store.putRecord(normalized);
		this.publish({
			targetKey: normalized.targetKey,
			target: normalized.target,
			previousRecord: previous ? cloneRecord(previous) : null,
			currentRecord: cloneRecord(normalized),
			previousStatus: previous?.status ?? null,
			currentStatus: normalized.status,
		});

		return cloneRecord(normalized);
	}

	async deleteRecord(targetKey: string): Promise<void> {
		const previous = await this.store.getRecord(targetKey);

		await this.store.deleteRecord(targetKey);
		if (!previous) return;

		this.publish({
			targetKey,
			target: previous.target,
			previousRecord: cloneRecord(previous),
			currentRecord: null,
			previousStatus: previous.status,
			currentStatus: null,
		});
	}

	async putBlob(input: ExplorerMediaBlobInput): Promise<ExplorerMediaBlob> {
		const blob = normalizeBlob(input);

		await this.store.putBlob(blob);
		return cloneBlob(blob);
	}

	async readBlob(input: ExplorerMediaBlobRead): Promise<ExplorerMediaBlob | null> {
		const record = await this.store.getRecord(input.targetKey);
		if (!record || record.status !== 'ready') return null;
		if (record.mediaKey !== input.expectedMediaKey) return null;

		return this.readBlobByKey(input.expectedMediaKey);
	}

	async loadVisibleBlobs(targetKeys: readonly string[]): Promise<Map<string, ExplorerMediaBlob>> {
		const blobs = new Map<string, ExplorerMediaBlob>();

		for (const targetKey of targetKeys) {
			const record = await this.store.getRecord(targetKey);
			if (!record || record.status !== 'ready' || !record.mediaKey) continue;

			const blob = await this.readBlob({ targetKey, expectedMediaKey: record.mediaKey });
			if (blob) blobs.set(targetKey, blob);
		}

		return blobs;
	}

	async loadVisibleDescriptorBlobs(
		input: ExplorerVisibleDescriptorBlobInput,
	): Promise<Map<string, ExplorerMediaBlob>> {
		const blobs = new Map<string, ExplorerMediaBlob>();
		if (!input.mediaVisible) return blobs;

		for (const id of input.visibleIds) {
			const descriptor = input.mediaById.get(id);
			if (!descriptor || descriptor.status !== 'ready' || !descriptor.mediaKey) continue;

			const blob = await this.readBlob({
				targetKey: descriptor.targetKey,
				expectedMediaKey: descriptor.mediaKey,
			});
			if (blob) blobs.set(id, blob);
		}

		return blobs;
	}

	subscribeFile(filePath: string, listener: ExplorerMediaCacheListener): () => void {
		return this.subscribeTarget(createExplorerMediaTargetKey({ kind: 'file', filePath }), listener);
	}

	subscribeNode(nodeId: string, listener: ExplorerMediaCacheListener): () => void {
		return this.subscribeTarget(createExplorerMediaTargetKey({ kind: 'node', nodeId }), listener);
	}

	getLruSnapshot(): ExplorerMediaLruSnapshot {
		return {
			totalBytes: this.lruBytes,
			keys: [...this.blobLru.keys()],
		};
	}

	private subscribeTarget(targetKey: string, listener: ExplorerMediaCacheListener): () => void {
		let listeners = this.targetListeners.get(targetKey);
		if (!listeners) {
			listeners = new Set();
			this.targetListeners.set(targetKey, listeners);
		}

		listeners.add(listener);
		return () => {
			listeners?.delete(listener);
			if (listeners?.size === 0) this.targetListeners.delete(targetKey);
		};
	}

	private publish(event: ExplorerMediaCacheEvent): void {
		const listeners = this.targetListeners.get(event.targetKey);
		if (!listeners) return;

		for (const listener of listeners) {
			listener({
				...event,
				target: cloneTarget(event.target),
				previousRecord: event.previousRecord ? cloneRecord(event.previousRecord) : null,
				currentRecord: event.currentRecord ? cloneRecord(event.currentRecord) : null,
			});
		}
	}

	private async readBlobByKey(mediaKey: string): Promise<ExplorerMediaBlob | null> {
		const cached = this.blobLru.get(mediaKey);
		if (cached) {
			this.blobLru.delete(mediaKey);
			this.blobLru.set(mediaKey, cached);
			return cloneBlob(cached);
		}

		const blob = await this.store.getBlob(mediaKey);
		if (!blob || blob.mediaKey !== mediaKey) return null;

		this.rememberBlob(blob);
		return cloneBlob(blob);
	}

	private rememberBlob(blob: ExplorerMediaBlob): void {
		const existing = this.blobLru.get(blob.mediaKey);
		if (existing) {
			this.blobLru.delete(blob.mediaKey);
			this.lruBytes -= existing.byteLength;
		}

		if (this.maxBlobBytes === 0 || blob.byteLength > this.maxBlobBytes) return;

		const cached = cloneBlob(blob);
		this.blobLru.set(cached.mediaKey, cached);
		this.lruBytes += cached.byteLength;
		this.evictOverflow();
	}

	private evictOverflow(): void {
		while (this.lruBytes > this.maxBlobBytes) {
			const oldestKey = this.blobLru.keys().next().value;
			if (!oldestKey) return;

			const oldest = this.blobLru.get(oldestKey);
			this.blobLru.delete(oldestKey);
			this.lruBytes -= oldest?.byteLength ?? 0;
		}
	}
}

function normalizeBlob(input: ExplorerMediaBlobInput): ExplorerMediaBlob {
	const bytes = cloneBytes(input.bytes);
	return {
		mediaKey: input.mediaKey,
		bytes,
		byteLength: bytes.byteLength,
		mimeType: input.mimeType,
	};
}

function cloneRecord(record: ExplorerMediaRecord): ExplorerMediaRecord {
	return {
		...record,
		target: cloneTarget(record.target),
		dimensions: record.dimensions ? { ...record.dimensions } : undefined,
	};
}

function cloneBlob(blob: ExplorerMediaBlob): ExplorerMediaBlob {
	return {
		...blob,
		bytes: cloneBytes(blob.bytes),
	};
}

function cloneTarget(target: ExplorerMediaTarget): ExplorerMediaTarget {
	return { ...target };
}

function cloneBytes(bytes: Uint8Array): Uint8Array {
	return bytes.slice();
}
