import type {
	CounterDomain,
	CounterRange,
} from '../types/typeGroupPreset';

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
