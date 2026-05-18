import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	clearActivePerfProbe,
	createPerfProbe,
	setActivePerfProbe,
} from '../../../src/dev/perfProbe';
import { createExplorerLayerBuilder } from '../../../src/services/serviceExplorerLayers';
import { createExplorerProjection } from '../../../src/services/serviceExplorerProjection';
import { rowInputFromTreeNode } from '../../../src/services/serviceExplorerRowInput';
import type { TreeNode } from '../../../src/types/typeNode';
import type { IViewService, ViewAction, ViewLayers } from '../../../src/types/typeViews';

type TestMeta = {
	kind: 'file';
	filePath: string;
};

function fileNode(id: string, label: string, depth = 0): TreeNode<TestMeta> {
	return {
		id,
		label,
		depth,
		icon: 'lucide-file',
		meta: {
			kind: 'file',
			filePath: id,
		},
	};
}

describe('createExplorerLayerBuilder', () => {
	afterEach(() => {
		clearActivePerfProbe();
	});

	it('builds layer and action state once from projection rows keyed by node id', () => {
		const openAction: ViewAction<TreeNode<TestMeta>> = { id: 'open', label: 'Open' };
		const projection = createExplorerProjection({
			providerId: 'files',
			viewMode: 'tree',
			rowInputs: [
				rowInputFromTreeNode(fileNode('Projects/Alpha.md', 'Alpha'), {
					detail: 'Projects/Alpha.md',
				}),
				rowInputFromTreeNode(fileNode('Projects/Beta.md', 'Beta'), {
					detail: 'Projects/Beta.md',
				}),
			],
			sourceRevision: 12,
			layoutRevision: 4,
		});
		const viewService = {
			getModel: vi.fn((input) => ({
				explorerId: input.explorerId,
				mode: input.mode,
				rows: input.nodes.map((node) => {
					const layers: ViewLayers = {
						badges: {
							filters: [
								{
									id: `${node.id}:filter`,
									label: input.getLabel?.(node) ?? node.id,
									tone: 'info',
								},
							],
						},
						state: { activeFilter: true },
					};
					return {
						id: node.id,
						node,
						label: input.getLabel?.(node) ?? node.id,
						detail: input.getDetail?.(node),
						cells: [],
						layers,
						actions: input.getActions?.(node) ?? [],
					};
				}),
				columns: [],
				groups: [],
				selection: { ids: new Set<string>() },
				focus: { id: null },
				sort: { id: 'manual', direction: 'asc' },
				search: { query: '' },
				virtualization: { rowHeight: 32, overscan: 5 },
				capabilities: {},
			})),
		} as Pick<IViewService, 'getModel'>;

		const result = createExplorerLayerBuilder().build({
			viewService,
			projection,
			revisions: { filesRevision: 12, queueRevision: 3, filterRevision: 9 },
			getActions: (row) => (row.id === 'Projects/Alpha.md' ? [openAction] : []),
		});

		expect(viewService.getModel).toHaveBeenCalledTimes(1);
		expect(viewService.getModel).toHaveBeenCalledWith(
			expect.objectContaining({
				explorerId: 'files',
				mode: 'tree',
				nodes: projection.rows.map((row) => row.node),
				revisions: { filesRevision: 12, queueRevision: 3, filterRevision: 9 },
			}),
		);
		expect(result.revisionKey).toContain('rows:12');
		expect(result.layersById.get('Projects/Alpha.md')?.badges?.filters?.[0]).toMatchObject({
			id: 'Projects/Alpha.md:filter',
			label: 'Alpha',
		});
		expect(result.layersById.get('Projects/Beta.md')?.state?.activeFilter).toBe(true);
		expect(result.actionsById.get('Projects/Alpha.md')).toEqual([openAction]);
		expect(result.actionsById.get('Projects/Beta.md')).toEqual([]);
	});

	it('reuses cached layer batches for the same projection and state revisions', () => {
		let now = 0;
		const probe = createPerfProbe({ now: () => now });
		setActivePerfProbe(probe.api);
		const projection = createExplorerProjection({
			providerId: 'files',
			viewMode: 'list',
			rowInputs: [rowInputFromTreeNode(fileNode('Projects/Alpha.md', 'Alpha'))],
			sourceRevision: 5,
		});
		const layers: ViewLayers = { state: { pending: true } };
		const viewService = {
			getModel: vi.fn((input) => {
				now = 7;
				return {
					explorerId: input.explorerId,
					mode: input.mode,
					rows: input.nodes.map((node) => ({
						id: node.id,
						node,
						label: input.getLabel?.(node) ?? node.id,
						cells: [],
						layers,
						actions: [],
					})),
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
		const builder = createExplorerLayerBuilder();

		const first = builder.build({
			viewService,
			projection,
			revisions: { filesRevision: 5, queueRevision: 2, filterRevision: 3 },
		});
		const second = builder.build({
			viewService,
			projection,
			revisions: { filesRevision: 5, queueRevision: 2, filterRevision: 3 },
		});

		expect(second).toBe(first);
		expect(viewService.getModel).toHaveBeenCalledTimes(1);
		expect(probe.snapshot().timings['explorer.layers.build']).toMatchObject({
			count: 1,
			totalNodes: 1,
			totalMs: 7,
		});
	});
});
