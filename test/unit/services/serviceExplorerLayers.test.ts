import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	clearActivePerfProbe,
	createPerfProbe,
	setActivePerfProbe,
} from '../../../src/dev/perfProbe';
import { buildExplorerLayerMap } from '../../../src/services/serviceExplorerLayers';
import type { IViewService, ViewLayers } from '../../../src/types/typeViews';

describe('buildExplorerLayerMap', () => {
	afterEach(() => {
		clearActivePerfProbe();
	});

	it('records one Files data-plane layer batch timing with queue and filter totals', () => {
		let now = 0;
		const probe = createPerfProbe({ now: () => now });
		const layers: ViewLayers = { state: { pending: true } };
		const viewService = {
			getModel: vi.fn((input) => {
				now = 9;
				return {
					explorerId: input.explorerId,
					mode: input.mode,
					rows: input.nodes.map((node) => ({ id: node.id, layers })),
					columns: [],
					groups: [],
					selection: { ids: new Set<string>() },
					focus: { id: null },
					sort: { id: 'manual', direction: 'asc' },
					search: { query: '' },
					virtualization: { rowHeight: 32, overscan: 5 },
					capabilities: {},
				};
			}),
		} as Pick<IViewService, 'getModel'>;
		setActivePerfProbe(probe.api);

		const result = buildExplorerLayerMap({
			viewService,
			explorerId: 'files',
			mode: 'tree',
			nodes: [
				{ id: 'Notes/a.md', label: 'a' },
				{ id: 'Notes/b.md', label: 'b' },
			],
			operations: [{ id: 'op-1', group: 'delete_file', change: { type: 'file_delete' } }] as never,
			activeFilters: [{ id: 'filter-1', kind: 'rule', rule: { type: 'rule' } }] as never,
		});

		expect(result.get('Notes/a.md')).toBe(layers);
		expect(viewService.getModel).toHaveBeenCalledTimes(1);
		expect(probe.snapshot().timings['explorerDataPlane.layers.batch']).toMatchObject({
			count: 1,
			totalNodes: 2,
			totalOperations: 1,
			totalFilters: 1,
			totalMs: 9,
		});
	});
});
