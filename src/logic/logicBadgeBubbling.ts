import type { NodeBadge, NodeBubbleDot, TreeNode } from '../types/typeTree';

export type BubbleColor = NonNullable<NodeBadge['color']>;

/**
 * BT5-017: when several hidden descendants are active, the projected dot takes
 * the most urgent color. The order is fixed so the winner never depends on
 * traversal order or on which descendant happens to render first.
 */
export const BUBBLE_COLOR_PRIORITY: readonly BubbleColor[] = [
	'error',
	'red',
	'warning',
	'orange',
	'accent',
	'purple',
	'blue',
	'info',
	'green',
	'success',
	'faint',
];

/** Badges without a color still signal activity; they bubble as accent. */
const FALLBACK_COLOR: BubbleColor = 'accent';

const PRIORITY_BY_COLOR = new Map<BubbleColor, number>(
	BUBBLE_COLOR_PRIORITY.map((color, index) => [color, index]),
);

/** How many hidden descendants contributed feeds the accessible description. */
export type BubbleDot = NodeBubbleDot;

export interface BubbleIndex<TMeta = unknown> {
	/** All projected nodes, indexed during the same O(n) build pass. */
	nodesById: ReadonlyMap<string, TreeNode<TMeta>>;
	/** node id -> aggregated activity of its DESCENDANTS (never its own badges). */
	descendantActivity: ReadonlyMap<string, BubbleDot>;
	/**
	 * Live references to the nodes that carry descendant activity. Re-projecting
	 * an expansion change touches only these, never the whole tree.
	 */
	carriers: ReadonlyMap<string, TreeNode<TMeta>>;
}

export interface BuildBubbleIndexOptions<TMeta = unknown> {
	/** Test/diagnostic hook: called once per visited node. */
	onVisit?: (node: TreeNode<TMeta>) => void;
}

function priorityOf(color: BubbleColor): number {
	return PRIORITY_BY_COLOR.get(color) ?? BUBBLE_COLOR_PRIORITY.length;
}

function mergeDots(
	left: BubbleDot | null,
	right: BubbleDot | null,
): BubbleDot | null {
	if (!left) return right;
	if (!right) return left;
	const color =
		priorityOf(right.color) < priorityOf(left.color) ? right.color : left.color;
	return { color, sourceCount: left.sourceCount + right.sourceCount };
}

/** Own activity of a node: real badges only, never a previously bubbled one. */
function ownActivity(node: TreeNode): BubbleDot | null {
	let dot: BubbleDot | null = null;
	for (const badge of node.badges ?? []) {
		if (badge.isInherited) continue;
		dot = mergeDots(dot, {
			color: badge.color ?? FALLBACK_COLOR,
			sourceCount: 1,
		});
	}
	// The accessible count describes active descendants, not how many badges
	// happen to be attached to the same descendant.
	return dot ? { ...dot, sourceCount: 1 } : null;
}

/**
 * One O(n) pass over the projected tree. The result is independent of the
 * expansion state, so toggling a folder re-projects from this index instead of
 * walking the tree again (BT5-017: no full-tree scan per frame).
 */
export function buildBubbleIndex<TMeta = unknown>(
	nodes: readonly TreeNode<TMeta>[],
	options: BuildBubbleIndexOptions<TMeta> = {},
): BubbleIndex<TMeta> {
	const nodesById = new Map<string, TreeNode<TMeta>>();
	const descendantActivity = new Map<string, BubbleDot>();
	const carriers = new Map<string, TreeNode<TMeta>>();

	const visit = (node: TreeNode<TMeta>): BubbleDot | null => {
		options.onVisit?.(node);
		nodesById.set(node.id, node);
		let fromDescendants: BubbleDot | null = null;
		for (const child of node.children ?? []) {
			fromDescendants = mergeDots(fromDescendants, visit(child));
		}
		if (fromDescendants) {
			descendantActivity.set(node.id, fromDescendants);
			carriers.set(node.id, node);
		}
		return mergeDots(ownActivity(node), fromDescendants);
	};

	for (const node of nodes) visit(node);
	return { nodesById, descendantActivity, carriers };
}

/**
 * Write the projection onto the tree in O(activity), not O(nodes): only the
 * carriers can ever hold a dot, so clearing and setting both stay bounded by
 * how much activity exists rather than by tree size (BT5-017).
 */
export function applyBubbleDots<TMeta = unknown>(
	index: BubbleIndex<TMeta>,
	expandedIds: ReadonlySet<string>,
): void {
	for (const [id, node] of index.carriers) {
		const dot = index.descendantActivity.get(id);
		if (dot && !expandedIds.has(id)) node.bubbleDot = dot;
		else delete node.bubbleDot;
	}
}

/**
 * Project the index onto the current expansion state: a dot appears only while
 * the node is collapsed, because expanding it reveals the real source again.
 */
export function bubbleDotsForExpansion<TMeta = unknown>(
	index: BubbleIndex<TMeta>,
	expandedIds: ReadonlySet<string>,
): Map<string, BubbleDot> {
	const dots = new Map<string, BubbleDot>();
	for (const [id, dot] of index.descendantActivity) {
		if (expandedIds.has(id)) continue;
		dots.set(id, dot);
	}
	return dots;
}

export function resolveCollapsedBubbleDots<TMeta = unknown>(
	nodes: readonly TreeNode<TMeta>[],
	expandedIds: ReadonlySet<string>,
): Map<string, BubbleDot> {
	return bubbleDotsForExpansion(buildBubbleIndex(nodes), expandedIds);
}
