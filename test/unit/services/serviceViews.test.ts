import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	clearActivePerfProbe,
	createPerfProbe,
	setActivePerfProbe,
} from '../../../src/dev/perfProbe';
import { NodeSelectionService } from '../../../src/services/serviceSelection.svelte';
import { ViewService } from '../../../src/services/serviceViews.svelte';
import { EXPLORER_VIEW_MODES, isExplorerViewMode } from '../../../src/types/typeViews';
import type { ActiveFilterEntry, NodeBase, QueueChange } from '../../../src/types/typeContracts';
import type {
	ExplorerRenderModel,
	ExplorerViewInput,
	ExplorerViewMode,
	IViewService,
	ViewAction,
	ViewLayers,
	ViewRow,
} from '../../../src/types/typeViews';
import type { ExplorerViewMode as ProviderViewMode } from '../../../src/types/typeExplorer';

interface TestNode extends NodeBase {
	label: string;
	detail?: string;
}

describe('view service contracts', () => {
	it('supports the canonical explorer view modes', () => {
		const modes: ExplorerViewMode[] = [...EXPLORER_VIEW_MODES];
		const providerMode: ProviderViewMode = 'table';

		expect(modes).toContain(providerMode);
		expect(modes).toContain('markmap');
		expect(isExplorerViewMode('markmap')).toBe(true);
		expect(isExplorerViewMode('masonry')).toBe(false);
	});

	it('represents list rows with semantic layers and actions', () => {
		const node: TestNode = { id: 'queue:1', label: 'Rename property', detail: 'status -> state' };
		const action: ViewAction<TestNode> = {
			id: 'remove',
			label: 'Remove',
			icon: 'lucide-x',
			tone: 'danger',
			run: (row) => row.node.id,
		};
		const layers: ViewLayers = {
			icons: [{ id: 'op', icon: 'lucide-pencil', source: 'operation' }],
			badges: { ops: [{ id: 'queued', label: 'Queued', tone: 'accent' }] },
			highlights: { query: [{ start: 0, end: 6 }] },
			state: { pending: true },
		};
		const row: ViewRow<TestNode> = {
			id: node.id,
			node,
			label: node.label,
			detail: node.detail,
			cells: [],
			layers,
			actions: [action],
		};
		const model: ExplorerRenderModel<TestNode> = {
			explorerId: 'queue',
			mode: 'list',
			rows: [row],
			columns: [],
			groups: [],
			selection: { ids: new Set() },
			focus: { id: null },
			sort: { id: 'manual', direction: 'asc' },
			search: { query: 'rename' },
			virtualization: { rowHeight: 32, overscan: 5 },
			capabilities: { canSelect: false },
		};

		expect(model.rows[0].layers.badges?.ops?.[0].label).toBe('Queued');
		expect(model.rows[0].actions[0].run?.(row)).toBe('queue:1');
	});

	it('defines a service contract that can build render models from input', () => {
		const input: ExplorerViewInput<TestNode> = {
			explorerId: 'filters',
			mode: 'list',
			nodes: [{ id: 'filter:1', label: 'has: status' }],
		};
		const service: Pick<IViewService, 'getModel'> = {
			getModel(received) {
				return {
					explorerId: received.explorerId,
					mode: received.mode,
					rows: [],
					columns: [],
					groups: [],
					selection: { ids: new Set() },
					focus: { id: null },
					sort: { id: 'manual', direction: 'asc' },
					search: { query: '' },
					virtualization: { rowHeight: 32, overscan: 5 },
					capabilities: {},
				};
			},
		};

		expect(service.getModel(input).mode).toBe('list');
	});
});

describe('ViewService', () => {
	afterEach(() => {
		clearActivePerfProbe();
	});

	it('reads selection and focus from the node selection authority', () => {
		const selectionService = new NodeSelectionService();
		const service = new ViewService({ selectionService });
		const nodes: TestNode[] = [
			{ id: 'a', label: 'Alpha' },
			{ id: 'b', label: 'Beta' },
		];

		selectionService.selectPointer('files', ['a', 'b'], 'b');
		const model = service.getModel({ explorerId: 'files', mode: 'tree', nodes });

		expect([...model.selection.ids]).toEqual(['b']);
		expect(model.selection.anchorId).toBe('b');
		expect(model.focus.id).toBe('b');
		expect(model.rows.map((row) => row.layers.state?.selected ?? false)).toEqual([false, true]);
		expect(model.rows.map((row) => row.layers.state?.focused ?? false)).toEqual([false, true]);
	});

	it('delegates deprecated selection mutators to the node selection authority', () => {
		const selectionService = new NodeSelectionService();
		const service = new ViewService({ selectionService });

		service.select('files', 'a');
		expect([...selectionService.snapshot('files').ids]).toEqual(['a']);
		expect(selectionService.snapshot('files').focusedId).toBe('a');

		service.select('files', 'b', 'add');
		expect([...selectionService.snapshot('files').ids]).toEqual(['a', 'b']);

		service.setFocused('files', 'b');
		expect(selectionService.snapshot('files').focusedId).toBe('b');

		service.clearSelection('files');
		expect([...selectionService.snapshot('files').ids]).toEqual([]);
		expect(selectionService.snapshot('files').focusedId).toBeNull();
	});

	it('stores view mode per explorer and notifies subscribers', () => {
		const service = new ViewService();
		let calls = 0;
		const unsubscribe = service.subscribe('queue', () => {
			calls += 1;
		});

		expect(service.getViewMode('queue')).toBe('tree');

		service.setViewMode('queue', 'list');

		expect(service.getViewMode('queue')).toBe('list');
		expect(calls).toBe(1);

		unsubscribe();
		service.setViewMode('queue', 'table');
		expect(calls).toBe(1);
	});

	it('tracks selection and marks selected rows in render models', () => {
		const service = new ViewService();
		const nodes: TestNode[] = [
			{ id: 'a', label: 'Alpha' },
			{ id: 'b', label: 'Beta' },
		];

		service.select('filters', 'b');
		const model = service.getModel({ explorerId: 'filters', mode: 'list', nodes });

		expect([...model.selection.ids]).toEqual(['b']);
		expect(model.rows.map((row) => row.layers.state?.selected ?? false)).toEqual([false, true]);

		service.select('filters', 'b', 'toggle');
		expect([
			...service.getModel({ explorerId: 'filters', mode: 'list', nodes }).selection.ids,
		]).toEqual([]);
	});

	it('builds flat rows with mapper-provided labels, details, actions, and decoration layers', () => {
		const service = new ViewService({
			decorationManager: {
				decorate() {
					return {
						icons: ['lucide-pencil'],
						badges: [{ label: 'Queued', accent: 'accent' }],
						highlights: [{ start: 0, end: 6 }],
					};
				},
				subscribe() {
					return () => {};
				},
			},
		});
		const nodes: TestNode[] = [
			{ id: 'queue:1', label: 'Rename property', detail: 'status -> state' },
		];
		const model = service.getModel({
			explorerId: 'queue',
			mode: 'list',
			nodes,
			getLabel: (node) => node.label,
			getDetail: (node) => node.detail ?? '',
			getActions: () => [{ id: 'remove', label: 'Remove', tone: 'danger' }],
			getDecorationContext: () => ({ kind: 'operation' }),
		});

		expect(model.rows[0].label).toBe('Rename property');
		expect(model.rows[0].detail).toBe('status -> state');
		expect(model.rows[0].actions[0].id).toBe('remove');
		expect(model.rows[0].layers.icons?.[0]).toMatchObject({
			icon: 'lucide-pencil',
			source: 'operation',
		});
		expect(model.rows[0].layers.badges?.ops?.[0].label).toBe('Queued');
		expect(model.rows[0].layers.highlights?.query).toEqual([{ start: 0, end: 6 }]);
	});

	it('reuses semantic row layers across selection-only changes when revisions are stable', () => {
		const decorate = vi.fn(() => ({
			icons: ['lucide-file'],
			badges: [{ label: '1', accent: 'blue' }],
			highlights: [],
		}));
		const service = new ViewService({
			decorationManager: {
				decorate,
				subscribe() {
					return () => {};
				},
			},
		});
		const nodes: TestNode[] = [{ id: 'a', label: 'Alpha' }];
		const input = {
			explorerId: 'files',
			mode: 'tree',
			nodes,
			revisions: {
				filesRevision: 1,
				queueRevision: 1,
				filterRevision: 1,
			},
			getLabel: (node: TestNode) => node.label,
			getDecorationContext: () => ({ kind: 'file' }),
		} as ExplorerViewInput<TestNode> & {
			revisions: { filesRevision: number; queueRevision: number; filterRevision: number };
		};

		expect(service.getModel(input).rows[0].layers.state?.selected).toBeUndefined();
		service.select('files', 'a');
		expect(service.getModel(input).rows[0].layers.state?.selected).toBe(true);

		expect(decorate).toHaveBeenCalledTimes(1);
	});

	it('records semantic cache hit, miss, and eviction probe counters', () => {
		const probe = createPerfProbe({ now: () => 0 });
		setActivePerfProbe(probe.api);
		const service = new ViewService({
			decorationManager: {
				decorate: vi.fn(() => ({
					icons: ['lucide-file'],
					badges: [],
					highlights: [],
				})),
				subscribe() {
					return () => {};
				},
			},
		});
		const input: ExplorerViewInput<TestNode> = {
			explorerId: 'files',
			mode: 'tree',
			nodes: [{ id: 'a', label: 'Alpha' }],
			revisions: {
				filesRevision: 1,
				queueRevision: 1,
				filterRevision: 1,
			},
			getLabel: (node) => node.label,
			getDecorationContext: () => ({ kind: 'file' }),
		};

		service.getModel(input);
		service.select('files', 'a');
		service.getModel(input);

		const churnNodes: TestNode[] = Array.from({ length: 5001 }, (_, index) => ({
			id: `node-${index}`,
			label: `Node ${index}`,
		}));
		service.getModel({
			...input,
			nodes: churnNodes,
			revisions: { ...input.revisions, filesRevision: 2 },
		});

		const snapshot = probe.snapshot();
		expect(snapshot.counters['viewService.semanticCache.miss']).toMatchObject({
			count: 5002,
			totalNodes: 5002,
		});
		expect(snapshot.counters['viewService.semanticCache.hit']).toMatchObject({
			count: 1,
			totalNodes: 1,
		});
		expect(snapshot.counters['viewService.semanticCache.evict']).toMatchObject({
			count: 1,
		});
	});

	it('maps queue changes to operation badges and pending state without decoration badges', () => {
		const service = new ViewService();
		const nodes: QueueChange[] = [
			{
				id: 'op-delete-status',
				group: 'delete_prop',
				change: {
					id: 'op-delete-status',
					type: 'property',
					action: 'delete',
					details: 'Delete status',
					property: 'status',
				} as never,
			},
		];
		const model = service.getModel({
			explorerId: 'queue',
			mode: 'list',
			nodes,
			getLabel: (node) => node.change.action,
			getDetail: (node) => node.change.details,
			getDecorationContext: () => ({ kind: 'operation' }),
		});

		expect(model.rows[0].layers.state?.pending).toBe(true);
		expect(model.rows[0].layers.badges?.ops?.[0]).toMatchObject({
			id: 'op-delete-status:op',
			label: 'delete',
			tone: 'danger',
			sourceId: 'op-delete-status',
			actionId: 'remove',
		});
		expect(model.rows[0].layers.icons?.[0]).toMatchObject({
			icon: 'lucide-trash-2',
			source: 'operation',
		});
	});

	it('maps active filter entries to filter badges, active state, and filter highlights', () => {
		const service = new ViewService();
		const nodes: ActiveFilterEntry[] = [
			{
				id: 'filter-status',
				kind: 'rule',
				rule: {
					id: 'filter-status',
					type: 'rule',
					filterType: 'has_property',
					property: 'status',
					values: [],
				},
			},
		];
		const model = service.getModel({
			explorerId: 'active-filters',
			mode: 'list',
			nodes,
			getLabel: () => 'has: status',
			getDecorationContext: () => ({ kind: 'filter' }),
		});

		expect(model.rows[0].layers.state?.activeFilter).toBe(true);
		expect(model.rows[0].layers.badges?.filters?.[0]).toMatchObject({
			id: 'filter-status:filter',
			label: 'has property',
			tone: 'info',
			sourceId: 'filter-status',
			actionId: 'remove',
		});
		expect(model.rows[0].layers.highlights?.filter).toEqual([{ start: 5, end: 11 }]);
		expect(model.rows[0].layers.highlights?.query).toBeUndefined();
	});

	it('maps selected-files groups to parent filter rows with count badges', () => {
		const service = new ViewService();
		const nodes: ActiveFilterEntry[] = [
			{
				id: 'selected-files',
				kind: 'group',
				depth: 0,
				group: {
					id: 'selected-files',
					kind: 'selected_files',
					type: 'group',
					logic: 'any',
					label: '2 selected files',
					children: [
						{
							id: 'selected-file:Notes/A.md',
							type: 'rule',
							filterType: 'file_path',
							property: '',
							values: ['Notes/A.md'],
						},
						{
							id: 'selected-file:Notes/B.md',
							type: 'rule',
							filterType: 'file_path',
							property: '',
							values: ['Notes/B.md'],
						},
					],
				},
			},
		];
		const model = service.getModel({
			explorerId: 'active-filters',
			mode: 'list',
			nodes,
			getLabel: () => '2 selected files',
			getDecorationContext: () => ({ kind: 'filter' }),
		});

		expect(model.rows[0].depth).toBe(0);
		expect(model.rows[0].layers.state?.activeFilter).toBe(true);
		expect(model.rows[0].layers.badges?.filters?.[0]).toMatchObject({
			id: 'selected-files:filter-group',
			label: 'selected files',
			tone: 'info',
		});
		expect(model.rows[0].layers.badges?.counts?.[0]).toMatchObject({
			id: 'selected-files:filter-group-count',
			label: '2',
		});
	});

	it('projects queued property operations onto matching property rows', () => {
		const service = new ViewService();
		const nodes: TestNode[] = [{ id: 'prop:status', label: 'status' }];
		const operations: QueueChange[] = [
			{
				id: 'op-delete-status',
				group: 'delete_prop',
				change: {
					id: 'op-delete-status',
					type: 'property',
					action: 'delete',
					details: 'Delete status',
					property: 'status',
				} as never,
			},
		];
		const model = service.getModel({
			explorerId: 'props',
			mode: 'tree',
			nodes,
			operations,
			getDecorationContext: () => ({
				kind: 'prop',
				propName: 'status',
				isValueNode: false,
			}),
		});

		expect(model.rows[0].layers.state).toMatchObject({
			pending: true,
			deleted: true,
		});
		expect(model.rows[0].layers.badges?.ops?.[0]).toMatchObject({
			id: 'prop:status:op:op-delete-status',
			label: 'delete',
			tone: 'danger',
			sourceId: 'op-delete-status',
			actionId: 'remove',
		});
	});

	it('does not project active value filters onto matching property value rows by default', () => {
		const service = new ViewService();
		const nodes: TestNode[] = [{ id: 'prop:status::todo', label: 'todo' }];
		const activeFilters: ActiveFilterEntry[] = [
			{
				id: 'filter-status-todo',
				kind: 'rule',
				rule: {
					id: 'filter-status-todo',
					type: 'rule',
					filterType: 'specific_value',
					property: 'status',
					values: ['todo'],
				},
			},
		];
		const model = service.getModel({
			explorerId: 'props',
			mode: 'tree',
			nodes,
			activeFilters,
			getDecorationContext: () => ({
				kind: 'prop',
				propName: 'status',
				isValueNode: true,
				rawValue: 'todo',
			}),
		});

		expect(model.rows[0].layers.state?.activeFilter).toBeUndefined();
		expect(model.rows[0].layers.badges?.filters).toBeUndefined();
		expect(model.rows[0].layers.highlights?.filter).toBeUndefined();
	});

	it('projects active value filters when matched filter decorations are enabled', () => {
		const service = new ViewService({ showMatchedFilterDecorations: () => true });
		const nodes: TestNode[] = [{ id: 'prop:status::todo', label: 'todo' }];
		const activeFilters: ActiveFilterEntry[] = [
			{
				id: 'filter-status-todo',
				kind: 'rule',
				rule: {
					id: 'filter-status-todo',
					type: 'rule',
					filterType: 'specific_value',
					property: 'status',
					values: ['todo'],
				},
			},
		];
		const model = service.getModel({
			explorerId: 'props',
			mode: 'tree',
			nodes,
			activeFilters,
			getDecorationContext: () => ({
				kind: 'prop',
				propName: 'status',
				isValueNode: true,
				rawValue: 'todo',
			}),
		});

		expect(model.rows[0].layers.state?.activeFilter).toBe(true);
		expect(model.rows[0].layers.badges?.filters?.[0]).toMatchObject({
			id: 'prop:status::todo:filter:filter-status-todo',
			label: 'specific value',
			tone: 'info',
			sourceId: 'filter-status-todo',
			actionId: 'remove',
		});
		expect(model.rows[0].layers.highlights?.filter).toEqual([{ start: 0, end: 4 }]);
	});

	it('projects queued tag operations and active tag filters onto matching tag rows', () => {
		const service = new ViewService({ showMatchedFilterDecorations: () => true });
		const nodes: TestNode[] = [{ id: 'tag:project', label: 'project' }];
		const operations: QueueChange[] = [
			{
				id: 'op-delete-project-tag',
				group: 'delete_tag',
				change: {
					id: 'op-delete-project-tag',
					type: 'tag',
					action: 'delete',
					details: 'Delete #project',
					tag: '#project',
				} as never,
			},
		];
		const activeFilters: ActiveFilterEntry[] = [
			{
				id: 'filter-project-tag',
				kind: 'rule',
				rule: {
					id: 'filter-project-tag',
					type: 'rule',
					filterType: 'has_tag',
					property: '',
					values: ['#project'],
				},
			},
		];
		const model = service.getModel({
			explorerId: 'tags',
			mode: 'tree',
			nodes,
			operations,
			activeFilters,
			getDecorationContext: () => ({ kind: 'tag', tagPath: 'project' }),
		});

		expect(model.rows[0].layers.state).toMatchObject({
			pending: true,
			deleted: true,
			activeFilter: true,
		});
		expect(model.rows[0].layers.badges?.ops?.[0]).toMatchObject({
			id: 'tag:project:op:op-delete-project-tag',
			label: 'delete',
			tone: 'danger',
		});
		expect(model.rows[0].layers.badges?.filters?.[0]).toMatchObject({
			id: 'tag:project:filter:filter-project-tag',
			label: 'has tag',
			tone: 'info',
		});
		expect(model.rows[0].layers.highlights?.filter).toEqual([{ start: 0, end: 7 }]);
	});

	it('projects queued file operations and file-name filters onto matching file rows', () => {
		const service = new ViewService({ showMatchedFilterDecorations: () => true });
		const nodes: TestNode[] = [{ id: 'file:notes/task.md', label: 'Task' }];
		const operations: QueueChange[] = [
			{
				id: 'op-rename-task',
				group: 'rename_file',
				change: {
					id: 'op-rename-task',
					type: 'file_rename',
					action: 'rename',
					details: 'Rename Task.md',
					files: [{ path: 'Notes/Task.md', basename: 'Task' } as never],
					newName: 'Task Done',
				} as never,
			},
		];
		const activeFilters: ActiveFilterEntry[] = [
			{
				id: 'filter-task-name',
				kind: 'rule',
				rule: {
					id: 'filter-task-name',
					type: 'rule',
					filterType: 'file_name',
					property: '',
					values: ['Task'],
				},
			},
		];
		const model = service.getModel({
			explorerId: 'files',
			mode: 'tree',
			nodes,
			operations,
			activeFilters,
			getDecorationContext: () => ({
				kind: 'file',
				filePath: 'Notes/Task.md',
				basename: 'Task',
			}),
		});

		expect(model.rows[0].layers.state).toMatchObject({
			pending: true,
			activeFilter: true,
		});
		expect(model.rows[0].layers.state?.deleted).toBeUndefined();
		expect(model.rows[0].layers.badges?.ops?.[0]).toMatchObject({
			id: 'file:notes/task.md:op:op-rename-task',
			label: 'rename',
			tone: 'warning',
		});
		expect(model.rows[0].layers.badges?.filters?.[0]).toMatchObject({
			id: 'file:notes/task.md:filter:filter-task-name',
			label: 'file name',
			tone: 'info',
		});
		expect(model.rows[0].layers.highlights?.filter).toEqual([{ start: 0, end: 4 }]);
	});

	it('records active probe metrics for model builds and selection mutations', () => {
		const probe = createPerfProbe({ now: () => 0 });
		const service = new ViewService();
		const nodes: TestNode[] = [
			{ id: 'a', label: 'Alpha' },
			{ id: 'b', label: 'Beta' },
		];

		setActivePerfProbe(probe.api);

		service.select('filters', 'a');
		service.clearSelection('filters');
		service.setFocused('filters', 'b');
		service.getModel({ explorerId: 'filters', mode: 'list', nodes });

		const snapshot = probe.snapshot();
		expect(snapshot.counters['viewService.select'].count).toBe(1);
		expect(snapshot.counters['viewService.clearSelection'].count).toBe(1);
		expect(snapshot.counters['viewService.setFocused'].count).toBe(1);
		expect(snapshot.timings['viewService.getModel']).toMatchObject({
			count: 1,
			totalNodes: 2,
		});
	});
});
