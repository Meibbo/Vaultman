import type { ExplorerSortDirection, ExplorerTabId } from './typeUI';

/**
 * Spec 08 §3.2: grouping is a preset SELECTION, not a toggle. `none` is a
 * value of that selection and the default; `custom` projects the custom
 * groups of the scene (`SceneConfig.groupMemberships`, U130-09).
 */
export type GroupPresetKind =
	| 'none'
	| 'letter'
	| 'name'
	| 'type'
	| 'words'
	| 'tasks'
	| 'props'
	| 'count'
	| 'childs'
	| 'modified'
	| 'opened'
	| 'created'
	| 'custom'
	| 'note'
	| 'sections'
	| 'state';

export interface GroupPreset {
	kind: GroupPresetKind;
	/** Header order. Ignored for `none` (§3.2: no direction there). */
	direction: ExplorerSortDirection;
	/** Explicit closed numeric intervals for counter/date presets. */
	counterRanges?: readonly CounterRange[];
}

export interface CounterRange {
	id: string;
	lo: number;
	hi: number;
}

/** Transient limits of the counter values fetched for the current projection. */
export interface CounterDomain {
	min: number;
	max: number;
}

export const NO_GROUP_PRESET: Readonly<GroupPreset> = Object.freeze({
	kind: 'none',
	direction: 'asc',
});

/** Counters (§3.2 table): grouped by numeric range. */
export const COUNTER_PRESET_KINDS: readonly GroupPresetKind[] = [
	'words',
	'tasks',
	'props',
	'count',
	'childs',
];

/** Dates (§3.2 table): grouped by day-distance range. */
export const DATE_PRESET_KINDS: readonly GroupPresetKind[] = [
	'modified',
	'opened',
	'created',
];

/**
 * Which presets a scene can offer. `letter`, `name` and `custom` need only a
 * label; the rest need a value the scene can extract from its own nodes.
 */
export const GROUP_PRESETS_BY_TAB: Record<
	ExplorerTabId,
	readonly GroupPresetKind[]
> = {
	files: [
		'none',
		'letter',
		'name',
		'type',
		'words',
		'tasks',
		'props',
		'childs',
		'modified',
		'opened',
		'created',
		'custom',
	],
	props: ['none', 'letter', 'name', 'type', 'count', 'childs', 'custom'],
	tags: ['none', 'letter', 'name', 'count', 'childs', 'custom'],
	snippets: ['none', 'letter', 'name', 'modified', 'created', 'custom'],
	plugins: ['none', 'letter', 'name', 'modified', 'created', 'custom', 'sections', 'state'],
};

export const ALL_GROUP_PRESET_KINDS: readonly GroupPresetKind[] = [
	'none',
	'letter',
	'name',
	'type',
	'words',
	'tasks',
	'props',
	'count',
	'childs',
	'modified',
	'opened',
	'created',
	'custom',
	'note',
	'sections',
	'state',
];

export function isGroupPresetKind(value: unknown): value is GroupPresetKind {
	return (
		typeof value === 'string' &&
		(ALL_GROUP_PRESET_KINDS as readonly string[]).includes(value)
	);
}

export function normalizeGroupPreset(
	tab: ExplorerTabId,
	value: unknown,
	revealActive = false,
): GroupPreset {
	if (typeof value !== 'object' || value === null)
		return { ...NO_GROUP_PRESET };
	const raw = value as {
		kind?: unknown;
		direction?: unknown;
		counterRanges?: unknown;
	};
	// Note groups are meaningful only while the props/tags explorer is
	// actually revealing a note.  Do not let a persisted `kind: note` leak
	// into an ordinary scene (or into files/snippets/plugins) merely because
	// the raw value happened to contain that string.
	const noteAllowed =
		(tab === 'props' || tab === 'tags') && revealActive;
	const kind =
		isGroupPresetKind(raw.kind) &&
		(GROUP_PRESETS_BY_TAB[tab].includes(raw.kind) ||
			(noteAllowed && raw.kind === 'note'))
			? raw.kind
			: 'none';
	const direction: ExplorerSortDirection =
		raw.direction === 'desc' ? 'desc' : 'asc';
	const counterRanges = normalizeCounterRanges(kind, raw.counterRanges);
	return counterRanges ? { kind, direction, counterRanges } : { kind, direction };
}

export function sameGroupPreset(a: GroupPreset, b: GroupPreset): boolean {
	if (a.kind !== b.kind || (a.kind !== 'none' && a.direction !== b.direction))
		return false;
	const ar = a.counterRanges;
	const br = b.counterRanges;
	if (ar === undefined || br === undefined) return ar === br;
	return (
		ar.length === br.length &&
		ar.every(
			(range, index) =>
				range.id === br[index]?.id &&
				range.lo === br[index]?.lo &&
				range.hi === br[index]?.hi,
		)
	);
}

export function isCounterPresetKind(
	kind: GroupPresetKind,
): boolean {
	return COUNTER_PRESET_KINDS.includes(kind);
}

export function normalizeCounterRanges(
	kind: GroupPresetKind,
	value: unknown,
): CounterRange[] | undefined {
	if (
		(!isCounterPresetKind(kind) && !DATE_PRESET_KINDS.includes(kind)) ||
		value === undefined
	)
		return undefined;
	if (!Array.isArray(value)) return undefined;
	const ranges: CounterRange[] = [];
	const ids = new Set<string>();
	for (const item of value) {
		if (typeof item !== 'object' || item === null) return undefined;
		const raw = item as { id?: unknown; lo?: unknown; hi?: unknown };
		if (
			typeof raw.id !== 'string' ||
			raw.id.length === 0 ||
			ids.has(raw.id) ||
			!Number.isInteger(raw.lo) ||
			!Number.isInteger(raw.hi) ||
			!Number.isFinite(raw.lo) ||
			!Number.isFinite(raw.hi) ||
			(raw.lo as number) < 0 ||
			(raw.hi as number) < 0 ||
			(raw.lo as number) > (raw.hi as number)
		) {
			return undefined;
		}
		ids.add(raw.id);
		ranges.push({ id: raw.id, lo: raw.lo as number, hi: raw.hi as number });
	}
	const ordered = [...ranges].sort((a, b) => a.lo - b.lo || a.hi - b.hi);
	for (let index = 1; index < ordered.length; index += 1) {
		if (ordered[index - 1]!.hi >= ordered[index]!.lo) return undefined;
	}
	return ranges.map((range) => ({ ...range }));
}

export function cloneGroupPreset(preset: GroupPreset): GroupPreset {
	return {
		kind: preset.kind,
		direction: preset.direction,
		...(preset.counterRanges
			? { counterRanges: preset.counterRanges.map((range) => ({ ...range })) }
			: {}),
	};
}
