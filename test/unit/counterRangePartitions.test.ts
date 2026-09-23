import { describe, expect, it } from 'vitest';
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
	migrateTaskCellDisplayMode,
	normalizeTaskCellDisplayMode,
	resolveTaskCellText,
	resolveTaskGroupingMetric,
} from '../../src/logic/logicTaskMetric';
import { buildPresetBuckets } from '../../src/logic/logicGroupPresets';

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

	it('rebalance edits only neighbouring slices', () => {
		const result = rebalanceCounterRange(ranges, { id: 'r2', lo: 150, hi: 400 }, domain);
		expect(result).toEqual({
			ok: true,
			ranges: [
				{ id: 'r1', lo: 0, hi: 149 },
				{ id: 'r2', lo: 150, hi: 400 },
				{ id: 'r3', lo: 401, hi: 600 },
			],
		});
	});

	it('structured editor parses values and preserves partition invariants', () => {
		const result = rebalanceCounterRangeEdit(ranges, { id: 'r2', lo: '150', hi: '400' }, domain);
		expect(result.ok).toBe(true);
		if (result.ok) expect(validateCounterRangePartition(result.ranges, domain).ok).toBe(true);
	});

	it('add and remove keep a complete domain', () => {
		const added = addCounterRangeSlice(ranges, domain);
		expect(added.ok).toBe(true);
		if (!added.ok) return;
		expect(isCounterRangePartition(added.ranges, domain)).toBe(true);
		const removed = removeCounterRangeSlice(added.ranges, added.addedId, domain);
		expect(removed.ok).toBe(true);
		if (removed.ok) expect(isCounterRangePartition(removed.ranges, domain)).toBe(true);
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
});
