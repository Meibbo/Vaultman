import {
	COUNTER_PRESET_KINDS,
	DATE_PRESET_KINDS,
	type GroupPreset,
	type GroupPresetKind,
	type CounterDomain,
	type CounterRange,
} from '../types/typeGroupPreset';
import {
	cloneGroupPreset,
	isCounterPresetKind,
} from '../types/typeGroupPreset';
import {
	addCounterRangeSlice,
	contiguousCounterRanges,
	removeCounterRangeSlice,
	rebalanceCounterRange,
	validateCounterRangePartition,
	isCounterRangePartition,
	type AddCounterRangeSliceResult,
	type RemoveCounterRangeSliceResult,
	type CounterRangePartitionResult,
} from './logicCounterRangePartitions';
import {
	resolveTaskGroupingMetric,
	type TaskMetricInput,
} from './logicTaskMetric';
import type { ExplorerSortDirection } from '../types/typeUI';
import type { TreeNode } from '../types/typeTree';
import type { GroupMutationResult } from './logicGroupSelectionTransaction';

/**
 * Spec 08 §3.2 — the group presets as pure derivations.
 *
 * Every preset resolves to the same shape: ordered buckets keyed by a string,
 * plus the nodes no bucket claimed. The projection (`projectGroupedTree`)
 * turns buckets into header rows; nothing here touches settings or the DOM.
 */

export interface PresetBucket<T> {
	key: string;
	label: string;
	members: T[];
	range?: CounterRange;
}

export interface PresetBuckets<T> {
	buckets: PresetBucket<T>[];
	/** Nodes without a usable value (folders for a counter, short names…). */
	ungrouped: T[];
	/** Present only for counter presets with at least one fetched value. */
	counterDomain?: CounterDomain;
}

export interface PresetBucketSnapshot {
	readonly bucketId: string;
	readonly label: string;
	readonly entityIds: readonly string[];
	readonly urns: readonly string[];
	readonly projectionRevision: number | null;
	/** Target that owns the visible preset header, not the menu cursor. */
	readonly scopeTarget?: import('../types/typeUI').ScopeTarget;
}

export type MaterializePresetHandler = (
	snapshot: PresetBucketSnapshot,
) => Promise<GroupMutationResult>;

/** Snapshot only membership roots; descendants are reproduced by projection. */
export function snapshotPresetBucket<TMeta>(
	header: TreeNode<TMeta>,
	urnOf: (node: TreeNode<TMeta>) => string,
	projectionRevision: number | null,
): PresetBucketSnapshot {
	const entityIds: string[] = [];
	const urns: string[] = [];
	const seen = new Set<string>();
	for (const node of header.children ?? []) {
		const entityId = node.entityId ?? node.id;
		if (seen.has(entityId)) continue;
		seen.add(entityId);
		entityIds.push(entityId);
		urns.push(urnOf(node));
	}
	return Object.freeze({
		bucketId: header.entityId ?? header.id,
		label: header.label,
		...(header.groupScopeTarget ? { scopeTarget: header.groupScopeTarget } : {}),
		entityIds: Object.freeze(entityIds),
		urns: Object.freeze(urns),
		projectionRevision,
	});
}

export interface MaterializePresetInput<
	T extends { label: string; id: string; entityId?: string },
> {
	nodes: readonly T[];
	preset: GroupPreset;
	extract?: PresetValueOf<T>;
	labels?: RangeLabels;
	now?: number;
	/** One name per selected bucket, in the order of `sourceBucketIds`. */
	names: readonly string[];
	sourceBucketIds?: readonly string[];
	existingMemberships?: Readonly<Record<string, readonly string[]>>;
	urnOf: (node: T) => string;
	projectionRevision: number;
	currentRevision?: number;
}

export type MaterializePresetResult<
	T extends { label: string; id: string; entityId?: string },
> =
	| {
			status: 'committed';
			memberships: Record<string, readonly string[]>;
			preset: GroupPreset;
			projectionRevision: number;
			buckets: readonly PresetBucket<T>[];
		}
	| { status: 'cancelled' }
	| { status: 'rejected'; reason: string };

/**
 * What a scene must be able to answer about a node for the value presets.
 * `letter` and `name` only read the label and need no extractor.
 * - `type`: a string (file extension, property type).
 * - counters: a number.
 * - dates: epoch milliseconds.
 * `null` puts the node in `ungrouped`.
 */
export type PresetValueOf<T> = (
	node: T,
	kind: GroupPresetKind,
) => string | number | TaskMetricInput | null;

export interface RangeLabels {
	/** `lo–hi` for a closed numeric range (`lo` alone when lo === hi). */
	span(lo: number, hi: number): string;
	/** The bucket that contains today: "Today" when it spans one day. */
	recent(days: number): string;
	/** `lo–hi days ago`. */
	daysAgo(lo: number, hi: number): string;
}

export const DEFAULT_RANGE_LABELS: RangeLabels = {
	span: (lo, hi) => (lo === hi ? `${lo}` : `${lo}–${hi}`),
	recent: (days) => (days === 1 ? 'Today' : `Last ${days} days`),
	daysAgo: (lo, hi) => (lo === hi ? `${lo} days ago` : `${lo}–${hi} days ago`),
};

// --- name (VLC MediaGroup) --------------------------------------------------

/** `AutomaticGroupPrefixSize` in VLC's `MediaGroup.h`. */
export const NAME_PREFIX_SIZE = 6;
const LEADING_ARTICLE = /^the\s+/i;

/**
 * VLC `MediaGroup::prefix`: drop a leading "the ", keep the first
 * `NAME_PREFIX_SIZE` UTF-8 code points, compare case-insensitively. A title
 * shorter than the prefix is a forced singleton (`fetchMatching` discards
 * `prefix.length() < AutomaticGroupPrefixSize`) and is NOT grouped.
 */
export function namePrefixKey(label: string): string | null {
	const stripped = (label ?? '').trim().replace(LEADING_ARTICLE, '');
	const points = Array.from(stripped);
	if (points.length < NAME_PREFIX_SIZE) return null;
	return points.slice(0, NAME_PREFIX_SIZE).join('').toLocaleLowerCase();
}

/** Display form of the prefix: the first member's own casing, article dropped. */
function namePrefixLabel(label: string): string {
	const stripped = (label ?? '').trim().replace(LEADING_ARTICLE, '');
	return Array.from(stripped).slice(0, NAME_PREFIX_SIZE).join('');
}

// --- letter (the floating index derivation, unchanged) ---------------------

export function letterKey(label: string): string | null {
	const [ch] = Array.from((label ?? '').trim());
	if (!ch) return null;
	const [upper] = Array.from(ch.toLocaleUpperCase());
	return upper ?? ch;
}

// --- ranges (§3.2.1) --------------------------------------------------------

export const MAX_SECTIONS = 8;

/**
 * How many sections `n` valued nodes deserve. Encodes the dev's example
 * literally: 2 nodes → none, 10 nodes → 2, "y así sucesivamente".
 * `floor(sqrt(n / 2.5))`: 5→1, 10→2, 23→3, 40→4, 90→6, 160+→8.
 * Fewer than 2 sections means "do not group".
 */
export function sectionCount(n: number): number {
	if (n <= 0) return 0;
	return Math.min(MAX_SECTIONS, Math.floor(Math.sqrt(n / 2.5)));
}

const DAY_MS = 86_400_000;

function daysAgo(epochMs: number, now: number): number {
	return Math.max(0, Math.floor((now - epochMs) / DAY_MS));
}

interface ValueRange {
	lo: number;
	hi: number;
}

export function counterRangeId(index: number): string {
	return `counter-range-${index + 1}`;
}

export function materializeCounterRanges<T extends { label: string }>(
	nodes: readonly T[],
	preset: GroupPreset,
	options: PresetBucketOptions<T> = {},
): GroupPreset {
	if (!isCounterPresetKind(preset.kind) || preset.counterRanges !== undefined)
		return cloneGroupPreset(preset);
	const extract = options.extract;
	if (!extract) return cloneGroupPreset(preset);
	const values = nodes
		.map((node) => extract(node, preset.kind))
		.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
		.map((value) => Math.max(0, Math.floor(value)));
	const count = sectionCount(values.length);
	if (count < 2) return cloneGroupPreset(preset);
	const min = Math.min(...values);
	const max = Math.max(...values);
	const ranges = contiguousCounterRanges(
		quantileRanges([...values].sort((a, b) => a - b), count).map(
		(range, index) => ({ ...range, id: counterRangeId(index) }),
		),
		{ min, max },
	);
	return { ...cloneGroupPreset(preset), counterRanges: ranges };
}

// Keep the historical import path stable while the actual partition engine
// lives in its own pure module (also used by Adjust range helpers).
export type {
	AddCounterRangeSliceResult,
	RemoveCounterRangeSliceResult,
	CounterRangePartitionResult,
};
export {
	addCounterRangeSlice,
	removeCounterRangeSlice,
	rebalanceCounterRange,
	validateCounterRangePartition,
	isCounterRangePartition,
};

export function materializePresetAsCustom<
	T extends { label: string; id: string; entityId?: string },
>(
	input: MaterializePresetInput<T>,
): MaterializePresetResult<T> {
	if (
		input.currentRevision !== undefined &&
		input.currentRevision !== input.projectionRevision
	)
		return { status: 'rejected', reason: 'projection_revision_changed' };
	const resolved = buildPresetBuckets(input.nodes, input.preset, {
		extract: input.extract,
		labels: input.labels,
		now: input.now,
	});
	if (!resolved) return { status: 'rejected', reason: 'preset_not_projectable' };
	const selected = input.sourceBucketIds
		? resolved.buckets.filter((bucket) => input.sourceBucketIds!.includes(bucket.key))
		: resolved.buckets;
	if (selected.length !== input.names.length || selected.length === 0)
		return { status: 'rejected', reason: 'bucket_name_count_mismatch' };
	const names = input.names.map((name) => name.trim());
	const existing = new Set(Object.keys(input.existingMemberships ?? {}));
	const unique = new Set<string>();
	if (names.some((name) => !name || existing.has(name) || !unique.add(name)))
		return { status: 'rejected', reason: 'group_name_collision' };
	const memberships: Record<string, readonly string[]> = {
		...Object.fromEntries(
			Object.entries(input.existingMemberships ?? {}).map(([id, urns]) => [id, [...urns]]),
		),
	};
	for (const [index, bucket] of selected.entries()) {
		const seen = new Set<string>();
		const urns: string[] = [];
		for (const node of bucket.members) {
			const identity = node.entityId ?? node.id;
			if (seen.has(identity)) continue;
			seen.add(identity);
			urns.push(input.urnOf(node));
		}
		memberships[names[index]!] = urns;
	}
	return {
		status: 'committed',
		memberships,
		preset: { kind: 'custom', direction: input.preset.direction },
		projectionRevision: input.projectionRevision,
		buckets: selected,
	};
}

/**
 * Cut `values` (sorted ascending) into up to `k` sections of equal COUNT,
 * never splitting equal values across two sections. Equal-count sections are
 * what "inteligentemente lo seccione" asks for: they stay balanced when the
 * counts are skewed (three notes with 0 words and one with 2000), which
 * equal-width sections cannot do.
 */
export function quantileRanges(
	values: readonly number[],
	k: number,
): ValueRange[] {
	const n = values.length;
	if (n === 0 || k < 1) return [];
	const out: ValueRange[] = [];
	let from = 0;
	for (let section = 1; section <= k && from < n; section += 1) {
		let to = section === k ? n : Math.round((section * n) / k);
		// Do not cut between equal values: push the boundary past the run.
		while (to < n && to > from && values[to] === values[to - 1]) to += 1;
		if (to <= from) continue;
		out.push({ lo: values[from], hi: values[to - 1] });
		from = to;
	}
	return out;
}

// --- the engine -------------------------------------------------------------

export interface PresetBucketOptions<T> {
	/** Named `extract`, not `valueOf`: `{}` already has `Object.prototype.valueOf`. */
	extract?: PresetValueOf<T>;
	labels?: RangeLabels;
	/** Epoch ms used as "today" for the date presets. Defaults to `Date.now()`. */
	now?: number;
}

function orderBuckets<T>(
	buckets: PresetBucket<T>[],
	compare: (a: PresetBucket<T>, b: PresetBucket<T>) => number,
	direction: ExplorerSortDirection,
): PresetBucket<T>[] {
	const sorted = [...buckets].sort(compare);
	return direction === 'desc' ? sorted.reverse() : sorted;
}

function keyed<T>(
	nodes: readonly T[],
	keyOf: (node: T) => string | null,
	labelOf: (node: T, key: string) => string,
): PresetBuckets<T> {
	const byKey = new Map<string, PresetBucket<T>>();
	const ungrouped: T[] = [];
	for (const node of nodes) {
		const key = keyOf(node);
		if (key === null) {
			ungrouped.push(node);
			continue;
		}
		const bucket = byKey.get(key);
		if (bucket) bucket.members.push(node);
		else byKey.set(key, { key, label: labelOf(node, key), members: [node] });
	}
	return { buckets: [...byKey.values()], ungrouped };
}

const byKeyText = <T>(a: PresetBucket<T>, b: PresetBucket<T>) =>
	a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' });

/**
 * Resolve a preset over the nodes of one level. Returns `null` when the
 * preset does not group these nodes (`none`, `custom`, or a range preset over
 * too few nodes — §3.2.1 "si hay solo dos nodos no hay necesidad de agrupar").
 */
export function buildPresetBuckets<T extends { label: string }>(
	nodes: readonly T[],
	preset: GroupPreset,
	options: PresetBucketOptions<T> = {},
): PresetBuckets<T> | null {
	const { kind, direction } = preset;
	const labels = options.labels ?? DEFAULT_RANGE_LABELS;

	if (kind === 'none' || kind === 'custom') return null;

	if (kind === 'letter') {
		const out = keyed(
			nodes,
			(n) => letterKey(n.label),
			(_n, key) => key,
		);
		return { ...out, buckets: orderBuckets(out.buckets, byKeyText, direction) };
	}

	if (kind === 'name') {
		const out = keyed(
			nodes,
			(n) => namePrefixKey(n.label),
			(n) => namePrefixLabel(n.label),
		);
		return { ...out, buckets: orderBuckets(out.buckets, byKeyText, direction) };
	}

	const valueOf = options.extract;
	if (!valueOf) return null;

	if (kind === 'type') {
		const out = keyed(
			nodes,
			(n) => {
				const value = valueOf(n, kind);
				return typeof value === 'string' && value ? value : null;
			},
			(_n, key) => key,
		);
		return { ...out, buckets: orderBuckets(out.buckets, byKeyText, direction) };
	}

	const isCounter = COUNTER_PRESET_KINDS.includes(kind);
	const isDate = DATE_PRESET_KINDS.includes(kind);
	if (!isCounter && !isDate) return null;

	const now = options.now ?? Date.now();
	const valued: { node: T; value: number }[] = [];
	const ungrouped: T[] = [];
	for (const node of nodes) {
		const raw = valueOf(node, kind);
		const numeric =
			kind === 'tasks'
				? resolveTaskGroupingMetric(raw)
				: typeof raw === 'number' && Number.isFinite(raw)
					? raw
					: null;
		if (numeric === null) {
			ungrouped.push(node);
			continue;
		}
		valued.push({ node, value: isDate ? daysAgo(numeric, now) : numeric });
	}
	const explicitRanges =
		(isCounter || isDate) && preset.counterRanges !== undefined;
	// Counter and date presets share the same closed-partition editor. Dates
	// are already represented as integer days-ago, so their fetched domain is
	// just as bounded and editable as a word/task count domain.
	const counterValues = (isCounter || isDate)
		? valued.map((entry) => Math.max(0, Math.floor(entry.value)))
		: [];
	const counterDomain =
		counterValues.length > 0
			? { min: Math.min(...counterValues), max: Math.max(...counterValues) }
			: undefined;
	const ranges: CounterRange[] = explicitRanges
		? preset.counterRanges!.map((range) => ({ ...range }))
		: (() => {
				const values = valued
					.map((entry) => entry.value)
					.sort((a, b) => a - b);
				const rawRanges = quantileRanges(values, sectionCount(valued.length)).map(
					(range, index) => ({ ...range, id: counterRangeId(index) }),
				);
				return values.length > 0
					? contiguousCounterRanges(rawRanges, {
							min: Math.min(...values),
							max: Math.max(...values),
					  })
					: rawRanges;
		  })();
	// A sufficiently large population may still collapse to one range when
	// every value is equal (quantiles must not split equal values). Keep that
	// single bucket; only the genuinely small automatic population opts out.
	if (!explicitRanges && sectionCount(valued.length) < 2) return null;
	if (ranges.length === 0) return null;
	const buckets: PresetBucket<T>[] = ranges.map((range) => ({
		key: range.id,
		label: isDate
			? range.lo === 0
				? labels.recent(range.hi + 1)
				: labels.daysAgo(range.lo, range.hi)
			: labels.span(range.lo, range.hi),
		members: [],
		...((isCounter || isDate) ? { range } : {}),
	}));
	for (const { node, value } of valued) {
		const index = ranges.findIndex((r) => value >= r.lo && value <= r.hi);
		if (index === -1) ungrouped.push(node);
		else buckets[index]!.members.push(node);
	}
	const rangeById = new Map(ranges.map((range) => [range.id, range] as const));
	const byIndexOrder = (a: PresetBucket<T>, b: PresetBucket<T>) => {
		const ar = rangeById.get(a.key)!;
		const br = rangeById.get(b.key)!;
		return ar.lo - br.lo || ar.hi - br.hi;
	};
	// Dates: `asc` reads as "most recent first", which is ascending days-ago.
	return {
		buckets: orderBuckets(buckets, byIndexOrder, direction),
		ungrouped,
		...(counterDomain ? { counterDomain } : {}),
	};
}
