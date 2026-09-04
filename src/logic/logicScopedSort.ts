import type {
	ExplorerSortDirection,
	ExplorerSortState,
	ExplorerTabId,
	ScopeSort,
	SortScopeKey,
} from '../types/typeUI';

const DEFAULT_SORT: ScopeSort = { sortBy: 'name', direction: 'asc' };

const SCOPES_BY_TAB: Record<ExplorerTabId, readonly SortScopeKey[]> = {
	// U121-079: `all` faltaba aqui. Sin el, propScene no tenia forma de decir
	// "ordena el arbol entero": elegir un preset escribia en `properties` y los
	// values se quedaban con su defecto alfabetico, sin que nada en la interfaz
	// lo dijera. fileScene siempre lo tuvo.
	props: ['all', 'properties', 'values', 'groups'],
	files: ['all', 'drill', 'groups'],
	tags: ['all', 'drill', 'groups'],
	snippets: ['all', 'groups'],
	plugins: ['all', 'groups'],
};

/** U130-03: los scopes validos de una tab. El menu los necesita para no ofrecer
 *  `groups` donde no significa nada, que es la mitad del fallo de U121-079. */
export function scopesForTab(tab: ExplorerTabId): readonly SortScopeKey[] {
	return SCOPES_BY_TAB[tab];
}

const DEFAULT_SCOPE_BY_TAB: Record<ExplorerTabId, SortScopeKey> = {
	props: 'all',
	files: 'all',
	tags: 'all',
	snippets: 'all',
	plugins: 'all',
};

function isHierarchicalTab(tab: ExplorerTabId): boolean {
	return tab === 'files' || tab === 'tags';
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
	return { sortBy: value.sortBy, direction: value.direction };
}

function defaultState(tab: ExplorerTabId): ExplorerSortState {
	return {
		sorts: {},
		activeScope: DEFAULT_SCOPE_BY_TAB[tab],
		...(isHierarchicalTab(tab) ? { drillNodeId: null } : {}),
		nodeTypeFilter: null,
		// Explicit rather than absent, and only where they mean something:
		// `sameExplorerSortState` compares these, and an undefined here against a
		// false there reads as a change that is not one. Off is the resting state
		// — "global" is `filtered` being off. Files carries the narrowing switch
		// too (the tree shows the whole vault until it is on) but has no reveal
		// projection. Add-on explorers project no note and no property set, so
		// they carry neither field.
		...(isNodeProviderTab(tab) || tab === 'files' ? { filtered: false } : {}),
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
	const allowedScopes = SCOPES_BY_TAB[tab];
	if (
		typeof value.activeScope !== 'string' ||
		!allowedScopes.includes(value.activeScope as SortScopeKey)
	) {
		return fallback;
	}

	const sorts: Partial<Record<SortScopeKey, ScopeSort>> = {};
	for (const scope of allowedScopes) {
		const sort = normalizeScopeSort(value.sorts[scope]);
		if (
			sort &&
			!(tab === 'props' && scope === 'values' && sort.sortBy === 'type')
		) {
			sorts[scope] = sort;
		}
	}

	// U121-079: before `all` existed, propScene's only reachable scope was
	// `properties`, so that entry WAS the tree-wide sort. Move it to `all` for
	// anyone who never opened the scope drawer. The proof is the RAW input, not
	// the sanitized `sorts`: `values: type` is stripped above, so reading the
	// sanitized copy would call a deliberate two-scope setup an accident.
	const declaredValuesScope = value.sorts.values !== undefined;
	if (tab === 'props' && sorts.properties && !declaredValuesScope) {
		sorts.all = sorts.properties;
		delete sorts.properties;
	}

	let activeScope = value.activeScope as SortScopeKey;
	if (tab === 'props' && activeScope === 'properties' && !sorts.properties) {
		activeScope = 'all';
	}
	let drillNodeId =
		typeof value.drillNodeId === 'string' && value.drillNodeId
			? value.drillNodeId
			: null;
	if (
		activeScope === 'drill' &&
		(!drillNodeId ||
			(options.isValidDrillNode && !options.isValidDrillNode(drillNodeId)))
	) {
		activeScope = 'all';
		drillNodeId = null;
	}

	return {
		sorts,
		activeScope,
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
	};
}

/**
 * U121-079: a scope the user never set follows the tab's `all`, instead of
 * silently reverting to name/asc.
 *
 * `sorts` is partial and starts empty, so every scope the user has not opened
 * is absent. Without this the new `all` scope would be write-only: choosing
 * `custom` there would leave `properties` and `values` on their own defaults
 * and change nothing on screen.
 */
export function activeScopeSort(
	tab: ExplorerTabId,
	state: ExplorerSortState,
	scope: SortScopeKey = state.activeScope,
): ScopeSort {
	const allowedScope = SCOPES_BY_TAB[tab].includes(scope)
		? scope
		: DEFAULT_SCOPE_BY_TAB[tab];
	const own = state.sorts[allowedScope];
	if (own) return own;
	// U130-03: `groups` NO hereda el sort de otro scope. Heredar el de `all`
	// haria que activar la agrupacion reordenara los grupos con el criterio de
	// los nodos, en silencio -- el fallo de U121-079 otra vez. Sin sort propio,
	// los grupos van en el orden por defecto y el usuario decide si lo cambia.
	if (allowedScope === 'groups') return state.sorts.groups ?? DEFAULT_SORT;
	const fallbackScope = DEFAULT_SCOPE_BY_TAB[tab];
	if (fallbackScope !== allowedScope) {
		return state.sorts[fallbackScope] ?? DEFAULT_SORT;
	}
	return DEFAULT_SORT;
}

export function replaceActiveScopeSort(
	tab: ExplorerTabId,
	state: ExplorerSortState,
	sort: ScopeSort,
): ExplorerSortState {
	const scope = SCOPES_BY_TAB[tab].includes(state.activeScope)
		? state.activeScope
		: DEFAULT_SCOPE_BY_TAB[tab];
	return {
		...state,
		sorts: { ...state.sorts, [scope]: { ...sort } },
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
	// 'custom' is the anchored note's own order — the order its frontmatter
	// declares. With no note anchored there is no order to read, so the option
	// does not exist rather than silently falling back to another sort.
	if (optionId === 'custom' && !context.revealActive) return false;
	if ((optionId === 'path' || optionId === 'parent') && context.nestedActive) {
		return false;
	}
	if (
		(optionId === 'sub' || optionId === 'type') &&
		context.tab === 'props' &&
		context.activeScope === 'values'
	) {
		return false;
	}
	return true;
}
