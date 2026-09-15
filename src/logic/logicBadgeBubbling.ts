import type { NodeBadge, NodeBubbleDot, TreeNode } from '../types/typeTree';
import { parseMembershipUrn } from './logicMembershipUrn';

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
	/**
	 * S07A: membership edges admitted as parent edges. A `node_group` is a
	 * parent by pertenencia, not by containment, so the containment walk
	 * alone never delivers anything to it. Groups named here receive the
	 * bubbled activity of their members even when no header TreeNode is in
	 * the input (the live explorers build the index pre-projection).
	 */
	membership?: BubbleMembership<TMeta>;
}

/**
 * S07A, spec 07 §1: pertenencia edges for the bubble index.
 *
 * - `groupsOf` resolves, per member row, the group header ids it belongs to.
 *   The caller owns the URN matching (see `projectGroupedTree`); the index
 *   stays tree-centric and never parses memberships itself.
 * - `parentOfGroup` climbs the `NodeGroupDef.parentId` nesting chain.
 * - `identityOf` is the dedup identity (dev 2026-09-06: IDENTITIES, not
 *   occurrences — `NodeIdentity.canonicalId`, i.e. the URN tripleta
 *   `providerId:kind:canonicalId`). Defaults to the row id, which keeps the
 *   index byte-identical to BT5-017 when no membership is passed.
 */
export interface BubbleMembership<TMeta = unknown> {
	groupsOf: (node: TreeNode<TMeta>) => readonly string[];
	parentOfGroup: (groupId: string) => string | null;
	identityOf?: (node: TreeNode<TMeta>) => string;
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
	const membership = options.membership;

	// S07A: identity tracking exists ONLY while membership edges are
	// admitted. Without them every row is visited once, so the summed
	// sourceCount can never double-count — allocating a per-subtree identity
	// set per node would be pure waste on a 10k vault.
	const subtreeIds = membership ? new Map<string, Set<string>>() : null;
	const groupSeeds = membership ? new Map<string, Set<string>>() : null;
	const identityColor = membership ? new Map<string, BubbleColor>() : null;
	const identityOf =
		membership?.identityOf ?? ((node: TreeNode<TMeta>) => node.id);

	const seedGroups = (node: TreeNode<TMeta>, ids: ReadonlySet<string>): void => {
		if (ids.size === 0 || !membership || !groupSeeds) return;
		for (const groupId of membership.groupsOf(node)) {
			let seed = groupSeeds.get(groupId);
			if (!seed) {
				seed = new Set<string>();
				groupSeeds.set(groupId, seed);
			}
			for (const id of ids) seed.add(id);
		}
	};

	const visit = (node: TreeNode<TMeta>): BubbleDot | null => {
		options.onVisit?.(node);
		nodesById.set(node.id, node);
		let fromDescendants: BubbleDot | null = null;
		if (subtreeIds) {
			const ids = new Set<string>();
			for (const child of node.children ?? []) {
				fromDescendants = mergeDots(fromDescendants, visit(child));
				const childIds = subtreeIds.get(child.id);
				if (childIds) for (const id of childIds) ids.add(id);
			}
			const own = ownActivity(node);
			if (own) {
				const key = identityOf(node);
				ids.add(key);
				const prev = identityColor?.get(key);
				if (prev === undefined || priorityOf(own.color) < priorityOf(prev)) {
					identityColor?.set(key, own.color);
				}
			}
			const total = mergeDots(own, fromDescendants);
			// Same contract as the classic path: descendant activity never
			// includes the node's own badges.
			if (fromDescendants) {
				descendantActivity.set(node.id, fromDescendants);
				carriers.set(node.id, node);
			}
			subtreeIds.set(node.id, ids);
			seedGroups(node, ids);
			return total;
		}
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
	if (membership && groupSeeds && subtreeIds && identityColor) {
		materializeGroupDots(membership, groupSeeds, subtreeIds, identityColor, descendantActivity);
	}
	return { nodesById, descendantActivity, carriers };
}

/**
 * S07A: pour the membership seeds into `descendantActivity`, climbing the
 * group nesting chain. Set union is the dedup: a node sitting in the parent
 * group AND in the child counts ONCE in the parent total (dev 2026-09-06).
 *
 * Groups with no active identity stay absent — same contract as quiet
 * folders (BT5-017: no decorative DOM). A group id with no header TreeNode
 * in the input has no live carrier to mutate; read it back through
 * `bubbleDotsForExpansion`, which is expansion-aware by id.
 */
function materializeGroupDots<TMeta>(
	membership: BubbleMembership<TMeta>,
	groupSeeds: Map<string, Set<string>>,
	subtreeIds: Map<string, Set<string>>,
	identityColor: Map<string, BubbleColor>,
	descendantActivity: Map<string, BubbleDot>,
): void {
	// A header present in the input already aggregates its direct members by
	// containment; the seed adds what containment cannot see (members outside
	// the subtree, nested groups). Union, never overwrite-then-lose.
	for (const [groupId, seed] of groupSeeds) {
		const contained = subtreeIds.get(groupId);
		if (contained) for (const id of contained) seed.add(id);
	}
	// Deepest group first, so a parent pours upward only after every child
	// has already poured into it. The `seen` chain guard makes a corrupt
	// parentId cycle a no-op instead of an infinite climb.
	const depthOf = (groupId: string): number => {
		let depth = 0;
		let cur: string | null = groupId;
		const seen = new Set<string>([groupId]);
		for (;;) {
			const parent: string | null = cur ? membership.parentOfGroup(cur) : null;
			if (!parent || seen.has(parent)) break;
			seen.add(parent);
			cur = parent;
			depth += 1;
		}
		return depth;
	};
	const ordered = [...groupSeeds.keys()].sort(
		(a, b) => depthOf(b) - depthOf(a),
	);
	for (const groupId of ordered) {
		const seed = groupSeeds.get(groupId);
		if (!seed || seed.size === 0) continue;
		let pour: Set<string> = seed;
		let cur: string | null = membership.parentOfGroup(groupId);
		const seen = new Set<string>([groupId]);
		while (cur && !seen.has(cur)) {
			seen.add(cur);
			let into = groupSeeds.get(cur);
			if (!into) {
				into = new Set<string>();
				groupSeeds.set(cur, into);
			}
			for (const id of pour) into.add(id);
			pour = into;
			cur = membership.parentOfGroup(cur);
		}
	}
	for (const [groupId, seed] of groupSeeds) {
		if (seed.size === 0) continue;
		let dot: BubbleDot | null = null;
		for (const id of seed) {
			const color = identityColor.get(id);
			if (!color) continue;
			dot = mergeDots(dot, { color, sourceCount: 1 });
		}
		if (dot) descendantActivity.set(groupId, dot);
	}
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

export interface GroupMemberCountInput {
	/** Groups to total. Nesting rides `parentId` (`NodeGroupDef` chain). */
	groups: readonly { id: string; parentId: string | null }[];
	/** Raw membership URNs per group id (`SceneConfig.groupMemberships`, U130-09). */
	memberships: Readonly<Record<string, readonly string[]>>;
	/**
	 * U130-09: the scene's provider. When given, a URN of another provider is
	 * not counted — the same guard `projectGroupedTree` applies when matching,
	 * so a header never shows a total its scene cannot contain.
	 */
	providerId?: string;
}

/**
 * S07A, spec 07 §1: the VALUE aggregation, not the dot. «El total de
 * ficheros de todos sus c-nodes» is a sum over the membership relation —
 * the `bubbleMaxToFolders` precedent (`logicLastOpened.ts:123`), but climbing
 * the group nesting chain instead of the folder ancestor chain, and summing
 * instead of maxing.
 *
 * Dedup identity is the URN tripleta `providerId:kind:canonicalId` — the
 * same rule `projectGroupedTree` matches by (spec-03), whose stable part is
 * `NodeIdentity.canonicalId`. A node sitting in the parent group AND in the
 * child counts ONCE in the parent total (dev 2026-09-06: identities, not
 * occurrences). Corrupt URNs are skipped, never fatal — same contract as
 * `parseMembershipUrn`. Groups with no live member stay absent, like folders
 * with no opened descendant in `bubbleMaxToFolders`.
 */
export function bubbleMemberCountsToGroups(
	input: GroupMemberCountInput,
): ReadonlyMap<string, number> {
	const direct = new Map<string, Set<string>>();
	for (const [groupId, urns] of Object.entries(input.memberships)) {
		let set = direct.get(groupId);
		if (!set) {
			set = new Set<string>();
			direct.set(groupId, set);
		}
		for (const urn of urns) {
			const ref = parseMembershipUrn(urn);
			if (!ref) continue;
			if (input.providerId !== undefined && ref.providerId !== input.providerId) {
				continue;
			}
			set.add(`${ref.providerId}:${ref.kind}:${ref.canonicalId}`);
		}
	}
	const allIds = new Map<string, string | null>();
	for (const group of input.groups) {
		if (!allIds.has(group.id)) allIds.set(group.id, group.parentId);
	}
	for (const groupId of direct.keys()) {
		if (!allIds.has(groupId)) allIds.set(groupId, null);
	}
	const childrenOf = new Map<string, string[]>();
	for (const [id, parentId] of allIds) {
		if (!parentId) continue;
		const list = childrenOf.get(parentId) ?? [];
		list.push(id);
		childrenOf.set(parentId, list);
	}
	const totals = new Map<string, Set<string>>();
	const visiting = new Set<string>();
	const totalOf = (groupId: string): Set<string> => {
		const cached = totals.get(groupId);
		if (cached) return cached;
		if (visiting.has(groupId)) {
			return new Set(direct.get(groupId) ?? []);
		}
		visiting.add(groupId);
		const acc = new Set(direct.get(groupId) ?? []);
		for (const child of childrenOf.get(groupId) ?? []) {
			for (const id of totalOf(child)) acc.add(id);
		}
		visiting.delete(groupId);
		totals.set(groupId, acc);
		return acc;
	};
	const out = new Map<string, number>();
	for (const groupId of allIds.keys()) {
		const size = totalOf(groupId).size;
		if (size > 0) out.set(groupId, size);
	}
	return out;
}

function badgeKey(badge: NodeBadge): string {
	return [
		badge.text ?? '',
		badge.icon ?? '',
		badge.color ?? '',
		badge.solid ? '1' : '0',
	].join('');
}

/**
 * BT5-042: the "detailed" collapsed mode. Instead of one dot, a collapsed
 * parent shows its descendants' own badges (deduped, marked inherited) so the
 * user can read exactly what is hidden. This is the opt-in alternative to the
 * single bubble dot; the dot mode stays the default.
 */
export function collectDescendantBadges<TMeta = unknown>(
	nodes: readonly TreeNode<TMeta>[],
	expandedIds: ReadonlySet<string>,
): Map<string, NodeBadge[]> {
	const result = new Map<string, NodeBadge[]>();

	const gather = (node: TreeNode<TMeta>): NodeBadge[] => {
		const own: NodeBadge[] = [];
		for (const child of node.children ?? []) {
			const childOwn = (child.badges ?? []).filter(
				(badge) => !badge.isInherited,
			);
			own.push(...childOwn, ...gather(child));
		}
		if (own.length > 0 && !expandedIds.has(node.id)) {
			const seen = new Set<string>();
			const deduped: NodeBadge[] = [];
			for (const badge of own) {
				const key = badgeKey(badge);
				if (seen.has(key)) continue;
				seen.add(key);
				deduped.push({ ...badge, isInherited: true, queueIndex: undefined });
			}
			result.set(node.id, deduped);
		}
		return own;
	};

	for (const node of nodes) gather(node);
	return result;
}
