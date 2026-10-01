import type {
	CounterDomain,
	CounterRange,
} from '../types/typeGroupPreset';

/** A numeric interval after its bounds have been parsed and checked. */
export interface CounterRangeBounds {
	id: string;
	lo: number;
	hi: number;
}

export type CounterRangePartitionReason =
	| 'invalid_domain'
	| 'invalid_range'
	| 'duplicate_id'
	| 'overlap'
	| 'gap'
	| 'unknown_range'
	| 'last_slice'
	| 'no_slice_available';

export type CounterRangePartitionResult =
	| { ok: true; ranges: CounterRange[] }
	| { ok: false; reason: CounterRangePartitionReason };

export function isValidCounterDomain(domain: CounterDomain): boolean {
	return (
		Number.isInteger(domain.min) &&
		Number.isInteger(domain.max) &&
		Number.isFinite(domain.min) &&
		Number.isFinite(domain.max) &&
		domain.min >= 0 &&
		domain.min <= domain.max
	);
}

export function sortCounterRanges(
	ranges: readonly CounterRange[],
): CounterRange[] {
	return ranges
		.map((range) => ({ ...range }))
		.sort((a, b) => a.lo - b.lo || a.hi - b.hi || a.id.localeCompare(b.id));
}

/**
 * Validate a closed integer partition. Unlike the legacy range editor this
 * helper deliberately rejects gaps: a configured counter/date preset must
 * account for every compatible value in its fetched domain.
 */
export function validateCounterRangePartition(
	ranges: readonly CounterRange[],
	domain: CounterDomain,
): CounterRangePartitionResult {
	if (!isValidCounterDomain(domain)) return { ok: false, reason: 'invalid_domain' };
	const ids = new Set<string>();
	for (const range of ranges) {
		if (
			typeof range.id !== 'string' ||
			range.id.length === 0 ||
			ids.has(range.id) ||
			!Number.isInteger(range.lo) ||
			!Number.isInteger(range.hi) ||
			range.lo < domain.min ||
			range.hi > domain.max ||
			range.lo > range.hi
		)
			return {
				ok: false,
				reason: ids.has(range.id) ? 'duplicate_id' : 'invalid_range',
			};
		ids.add(range.id);
	}
	const ordered = sortCounterRanges(ranges);
	if (ordered.length === 0) return { ok: false, reason: 'gap' };
	if (ordered[0].lo !== domain.min) return { ok: false, reason: 'gap' };
	for (let index = 1; index < ordered.length; index += 1) {
		const previous = ordered[index - 1];
		const current = ordered[index];
		if (current.lo <= previous.hi) return { ok: false, reason: 'overlap' };
		if (current.lo !== previous.hi + 1) return { ok: false, reason: 'gap' };
	}
	if (ordered.at(-1)!.hi !== domain.max) return { ok: false, reason: 'gap' };
	return { ok: true, ranges: ordered };
}

/** Whether the ranges form the complete, disjoint domain partition. */
export function isCounterRangePartition(
	ranges: readonly CounterRange[],
	domain: CounterDomain,
): boolean {
	return validateCounterRangePartition(ranges, domain).ok;
}

/**
 * Make quantile slices contiguous without changing which values belong to a
 * slice. Quantile boundaries are between observed values, so filling the
 * integer gap is safe and prevents compatible values from falling into No
 * group merely because the population is sparse.
 */
export function contiguousCounterRanges(
	ranges: readonly CounterRange[],
	domain: CounterDomain,
): CounterRange[] {
	if (!isValidCounterDomain(domain) || ranges.length === 0) return [];
	const ordered = sortCounterRanges(ranges);
	const out = ordered.map((range, index) => ({
		...range,
		// Keep the observed quantile boundary. The integer gap belongs to the
		// preceding slice and is filled below.
		lo: index === 0 ? domain.min : range.lo,
		hi: index === ordered.length - 1 ? domain.max : range.hi,
	}));
	// The provisional hi above is the observed quantile hi. Expand each slice
	// to the next slice's lower boundary; this preserves disjointness.
	for (let index = 0; index + 1 < out.length; index += 1) {
		out[index].hi = out[index + 1].lo - 1;
	}
	return out;
}

export interface CounterRangeEditBounds {
	id: string;
	lo: number;
	hi: number;
}

/**
 * Apply a range edit while keeping the complete domain covered. The edited
 * range keeps its id; only its immediate neighbours are rebalanced. This is
 * what turns 0–200 / 201–400 / 401–600 + 150–400 into 0–149 / 150–400 /
 * 401–600.
 */
function nextCounterRangeId(ranges: readonly CounterRange[]): string {
	const used = new Set(ranges.map((range) => range.id));
	let index = ranges.length;
	while (used.has(`counter-range-${index + 1}`)) index += 1;
	return `counter-range-${index + 1}`;
}

/**
 * Apply a range edit while keeping the complete domain covered. The edited
 * range keeps its id. When boundaries expand into neighbors, those neighbors
 * are absorbed. When the first slice lo > domain.min, an automatic slice is inserted.
 */
export function rebalanceCounterRange(
	ranges: readonly CounterRange[],
	edited: CounterRangeEditBounds,
	domain: CounterDomain,
): CounterRangePartitionResult {
	if (!isValidCounterDomain(domain)) return { ok: false, reason: 'invalid_domain' };
	if (
		!Number.isInteger(edited.lo) ||
		!Number.isInteger(edited.hi) ||
		edited.lo < domain.min ||
		edited.hi > domain.max ||
		edited.lo > edited.hi
	) {
		return { ok: false, reason: 'invalid_range' };
	}

	const ordered = sortCounterRanges(ranges);
	const index = ordered.findIndex((range) => range.id === edited.id);
	if (index < 0) return { ok: false, reason: 'unknown_range' };

	const next: CounterRange[] = [];

	// 1. Preceding slices (Finding 1.1: split lower bound > 0 when index === 0, or absorb preceding on expansion)
	if (index === 0 && edited.lo > domain.min) {
		next.push({
			id: nextCounterRangeId(ordered),
			lo: domain.min,
			hi: edited.lo - 1,
		});
	} else if (index > 0) {
		const preceding = ordered.slice(0, index);
		for (let i = 0; i < preceding.length; i++) {
			const p = { ...preceding[i] };
			if (p.lo >= edited.lo) {
				// Completely absorbed by edited.lo
				continue;
			}
			if (i === preceding.length - 1 || p.hi >= edited.lo) {
				p.hi = edited.lo - 1;
			}
			next.push(p);
		}
		if (next.length === 0 && edited.lo > domain.min) {
			next.push({
				id: nextCounterRangeId([...ordered, ...next]),
				lo: domain.min,
				hi: edited.lo - 1,
			});
		}
	}

	// 2. The edited slice
	next.push({ id: edited.id, lo: edited.lo, hi: edited.hi });

	// 3. Following slices (Finding 1.2: absorption on hi expansion)
	const following = ordered.slice(index + 1);
	for (let i = 0; i < following.length; i++) {
		const f = { ...following[i] };
		if (f.hi <= edited.hi) {
			// Completely absorbed by edited.hi
			continue;
		}
		if (f.lo <= edited.hi) {
			f.lo = edited.hi + 1;
		} else if (i === 0 || next[next.length - 1].id === edited.id) {
			f.lo = edited.hi + 1;
		}
		next.push(f);
	}

	if (following.length > 0 && next[next.length - 1].id === edited.id && edited.hi < domain.max) {
		next.push({
			id: nextCounterRangeId([...ordered, ...next]),
			lo: edited.hi + 1,
			hi: domain.max,
		});
	}

	return validateCounterRangePartition(next, domain);
}

/**
 * Shrink the target slice toward `[edited.lo, edited.hi]`, turning the
 * leftover gaps into new slices. Other ranges are left untouched.
 */
export function sliceCounterRange(
	ranges: readonly CounterRange[],
	edited: CounterRangeEditBounds,
	domain: CounterDomain,
): CounterRangePartitionResult {
	const ordered = sortCounterRanges(ranges);
	const index = ordered.findIndex((range) => range.id === edited.id);
	if (index < 0) return { ok: false, reason: 'unknown_range' };
	const target = ordered[index];
	if (
		!Number.isInteger(edited.lo) ||
		!Number.isInteger(edited.hi) ||
		edited.lo < target.lo ||
		edited.hi > target.hi ||
		edited.lo > edited.hi
	) {
		return { ok: false, reason: 'invalid_range' };
	}
	const next: CounterRange[] = [];
	for (let i = 0; i < index; i += 1) {
		next.push({ ...ordered[i] });
	}
	if (edited.lo > target.lo) {
		next.push({
			id: nextCounterRangeId([...ordered, ...next]),
			lo: target.lo,
			hi: edited.lo - 1,
		});
	}
	next.push({ id: edited.id, lo: edited.lo, hi: edited.hi });
	if (edited.hi < target.hi) {
		next.push({
			id: nextCounterRangeId([...ordered, ...next]),
			lo: edited.hi + 1,
			hi: target.hi,
		});
	}
	for (let i = index + 1; i < ordered.length; i += 1) {
		next.push({ ...ordered[i] });
	}
	return validateCounterRangePartition(next, domain);
}

export type AddCounterRangeSliceResult =
	| { ok: true; ranges: CounterRange[]; addedId: string }
	| { ok: false; reason: CounterRangePartitionReason };

/** Add a slice by splitting a widest interval, retaining all coverage. */
export function addCounterRangeSlice(
	ranges: readonly CounterRange[],
	domain: CounterDomain,
): AddCounterRangeSliceResult {
	if (!isValidCounterDomain(domain)) return { ok: false, reason: 'invalid_domain' };
	const ordered = sortCounterRanges(ranges);
	if (ordered.length === 0) {
		return {
			ok: true,
			addedId: nextCounterRangeId(ordered),
			ranges: [{ id: nextCounterRangeId(ordered), lo: domain.min, hi: domain.max }],
		};
	}
	const valid = validateCounterRangePartition(ordered, domain);
	if (!valid.ok) {
		// Accept a legacy partially configured preset when the slices are
		// otherwise ordered and disjoint. The added slice repairs the largest
		// uncovered segment, yielding a complete partition in one operation.
		if (valid.reason !== 'gap') return valid;
		for (let index = 1; index < ordered.length; index += 1) {
			if (ordered[index].lo <= ordered[index - 1].hi)
				return { ok: false, reason: 'overlap' };
		}
		const gaps: Array<{ lo: number; hi: number }> = [];
		let cursor = domain.min;
		for (const range of ordered) {
			if (range.lo > cursor) gaps.push({ lo: cursor, hi: range.lo - 1 });
			cursor = range.hi + 1;
		}
		if (cursor <= domain.max) gaps.push({ lo: cursor, hi: domain.max });
		const gap = gaps.sort((a, b) => b.hi - b.lo - (a.hi - a.lo))[0];
		if (!gap) return { ok: false, reason: 'gap' };
		const addedId = nextCounterRangeId(ordered);
		return {
			ok: true,
			addedId,
			ranges: [...ordered, { id: addedId, ...gap }].sort(
				(a, b) => a.lo - b.lo || a.hi - b.hi,
			),
		};
	}
	let splitIndex = 0;
	for (let index = 1; index < ordered.length; index += 1) {
		const width = ordered[index].hi - ordered[index].lo;
		const bestWidth = ordered[splitIndex].hi - ordered[splitIndex].lo;
		if (width > bestWidth) splitIndex = index;
	}
	const source = ordered[splitIndex];
	if (source.lo === source.hi) return { ok: false, reason: 'no_slice_available' };
	const midpoint = Math.floor((source.lo + source.hi) / 2);
	const addedId = nextCounterRangeId(ordered);
	const next = ordered.map((range) => ({ ...range }));
	next[splitIndex] = { ...source, hi: midpoint };
	next.splice(splitIndex + 1, 0, {
		id: addedId,
		lo: midpoint + 1,
		hi: source.hi,
	});
	return { ok: true, ranges: next, addedId };
}

export type RemoveCounterRangeSliceResult = CounterRangePartitionResult;

/** Remove a slice by giving its domain to an immediate neighbour. */
export function removeCounterRangeSlice(
	ranges: readonly CounterRange[],
	id: string,
	domain: CounterDomain,
): RemoveCounterRangeSliceResult {
	const checked = validateCounterRangePartition(ranges, domain);
	if (!checked.ok) return checked;
	const index = checked.ranges.findIndex((range) => range.id === id);
	if (index < 0) return { ok: false, reason: 'unknown_range' };
	if (checked.ranges.length === 1) return { ok: false, reason: 'last_slice' };
	const next = checked.ranges.map((range) => ({ ...range }));
	if (index > 0) next[index - 1].hi = next[index].hi;
	else next[index + 1].lo = next[index].lo;
	next.splice(index, 1);
	return validateCounterRangePartition(next, domain);
}
