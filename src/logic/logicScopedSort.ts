import type {
	ExplorerSortDirection,
	ExplorerSortState,
	ExplorerTabId,
	ScopeSort,
	SortScopeKey,
} from '../types/typeUI';

const DEFAULT_SORT: ScopeSort = { sortBy: 'name', direction: 'asc' };

// --- Spec 08 §3.1.bis: scopes are levels -------------------------------------

export function levelScope(level: number): SortScopeKey {
	return `level:${level}`;
}

export function parentScope(id: string): SortScopeKey {
	return `parent:${id}`;
}

export function isLevelScope(scope: string): scope is `level:${number}` {
	return /^level:\d+$/.test(scope);
}

export function isParentScope(scope: string): scope is `parent:${string}` {
	return scope.startsWith('parent:') && scope.length > 'parent:'.length;
}

export function levelOfScope(scope: string): number | null {
	return isLevelScope(scope) ? Number(scope.slice('level:'.length)) : null;
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
	plugins: ['all'],
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
	// Level 0 is the group headers, and groups exist on every tab (§3.2).
	if (scope === 'level:0') return true;
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
	props: 'all',
	files: 'all',
	tags: 'all',
	snippets: 'all',
	plugins: 'all',
};

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
		return {
			...fallback,
			sorts: { [DEFAULT_SCOPE_BY_TAB[tab]]: legacySort },
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

	return {
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
	return {
		...state,
		sorts: { ...state.sorts, [key]: { ...sort } },
		// Writing a sort to a hidden scope is the user un-hiding it.
		...(state.hiddenScopes?.includes(key)
			? { hiddenScopes: state.hiddenScopes.filter((entry) => entry !== key) }
			: {}),
	};
}

export function sameSortProjection(
	a: ExplorerSortState,
	b: ExplorerSortState,
): boolean {
	return (
		JSON.stringify(a.sorts) === JSON.stringify(b.sorts) &&
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
	if (optionId === 'note' && !context.revealActive) return false;
	if ((optionId === 'path' || optionId === 'parent') && context.nestedActive) {
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
