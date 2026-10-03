import { describe, expect, it } from 'vitest';
import {
	cloneGroupPreset,
	normalizeCounterRanges,
	normalizeGroupPreset,
	sameGroupPreset,
} from '../../src/types/typeGroupPreset';
import {
	rebalanceCounterRange,
	removeCounterRangeSlice,
	setCounterRangeDisplayName,
	sliceCounterRange,
	validateCounterRangePartition,
} from '../../src/logic/logicCounterRangePartitions';
import {
	buildPresetBuckets,
	resolvePartitionDisplayLabel,
} from '../../src/logic/logicGroupPresets';

const domain = { min: 0, max: 600 };
const named = [
	{ id: 'r1', lo: 0, hi: 200, displayName: 'Small' },
	{ id: 'r2', lo: 201, hi: 400 },
	{ id: 'r3', lo: 401, hi: 600, displayName: 'Huge' },
];

describe('U130 native polish: partition display names', () => {
	it('normalize preserves displayName instead of discarding extra fields', () => {
		const out = normalizeCounterRanges('words', named);
		expect(out).toEqual(named);
	});

	it('normalize trims names and drops blank ones, trimming overlong input', () => {
		const out = normalizeCounterRanges('words', [
			{ id: 'a', lo: 0, hi: 10, displayName: '  Padded  ' },
			{ id: 'b', lo: 11, hi: 20, displayName: '   ' },
			{ id: 'c', lo: 21, hi: 30, displayName: 'x'.repeat(200) },
		]);
		expect(out?.[0]?.displayName).toBe('Padded');
		expect(out?.[1]).toEqual({ id: 'b', lo: 11, hi: 20 });
		expect(out?.[2]?.displayName?.length).toBe(80);
	});

	it('clone/equality round-trip displayName and presentation', () => {
		const preset = normalizeGroupPreset('files', {
			kind: 'words',
			direction: 'asc',
			counterRanges: named,
			partitionPresentation: 'name-only',
		});
		const clone = cloneGroupPreset(preset);
		expect(clone).toEqual(preset);
		expect(sameGroupPreset(preset, clone)).toBe(true);
		expect(
			sameGroupPreset(preset, { ...clone, partitionPresentation: 'name-range' }),
		).toBe(false);
		const renamed = cloneGroupPreset(preset);
		const renamedRanges = (renamed.counterRanges ?? []).map((range, i) =>
			i === 0 ? { ...range, displayName: 'Other' } : range,
		);
		renamed.counterRanges = renamedRanges;
		expect(sameGroupPreset(preset, renamed)).toBe(false);
	});

	it('adjusting bounds preserves the edited name; absorbed ids lose metadata', () => {
		const out = rebalanceCounterRange(named, { id: 'r2', lo: 150, hi: 450 }, domain);
		expect(out.ok).toBe(true);
		if (!out.ok) return;
		expect(out.ranges.find((r) => r.id === 'r2')).toEqual({
			id: 'r2',
			lo: 150,
			hi: 450,
		});
		expect(out.ranges.find((r) => r.id === 'r1')).toEqual({
			id: 'r1',
			lo: 0,
			hi: 149,
			displayName: 'Small',
		});
		expect(out.ranges.find((r) => r.id === 'r3')).toEqual({
			id: 'r3',
			lo: 451,
			hi: 600,
			displayName: 'Huge',
		});
	});

	it('slice keeps the edited name; new sibling slices are unnamed', () => {
		const single = [{ id: 'only', lo: 0, hi: 600, displayName: 'Everything' }];
		const out = sliceCounterRange(single, { id: 'only', lo: 200, hi: 400 }, domain);
		expect(out.ok).toBe(true);
		if (!out.ok) return;
		expect(out.ranges.find((r) => r.id === 'only')).toEqual({
			id: 'only',
			lo: 200,
			hi: 400,
			displayName: 'Everything',
		});
		for (const range of out.ranges) {
			if (range.id !== 'only') expect(range.displayName).toBeUndefined();
		}
	});

	it('Name partition action sets and clears names without touching bounds', () => {
		const renamed = setCounterRangeDisplayName(named, 'r2', '  Middle  ', domain);
		expect(renamed.ok).toBe(true);
		if (!renamed.ok) return;
		expect(renamed.ranges.find((r) => r.id === 'r2')).toEqual({
			id: 'r2',
			lo: 201,
			hi: 400,
			displayName: 'Middle',
		});
		const cleared = setCounterRangeDisplayName(renamed.ranges, 'r1', '   ', domain);
		expect(cleared.ok).toBe(true);
		if (!cleared.ok) return;
		expect(cleared.ranges.find((r) => r.id === 'r1')).toEqual({
			id: 'r1',
			lo: 0,
			hi: 200,
		});
		expect(validateCounterRangePartition(cleared.ranges, domain).ok).toBe(true);
	});

	it('removing a slice keeps the absorbing neighbour name', () => {
		const out = removeCounterRangeSlice(named, 'r2', domain);
		expect(out.ok).toBe(true);
		if (!out.ok) return;
		expect(out.ranges).toEqual([
			{ id: 'r1', lo: 0, hi: 400, displayName: 'Small' },
			{ id: 'r3', lo: 401, hi: 600, displayName: 'Huge' },
		]);
	});

	it('labels default to name + generated range, name-only hides the range', () => {
		expect(resolvePartitionDisplayLabel({ displayName: 'Small' }, '0–200', undefined)).toBe(
			'Small (0–200)',
		);
		expect(
			resolvePartitionDisplayLabel({ displayName: 'Small' }, '0–200', 'name-only'),
		).toBe('Small');
		expect(resolvePartitionDisplayLabel({}, '0–200', 'name-only')).toBe('0–200');
	});

	it('date preset keeps Today for unnamed slices and names it otherwise', () => {
		const buckets = buildPresetBuckets(
			[
				{ label: 'a' },
				{ label: 'b' },
				{ label: 'c' },
				{ label: 'd' },
				{ label: 'e' },
				{ label: 'f' },
				{ label: 'g' },
				{ label: 'h' },
				{ label: 'i' },
				{ label: 'j' },
			],
			{
				kind: 'modified',
				direction: 'asc',
				counterRanges: [
					{ id: 'today', lo: 0, hi: 0, displayName: 'Fresh' },
					{ id: 'rest', lo: 1, hi: 30 },
				],
			},
			{
				extract: (node: { label: string }) =>
					node.label === 'a' ? Date.now() : Date.now() - 10 * 86_400_000,
				now: Date.now(),
			},
		);
		const labels = (buckets?.buckets ?? []).map((b) => b.label);
		expect(labels).toContain('Fresh (Today)');
		expect(labels).toContain('1–30 days ago');
	});
});
