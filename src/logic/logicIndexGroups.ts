/**
 * Pure derivation of the floating TOC index groups.
 *
 * The rail is a faithful projection of the explorer's CURRENT visible order:
 * groups are keyed by the literal first glyph of each node's label (letters
 * upper-cased so 'a'/'A' merge; digits and symbols kept as-is, so "_x", "+x"
 * and "1x" index under '_', '+' and '1'), emitted in first-encounter order
 * with no re-sorting. Because the caller passes nodes already in explorer-sort
 * order, the rail scrolls monotonically with the list and reacts to sort
 * axis/direction changes for free. Unnamed nodes are skipped.
 */

export interface IndexNodeRef {
	id: string;
	label: string;
	/** container = folder (files) / node with children (props, tags). */
	isContainer: boolean;
}

export interface IndexGroup {
	key: string;
	label: string;
	firstId: string;
	/** Label of the group's first node — shown as the Niagara scrub name cell. */
	firstLabel: string;
	count: number;
}

/** Minimal shape a tree node must satisfy to be projected into an index level. */
export interface IndexTreeNode {
	id: string;
	label: string;
	children?: IndexTreeNode[];
}

export type FloatingTocExpansionChange =
	| { type: 'collapse-node'; id: string }
	| { type: 'collapse-all' };

function indexKeyFor(label: string): string | null {
	const [ch] = Array.from((label ?? '').trim());
	if (!ch) return null;
	const [upper] = Array.from(ch.toLocaleUpperCase());
	return upper ?? ch;
}

/**
 * Project one hierarchy level into index node refs. `rootId === null` yields the
 * top level; otherwise the direct children of the node with that id (empty when
 * absent). `isContainer` classifies each node (folder vs file / has children).
 */
export function indexLevel<T extends IndexTreeNode>(
	roots: readonly T[] | null | undefined,
	rootId: string | null,
	isContainer: (node: T) => boolean,
): IndexNodeRef[] {
	const source = roots ?? [];
	const find = (nodes: readonly T[]): T | null => {
		for (const node of nodes) {
			if (node.id === rootId) return node;
			const hit = node.children ? find(node.children as T[]) : null;
			if (hit) return hit;
		}
		return null;
	};
	const level =
		rootId === null ? source : ((find(source)?.children as T[]) ?? []);
	return level.map((node) => ({
		id: node.id,
		label: node.label,
		isContainer: isContainer(node),
	}));
}

/**
 * The scope root that owns `id`'s level: the id of `id`'s parent, or null when
 * `id` is top-level or absent. Feeds the drill so that picking ANY node indexes
 * the level it lives on (its siblings), not the picked node's own children.
 */
export function findParentId<T extends IndexTreeNode>(
	roots: readonly T[] | null | undefined,
	id: string,
	parent: string | null = null,
): string | null {
	for (const node of roots ?? []) {
		if (node.id === id) return parent;
		const hit = node.children
			? findParentId(node.children as T[], id, node.id)
			: null;
		if (hit !== null) return hit;
	}
	return null;
}

/**
 * Scope pick ownership differs from the floating index: clicking a container
 * selects that container's own sibling scope, while clicking a leaf selects
 * the scope of its immediate parent.
 */
export function findScopeParentId<T extends IndexTreeNode>(
	roots: readonly T[] | null | undefined,
	id: string,
	parent: string | null = null,
	isParent: (node: T) => boolean = (node) =>
		(node.children?.length ?? 0) > 0,
): string | null {
	const checkParent = (node: T): boolean =>
		Boolean(('isGroupHeader' in node && node.isGroupHeader)) || isParent(node);
	for (const node of roots ?? []) {
		if (node.id === id) {
			return checkParent(node) ? node.id : parent;
		}
		const hit = node.children
			? findScopeParentId(node.children as T[], id, node.id, isParent)
			: null;
		if (hit !== null) return hit;
	}
	return null;
}

/**
 * Whether the rendered source tree contains at least one selectable parent.
 * U130-GGC-028: node_group is always an eligible parent across all explorers.
 */
export function hasScopeParentNodes<T extends IndexTreeNode>(
	roots: readonly T[] | null | undefined,
	isParent: (node: T) => boolean = (node) =>
		(node.children?.length ?? 0) > 0,
): boolean {
	const checkParent = (node: T): boolean =>
		Boolean(('isGroupHeader' in node && node.isGroupHeader)) || isParent(node);
	for (const node of roots ?? []) {
		if (checkParent(node)) return true;
		if (node.children && hasScopeParentNodes(node.children as T[], isParent))
			return true;
	}
	return false;
}

/**
 * Spec 08 §3.1 item 3 ("Select a level"): the 1-based level of a node in the
 * rendered tree — root natural rows are Level 1 — or null when it is not there.
 * Group headers represent virtual groupings: Level 0 is the explorer root `/`.
 * Root group headers are Level 0+1 (subgroups 0+2); nested groups inside a
 * parent at Level N are Level N+1 (subgroups N+2), while natural children are
 * Level N+1.
 */
export function findNodeLevel<T extends IndexTreeNode>(
	roots: readonly T[] | null | undefined,
	id: string,
	parentPNodeLevel = 0,
	groupDepth = 0,
): number | string | null {
	for (const node of roots ?? []) {
		const isGroup = Boolean(('isGroupHeader' in node && node.isGroupHeader));
		const currentLevel: number | string = isGroup
			? `${parentPNodeLevel}+${groupDepth + 1}`
			: parentPNodeLevel + 1;
		if (node.id === id) {
			return currentLevel;
		}
		if (node.children?.length) {
			const hit = isGroup
				? findNodeLevel(
						node.children as T[],
						id,
						parentPNodeLevel,
						groupDepth + 1,
				  )
				: findNodeLevel(
						node.children as T[],
						id,
						typeof currentLevel === 'number' ? currentLevel : parentPNodeLevel + 1,
						0,
				  );
			if (hit !== null) return hit;
		}
	}
	return null;
}

/**
 * Reconcile a scoped floating index with an explicit explorer collapse.
 * Unrelated collapses preserve the scope; collapsing the scope or one of its
 * ancestors moves the index to the level immediately above that collapsed node.
 */
export function scopeAfterExpansionChange(
	currentRootId: string | null,
	change: FloatingTocExpansionChange,
	parentForNode: (id: string) => string | null,
): string | null {
	if (change.type === 'collapse-all') return null;
	if (currentRootId === null) return null;

	const visited = new Set<string>();
	let cursor: string | null = currentRootId;
	while (cursor !== null && !visited.has(cursor)) {
		if (cursor === change.id) return parentForNode(change.id);
		visited.add(cursor);
		cursor = parentForNode(cursor);
	}
	return currentRootId;
}

/** Un predicado devuelve la clave de grupo de un nodo, o `null` para saltarlo. */
export type IndexGroupPredicate = (node: IndexNodeRef) => string | null;

export function buildIndexGroups(
	nodes: readonly IndexNodeRef[] | null | undefined,
	// U130-03: el predicado deja de estar cableado. `indexKeyFor` sigue siendo
	// el defecto para que el indice flotante NO cambie de comportamiento.
	predicate: IndexGroupPredicate = (node) => indexKeyFor(node.label),
): IndexGroup[] {
	const order: string[] = [];
	const groups = new Map<string, IndexGroup>();
	for (const node of nodes ?? []) {
		const key = predicate(node);
		if (key === null) continue;
		const existing = groups.get(key);
		if (existing) {
			existing.count += 1;
		} else {
			groups.set(key, {
				key,
				label: key,
				firstId: node.id,
				firstLabel: node.label,
				count: 1,
			});
			order.push(key);
		}
	}
	return order.map((key) => groups.get(key)!);
}
