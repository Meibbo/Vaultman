import type {
	CounterDomain,
	CounterRange,
} from '../types/typeGroupPreset';
import {
	rebalanceCounterRange,
	removeCounterRangeSlice,
	type CounterRangePartitionResult,
} from './logicCounterRangePartitions';

export interface CounterRangeEdit {
	id: string;
	lo: string;
	hi: string;
}

export type CounterRangeEditResult =
	| { ok: true; range: CounterRange }
	| {
			ok: false;
			reason: 'integer' | 'negative' | 'order' | 'overlap' | 'bounds';
	  };

export function validateCounterRangeEdit(
	edit: CounterRangeEdit,
	allRanges: readonly CounterRange[],
	domain?: CounterDomain,
): CounterRangeEditResult {
	const lo = Number(edit.lo);
	const hi = Number(edit.hi);
	if (!Number.isFinite(lo) || !Number.isFinite(hi) || !Number.isInteger(lo) || !Number.isInteger(hi))
		return { ok: false, reason: 'integer' };
	if (lo < 0 || hi < 0) return { ok: false, reason: 'negative' };
	if (lo > hi) return { ok: false, reason: 'order' };
	if (domain && (lo < domain.min || hi > domain.max))
		return { ok: false, reason: 'bounds' };
	const candidate = { id: edit.id, lo, hi };
	const overlap = allRanges.some(
		(range) =>
			range.id !== edit.id &&
			range.lo <= candidate.hi &&
		candidate.lo <= range.hi,
	);
	if (overlap) return { ok: false, reason: 'overlap' };
	return { ok: true, range: candidate };
}

export function updateCounterRange(
	ranges: readonly CounterRange[],
	edit: CounterRangeEdit,
	domain?: CounterDomain,
): CounterRangeEditResult {
	const result = validateCounterRangeEdit(edit, ranges, domain);
	if (!result.ok) return result;
	return {
		ok: true,
		range: result.range,
	};
}

/**
 * Structured Adjust range commit. Unlike `updateCounterRange`, this variant
 * edits the selected slice and rebalances only its immediate neighbours so a
 * configured domain remains a complete partition.
 */
export function rebalanceCounterRangeEdit(
	ranges: readonly CounterRange[],
	edit: CounterRangeEdit,
	domain: CounterDomain,
): CounterRangePartitionResult | {
	ok: false;
	reason: Extract<CounterRangeEditResult, { ok: false }>['reason'];
} {
	const parsed = validateCounterRangeEdit(edit, [], domain);
	if (!parsed.ok) return parsed;
	return rebalanceCounterRange(ranges, parsed.range, domain);
}

/** Alias used by command/action adapters. */
export const applyCounterRangeEdit = rebalanceCounterRangeEdit;

/** Remove a configured slice without leaving an uncovered domain. */
export { removeCounterRangeSlice };
