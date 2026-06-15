/**
 * logicBadge — PURE badge-derivation logic (Q4 lane A, slice 4).
 *
 * The single state -> `NodeBadge[]` projection for the explorer. ZERO `obsidian`,
 * DOM, or Svelte imports (spec AC#1) — and, like the other `logic*` modules, it
 * does NOT import `typeViews`/`typeContracts` either (those reach `obsidian` via
 * `TFile`). Instead it declares its own app-free structural inputs; the services
 * (`serviceExplorerLayers`, `serviceOverlayProjection`) pass their richer
 * `ViewLayers`/`ViewBadge`/`QueueChange` values, which are structurally compatible.
 *
 * Three responsibilities:
 *  1. `deriveNodeBadges` — plain decoration state (pending / filter / inherited)
 *     in, `NodeBadge[]` out (kind/color/queueIndex/inherited).
 *  2. `nodeBadgesFromLayers` — projects an already-built view-layer badge model
 *     (ops/filters/warnings/inherited/counts) into `NodeBadge[]`, resolving the
 *     removable `queueIndex` against the pending operations.
 *  3. `bubbleNodeBadges` — inherited (bubbled) folder badges (SDF-016 / §06.17):
 *     a COLLAPSED parent surfaces a deduped, `isInherited`-flagged copy of its
 *     descendants' bubbleable badges; an expanded parent shows none.
 *
 * `colorFromTone` is exported as the one tone -> color map so services never
 * re-derive the badge palette.
 */
import type { NodeBadge, TreeNode } from '../types/typeTreeNode';

/** App-free tone vocabulary (structurally matches the view layer's `ViewTone`). */
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

/**
 * App-free description of one operation/filter badge as carried by a view layer
 * (structurally a subset of the view layer's `ViewBadge`).
 */
export interface BadgeLayerView {
	id: string;
	label?: string;
	icon?: string;
	tone?: BadgeTone;
	solid?: boolean;
	inherited?: boolean;
	/** Stable id of the queued operation this badge removes (when `actionId` is 'remove'). */
	sourceId?: string;
	actionId?: string;
}

/** The view layer's badge buckets, in render order (subset of `ViewBadgeLayers`). */
export interface BadgeLayersView {
	ops?: readonly BadgeLayerView[];
	filters?: readonly BadgeLayerView[];
	warnings?: readonly BadgeLayerView[];
	inherited?: readonly BadgeLayerView[];
	counts?: readonly BadgeLayerView[];
}

/** Minimal layer shape `nodeBadgesFromLayers` reads (subset of `ViewLayers`). */
export interface BadgeLayersInput {
	badges?: BadgeLayersView;
}

/**
 * App-free reference to a queued operation (structurally a subset of `QueueChange`).
 * Used only to resolve a removable badge's `queueIndex` by stable identity.
 */
export interface QueueOpRef {
	id?: string;
	change?: { id?: string };
}

/** One descriptor for a directly-applicable badge in `deriveNodeBadges`. */
export interface BadgeStateDescriptor {
	tone?: BadgeTone;
	label?: string;
	icon?: string;
	solid?: boolean;
	/** Queue operation index for click-to-remove. Omit for visual-only badges. */
	queueIndex?: number;
}

/** Plain decoration state for a single node (no `app`/DOM). */
export interface NodeBadgeState {
	/** Queued operations targeting this node (newest semantics owned by the caller). */
	pending?: readonly BadgeStateDescriptor[];
	/** Active filters matching this node (rendered as visual-only filter badges). */
	filterActive?: readonly BadgeStateDescriptor[];
	/**
	 * When set, the node is surfacing a DESCENDANT's badge (collapsed-folder
	 * bubbling): every produced badge is flagged `isInherited` and stripped of its
	 * `queueIndex` (the inherited copy is non-removable; the source row owns removal).
	 */
	inheritedFrom?: string;
}

/** The one tone -> NodeBadge color map. Services must not re-derive the palette. */
export function colorFromTone(tone: BadgeTone | undefined): NodeBadge['color'] {
	if (tone === 'danger') return 'red';
	if (tone === 'success') return 'green';
	if (tone === 'warning') return 'orange';
	if (tone === 'info') return 'blue';
	if (tone === 'accent') return 'purple';
	return 'faint';
}

/**
 * Derive a node's badges from its plain decoration state. Pending (queued) badges
 * come first (each may carry a `queueIndex` for click-to-remove), then visual-only
 * filter badges. When `inheritedFrom` is set every badge is flagged inherited and
 * its `queueIndex` dropped. Does not mutate input.
 */
export function deriveNodeBadges(state: NodeBadgeState): NodeBadge[] {
	const inherited = state.inheritedFrom != null;
	const badges: NodeBadge[] = [];

	for (const op of state.pending ?? []) {
		badges.push(badgeFromDescriptor(op, op.queueIndex, inherited));
	}
	for (const filter of state.filterActive ?? []) {
		// filter badges are visual-only: never removable, so no queueIndex.
		badges.push(badgeFromDescriptor(filter, undefined, inherited));
	}
	return badges;
}

function badgeFromDescriptor(
	descriptor: BadgeStateDescriptor,
	queueIndex: number | undefined,
	inherited: boolean,
): NodeBadge {
	return {
		text: descriptor.label,
		icon: descriptor.icon,
		color: colorFromTone(descriptor.tone),
		solid: descriptor.solid,
		isInherited: inherited || undefined,
		queueIndex: inherited ? undefined : queueIndex,
	};
}

/**
 * Project an already-built view-layer badge model into `NodeBadge[]`, in render
 * order (ops, filters, warnings, inherited, counts). A removable badge
 * (`actionId === 'remove'` with a `sourceId`) resolves its `queueIndex` against
 * `operations` by stable identity. Does not mutate input.
 *
 * (This is the canonical home of the old `utilViewLayers.nodeBadgesFromViewLayers`
 * projection; that util now delegates here.)
 */
export function nodeBadgesFromLayers(
	layers: BadgeLayersInput,
	operations: readonly QueueOpRef[] = [],
): NodeBadge[] {
	return allLayerBadges(layers).map((badge) => ({
		text: badge.label,
		icon: badge.icon,
		color: colorFromTone(badge.tone),
		solid: badge.solid,
		isInherited: badge.inherited,
		queueIndex: queueIndexForLayerBadge(badge, operations),
	}));
}

function allLayerBadges(layers: BadgeLayersInput): BadgeLayerView[] {
	const badges = layers.badges;
	return [
		...(badges?.ops ?? []),
		...(badges?.filters ?? []),
		...(badges?.warnings ?? []),
		...(badges?.inherited ?? []),
		...(badges?.counts ?? []),
	];
}

function queueIndexForLayerBadge(
	badge: BadgeLayerView,
	operations: readonly QueueOpRef[],
): number | undefined {
	if (badge.actionId !== 'remove' || !badge.sourceId) return undefined;
	const index = operations.findIndex(
		(operation) => operation.id === badge.sourceId || operation.change?.id === badge.sourceId,
	);
	return index >= 0 ? index : undefined;
}

// ---------------------------------------------------------------------------
// Inherited (bubbled) folder badges — SDF-016 / §06.17.
// ---------------------------------------------------------------------------

interface BubbleResult<TMeta> {
	node: TreeNode<TMeta>;
	ownAndDescendantBadges: NodeBadge[];
	changed: boolean;
}

/**
 * Surface hidden descendant badges onto COLLAPSED ancestors as inherited badges
 * (SDF-016 / §06.17). A folder/parent that is NOT in `expandedIds` and has
 * children gains a deduped, `isInherited`-flagged copy of its descendants'
 * bubbleable (non-quick-action) badges; an expanded parent shows none of its
 * children's badges. Node references are reused wherever nothing changed, so
 * downstream `keyed`/memoized renders stay stable. Does not mutate input.
 */
export function bubbleNodeBadges<TMeta>(
	nodes: readonly TreeNode<TMeta>[],
	expandedIds: ReadonlySet<string>,
): TreeNode<TMeta>[] {
	let changed = false;
	const results = nodes.map((node) => {
		const result = bubbleNode(node, expandedIds);
		if (result.changed) changed = true;
		return result.node;
	});
	return changed ? results : (nodes as TreeNode<TMeta>[]);
}

function bubbleNode<TMeta>(
	node: TreeNode<TMeta>,
	expandedIds: ReadonlySet<string>,
): BubbleResult<TMeta> {
	const sourceChildren = node.children ?? [];
	const childResults = sourceChildren.map((child) => bubbleNode(child, expandedIds));
	const childrenChanged = childResults.some((result) => result.changed);
	const children = childrenChanged ? childResults.map((result) => result.node) : sourceChildren;
	const currentBadges = node.badges ?? [];
	const directBadges = currentBadges.filter((badge) => !badge.isInherited);
	const bubbleableDirectBadges = directBadges.filter((badge) => !badge.quickAction);
	const descendantBadges = childResults.flatMap((result) => result.ownAndDescendantBadges);
	const inheritedBadges =
		children.length > 0 && !expandedIds.has(node.id)
			? uniqueBadges(descendantBadges).map((badge) => ({ ...badge, isInherited: true }))
			: [];
	const badges = [...directBadges, ...inheritedBadges];
	const badgesChanged = !sameBadges(currentBadges, badges);
	const changed = childrenChanged || badgesChanged;

	return {
		node: changed ? { ...node, badges, children } : node,
		ownAndDescendantBadges: [...bubbleableDirectBadges, ...descendantBadges],
		changed,
	};
}

function sameBadges(left: readonly NodeBadge[], right: readonly NodeBadge[]): boolean {
	if (left.length !== right.length) return false;
	return left.every((badge, index) => badgeKey(badge) === badgeKey(right[index]));
}

function uniqueBadges(badges: readonly NodeBadge[]): NodeBadge[] {
	const seen = new Set<string>();
	return badges.filter((badge) => {
		const key = badgeKey(badge);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function badgeKey(badge: NodeBadge): string {
	return [
		badge.queueIndex ?? 'no-queue',
		badge.text ?? '',
		badge.icon ?? '',
		badge.color ?? '',
		badge.solid ?? false,
		badge.quickAction ?? false,
	].join(':');
}
