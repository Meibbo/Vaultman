import { describe, expect, it, vi } from 'vitest';
import {
	ExplorerMediaCacheService,
	createExplorerMediaTargetKey,
	type ExplorerMediaBlob,
	type ExplorerMediaCacheStore,
	type ExplorerMediaRecord,
} from '../../../src/services/serviceExplorerMediaCache';
import { createExplorerProjection } from '../../../src/services/serviceExplorerProjection';
import type { ExplorerRowInput } from '../../../src/services/serviceExplorerRowInput';
import type { ExplorerSyntheticFileMeta } from '../../support/explorerSyntheticDataset';
import { createExplorerSyntheticDataset } from '../../support/explorerSyntheticDataset';

type PollutedMediaRecord = ExplorerMediaRecord & {
	bytes: Uint8Array;
	byteLength: number;
	mimeType: string;
};

function readyDescriptor(nodeId: string, index: number): ExplorerMediaRecord {
	const filePath = `Synthetic/Visible ${index}.png`;
	const target = { kind: 'file' as const, filePath };
	return {
		targetKey: createExplorerMediaTargetKey(target),
		target,
		status: 'ready',
		mediaKey: `media-${nodeId}`,
		dimensions: { width: 320 + index, height: 180 + index },
		sourceMtime: 1000 + index,
		sourceHash: `hash-${nodeId}`,
		revision: 2000 + index,
		generatedAt: 3000 + index,
	};
}

function rowInputsWithReadyMedia(
	rows: readonly ExplorerRowInput<ExplorerSyntheticFileMeta>[],
): ExplorerRowInput<ExplorerSyntheticFileMeta>[] {
	return rows.map((row, index) => ({
		...row,
		mediaDescriptor: readyDescriptor(row.id, index),
	}));
}

function makeStore(records: readonly ExplorerMediaRecord[]): ExplorerMediaCacheStore & {
	getRecord: ReturnType<typeof vi.fn>;
	getBlob: ReturnType<typeof vi.fn>;
} {
	const recordByKey = new Map(records.map((record) => [record.targetKey, record]));
	const blobByKey = new Map(
		records.flatMap((record) => {
			if (!record.mediaKey) return [];
			const blob: ExplorerMediaBlob = {
				mediaKey: record.mediaKey,
				bytes: new Uint8Array([record.revision ?? 1]),
				byteLength: 1,
				mimeType: 'image/png',
			};
			return [[record.mediaKey, blob] as const];
		}),
	);

	return {
		getRecord: vi.fn(async (targetKey: string) => recordByKey.get(targetKey)),
		putRecord: vi.fn(async () => undefined),
		deleteRecord: vi.fn(async () => undefined),
		getBlob: vi.fn(async (mediaKey: string) => blobByKey.get(mediaKey)),
		putBlob: vi.fn(async () => undefined),
		deleteBlob: vi.fn(async () => undefined),
	};
}

describe('serviceExplorerMediaDescriptor', () => {
	it('projects descriptor-only media metadata for every synthetic row without blob fields', () => {
		const dataset = createExplorerSyntheticDataset({
			nodes: 10_000,
			shape: 'mixed',
			providerId: 'files',
			withMediaDescriptors: true,
		});
		const polluted: PollutedMediaRecord = {
			...readyDescriptor('node-0', 0),
			bytes: new Uint8Array([1, 2, 3]),
			byteLength: 3,
			mimeType: 'image/png',
		};
		const rowInputs = dataset.rowInputs.map((row) =>
			row.id === 'node-0' ? { ...row, mediaDescriptor: polluted } : row,
		);

		const projection = createExplorerProjection({
			providerId: 'files',
			viewMode: 'grid',
			rowInputs,
			sourceRevision: 31,
		});

		expect(projection.mediaById.size).toBe(rowInputs.length);
		expect(projection.mediaById.get('node-0')).toMatchObject({
			status: 'ready',
			mediaKey: 'media-node-0',
			dimensions: { width: 320, height: 180 },
			revision: 2000,
		});
		expect(projection.mediaById.get('node-1')).toMatchObject({
			status: 'unprocessed',
			mediaKey: null,
			dimensions: { width: 352, height: 204 },
			revision: 1,
		});
		expect(projection.mediaById.get('node-0')).not.toHaveProperty('bytes');
		expect(projection.mediaById.get('node-0')).not.toHaveProperty('byteLength');
		expect(projection.mediaById.get('node-0')).not.toHaveProperty('mimeType');
		expect(projection.rows[0].mediaDescriptor).toBe(projection.mediaById.get('node-0'));
	});

	it('does not request blobs while media is hidden and loads only visible descriptor ids', async () => {
		const dataset = createExplorerSyntheticDataset({
			nodes: 5,
			shape: 'flat',
			providerId: 'files',
			withMediaDescriptors: true,
		});
		const rowInputs = rowInputsWithReadyMedia(dataset.rowInputs);
		const projection = createExplorerProjection({
			providerId: 'files',
			viewMode: 'cards',
			rowInputs,
			sourceRevision: 32,
		});
		const descriptors = [...projection.mediaById.values()];
		const store = makeStore(descriptors);
		const service = new ExplorerMediaCacheService({ store, maxBlobBytes: 20 });

		const hidden = await service.loadVisibleDescriptorBlobs({
			mediaById: projection.mediaById,
			visibleIds: ['node-1', 'node-3'],
			mediaVisible: false,
		});

		expect(hidden.size).toBe(0);
		expect(store.getRecord).not.toHaveBeenCalled();
		expect(store.getBlob).not.toHaveBeenCalled();

		const visible = await service.loadVisibleDescriptorBlobs({
			mediaById: projection.mediaById,
			visibleIds: ['node-1', 'node-3'],
			mediaVisible: true,
		});

		expect([...visible.keys()]).toEqual(['node-1', 'node-3']);
		expect(visible.get('node-1')).toMatchObject({ mediaKey: 'media-node-1' });
		expect(visible.get('node-3')).toMatchObject({ mediaKey: 'media-node-3' });
		expect(store.getRecord).toHaveBeenCalledTimes(2);
		expect(store.getRecord).toHaveBeenNthCalledWith(
			1,
			projection.mediaById.get('node-1')?.targetKey,
		);
		expect(store.getRecord).toHaveBeenNthCalledWith(
			2,
			projection.mediaById.get('node-3')?.targetKey,
		);
		expect(store.getBlob).toHaveBeenCalledTimes(2);
		expect(store.getBlob).toHaveBeenNthCalledWith(1, 'media-node-1');
		expect(store.getBlob).toHaveBeenNthCalledWith(2, 'media-node-3');
	});
});
