import { describe, expect, it } from 'vitest';
import { createExplorerSyntheticDataset } from '../../support/explorerSyntheticDataset';

describe('explorer synthetic platform dataset', () => {
	it('builds deterministic mixed Explorer rows with lookup maps and media descriptors', () => {
		const dataset = createExplorerSyntheticDataset({
			nodes: 10_000,
			shape: 'mixed',
			providerId: 'files',
			filteredEvery: 7,
			selectedEvery: 11,
			withBadges: true,
			withMediaDescriptors: true,
		});

		expect(dataset.nodes).toHaveLength(10_000);
		expect(dataset.rowInputs).toHaveLength(10_000);
		expect(dataset.idToIndex.get('node-9999')).toBe(9999);
		expect(dataset.activeFilterIds.has('node-7')).toBe(true);
		expect(dataset.mediaDescriptors.get('node-0')?.status).toBe('unprocessed');
	});

	it('builds 50k row maps with unique ids and descriptor-only media records', () => {
		const dataset = createExplorerSyntheticDataset({
			nodes: 50_000,
			shape: 'mixed',
			providerId: 'files',
			withMediaDescriptors: true,
		});

		expect(dataset.nodes).toHaveLength(50_000);
		expect(dataset.rowInputs).toHaveLength(50_000);
		expect(dataset.idToIndex.size).toBe(50_000);
		expect(dataset.indexToId.size).toBe(50_000);
		expect(new Set(dataset.rowInputs.map((row) => row.id)).size).toBe(50_000);
		expect(dataset.idToIndex.get('node-49999')).toBe(49_999);
		expect(dataset.indexToId.get(49_999)).toBe('node-49999');
		expect(dataset.mediaDescriptors.size).toBe(50_000);
		expect(dataset.mediaDescriptors.get('node-49999')).not.toHaveProperty('bytes');
	});

	it('builds a 100k proof dataset without allocating media descriptors or blobs', () => {
		const dataset = createExplorerSyntheticDataset({
			nodes: 100_000,
			shape: 'flat',
			providerId: 'files',
			withMediaDescriptors: false,
		});

		expect(dataset.nodes).toHaveLength(100_000);
		expect(dataset.rowInputs).toHaveLength(100_000);
		expect(dataset.idToIndex.size).toBe(100_000);
		expect(dataset.indexToId.size).toBe(100_000);
		expect(new Set(dataset.expectedVisibleIds).size).toBe(100_000);
		expect(dataset.idToIndex.get('node-99999')).toBe(99_999);
		expect(dataset.indexToId.get(99_999)).toBe('node-99999');
		expect(dataset.mediaDescriptors.size).toBe(0);
	});
});
