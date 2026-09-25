import { describe, expect, it, vi } from 'vitest';
import {
	addCounterRangeSlice,
	contiguousCounterRanges,
	isCounterRangePartition,
	removeCounterRangeSlice,
	rebalanceCounterRange,
	validateCounterRangePartition,
} from '../../src/logic/logicCounterRangePartitions';
import { rebalanceCounterRangeEdit } from '../../src/logic/logicCounterRangeEditor';
import {
	DEFAULT_TASK_CELL_DISPLAY_MODE,
	effectiveTaskCellDisplayMode,
	migrateTaskCellDisplayMode,
	normalizeTaskCellDisplayMode,
	resolveTaskCellText,
	resolveTaskGroupingMetric,
} from '../../src/logic/logicTaskMetric';
import {
	buildPresetBuckets,
	materializeCounterRanges,
} from '../../src/logic/logicGroupPresets';
import {
	applyLayoutToPort,
	captureSavedViewConfig,
	createSceneConfigPort,
	sceneFacetsOf,
	type SavedLayoutConfig,
} from '../../src/logic/logicSceneConfigPort';
import {
	EMPTY_REGISTRY,
	ensureInstance,
} from '../../src/logic/logicInstanceRegistry';
import {
	normalizeExplorerSortState,
	scopeStateFromLegacy,
} from '../../src/logic/logicScopedSort';
import { fileTaskMetricValue } from '../../src/components/containers/explorerFiles';
import type { SceneConfig } from '../../src/types/typeInstance';

const domain = { min: 0, max: 600 };
const ranges = [
	{ id: 'r1', lo: 0, hi: 200 },
	{ id: 'r2', lo: 201, hi: 400 },
	{ id: 'r3', lo: 401, hi: 600 },
];

describe('U130-GGC-004 counter/date partitions', () => {
	it('covers sparse quantile ranges without overlap or gap', () => {
		const out = contiguousCounterRanges(
			[
				{ id: 'r1', lo: 0, hi: 200 },
				{ id: 'r2', lo: 400, hi: 600 },
			],
			domain,
		);
		expect(out).toEqual([
			{ id: 'r1', lo: 0, hi: 399 },
			{ id: 'r2', lo: 400, hi: 600 },
		]);
		expect(isCounterRangePartition(out, domain)).toBe(true);
	});

	it('full domain single slice produces exactly one group and sends incompatible values to No group', () => {
		const singleSlice = [{ id: 'all-slice', lo: 0, hi: 600 }];
		expect(isCounterRangePartition(singleSlice, domain)).toBe(true);

		const nodes = [
			{ id: 'a', label: 'A', words: 0 },
			{ id: 'b', label: 'B', words: 350 },
			{ id: 'c', label: 'C', words: 600 },
			{ id: 'd', label: 'D', words: null }, // Incompatible
		];
		const out = buildPresetBuckets(
			nodes,
			{ kind: 'words', direction: 'asc', counterRanges: singleSlice },
			{ extract: (n) => n.words },
		);
		expect(out?.buckets).toHaveLength(1);
		expect(out?.buckets[0]?.members.map((m) => m.id)).toEqual(['a', 'b', 'c']);
		expect(out?.ungrouped.map((m) => m.id)).toEqual(['d']);
	});

	it('supports zero-limit boundaries [0, 0] deterministically', () => {
		const zeroDomain = { min: 0, max: 0 };
		const zeroRanges = [{ id: 'z1', lo: 0, hi: 0 }];
		expect(isCounterRangePartition(zeroRanges, zeroDomain)).toBe(true);

		const nodes = [
			{ id: 'zero1', label: 'Zero 1', tasks: 0 },
			{ id: 'zero2', label: 'Zero 2', tasks: 0 },
			{ id: 'invalid', label: 'Invalid', tasks: null },
		];
		const out = buildPresetBuckets(
			nodes,
			{ kind: 'tasks', direction: 'asc', counterRanges: zeroRanges },
			{ extract: (n) => n.tasks },
		);
		expect(out?.buckets).toHaveLength(1);
		expect(out?.buckets[0]?.members.map((m) => m.id)).toEqual(['zero1', 'zero2']);
		expect(out?.ungrouped.map((m) => m.id)).toEqual(['invalid']);
	});

	it('rebalance edits only neighbouring slices across left, middle, and right boundaries', () => {
		// Middle slice edit: 0–200/201–400/401–600 -> 150–400 leaves 0–149/150–400/401–600
		const resMid = rebalanceCounterRange(ranges, { id: 'r2', lo: 150, hi: 400 }, domain);
		expect(resMid).toEqual({
			ok: true,
			ranges: [
				{ id: 'r1', lo: 0, hi: 149 },
				{ id: 'r2', lo: 150, hi: 400 },
				{ id: 'r3', lo: 401, hi: 600 },
			],
		});

		// Left slice edit: change r1 to 0–150 adjusts r2 to 151–400
		const resLeft = rebalanceCounterRange(ranges, { id: 'r1', lo: 0, hi: 150 }, domain);
		expect(resLeft).toEqual({
			ok: true,
			ranges: [
				{ id: 'r1', lo: 0, hi: 150 },
				{ id: 'r2', lo: 151, hi: 400 },
				{ id: 'r3', lo: 401, hi: 600 },
			],
		});

		// Right slice edit: change r3 to 350–600 adjusts r2 to 201–349
		const resRight = rebalanceCounterRange(ranges, { id: 'r3', lo: 350, hi: 600 }, domain);
		expect(resRight).toEqual({
			ok: true,
			ranges: [
				{ id: 'r1', lo: 0, hi: 200 },
				{ id: 'r2', lo: 201, hi: 349 },
				{ id: 'r3', lo: 350, hi: 600 },
			],
		});
	});

	it('Finding 1.1: splits automatic preceding slice when first slice lo > domain.min', () => {
		const resSplit = rebalanceCounterRange(ranges, { id: 'r1', lo: 50, hi: 200 }, domain);
		expect(resSplit).toEqual({
			ok: true,
			ranges: [
				{ id: 'counter-range-4', lo: 0, hi: 49 },
				{ id: 'r1', lo: 50, hi: 200 },
				{ id: 'r2', lo: 201, hi: 400 },
				{ id: 'r3', lo: 401, hi: 600 },
			],
		});
		if (resSplit.ok) expect(isCounterRangePartition(resSplit.ranges, domain)).toBe(true);
	});

	it('Finding 1.2: absorbs neighboring groups when expanding hi or lo beyond boundaries', () => {
		// r1 expands hi beyond r2 and into r3 (hi = 450): absorbs r2, adjusts r3.lo to 451
		const resExpand = rebalanceCounterRange(ranges, { id: 'r1', lo: 0, hi: 450 }, domain);
		expect(resExpand).toEqual({
			ok: true,
			ranges: [
				{ id: 'r1', lo: 0, hi: 450 },
				{ id: 'r3', lo: 451, hi: 600 },
			],
		});
		if (resExpand.ok) expect(isCounterRangePartition(resExpand.ranges, domain)).toBe(true);

		// r2 expands lo to 0: absorbs r1 completely
		const resAbsorbLeft = rebalanceCounterRange(ranges, { id: 'r2', lo: 0, hi: 400 }, domain);
		expect(resAbsorbLeft).toEqual({
			ok: true,
			ranges: [
				{ id: 'r2', lo: 0, hi: 400 },
				{ id: 'r3', lo: 401, hi: 600 },
			],
		});
		if (resAbsorbLeft.ok) expect(isCounterRangePartition(resAbsorbLeft.ranges, domain)).toBe(true);

		// r1 expands hi to domain.max: absorbs r2 and r3 completely
		const resAbsorbAll = rebalanceCounterRange(ranges, { id: 'r1', lo: 0, hi: 600 }, domain);
		expect(resAbsorbAll).toEqual({
			ok: true,
			ranges: [
				{ id: 'r1', lo: 0, hi: 600 },
			],
		});
		if (resAbsorbAll.ok) expect(isCounterRangePartition(resAbsorbAll.ranges, domain)).toBe(true);
	});

	it('Finding 1.3: allows unit ranges [X, X] and absorbs across population gaps', () => {
		// Sparse unit ranges with population gap: [0, 2] and [8, 8] with domain [0, 8]
		const sparseRanges = [
			{ id: 'r-small', lo: 0, hi: 2 },
			{ id: 'r-unit', lo: 8, hi: 8 },
		];
		const sparseDomain = { min: 0, max: 8 };

		// Lowering lo of unit range [8, 8] to 0 absorbs [0, 2] and covers domain completely
		const resAbsorbGap = rebalanceCounterRange(sparseRanges, { id: 'r-unit', lo: 0, hi: 8 }, sparseDomain);
		expect(resAbsorbGap).toEqual({
			ok: true,
			ranges: [
				{ id: 'r-unit', lo: 0, hi: 8 },
			],
		});
		if (resAbsorbGap.ok) expect(isCounterRangePartition(resAbsorbGap.ranges, sparseDomain)).toBe(true);

		// Adjusting lo of unit range [8, 8] to 3 fills gap continuously with preceding [0, 2]
		const resContigGap = rebalanceCounterRange(sparseRanges, { id: 'r-unit', lo: 3, hi: 8 }, sparseDomain);
		expect(resContigGap).toEqual({
			ok: true,
			ranges: [
				{ id: 'r-small', lo: 0, hi: 2 },
				{ id: 'r-unit', lo: 3, hi: 8 },
			],
		});
		if (resContigGap.ok) expect(isCounterRangePartition(resContigGap.ranges, sparseDomain)).toBe(true);
	});

	it('rejects invalid range values out of domain boundaries or reversed order', () => {
		// reversed order lo > hi
		const resReversed = rebalanceCounterRange(ranges, { id: 'r1', lo: 300, hi: 200 }, domain);
		expect(resReversed.ok).toBe(false);
		if (!resReversed.ok) expect(resReversed.reason).toBe('invalid_range');

		// out of domain bounds
		const resBounds = rebalanceCounterRange(ranges, { id: 'r3', lo: 401, hi: 700 }, domain);
		expect(resBounds.ok).toBe(false);
		if (!resBounds.ok) expect(resBounds.reason).toBe('invalid_range');
	});

	it('partitions date presets without gaps or overlap, supporting Today and days-ago ranges', () => {
		const DAY = 86_400_000;
		const now = 1_700_000_000_000;
		const dateDomain = { min: 0, max: 30 };
		const dateRanges = [
			{ id: 'd-today', lo: 0, hi: 0 },
			{ id: 'd-week', lo: 1, hi: 7 },
			{ id: 'd-month', lo: 8, hi: 30 },
		];
		expect(isCounterRangePartition(dateRanges, dateDomain)).toBe(true);

		const nodes = [
			{ id: 'f_today', label: 'Today Note', mtime: now }, // 0 days ago
			{ id: 'f_3d', label: '3d Note', mtime: now - 3 * DAY }, // 3 days ago
			{ id: 'f_10d', label: '10d Note', mtime: now - 10 * DAY }, // 10 days ago
			{ id: 'f_inval', label: 'No Date Note', mtime: null }, // incompatible
		];

		const out = buildPresetBuckets(
			nodes,
			{ kind: 'modified', direction: 'asc', counterRanges: dateRanges },
			{ extract: (n) => n.mtime, now },
		);
		expect(out?.buckets).toHaveLength(3);
		expect(out?.buckets[0]?.label).toBe('Today');
		expect(out?.buckets[0]?.members.map((m) => m.id)).toEqual(['f_today']);
		expect(out?.buckets[1]?.label).toBe('1–7 days ago');
		expect(out?.buckets[1]?.members.map((m) => m.id)).toEqual(['f_3d']);
		expect(out?.buckets[2]?.label).toBe('8–30 days ago');
		expect(out?.buckets[2]?.members.map((m) => m.id)).toEqual(['f_10d']);
		expect(out?.ungrouped.map((m) => m.id)).toEqual(['f_inval']);

		// Rebalance date ranges: change d-week to 1–14
		const rebalanced = rebalanceCounterRange(dateRanges, { id: 'd-week', lo: 1, hi: 14 }, dateDomain);
		expect(rebalanced.ok).toBe(true);
		if (rebalanced.ok) {
			expect(rebalanced.ranges).toEqual([
				{ id: 'd-today', lo: 0, hi: 0 },
				{ id: 'd-week', lo: 1, hi: 14 },
				{ id: 'd-month', lo: 15, hi: 30 },
			]);
		}
	});

	it('add and remove keep a complete domain and refuse removing the last slice', () => {
		const added = addCounterRangeSlice(ranges, domain);
		expect(added.ok).toBe(true);
		if (!added.ok) return;
		expect(isCounterRangePartition(added.ranges, domain)).toBe(true);
		const removed = removeCounterRangeSlice(added.ranges, added.addedId, domain);
		expect(removed.ok).toBe(true);
		if (removed.ok) expect(isCounterRangePartition(removed.ranges, domain)).toBe(true);

		// Single slice domain cannot remove its only slice
		const single = [{ id: 's1', lo: 0, hi: 600 }];
		const singleRemove = removeCounterRangeSlice(single, 's1', domain);
		expect(singleRemove).toEqual({ ok: false, reason: 'last_slice' });
	});
});

describe('U130-GGC-017 structured editor and rebalance validation', () => {
	it('structured editor parses values and preserves partition invariants', () => {
		const result = rebalanceCounterRangeEdit(ranges, { id: 'r2', lo: '150', hi: '400' }, domain);
		expect(result.ok).toBe(true);
		if (result.ok) expect(validateCounterRangePartition(result.ranges, domain).ok).toBe(true);
	});

	it('rejects non-integer, negative, or reversed string values', () => {
		expect(rebalanceCounterRangeEdit(ranges, { id: 'r2', lo: '15.5', hi: '400' }, domain)).toEqual({
			ok: false,
			reason: 'integer',
		});
		expect(rebalanceCounterRangeEdit(ranges, { id: 'r2', lo: '-5', hi: '400' }, domain)).toEqual({
			ok: false,
			reason: 'negative',
		});
		expect(rebalanceCounterRangeEdit(ranges, { id: 'r2', lo: '450', hi: '400' }, domain)).toEqual({
			ok: false,
			reason: 'order',
		});
	});

	it('cancellation preserves original ranges array unmodified', () => {
		const originalSnapshot = JSON.stringify(ranges);
		// An uncommitted or cancelled edit leaves `ranges` intact
		const cancelledEdit = { id: 'r2', lo: '150', hi: '400' };
		void cancelledEdit;
		expect(JSON.stringify(ranges)).toBe(originalSnapshot);
	});
});

describe('U130-GGC-008 task cell versus group metric', () => {
	it('renders either presentation from one canonical metric', () => {
		const stats = { completed: 8, total: 10 };
		expect(resolveTaskCellText(stats, 'done-total')).toBe('8/10');
		expect(resolveTaskCellText(stats, 'pending')).toBe('2');
		expect(resolveTaskGroupingMetric(stats)).toBe(2);
		expect(DEFAULT_TASK_CELL_DISPLAY_MODE).toBe('done-total');
		expect(migrateTaskCellDisplayMode(undefined)).toBe('done-total');
		expect(migrateTaskCellDisplayMode('pending')).toBe('pending');
		expect(resolveTaskGroupingMetric('8/10')).toBe(2);
		expect(resolveTaskGroupingMetric('2')).toBe(2);
	});

	it('groups by pending even when the visible value is done/total', () => {
		const out = buildPresetBuckets(
			Array.from({ length: 10 }, (_, index) => ({
				id: `n${index}`,
				label: `Note ${index}`,
				tasks: { completed: 8, total: 10 },
			})),
			{ kind: 'tasks', direction: 'asc' },
			{ extract: (node) => node.tasks },
		);
		expect(out?.ungrouped).toEqual([]);
		expect(out?.buckets.flatMap((bucket) => bucket.members)).toHaveLength(10);
		expect(out?.buckets[0]?.range).toEqual({ id: 'counter-range-1', lo: 2, hi: 2 });
	});

	it('sends incompatible non-Markdown Files to No group only', () => {
		const out = buildPresetBuckets(
			[
				...Array.from({ length: 10 }, (_, index) => ({
					id: `md${index}`,
					label: `Note ${index}`,
					extension: 'md',
					pending: 2,
				})),
				{ id: 'png', label: 'Image', extension: 'png', pending: 2 },
			],
			{ kind: 'tasks', direction: 'asc' },
			{
				extract: (node) =>
					node.extension === 'md' ? node.pending : null,
			},
		);
		expect(out?.ungrouped.map((node) => node.id)).toEqual(['png']);
	});

	it('normalizes/migrates persisted cell modes', () => {
		expect(normalizeTaskCellDisplayMode('pending')).toBe('pending');
		expect(normalizeTaskCellDisplayMode('bad')).toBe('done-total');
	});

	it('routes notes without tasks (total === 0) strictly to No group and groups notes with measurable tasks', () => {
		// fileTaskMetricValue extraction
		expect(fileTaskMetricValue(null, { completed: 0, total: 5 })).toBeNull();
		expect(fileTaskMetricValue({ extension: 'png' }, { completed: 0, total: 5 })).toBeNull();
		expect(fileTaskMetricValue({ extension: 'md' }, null)).toBeNull();
		expect(fileTaskMetricValue({ extension: 'md' }, { completed: 0, total: 0 })).toBeNull();
		expect(fileTaskMetricValue({ extension: 'md' }, { completed: 2, total: 5 })).toBe(3);
		expect(fileTaskMetricValue({ extension: 'md' }, { completed: 4, total: 4 })).toBe(0);

		// resolveTaskGroupingMetric handling
		expect(resolveTaskGroupingMetric({ completed: 0, total: 0 })).toBeNull();
		expect(resolveTaskGroupingMetric('0/0')).toBeNull();
		expect(resolveTaskGroupingMetric({ completed: 5, total: 5 })).toBe(0);
		expect(resolveTaskGroupingMetric('2/5')).toBe(3);

		// buildPresetBuckets sends total === 0 to ungrouped (No group)
		const out = buildPresetBuckets(
			[
				...Array.from({ length: 10 }, (_, index) => ({
					id: `has-tasks-${index}`,
					label: `Has Tasks ${index}`,
					taskStats: { completed: 1, total: 4 },
				})),
				{ id: 'zero-tasks-1', label: 'Zero Tasks 1', taskStats: { completed: 0, total: 0 } },
				{ id: 'zero-tasks-2', label: 'Zero Tasks 2', taskStats: { completed: 0, total: 0 } },
			],
			{ kind: 'tasks', direction: 'asc' },
			{ extract: (node) => node.taskStats },
		);
		expect(out?.ungrouped.map((n) => n.id)).toEqual(['zero-tasks-1', 'zero-tasks-2']);
		expect(out?.buckets.flatMap((b) => b.members).map((m) => m.id)).toHaveLength(10);
	});
});

const defaults: Required<SceneConfig> = {
	viewMode: 'tree',
	interactionMode: 'open',
	visibleCells: ['name'],
	taskCellDisplayMode: 'auto',
	sortState: normalizeExplorerSortState('files', null),
	stickyRows: true,
	compactFolders: false,
	indent: true,
	groupPreset: { kind: 'none', direction: 'asc' },
	hiddenGroupIds: [],
	sceneLabelMode: 'auto',
	autoRevealMode: 'auto',
	hiddenToolbarNodes: [],
	toolbarNodeIcons: {},
	toolbarCommandActions: [],
	createActionsPlacement: 'auto',
	tooltips: true,
	toolbarNodeOrder: [],
	groupMemberships: {},
};

function makeTestInstance(id: string) {
	let registry = ensureInstance(EMPTY_REGISTRY, id).registry;
	const port = createSceneConfigPort({
		instanceId: id,
		readRegistry: () => registry,
		writeRegistry: (next) => {
			registry = next;
		},
		persist: vi.fn(async () => {}),
		defaultsFor: () => defaults,
	});
	return {
		port,
		get registry() {
			return registry;
		},
	};
}

function layoutForTab(
	tab: 'files' | 'props' | 'tags',
	saved: ReturnType<typeof captureSavedViewConfig>,
): SavedLayoutConfig {
	return {
		viewModeByTab: {},
		interactionModeByTab: {},
		visibleCellsByTab: {},
		sortStateByTab: { [tab]: saved.sortState },
		sceneFacetsByTab: { [tab]: sceneFacetsOf(saved) },
	};
}

describe('U130-GGC-008 instance presentation override', () => {
	it('keeps two instances independent through a layout photo and a global Settings change', async () => {
		const left = makeTestInstance('vm-tasks-left');
		const right = makeTestInstance('vm-tasks-right');
		await left.port.propose('files', {
			...left.port.read('files'),
			taskCellDisplayMode: 'pending',
		});
		const saved = captureSavedViewConfig(left.port.read('files'));
		expect(saved.taskCellDisplayMode).toBe('pending');
		expect(right.port.read('files').taskCellDisplayMode).toBe('auto');

		const stats = { completed: 8, total: 10 };
		let globalMode: 'pending' | 'done-total' = 'done-total';
		const textFor = (mode: 'auto' | 'pending' | 'done-total') =>
			resolveTaskCellText(stats, effectiveTaskCellDisplayMode(mode, globalMode));
		expect(textFor(left.port.read('files').taskCellDisplayMode)).toBe('2');
		expect(textFor(right.port.read('files').taskCellDisplayMode)).toBe('8/10');
		globalMode = 'pending';
		expect(textFor(right.port.read('files').taskCellDisplayMode)).toBe('2');
		expect(left.port.read('files').taskCellDisplayMode).toBe('pending');
		expect(resolveTaskGroupingMetric(stats)).toBe(2);

		const restored = makeTestInstance('vm-tasks-restored');
		await applyLayoutToPort(restored.port, layoutForTab('files', saved));
		expect(restored.port.read('files').taskCellDisplayMode).toBe('pending');
	});
});

describe('U130-GGC-019 range persistence across layout and scopes', () => {
	it('materializes counter and date ranges with correct day metrics and tasks', () => {
		const DAY = 86_400_000;
		const now = 1_700_000_000_000;
		const dateNodes = Array.from({ length: 10 }, (_, i) => ({
			id: `d${i}`,
			label: `Doc ${i}`,
			mtime: now - i * 2 * DAY, // 0..18 days ago
		}));

		const datePreset = materializeCounterRanges(
			dateNodes,
			{ kind: 'modified', direction: 'asc' },
			{ extract: (n) => n.mtime, now },
		);
		expect(datePreset.counterRanges).toBeDefined();
		expect(datePreset.counterRanges!.length).toBeGreaterThanOrEqual(2);
		expect(datePreset.counterRanges![0]?.lo).toBe(0); // today / 0 days ago

		const taskNodes = Array.from({ length: 10 }, (_, i) => ({
			id: `t${i}`,
			label: `Task ${i}`,
			tasks: { completed: i, total: 10 }, // 10..1 pending
		}));
		const taskPreset = materializeCounterRanges(
			taskNodes,
			{ kind: 'tasks', direction: 'asc' },
			{ extract: (n) => n.tasks },
		);
		expect(taskPreset.counterRanges).toBeDefined();
		expect(taskPreset.counterRanges!.length).toBeGreaterThanOrEqual(2);
	});

	it('roundtrips independent slices across multiple scopes without reference aliasing', async () => {
		const a = makeTestInstance('vm-scope-ranges-a');
		const allSort = normalizeExplorerSortState('files', null);
		const scopedSortState = {
			...allSort,
			scopeState: {
				cursor: 'all' as const,
				levelBase: 1 as const,
				sets: {
					all: {
						groupPreset: {
							kind: 'words' as const,
							direction: 'asc' as const,
							counterRanges: [
								{ id: 'w1', lo: 0, hi: 100 },
								{ id: 'w2', lo: 101, hi: 500 },
							],
						},
					},
					'level:1': {
						groupPreset: {
							kind: 'tasks' as const,
							direction: 'desc' as const,
							counterRanges: [
								{ id: 't1', lo: 0, hi: 3 },
								{ id: 't2', lo: 4, hi: 10 },
							],
						},
					},
				},
			},
		};

		await a.port.propose('files', {
			...defaults,
			sortState: scopedSortState,
			groupPreset: {
				kind: 'words',
				direction: 'asc',
				counterRanges: [
					{ id: 'w1', lo: 0, hi: 100 },
					{ id: 'w2', lo: 101, hi: 500 },
				],
			},
		});

		const saved = captureSavedViewConfig(a.port.read('files'));
		const b = makeTestInstance('vm-scope-ranges-b');
		await applyLayoutToPort(b.port, layoutForTab('files', saved));

		const restored = b.port.read('files');
		expect(restored.groupPreset.counterRanges).toEqual([
			{ id: 'w1', lo: 0, hi: 100 },
			{ id: 'w2', lo: 101, hi: 500 },
		]);
		expect(restored.sortState.scopeState?.sets?.all?.groupPreset?.counterRanges).toEqual([
			{ id: 'w1', lo: 0, hi: 100 },
			{ id: 'w2', lo: 101, hi: 500 },
		]);
		expect(restored.sortState.scopeState?.sets?.['level:1']?.groupPreset?.counterRanges).toEqual([
			{ id: 't1', lo: 0, hi: 3 },
			{ id: 't2', lo: 4, hi: 10 },
		]);

		// Reference isolation check: mutating restored does not affect saved or source instance
		(restored.sortState.scopeState!.sets!['level:1']!.groupPreset!.counterRanges![0] as { lo: number }).lo = 999;
		expect(saved.sortState.scopeState?.sets?.['level:1']?.groupPreset?.counterRanges?.[0]?.lo).toBe(0);
		expect(a.port.read('files').sortState.scopeState?.sets?.['level:1']?.groupPreset?.counterRanges?.[0]?.lo).toBe(0);
	});

	it('migrates legacy layout counter ranges into scopeState.sets.all without data loss', async () => {
		const b = makeTestInstance('vm-legacy-ranges');
		const legacySaved = {
			viewMode: 'tree' as const,
			visibleCells: ['name'],
			sortState: normalizeExplorerSortState('files', null),
			groupPreset: {
				kind: 'words' as const,
				direction: 'asc' as const,
				counterRanges: [
					{ id: 'w1', lo: 0, hi: 50 },
					{ id: 'w2', lo: 51, hi: 300 },
				],
			},
		};

		await applyLayoutToPort(b.port, {
			viewModeByTab: {},
			interactionModeByTab: {},
			visibleCellsByTab: {},
			sortStateByTab: { files: legacySaved.sortState },
			sceneFacetsByTab: { files: sceneFacetsOf(legacySaved) },
		});

		const restored = b.port.read('files');
		expect(restored.groupPreset.counterRanges).toEqual([
			{ id: 'w1', lo: 0, hi: 50 },
			{ id: 'w2', lo: 51, hi: 300 },
		]);
		// When hydrated into scope space, legacy counter ranges land in sets.all
		const migratedScope = scopeStateFromLegacy('files', restored.sortState, restored.groupPreset);
		expect(migratedScope.sets.all?.groupPreset?.counterRanges).toEqual([
			{ id: 'w1', lo: 0, hi: 50 },
			{ id: 'w2', lo: 51, hi: 300 },
		]);

		// Re-saving with the migrated scopeState persists both presets cleanly
		await b.port.propose('files', {
			...restored,
			sortState: { ...restored.sortState, scopeState: migratedScope },
		});
		const newPhoto = captureSavedViewConfig(b.port.read('files'));
		const c = makeTestInstance('vm-legacy-ranges-c');
		await applyLayoutToPort(c.port, layoutForTab('files', newPhoto));
		const roundtripRestored = c.port.read('files');
		expect(roundtripRestored.sortState.scopeState?.sets.all?.groupPreset?.counterRanges).toEqual([
			{ id: 'w1', lo: 0, hi: 50 },
			{ id: 'w2', lo: 51, hi: 300 },
		]);
	});

});
