import {
	COUNTER_PRESET_KINDS,
	DATE_PRESET_KINDS,
	type GroupPreset,
	type GroupPresetKind,
} from '../types/typeGroupPreset';
import type { ExplorerSortDirection } from '../types/typeUI';

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
}

export interface PresetBuckets<T> {
	buckets: PresetBucket<T>[];
	/** Nodes without a usable value (folders for a counter, short names…). */
	ungrouped: T[];
}

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
) => string | number | null;

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
		if (typeof raw !== 'number' || !Number.isFinite(raw)) {
			ungrouped.push(node);
			continue;
		}
		valued.push({ node, value: isDate ? daysAgo(raw, now) : raw });
	}
	const k = sectionCount(valued.length);
	if (k < 2) return null;

	const ranges = quantileRanges(
		valued.map((entry) => entry.value).sort((a, b) => a - b),
		k,
	);
	const buckets: PresetBucket<T>[] = ranges.map((range, index) => ({
		key: String(index),
		label: isDate
			? range.lo === 0
				? labels.recent(range.hi + 1)
				: labels.daysAgo(range.lo, range.hi)
			: labels.span(range.lo, range.hi),
		members: [],
	}));
	for (const { node, value } of valued) {
		const index = ranges.findIndex((r) => value >= r.lo && value <= r.hi);
		buckets[index === -1 ? buckets.length - 1 : index].members.push(node);
	}
	const byIndexOrder = (a: PresetBucket<T>, b: PresetBucket<T>) =>
		Number(a.key) - Number(b.key);
	// Dates: `asc` reads as "most recent first", which is ascending days-ago.
	return { buckets: orderBuckets(buckets, byIndexOrder, direction), ungrouped };
}
