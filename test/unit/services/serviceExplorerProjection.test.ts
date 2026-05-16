import { describe, expect, it } from 'vitest';
import { createExplorerProjection } from '../../../src/services/serviceExplorerProjection';
import { createExplorerSyntheticDataset } from '../../support/explorerSyntheticDataset';

describe('serviceExplorerProjection', () => {
	it('builds stable projection rows, lookup maps, and media descriptor references', () => {
		const dataset = createExplorerSyntheticDataset({
			nodes: 10_000,
			shape: 'mixed',
			providerId: 'files',
			filteredEvery: 7,
			selectedEvery: 11,
			withBadges: true,
			withMediaDescriptors: true,
		});

		const projection = createExplorerProjection({
			providerId: 'files',
			viewMode: 'tree',
			rowInputs: dataset.rowInputs,
			sourceRevision: 1,
		});

		expect(projection.visibleIds[9999]).toBe('node-9999');
		expect(projection.idToIndex.get('node-9999')).toBe(9999);
		expect(projection.indexToId.get(9999)).toBe('node-9999');
		expect(projection.rowsRevision).toBe(1);
		expect(projection.mediaById.get('node-0')?.status).toBe('unprocessed');
		expect(projection.rows[9999]).toMatchObject({
			id: 'node-9999',
			key: 'files:tree:node-9999',
			index: 9999,
			providerId: 'files',
			viewMode: 'tree',
			depth: dataset.rowInputs[9999].depth,
			parentId: dataset.rowInputs[9999].parentId,
			rowInput: dataset.rowInputs[9999],
			node: dataset.rowInputs[9999].node,
		});
		expect(projection.mediaById.get('node-0')).not.toHaveProperty('bytes');
	});

	it('keeps stable ids for the same source revision and separates layout revision', () => {
		const dataset = createExplorerSyntheticDataset({
			nodes: 1_000,
			shape: 'mixed',
			providerId: 'files',
		});

		const first = createExplorerProjection({
			providerId: 'files',
			viewMode: 'tree',
			rowInputs: dataset.rowInputs,
			sourceRevision: 7,
		});
		const sameRevision = createExplorerProjection({
			providerId: 'files',
			viewMode: 'tree',
			rowInputs: dataset.rowInputs,
			sourceRevision: 7,
		});
		const refreshedRows = createExplorerProjection({
			providerId: 'files',
			viewMode: 'tree',
			rowInputs: dataset.rowInputs,
			sourceRevision: 8,
			layoutRevision: 7,
		});

		expect(sameRevision.rowsRevision).toBe(first.rowsRevision);
		expect(sameRevision.layoutRevision).toBe(first.layoutRevision);
		expect(sameRevision.visibleIds).toEqual(first.visibleIds);
		expect([...sameRevision.idToIndex.entries()]).toEqual([...first.idToIndex.entries()]);
		expect(refreshedRows.rowsRevision).toBe(8);
		expect(refreshedRows.layoutRevision).toBe(7);
		expect(refreshedRows.visibleIds).toEqual(first.visibleIds);
	});
});
