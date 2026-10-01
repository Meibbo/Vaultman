import type {
	ExplorerSortDirection,
	ExplorerSortState,
	ExplorerTabId,
	ScopeSet,
	ScopeState,
	ScopeTarget,
	ScopeSort,
	SortScopeKey,
} from '../types/typeUI';
import {
	normalizeGroupPreset,
	type GroupPreset,
} from '../types/typeGroupPreset';

const DEFAULT_SORT: ScopeSort = { sortBy: 'name', direction: 'asc' };

/** Minimal structural information needed by the scope resolver. */
export interface ScopeResolutionNode {
	/** Preferred explicit 1-based p-node level or compound group level. */
	level?: number | string;
	/** TreeNode depth is zero-based, so it is translated to level + 1. */
	depth?: number;
	/** Canonical id of the direct p-node parent, when one exists. */
	parentId?: string | null;
	parentCanonicalId?: string | null;
	parent?: { id?: string; canonicalId?: string } | null;
}

function cloneScopeSort(sort: ScopeSort): ScopeSort {
	return { sortBy: sort.sortBy, direction: sort.direction };
}

function cloneScopeSet(set: ScopeSet | undefined): ScopeSet {
	if (!set) return {};
	return {
		...(set.sort ? { sort: cloneScopeSort(set.sort) } : {}),
		...(set.groupPreset
			? {
					groupPreset: {
						...set.groupPreset,
						...(set.groupPreset.counterRanges
							? {
									counterRanges: set.groupPreset.counterRanges.map((range) => ({ ...range })),
								}
							: {}),
					},
				}
			: {}),
		...(set.cellToggles ? { cellToggles: { ...set.cellToggles } } : {}),
		...(set.nodeTypeFilters
			? { nodeTypeFilters: [...set.nodeTypeFilters] }
			: {}),
		...(set.filterPolicy ? { filterPolicy: set.filterPolicy } : {}),
		...(set.hidden ? { hidden: true } : {}),
		...(set.viewMode ? { viewMode: set.viewMode } : {}),
		...(set.nested !== undefined ? { nested: set.nested } : {}),
		...(set.indent !== undefined ? { indent: set.indent } : {}),
		...(set.stickyRows !== undefined ? { stickyRows: set.stickyRows } : {}),
		...(set.compactFolders !== undefined ? { compactFolders: set.compactFolders } : {}),
		...(set.fixedFolders !== undefined ? { fixedFolders: set.fixedFolders } : {}),
		...(set.parentsFirst !== undefined ? { parentsFirst: set.parentsFirst } : {}),
	};
}

/** Defensive copy for persistence/cascade boundaries. */
export function cloneScopeState(state: ScopeState): ScopeState {
	const sets: Partial<Record<ScopeTarget, ScopeSet>> = {};
	for (const [target, set] of Object.entries(state.sets) as Array<
		[ScopeTarget, ScopeSet | undefined]
	>) {
		if (set) sets[target] = cloneScopeSet(set);
	}
	return { sets, cursor: state.cursor, levelBase: 1 };
}

/** Field-wise overlay used while upgrading a legacy flat scene in one edit. */
export function mergeScopeStates(
	base: ScopeState,
	overlay: ScopeState,
): ScopeState {
	const out = cloneScopeState(base);
	for (const [target, rawSet] of Object.entries(overlay.sets) as Array<
		[ScopeTarget, ScopeSet | undefined]
	>) {
		if (!rawSet) continue;
		const set = cloneScopeSet(rawSet);
		const prior = out.sets[target];
		out.sets[target] = {
			...(prior ?? {}),
			...set,
			...((prior?.cellToggles || set.cellToggles)
				? {
						cellToggles: {
							...(prior?.cellToggles ?? {}),
							...(set.cellToggles ?? {}),
						},
					}
				: {}),
		};
	}
	out.cursor = overlay.cursor;
	return out;
}

/** Clone every persisted collection owned by a scene's sort/scope snapshot. */
export function cloneExplorerSortState(
	state: ExplorerSortState,
): ExplorerSortState {
	const sorts: Partial<Record<SortScopeKey, ScopeSort>> = {};
	for (const [scope, sort] of Object.entries(state.sorts) as Array<
		[SortScopeKey, ScopeSort | undefined]
	>) {
		if (sort) sorts[scope] = cloneScopeSort(sort);
	}
	return {
		...state,
		sorts,
		...(state.scopeState ? { scopeState: cloneScopeState(state.scopeState) } : {}),
		...(state.hiddenScopes ? { hiddenScopes: [...state.hiddenScopes] } : {}),
		...(state.nodeTypeFilters
			? { nodeTypeFilters: [...state.nodeTypeFilters] }
			: {}),
	};
}

function normalizeScopeSetValue(
	tab: ExplorerTabId,
	value: unknown,
): ScopeSet | null {
	if (!isRecord(value)) return null;
	const out: ScopeSet = {};
	const sort = normalizeScopeSort(value.sort);
	if (sort) out.sort = sort;
	if (isRecord(value.groupPreset) && typeof value.groupPreset.kind === 'string') {
		out.groupPreset = normalizeGroupPreset(tab, value.groupPreset, true);
	}
	if (isRecord(value.cellToggles)) {
		const toggles: Record<string, boolean> = {};
		for (const [id, enabled] of Object.entries(value.cellToggles)) {
			if (typeof enabled === 'boolean') toggles[id] = enabled;
		}
		if (Object.keys(toggles).length > 0) out.cellToggles = toggles;
	}
	if (Array.isArray(value.nodeTypeFilters)) {
		out.nodeTypeFilters = value.nodeTypeFilters.filter(
			(entry): entry is string => typeof entry === 'string',
		);
	}
	if (value.filterPolicy === 'included') out.filterPolicy = 'included';
	if (value.hidden === true) out.hidden = true;
	if (typeof value.viewMode === 'string') {
		const vm = value.viewMode;
		if (vm === 'tree' || vm === 'table' || vm === 'dnd' || vm === 'grid' || vm === 'cards') {
			out.viewMode = vm;
		}
	}
	if (typeof value.nested === 'boolean') out.nested = value.nested;
	if (typeof value.indent === 'boolean') out.indent = value.indent;
	if (typeof value.stickyRows === 'boolean') out.stickyRows = value.stickyRows;
	if (typeof value.compactFolders === 'boolean') out.compactFolders = value.compactFolders;
	if (typeof value.fixedFolders === 'boolean') out.fixedFolders = value.fixedFolders;
	if (typeof value.parentsFirst === 'boolean') out.parentsFirst = value.parentsFirst;
	return out;
}

/** Normalize an already-persisted scope state without trusting JSON shapes. */
export function normalizeScopeState(
	tab: ExplorerTabId,
	value: unknown,
	legacy: ExplorerSortState,
): ScopeState {
	const migrated = scopeStateFromLegacy(tab, legacy);
	if (!isRecord(value) || !isRecord(value.sets)) return migrated;
	const sets: Partial<Record<ScopeTarget, ScopeSet>> = {};
	for (const [rawTarget, rawSet] of Object.entries(value.sets)) {
		const target = migrateLegacyScopeKey(rawTarget);
		if (target === 'drill' || !isScopeAllowed(tab, target)) continue;
		const normalized = normalizeScopeSetValue(tab, rawSet);
		if (normalized) sets[target as ScopeTarget] = normalized;
	}
	const rawCursor =
		typeof value.cursor === 'string'
			? migrateLegacyScopeKey(value.cursor)
			: migrated.cursor;
	const cursor =
		rawCursor !== 'drill' && isScopeAllowed(tab, rawCursor)
			? (rawCursor as ScopeTarget)
			: migrated.cursor;
	return { sets, cursor, levelBase: 1 };
}

function scopeNodeLevel(node: ScopeResolutionNode): number | string | null {
	if (node.level !== undefined && node.level !== null) return node.level;
	if (Number.isInteger(node.depth) && node.depth! >= 0) return node.depth! + 1;
	return null;
}

function scopeNodeParent(node: ScopeResolutionNode): string | null {
	if (typeof node.parentCanonicalId === 'string' && node.parentCanonicalId) {
		return node.parentCanonicalId;
	}
	if (typeof node.parentId === 'string' && node.parentId) return node.parentId;
	if (node.parent) {
		if (typeof node.parent.canonicalId === 'string' && node.parent.canonicalId) {
			return node.parent.canonicalId;
		}
		if (typeof node.parent.id === 'string' && node.parent.id) return node.parent.id;
	}
	return null;
}

/**
 * Resolve all scope-set fields for one node. The cursor is intentionally not
 * consulted: it only identifies the target currently being edited by menus.
 * Parent and level sets are independent overrides, so a parent that only
 * supplies `sort` still inherits grouping/cells/type filters from lower
 * specificity sets. Hidden sets are skipped, not deleted.
 */
export function resolveScopeSet(
	state: ScopeState | undefined,
	node: ScopeResolutionNode,
	defaults: ScopeSet = {},
): ScopeSet {
	const sets = state?.sets ?? {};
	const parent = scopeNodeParent(node);
	const level = scopeNodeLevel(node);
	const lvlScope = level !== null ? levelScope(level) : null;
	const candidates: Array<ScopeSet | undefined> = [
		parent ? sets[parentScope(parent) as ScopeTarget] : undefined,
		lvlScope ? sets[lvlScope as ScopeTarget] : undefined,
		sets.all,
	];
	const active = candidates.map((set) => (set?.hidden ? undefined : set));
	const out: ScopeSet = {};

	const first = <K extends keyof ScopeSet>(key: K): ScopeSet[K] | undefined => {
		for (const set of active) {
			if (set && set[key] !== undefined) return set[key];
		}
		return defaults[key];
	};

	const sort = first('sort');
	if (sort) out.sort = cloneScopeSort(sort);
	const groupPreset = first('groupPreset');
	if (groupPreset) {
		out.groupPreset = {
			...groupPreset,
			...(groupPreset.counterRanges
				? { counterRanges: groupPreset.counterRanges.map((range) => ({ ...range })) }
				: {}),
		};
	}

	// Cell toggles are partial overrides, so merge from the least specific
	// target toward the most specific target. A target may explicitly disable
	// a cell without replacing unrelated toggles inherited from `all`.
	const toggles: Record<string, boolean> = {};
	if (defaults.cellToggles) Object.assign(toggles, defaults.cellToggles);
	for (const set of [...active].reverse()) {
		if (set?.cellToggles) Object.assign(toggles, set.cellToggles);
	}
	if (Object.keys(toggles).length > 0) out.cellToggles = toggles;

	const nodeTypeFilters = first('nodeTypeFilters');
	if (nodeTypeFilters) out.nodeTypeFilters = [...nodeTypeFilters];

	// Filter policy is a membership union, not a field cascade: `all`, the
	// node's level, and its direct parent may each include the node.
	if (
		active.some((set) => set?.filterPolicy === 'included') ||
		(active.every((set) => set === undefined) && defaults.filterPolicy === 'included')
	) {
		out.filterPolicy = 'included';
	}

	const viewMode = first('viewMode');
	if (viewMode) out.viewMode = viewMode;
	const nested = first('nested');
	if (nested !== undefined) out.nested = nested;
	const indent = first('indent');
	if (indent !== undefined) out.indent = indent;
	const stickyRows = first('stickyRows');
	if (stickyRows !== undefined) out.stickyRows = stickyRows;
	const compactFolders = first('compactFolders');
	if (compactFolders !== undefined) out.compactFolders = compactFolders;
	const fixedFolders = first('fixedFolders');
	if (fixedFolders !== undefined) out.fixedFolders = fixedFolders;
	const parentsFirst = first('parentsFirst');
	if (parentsFirst !== undefined) out.parentsFirst = parentsFirst;

	return out;
}

/** Whether any persisted, non-hidden target currently projects groups. */
export function hasScopeGrouping(state: ScopeState | undefined): boolean {
	if (!state) return false;
	return Object.values(state.sets).some(
		(set) =>
			set?.hidden !== true &&
			set?.groupPreset !== undefined &&
			set.groupPreset.kind !== 'none',
	);
}

/**
 * Build the new cumulative scope space from the legacy flat scene fields.
 * This helper is idempotent when called with an existing `scopeState` by the
 * caller: it is only intended for the first load of a scene.
 *
 * U130-GGC-025: new scenes open with cursor `level:1` on hierarchical tabs
 * (`all` on flat add-on tabs). Persisted scenes keep their historically
 * assigned cursor: this helper only defaults the cursor when the legacy
 * state carries nothing to preserve, and it never rewrites existing sets.
 */
export function scopeStateFromLegacy(
	tab: ExplorerTabId,
	sortState: ExplorerSortState | undefined,
	groupPreset?: GroupPreset,
): ScopeState {
	const state: ScopeState = {
		sets: {},
		cursor: defaultScopeForTab(tab),
		levelBase: 1,
	};
	if (sortState) {
		for (const [rawKey, sort] of Object.entries(sortState.sorts)) {
			if (!sort) continue;
			const migrated = rawKey === 'drill'
				? sortState.drillNodeId
					? parentScope(sortState.drillNodeId)
					: null
				: migrateLegacyScopeKey(rawKey);
			if (!migrated || migrated === 'drill' || !isScopeAllowed(tab, migrated)) continue;
			const key = migrated as ScopeTarget;
			state.sets[key] = {
				...(state.sets[key] ?? {}),
				sort: cloneScopeSort(sort),
			};
		}
		const filters = sortState.nodeTypeFilters ??
			(sortState.nodeTypeFilter ? [sortState.nodeTypeFilter] : undefined);
		if (filters?.length) {
			state.sets.all = {
				...(state.sets.all ?? {}),
				nodeTypeFilters: [...filters],
			};
		}
		if (sortState.filtered === true) {
			state.sets.all = {
				...(state.sets.all ?? {}),
				filterPolicy: 'included',
			};
		}
		for (const rawHidden of sortState.hiddenScopes ?? []) {
			const migrated = rawHidden === 'drill'
				? sortState.drillNodeId
					? parentScope(sortState.drillNodeId)
					: null
				: migrateLegacyScopeKey(rawHidden);
			if (!migrated || migrated === 'drill' || !isScopeAllowed(tab, migrated)) continue;
			const key = migrated as ScopeTarget;
			state.sets[key] = { ...(state.sets[key] ?? {}), hidden: true };
		}
		const rawCursor = sortState.activeScope === 'drill'
			? sortState.drillNodeId
				? parentScope(sortState.drillNodeId)
				: 'all'
			: migrateLegacyScopeKey(sortState.activeScope);
		if (rawCursor !== 'drill' && isScopeAllowed(tab, rawCursor)) {
			state.cursor = rawCursor as ScopeTarget;
		}
	}
	if (groupPreset && groupPreset.kind !== 'none') {
		// A legacy preset was scene-wide. Migrating it into the editing cursor
		// would silently narrow it to whichever parent/level happened to be
		// selected when the scene was saved. Preserve the old projection under
		// `all`; later edits may add narrower cumulative overrides.
		state.sets.all = {
			...(state.sets.all ?? {}),
			groupPreset: cloneScopeSet({ groupPreset }).groupPreset,
		};
	}
	return state;
}

/** Compatibility spelling for callers that describe this as migration. */
export const migrateScopeState = scopeStateFromLegacy;

// --- Spec 08 §3.1.bis: scopes are levels -------------------------------------

export function levelScope(level: number | string): SortScopeKey {
	return `level:${level}` as SortScopeKey;
}

export function parentScope(id: string): SortScopeKey {
	return `parent:${id}`;
}

export function isLevelScope(
	scope: string,
): scope is `level:${number}` | `level:${number}+${number}` {
	return /^level:\d+(\+\d+)?$/.test(scope);
}

export function isParentScope(scope: string): scope is `parent:${string}` {
	return scope.startsWith('parent:') && scope.length > 'parent:'.length;
}

export function levelOfScope(scope: string): number | string | null {
	if (!isLevelScope(scope)) return null;
	const val = scope.slice('level:'.length);
	return /^\d+$/.test(val) ? Number(val) : val;
}

export function parseScopeLevel(
	level: number | string | null | undefined,
): { base: number; offset: number } {
	if (level === null || level === undefined) return { base: 0, offset: 0 };
	if (typeof level === 'number') return { base: level, offset: 0 };
	const match = /^(\d+)(?:\+(\d+))?$/.exec(level);
	if (!match) return { base: 0, offset: 0 };
	const base = Number(match[1]);
	const offset = match[2] ? Number(match[2]) : 0;
	return { base, offset };
}

export function compareScopeLevels(
	a: number | string | null | undefined,
	b: number | string | null | undefined,
): number {
	const pa = parseScopeLevel(a);
	const pb = parseScopeLevel(b);
	if (pa.base !== pb.base) return pa.base - pb.base;
	return pa.offset - pb.offset;
}

export function parentOfScope(scope: string): string | null {
	return isParentScope(scope) ? scope.slice('parent:'.length) : null;
}

/**
 * The NAMED scopes each tab offers; `level:*` and `parent:*` are accepted on
 * top wherever the tab has levels to pick from (`supportsLevelScopes`).
 * U121-079: `all` is on every tab so "sort the whole tree" is always sayable.
 */
const SCOPES_BY_TAB: Record<ExplorerTabId, readonly SortScopeKey[]> = {
	props: ['all', 'drill'],
	files: ['all', 'drill'],
	tags: ['all', 'drill'],
	snippets: ['all'],
	plugins: ['all', 'drill'],
};

/** U130-03: the named scopes of a tab. Menus derive from this, never from a copy. */
export function scopesForTab(tab: ExplorerTabId): readonly SortScopeKey[] {
	return SCOPES_BY_TAB[tab];
}

/** Flat add-on lists have one level: nothing to pick a parent or level from. */
export function supportsLevelScopes(tab: ExplorerTabId): boolean {
	return SCOPES_BY_TAB[tab].includes('drill');
}

export function isScopeAllowed(tab: ExplorerTabId, scope: string): scope is SortScopeKey {
	if ((SCOPES_BY_TAB[tab] as readonly string[]).includes(scope)) return true;
	// Level 0 is group headers, and level 1 is item root level (valid on every tab, U130-GGC-027).
	if (scope === 'level:0' || scope === 'level:1') return true;
	return supportsLevelScopes(tab) && (isLevelScope(scope) || isParentScope(scope));
}

/**
 * Migration of the named scopes spec 08 §3.1.bis retires. `groups` was never
 * the grouping switch (plan D4): it maps to level 0 and turns no preset on.
 */
const LEGACY_SCOPES: Record<string, SortScopeKey> = {
	properties: 'level:1',
	values: 'level:2',
	groups: 'level:0',
};

export function migrateLegacyScopeKey(scope: string): string {
	return LEGACY_SCOPES[scope] ?? scope;
}

const DEFAULT_SCOPE_BY_TAB: Record<ExplorerTabId, SortScopeKey> = {
	props: 'level:1',
	files: 'level:1',
	tags: 'level:1',
	snippets: 'all',
	plugins: 'all',
};

/**
 * U130-GGC-025: the scope a brand-new scene opens with. Hierarchical tabs
 * open on `level:1`; flat add-on tabs stay on `all`. A persisted Settings
 * override (`scopeDefaultCursor`) only selects the initial cursor between
 * these two visitable targets — it never rewrites existing sets. Passing an
 * override that the tab cannot project falls back to the tab default.
 */
export type ScopeDefaultCursor = 'level:1' | 'all';

export function normalizeScopeDefaultCursor(value: unknown): ScopeDefaultCursor {
	return value === 'all' ? 'all' : 'level:1';
}

export function defaultScopeForTab(
	tab: ExplorerTabId,
	preferred?: string,
): ScopeTarget {
	if (preferred === 'all' || preferred === 'level:1') {
		if (isScopeAllowed(tab, preferred)) return preferred;
	}
	return DEFAULT_SCOPE_BY_TAB[tab] as ScopeTarget;
}

function isHierarchicalTab(tab: ExplorerTabId): boolean {
	return supportsLevelScopes(tab);
}

/** The surfaces that project properties or tags, and so can be narrowed. */
function isNodeProviderTab(tab: ExplorerTabId): boolean {
	return tab === 'props' || tab === 'tags';
}

interface NormalizeSortOptions {
	isValidDrillNode?: (id: string) => boolean;
}

interface SortableTreeNode<TNode> {
	id: string;
	children?: TNode[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDirection(value: unknown): value is ExplorerSortDirection {
	return value === 'asc' || value === 'desc';
}

function normalizeScopeSort(value: unknown): ScopeSort | null {
	if (!isRecord(value)) return null;
	if (typeof value.sortBy !== 'string' || !value.sortBy) return null;
	if (!isDirection(value.direction)) return null;
	// `custom` was the original persisted name of the note-order preset.
	// Normalize old layouts while exposing the new user-facing name.
	return {
		sortBy: value.sortBy === 'custom' ? 'note' : value.sortBy,
		direction: value.direction,
	};
}

function defaultState(tab: ExplorerTabId): ExplorerSortState {
	return {
		sorts: {},
		activeScope: DEFAULT_SCOPE_BY_TAB[tab],
		...(isHierarchicalTab(tab) ? { drillNodeId: null } : {}),
		nodeTypeFilter: null,
		// Explicit rather than absent, and only where they mean something:
		// `sameExplorerSortState` compares these, and an undefined here against a
		// false there reads as a change that is not one. Files carries the narrowing
		// switch and starts scoped to the filtered set, but has no reveal
		// projection. Add-on explorers project no note and no property set, so
		// they carry neither field.
		...(isNodeProviderTab(tab) || tab === 'files'
			? { filtered: tab === 'files' }
			: {}),
		...(isNodeProviderTab(tab)
			? {
					revealAnchor: 'current-file' as const,
					revealAnchorPath: null,
				}
			: {}),
		...(tab === 'files' ? { parentsFirst: true, fixedFolders: true } : {}),
	};
}

function normalizeNodeFilters(
	value: Record<string, unknown>,
): Pick<ExplorerSortState, 'nodeTypeFilter' | 'nodeTypeFilters'> {
	const nodeTypeFilter =
		typeof value.nodeTypeFilter === 'string' ? value.nodeTypeFilter : null;
	const nodeTypeFilters = Array.isArray(value.nodeTypeFilters)
		? value.nodeTypeFilters.filter(
				(entry): entry is string => typeof entry === 'string',
			)
		: undefined;

	return {
		nodeTypeFilter,
		...(nodeTypeFilters ? { nodeTypeFilters } : {}),
	};
}

function normalizeNarrowingState(
	tab: ExplorerTabId,
	value: Record<string, unknown>,
): Pick<ExplorerSortState, 'filtered' | 'revealAnchor' | 'revealAnchorPath'> {
	if (tab === 'props' || tab === 'tags') {
		// A pinned anchor without a path is not an anchor, so it falls back to
		// following the workspace rather than projecting nothing.
		const path =
			typeof value.revealAnchorPath === 'string' && value.revealAnchorPath
				? value.revealAnchorPath
				: null;
		const pinned = value.revealAnchor === 'pinned' && path !== null;
		return {
			filtered: value.filtered === true,
			revealAnchor: pinned ? 'pinned' : 'current-file',
			revealAnchorPath: pinned ? path : null,
		};
	}
	// Files narrows its source set the same way but has no reveal projection.
	if (tab === 'files') {
		return { filtered: value.filtered === true };
	}
	return {};
}

export function normalizeExplorerSortState(
	tab: ExplorerTabId,
	value: unknown,
	options: NormalizeSortOptions = {},
): ExplorerSortState {
	const fallback = defaultState(tab);
	if (!isRecord(value)) return fallback;

	const nodeFilters = normalizeNodeFilters(value);
	const legacySort = normalizeScopeSort(value);
	if (legacySort) {
		const normalized: ExplorerSortState = {
			...fallback,
			// U130-GGC-025: a legacy flat sort described the whole tree, so it
			// stays on `all` even though new scenes now open on `level:1`.
			// The fallback above already carries the new default cursor.
			activeScope: 'all',
			sorts: { all: legacySort },
			...nodeFilters,
			...normalizeNarrowingState(tab, value),
			...(tab === 'files' && typeof value.parentsFirst === 'boolean'
				? { parentsFirst: value.parentsFirst }
				: {}),
			...(tab === 'files' && typeof value.fixedFolders === 'boolean'
				? { fixedFolders: value.fixedFolders }
				: tab === 'files'
					? { fixedFolders: true }
					: {}),
		};
		if (value.scopeState !== undefined) {
			normalized.scopeState = normalizeScopeState(tab, value.scopeState, normalized);
		}
		return normalized;
	}

	if (!isRecord(value.sorts)) return fallback;
	if (typeof value.activeScope !== 'string') return fallback;
	const rawSorts = value.sorts;

	// U121-079 (pre-migration shape): before `all` existed, propScene's only
	// reachable scope was `properties`, so that entry WAS the tree-wide sort.
	// Move it to `all` for anyone who never opened the scope drawer. The
	// proof is the RAW input: `values: type` is stripped below, so reading
	// the sanitized copy would call a deliberate two-scope setup an accident.
	const legacyPropsOnly =
		tab === 'props' &&
		rawSorts.properties !== undefined &&
		rawSorts.values === undefined &&
		rawSorts['level:1'] === undefined;

	const rawDrillNodeId =
		typeof value.drillNodeId === 'string' && value.drillNodeId
			? value.drillNodeId
			: null;
	const sorts: Partial<Record<SortScopeKey, ScopeSort>> = {};
	for (const rawScope of Object.keys(rawSorts)) {
		// `sorts.drill` was the picked parent's sort: it now lives with that
		// parent (`parent:<id>`); with no parent picked it had nothing to order.
		if (rawScope === 'drill') {
			if (!rawDrillNodeId) continue;
			const sort = normalizeScopeSort(rawSorts.drill);
			const key = parentScope(rawDrillNodeId);
			if (sort && isScopeAllowed(tab, key) && !sorts[key]) sorts[key] = sort;
			continue;
		}
		const scope =
			legacyPropsOnly && rawScope === 'properties'
				? 'all'
				: migrateLegacyScopeKey(rawScope);
		if (!isScopeAllowed(tab, scope)) continue;
		const sort = normalizeScopeSort(rawSorts[rawScope]);
		if (!sort) continue;
		// Values have no type of their own: `type` there sorted nothing.
		if (tab === 'props' && scope === 'level:2' && sort.sortBy === 'type') continue;
		// A level:1 entry beats the migrated `properties` when both exist.
		if (sorts[scope] && rawScope in LEGACY_SCOPES) continue;
		sorts[scope] = sort;
	}

	const migratedScope =
		legacyPropsOnly && value.activeScope === 'properties'
			? 'all'
			: migrateLegacyScopeKey(value.activeScope);
	if (!isScopeAllowed(tab, migratedScope)) return fallback;
	let activeScope: SortScopeKey = migratedScope;
	const hiddenScopes = Array.isArray(value.hiddenScopes)
		? value.hiddenScopes
				.map((entry) => (typeof entry === 'string' ? migrateLegacyScopeKey(entry) : ''))
				.filter((entry): entry is SortScopeKey => isScopeAllowed(tab, entry))
		: [];
	let drillNodeId = rawDrillNodeId;
	if (
		activeScope === 'drill' &&
		(!drillNodeId ||
			(options.isValidDrillNode && !options.isValidDrillNode(drillNodeId)))
	) {
		activeScope = 'all';
		drillNodeId = null;
	}
	// A parent scope whose node is gone has nothing to act on.
	const activeParent = parentOfScope(activeScope);
	if (
		activeParent &&
		options.isValidDrillNode &&
		!options.isValidDrillNode(activeParent)
	) {
		activeScope = 'all';
	}

	const normalized: ExplorerSortState = {
		sorts,
		activeScope,
		...(hiddenScopes.length > 0 ? { hiddenScopes } : {}),
		...(isHierarchicalTab(tab) ? { drillNodeId } : {}),
		...nodeFilters,
		...normalizeNarrowingState(tab, value),
		...(tab === 'files'
			? {
					parentsFirst:
						typeof value.parentsFirst === 'boolean' ? value.parentsFirst : true,
					fixedFolders:
						typeof value.fixedFolders === 'boolean' ? value.fixedFolders : true,
				}
			: {}),
		...(tab === 'props'
			? {
					addPropertyFirst: value.addPropertyFirst === true,
				}
			: {}),
	};
	if (value.scopeState !== undefined) {
		normalized.scopeState = normalizeScopeState(tab, value.scopeState, normalized);
	}
	return normalized;
}

/**
 * Where a scope's sort is stored. `drill` is the parent currently picked, so
 * its sort lives with that parent (`parent:<drillNodeId>`): the list of
 * parents with their own sort (§3.1.5) is just the `parent:*` keys.
 */
export function storageScope(
	state: ExplorerSortState,
	scope: SortScopeKey,
): SortScopeKey {
	if (scope === 'drill') {
		return state.drillNodeId ? parentScope(state.drillNodeId) : 'all';
	}
	return scope;
}

function isHiddenScope(state: ExplorerSortState, scope: SortScopeKey): boolean {
	return state.hiddenScopes?.includes(scope) === true;
}

/**
 * U121-079: a scope the user never set follows the tab's `all`, instead of
 * silently reverting to name/asc. Level 0 (the old `groups`) does NOT inherit:
 * turning grouping on must not reorder the headers with the nodes' criterion.
 */
export function activeScopeSort(
	tab: ExplorerTabId,
	state: ExplorerSortState,
	scope: SortScopeKey = state.activeScope,
): ScopeSort {
	const allowed = isScopeAllowed(tab, scope) ? scope : DEFAULT_SCOPE_BY_TAB[tab];
	const key = storageScope(state, allowed);
	const own = state.sorts[key];
	if (own && !isHiddenScope(state, key)) return own;
	if (key === 'level:0') return DEFAULT_SORT;
	if (key !== 'all') return state.sorts.all ?? DEFAULT_SORT;
	return DEFAULT_SORT;
}

/**
 * The sort that orders the siblings under `parentId` at `level` (1 = root):
 * the parent's own sort wins, then the level's, then `all`. This is the
 * single resolver every scene sorts with; `drill` is just the parent whose
 * `parent:*` entry the pick wrote.
 */
export function siblingScopeSort(
	tab: ExplorerTabId,
	state: ExplorerSortState,
	parentId: string | null,
	level: number,
): ScopeSort {
	if (parentId !== null) {
		const byParent = parentScope(parentId);
		const own = state.sorts[byParent];
		if (own && !isHiddenScope(state, byParent)) return own;
	}
	const byLevel = levelScope(level);
	const levelSort = state.sorts[byLevel];
	if (levelSort && !isHiddenScope(state, byLevel)) return levelSort;
	return activeScopeSort(tab, state, 'all');
}

export function replaceActiveScopeSort(
	tab: ExplorerTabId,
	state: ExplorerSortState,
	sort: ScopeSort,
): ExplorerSortState {
	const scope = isScopeAllowed(tab, state.activeScope)
		? state.activeScope
		: DEFAULT_SCOPE_BY_TAB[tab];
	const key = storageScope(state, scope);
	const scopeTarget = key === 'drill' ? 'all' : key;
	const scopeState = state.scopeState
		? cloneScopeState(state.scopeState)
		: scopeStateFromLegacy(tab, state);
	scopeState.cursor = scopeTarget;
	scopeState.sets[scopeTarget] = {
		...(scopeState.sets[scopeTarget] ?? {}),
		sort: { ...sort },
		hidden: false,
	};
	return {
		...state,
		sorts: { ...state.sorts, [key]: { ...sort } },
		scopeState,
		// Writing a sort to a hidden scope is the user un-hiding it.
		...(state.hiddenScopes?.includes(key)
			? { hiddenScopes: state.hiddenScopes.filter((entry) => entry !== key) }
			: {}),
	};
}

/**
 * U130-GGC-029 (smoke 2026-09-24 §4.3): Delete on a scope row purges the
 * cumulative `ScopeSet`, not just the flat sort. Deleting only `sorts[target]`
 * left groups, cells and engine options applied because projection reads
 * `scopeState.sets`. Deleting `all` empties it (Spec 08d §4): with no override
 * the scene defaults govern, and the fixed `All levels` row stays visitable.
 * When the editing cursor pointed at the removed target it returns to `all`.
 */
export function deleteScopeTarget(
	tab: ExplorerTabId,
	state: ExplorerSortState,
	target: string,
): ExplorerSortState {
	if (!isScopeAllowed(tab, target)) return state;
	const scopeKey = target;
	const { [scopeKey]: _removed, ...sorts } = state.sorts;
	const scopeState = state.scopeState
		? cloneScopeState(state.scopeState)
		: undefined;
	if (scopeState) {
		delete scopeState.sets[scopeKey as ScopeTarget];
	}
	const next: ExplorerSortState = {
		...state,
		sorts,
		hiddenScopes: (state.hiddenScopes ?? []).filter(
			(entry) => entry !== scopeKey,
		),
		...(scopeState ? { scopeState } : {}),
	};
	if (storageScope(state, state.activeScope) === scopeKey) {
		next.activeScope = 'all';
		next.drillNodeId = null;
		if (scopeState) scopeState.cursor = 'all';
	}
	return next;
}

/**
 * U130-GGC-029 (smoke 2026-09-24 §4.3): Hide keeps the `ScopeSet` but stops
 * resolving it, on both layers. `resolveScopeSet` already skips hidden sets and
 * falls through to `all`/defaults; un-hiding clears both flags, deleting the
 * set entry when nothing but the flag remains.
 */
export function setScopeTargetHidden(
	tab: ExplorerTabId,
	state: ExplorerSortState,
	target: string,
	hidden: boolean,
): ExplorerSortState {
	if (!isScopeAllowed(tab, target)) return state;
	const scopeKey = target;
	const hiddenScopes = (state.hiddenScopes ?? []).filter(
		(entry) => entry !== scopeKey,
	);
	if (hidden) hiddenScopes.push(scopeKey);
	const scopeState = state.scopeState
		? cloneScopeState(state.scopeState)
		: undefined;
	if (scopeState) {
		if (hidden) {
			scopeState.sets[scopeKey as ScopeTarget] = {
				...(scopeState.sets[scopeKey as ScopeTarget] ?? {}),
				hidden: true,
			};
		} else {
			const { hidden: _wasHidden, ...rest } =
				(scopeState.sets[scopeKey as ScopeTarget] ?? {}) as ScopeSet & {
					hidden?: boolean;
				};
			if (Object.keys(rest).length > 0) {
				scopeState.sets[scopeKey as ScopeTarget] = rest;
			} else {
				delete scopeState.sets[scopeKey as ScopeTarget];
			}
		}
	}
	const next: ExplorerSortState = {
		...state,
		hiddenScopes,
		...(scopeState ? { scopeState } : {}),
	};
	if (hidden && storageScope(state, state.activeScope) === scopeKey) {
		next.activeScope = 'all';
		next.drillNodeId = null;
		if (scopeState) scopeState.cursor = 'all';
	}
	return next;
}

export function sameSortProjection(
	a: ExplorerSortState,
	b: ExplorerSortState,
): boolean {
	return (
		JSON.stringify(a.sorts) === JSON.stringify(b.sorts) &&
		JSON.stringify(a.scopeState ?? null) === JSON.stringify(b.scopeState ?? null) &&
		a.parentsFirst === b.parentsFirst &&
		a.fixedFolders === b.fixedFolders
	);
}

export function sameExplorerSortState(
	a: ExplorerSortState,
	b: ExplorerSortState,
): boolean {
	return (
		sameSortProjection(a, b) &&
		a.activeScope === b.activeScope &&
		a.drillNodeId === b.drillNodeId &&
		JSON.stringify(a.hiddenScopes ?? []) === JSON.stringify(b.hiddenScopes ?? []) &&
		a.nodeTypeFilter === b.nodeTypeFilter &&
		a.filtered === b.filtered &&
		a.revealAnchor === b.revealAnchor &&
		a.revealAnchorPath === b.revealAnchorPath &&
		JSON.stringify(a.nodeTypeFilters ?? []) ===
			JSON.stringify(b.nodeTypeFilters ?? [])
	);
}

export function sortTwoLevel<T extends { children?: T[] }>(
	nodes: readonly T[],
	compareProperties: (a: T, b: T) => number,
	compareValues: (a: T, b: T, parent: T) => number,
): T[] {
	return [...nodes].sort(compareProperties).map((node) =>
		node.children?.length
			? {
					...node,
					children: [...node.children].sort((a, b) =>
						compareValues(a, b, node),
					),
				}
			: node,
	);
}

/**
 * Spec 08 §3.1: sort every level with the resolver of `siblingScopeSort`.
 * `compareWith(sort)` builds the comparator for one ScopeSort; it is called
 * once per distinct sort, so scenes can cache their indexes per sort.
 */
export function sortWithScopes<T extends SortableTreeNode<T>>(
	nodes: readonly T[],
	resolveSort: (parentId: string | null, level: number) => ScopeSort,
	compareWith: (sort: ScopeSort) => (a: T, b: T) => number,
): T[] {
	const comparators = new Map<string, (a: T, b: T) => number>();
	const comparatorFor = (sort: ScopeSort) => {
		const key = `${sort.sortBy}|${sort.direction}`;
		let compare = comparators.get(key);
		if (!compare) {
			compare = compareWith(sort);
			comparators.set(key, compare);
		}
		return compare;
	};
	const sortLevel = (
		siblings: readonly T[],
		parentId: string | null,
		level: number,
	): T[] =>
		[...siblings]
			.sort(comparatorFor(resolveSort(parentId, level)))
			.map((node) =>
				node.children?.length
					? { ...node, children: sortLevel(node.children, node.id, level + 1) }
					: node,
			);
	return sortLevel(nodes, null, 1);
}

export function sortAllWithDrill<T extends SortableTreeNode<T>>(
	nodes: readonly T[],
	compareAll: (a: T, b: T) => number,
	compareDrill: (a: T, b: T) => number,
	drillNodeId: string | null | undefined,
): T[] {
	const sortLevel = (siblings: readonly T[], parentId: string | null): T[] => {
		const compare =
			drillNodeId && parentId === drillNodeId ? compareDrill : compareAll;
		return [...siblings]
			.sort(compare)
			.map((node) =>
				node.children?.length
					? { ...node, children: sortLevel(node.children, node.id) }
					: node,
			);
	};

	return sortLevel(nodes, null);
}

/** D33: options that make no sense in the current context disappear.
 * - 'path' is meaningless while the tree is nested.
 * - 'parent' is its props/tags counterpart: with the hierarchy drawn as rows
 *   there is nothing for it to group that Nested is not already showing.
 * - 'sub' (sub-element count) is meaningless for prop VALUES (no children).
 */
export function isSortOptionVisible(
	optionId: string,
	context: {
		tab: ExplorerTabId;
		nestedActive: boolean;
		activeScope: SortScopeKey;
		revealActive?: boolean;
	},
): boolean {
	// 'note' is the anchored note's own order — the order its frontmatter
	// declares. With no note anchored there is no order to read, so the option
	// does not exist rather than silently falling back to another sort.
	// (#90/#101) the anchor is a reveal toggle, never a sort option, so it has
	// no visibility gate here.
	if (optionId === 'note' && !context.revealActive) return false;
	if ((optionId === 'path' || optionId === 'parent') && context.nestedActive) {
		return false;
	}
	if (
		optionId === 'count' &&
		context.tab === 'props' &&
		context.revealActive
	) {
		return false;
	}
	if (
		(optionId === 'sub' || optionId === 'type') &&
		context.tab === 'props' &&
		context.activeScope === 'level:2'
	) {
		return false;
	}
	return true;
}
