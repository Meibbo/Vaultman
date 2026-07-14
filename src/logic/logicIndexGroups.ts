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
	count: number;
}

/** Minimal shape a tree node must satisfy to be projected into an index level. */
export interface IndexTreeNode {
	id: string;
	label: string;
	children?: IndexTreeNode[];
}

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
	const level = rootId === null ? source : ((find(source)?.children as T[]) ?? []);
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

export function buildIndexGroups(
	nodes: readonly IndexNodeRef[] | null | undefined,
): IndexGroup[] {
	const order: string[] = [];
	const groups = new Map<string, IndexGroup>();
	for (const node of nodes ?? []) {
		const key = indexKeyFor(node.label);
		if (key === null) continue;
		const existing = groups.get(key);
		if (existing) {
			existing.count += 1;
		} else {
			groups.set(key, { key, label: key, firstId: node.id, count: 1 });
			order.push(key);
		}
	}
	return order.map((key) => groups.get(key)!);
}
