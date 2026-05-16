import { describe, expect, it, vi } from 'vitest';
import {
	createExplorerScrollGeometry,
	createExplorerVariableGeometry,
} from '../../../src/services/serviceExplorerScrollGeometry';

describe('serviceExplorerScrollGeometry', () => {
	it('resolves semantic id intents through direct index maps', () => {
		const coordinator = createExplorerScrollGeometry({
			idToIndex: new Map([['node-40', 40]]),
			rowHeight: 32,
			rowCount: 100,
		});

		expect(coordinator.resolve({ kind: 'id', id: 'node-40', reason: 'keyboard' })).toMatchObject({
			index: 40,
			top: 1280,
			reason: 'keyboard',
		});
	});

	it('uses late id lookup without requiring a row scan', () => {
		const resolveIndexById = vi.fn((id: string) => (id === 'node-80' ? 80 : undefined));
		const coordinator = createExplorerScrollGeometry({
			idToIndex: new Map(),
			rowHeight: 24,
			rowCount: 100,
			resolveIndexById,
		});

		expect(coordinator.resolve({ kind: 'id', id: 'node-80', reason: 'selection' })).toMatchObject({
			index: 80,
			top: 1920,
		});
		expect(resolveIndexById).toHaveBeenCalledWith('node-80');
	});

	it('ignores stale revision intents', () => {
		const coordinator = createExplorerScrollGeometry({
			idToIndex: new Map([['node-4', 4]]),
			rowHeight: 30,
			rowCount: 10,
			revision: 7,
		});

		expect(
			coordinator.resolve({
				kind: 'id',
				id: 'node-4',
				reason: 'keyboard',
				minRevision: 8,
			}),
		).toBeNull();
		expect(
			coordinator.resolve({
				kind: 'id',
				id: 'node-4',
				reason: 'keyboard',
				minRevision: 7,
			}),
		).toMatchObject({ index: 4, top: 120 });
	});

	it('coalesces pending intents by priority and cancels them on manual scroll', () => {
		const coordinator = createExplorerScrollGeometry({
			idToIndex: new Map([
				['node-1', 1],
				['node-70', 70],
			]),
			rowHeight: 32,
			rowCount: 100,
		});

		coordinator.queue({ kind: 'id', id: 'node-1', reason: 'selection', priority: 10 });
		coordinator.queue({ kind: 'id', id: 'node-70', reason: 'keyboard', priority: 50 });

		expect(coordinator.flush()).toMatchObject({
			index: 70,
			top: 2240,
			reason: 'keyboard',
		});

		coordinator.queue({ kind: 'id', id: 'node-1', reason: 'selection', priority: 10 });
		coordinator.cancelPending({ reason: 'manual-scroll' });

		expect(coordinator.flush()).toBeNull();
	});

	it('exposes variable geometry estimates and measured corrections', () => {
		const geometry = createExplorerVariableGeometry({
			rowCount: 4,
			estimateSize: (index) => (index === 0 ? 40 : 20),
		});

		expect(geometry.topForIndex(3)).toBe(80);
		expect(geometry.sizeForIndex(1)).toBe(20);

		geometry.measure(1, 50);

		expect(geometry.sizeForIndex(1)).toBe(50);
		expect(geometry.topForIndex(3)).toBe(110);
	});
});
