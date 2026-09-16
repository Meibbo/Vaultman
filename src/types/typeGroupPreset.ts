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
	| 'modified'
	| 'opened'
	| 'created'
	| 'custom'
	| 'note';

export interface GroupPreset {
	kind: GroupPresetKind;
	/** Header order. Ignored for `none` (§3.2: no direction there). */
	direction: ExplorerSortDirection;
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
		'modified',
		'opened',
		'created',
		'custom',
	],
	props: ['none', 'letter', 'name', 'type', 'custom'],
	tags: ['none', 'letter', 'name', 'custom'],
	snippets: ['none', 'letter', 'name', 'modified', 'created', 'custom'],
	plugins: ['none', 'letter', 'name', 'modified', 'created', 'custom'],
};

export const ALL_GROUP_PRESET_KINDS: readonly GroupPresetKind[] = [
	...GROUP_PRESETS_BY_TAB.files,
	'note',
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
	const raw = value as { kind?: unknown; direction?: unknown };
	const noteAllowed =
		(tab === 'props' || tab === 'tags') && (revealActive || raw.kind === 'note');
	const kind =
		isGroupPresetKind(raw.kind) &&
		(GROUP_PRESETS_BY_TAB[tab].includes(raw.kind) ||
			(noteAllowed && raw.kind === 'note'))
			? raw.kind
			: 'none';
	const direction: ExplorerSortDirection =
		raw.direction === 'desc' ? 'desc' : 'asc';
	return { kind, direction };
}

export function sameGroupPreset(a: GroupPreset, b: GroupPreset): boolean {
	return (
		a.kind === b.kind && (a.kind === 'none' || a.direction === b.direction)
	);
}
