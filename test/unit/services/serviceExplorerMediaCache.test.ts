import { describe, expect, it } from 'vitest';
import {
	ExplorerMediaCacheService,
	MemoryExplorerMediaCacheStore,
	createExplorerMediaTargetKey,
	type ExplorerMediaRecord,
} from '../../../src/services/serviceExplorerMediaCache';

const fileTarget = { kind: 'file' as const, filePath: 'Images/Cover.png' };
const nodeTarget = { kind: 'node' as const, nodeId: 'node-1', filePath: 'Notes/Card.md' };

function bytes(values: readonly number[]): Uint8Array {
	return new Uint8Array(values);
}

function baseRecord(overrides: Partial<ExplorerMediaRecord> = {}): ExplorerMediaRecord {
	return {
		targetKey: createExplorerMediaTargetKey(fileTarget),
		target: fileTarget,
		status: 'unprocessed',
		mediaKey: 'cover-v1',
		sourceMtime: 100,
		sourceHash: 'hash-v1',
		generatedAt: 0,
		...overrides,
	};
}

describe('ExplorerMediaCacheService', () => {
	it('stores media status/key metadata separately from blobs', async () => {
		const store = new MemoryExplorerMediaCacheStore();
		const service = new ExplorerMediaCacheService({ store, maxBlobBytes: 10 });
		const record = baseRecord({ status: 'ready', dimensions: { width: 64, height: 32 } });

		await service.putRecord(record);
		await service.putBlob({
			mediaKey: 'cover-v1',
			mimeType: 'image/png',
			bytes: bytes([1, 2, 3]),
		});

		expect(await store.getRecord(record.targetKey)).toMatchObject({
			status: 'ready',
			mediaKey: 'cover-v1',
			dimensions: { width: 64, height: 32 },
		});
		expect((await store.getRecord(record.targetKey)) as Record<string, unknown>).not.toHaveProperty(
			'bytes',
		);
		expect(await store.getBlob('cover-v1')).toMatchObject({
			mediaKey: 'cover-v1',
			mimeType: 'image/png',
			byteLength: 3,
		});
		expect(service.getLruSnapshot()).toEqual({ totalBytes: 0, keys: [] });
	});

	it('rejects stale blob reads when the expected mediaKey no longer matches the record', async () => {
		const store = new MemoryExplorerMediaCacheStore();
		const service = new ExplorerMediaCacheService({ store, maxBlobBytes: 20 });
		const targetKey = createExplorerMediaTargetKey(fileTarget);

		await service.putRecord(baseRecord({ status: 'ready', mediaKey: 'cover-v1' }));
		await service.putBlob({ mediaKey: 'cover-v1', bytes: bytes([1, 2, 3]) });
		await service.putBlob({ mediaKey: 'cover-v2', bytes: bytes([9, 9, 9]) });

		await service.putRecord(baseRecord({ status: 'ready', mediaKey: 'cover-v2' }));

		await expect(service.readBlob({ targetKey, expectedMediaKey: 'cover-v1' })).resolves.toBeNull();
		await expect(service.readBlob({ targetKey, expectedMediaKey: 'cover-v2' })).resolves.toMatchObject({
			mediaKey: 'cover-v2',
			byteLength: 3,
		});
	});

	it('bounds the in-memory blob LRU while leaving blob database records readable', async () => {
		const store = new MemoryExplorerMediaCacheStore();
		const service = new ExplorerMediaCacheService({ store, maxBlobBytes: 5 });
		const targetA = createExplorerMediaTargetKey({ kind: 'file', filePath: 'Images/A.png' });
		const targetB = createExplorerMediaTargetKey({ kind: 'file', filePath: 'Images/B.png' });

		await service.putRecord(
			baseRecord({
				targetKey: targetA,
				target: { kind: 'file', filePath: 'Images/A.png' },
				status: 'ready',
				mediaKey: 'a',
			}),
		);
		await service.putRecord(
			baseRecord({
				targetKey: targetB,
				target: { kind: 'file', filePath: 'Images/B.png' },
				status: 'ready',
				mediaKey: 'b',
			}),
		);
		await store.putBlob({ mediaKey: 'a', bytes: bytes([1, 1, 1]), byteLength: 3 });
		await store.putBlob({ mediaKey: 'b', bytes: bytes([2, 2, 2]), byteLength: 3 });

		await service.readBlob({ targetKey: targetA, expectedMediaKey: 'a' });
		await service.readBlob({ targetKey: targetB, expectedMediaKey: 'b' });

		expect(service.getLruSnapshot()).toEqual({
			totalBytes: 3,
			keys: ['b'],
		});
		expect(await store.getBlob('a')).toMatchObject({ mediaKey: 'a', byteLength: 3 });
		expect(await store.getBlob('b')).toMatchObject({ mediaKey: 'b', byteLength: 3 });
	});

	it('lazily loads blobs only for visible ready rows', async () => {
		const store = new MemoryExplorerMediaCacheStore();
		const service = new ExplorerMediaCacheService({ store, maxBlobBytes: 20 });
		const visibleTargetKey = createExplorerMediaTargetKey(fileTarget);
		const hiddenTargetKey = createExplorerMediaTargetKey({
			kind: 'file',
			filePath: 'Images/Hidden.png',
		});
		const staleTargetKey = createExplorerMediaTargetKey({
			kind: 'node',
			nodeId: 'stale-node',
			filePath: 'Notes/Stale.md',
		});

		await service.putRecord(baseRecord({ targetKey: visibleTargetKey, status: 'ready', mediaKey: 'visible' }));
		await service.putRecord(
			baseRecord({
				targetKey: hiddenTargetKey,
				target: { kind: 'file', filePath: 'Images/Hidden.png' },
				status: 'ready',
				mediaKey: 'hidden',
			}),
		);
		await service.putRecord(
			baseRecord({
				targetKey: staleTargetKey,
				target: { kind: 'node', nodeId: 'stale-node', filePath: 'Notes/Stale.md' },
				status: 'stale',
				mediaKey: 'stale',
			}),
		);
		await service.putBlob({ mediaKey: 'visible', bytes: bytes([1]) });
		await service.putBlob({ mediaKey: 'hidden', bytes: bytes([2]) });
		await service.putBlob({ mediaKey: 'stale', bytes: bytes([3]) });

		const loaded = await service.loadVisibleBlobs([visibleTargetKey, staleTargetKey]);

		expect([...loaded.keys()]).toEqual([visibleTargetKey]);
		expect(loaded.get(visibleTargetKey)).toMatchObject({ mediaKey: 'visible', byteLength: 1 });
		expect(service.getLruSnapshot().keys).toEqual(['visible']);
	});

	it('publishes narrow file and node media status transitions without generic row subscriptions', async () => {
		const store = new MemoryExplorerMediaCacheStore();
		const service = new ExplorerMediaCacheService({ store, maxBlobBytes: 20 });
		const fileEvents: string[] = [];
		const nodeEvents: string[] = [];
		const unrelatedEvents: string[] = [];

		const unsubscribeFile = service.subscribeFile(fileTarget.filePath, (event) => {
			fileEvents.push(`${event.previousStatus ?? 'none'}->${event.currentStatus ?? 'removed'}`);
		});
		const unsubscribeNode = service.subscribeNode(nodeTarget.nodeId, (event) => {
			nodeEvents.push(`${event.previousStatus ?? 'none'}->${event.currentStatus ?? 'removed'}`);
		});
		service.subscribeFile('Images/Other.png', (event) => {
			unrelatedEvents.push(event.targetKey);
		});

		await service.putRecord(baseRecord({ status: 'unprocessed' }));
		await service.putRecord(baseRecord({ status: 'ready', mediaKey: 'cover-v1' }));
		await service.putRecord(baseRecord({ status: 'stale', mediaKey: 'cover-v1' }));
		await service.putRecord(baseRecord({ status: 'ready', mediaKey: 'cover-v1' }));
		await service.putRecord(baseRecord({ status: 'error', mediaKey: 'cover-v1', error: 'decode failed' }));
		await service.deleteRecord(createExplorerMediaTargetKey(fileTarget));
		await service.putRecord(
			baseRecord({
				targetKey: createExplorerMediaTargetKey(nodeTarget),
				target: nodeTarget,
				status: 'ready',
				mediaKey: 'node-v1',
			}),
		);

		unsubscribeFile();
		unsubscribeNode();
		await service.putRecord(baseRecord({ status: 'ready', mediaKey: 'cover-v2' }));

		expect(fileEvents).toEqual([
			'none->unprocessed',
			'unprocessed->ready',
			'ready->stale',
			'stale->ready',
			'ready->error',
			'error->removed',
		]);
		expect(nodeEvents).toEqual(['none->ready']);
		expect(unrelatedEvents).toEqual([]);
		expect('subscribeRow' in service).toBe(false);
	});
});
