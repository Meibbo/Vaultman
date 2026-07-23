import type { TreeNode } from '../types/typeTree';

/**
 * BT5-089: move one node inside an already-projected tree.
 *
 * Some ordering changes touch exactly one node: opening a file gives it the
 * newest "last opened" timestamp, which is by definition the maximum, so it
 * moves to one edge of its sibling group and nothing else changes relative
 * order. Rebuilding and re-sorting the whole tree to express that is
 * O(n log n) plus a full re-decoration pass, and it is what made switching
 * tabs stutter while the recency sort was active.
 *
 * Only the affected sibling array is rebuilt; every untouched subtree keeps
 * its existing object identity, so the virtualized view can re-project
 * without re-running icon, badge or statistics decoration.
 */

export interface NodeMoveResult<TMeta = unknown> {
	/** False when the node was absent or already in the requested position. */
	changed: boolean;
	nodes: TreeNode<TMeta>[];
}

export type SiblingEdge = 'start' | 'end';

export interface SiblingEdgeOptions<TMeta = unknown> {
	/**
	 * Groups siblings that may be reordered against each other. With
	 * `parentsFirst`, folders occupy the head of every sibling group and files
	 * the tail, so a file's "start" is the first file index, not index 0.
	 * Without this, moving a file to index 0 pushes it above the folders and
	 * the level only repairs itself on the next full render.
	 */
	partitionOf?: (node: TreeNode<TMeta>) => unknown;
}

/** The index range siblings sharing `partition` currently occupy. */
function partitionBounds<TMeta>(
	items: TreeNode<TMeta>[],
	partition: unknown,
	partitionOf: (node: TreeNode<TMeta>) => unknown,
): { first: number; last: number } {
	let first = -1;
	let last = -1;
	for (let i = 0; i < items.length; i += 1) {
		if (partitionOf(items[i]) !== partition) continue;
		if (first < 0) first = i;
		last = i;
	}
	return { first, last };
}

function moveWithin<TMeta>(
	items: TreeNode<TMeta>[],
	from: number,
	to: number,
): TreeNode<TMeta>[] {
	const next = items.slice();
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);
	return next;
}

/**
 * Move `id` to `toIndex` within its own sibling group, wherever it sits in
 * the tree. A node never changes parent, so a move can never reorder
 * unrelated branches.
 */
export function moveNodeWithinSiblings<TMeta = unknown>(
	nodes: TreeNode<TMeta>[],
	id: string,
	toIndex: number,
): NodeMoveResult<TMeta> {
	const index = nodes.findIndex((node) => node.id === id);
	if (index >= 0) {
		const target = Math.min(Math.max(toIndex, 0), nodes.length - 1);
		if (target === index) return { changed: false, nodes };
		return { changed: true, nodes: moveWithin(nodes, index, target) };
	}

	for (let i = 0; i < nodes.length; i += 1) {
		const node = nodes[i];
		const children = node.children;
		if (!children?.length) continue;
		const result = moveNodeWithinSiblings(children, id, toIndex);
		if (!result.changed) continue;
		// Rebuild only the ancestors on the path to the moved node; the
		// siblings on each level keep their identity.
		const nextNodes = nodes.slice();
		nextNodes[i] = { ...node, children: result.nodes };
		return { changed: true, nodes: nextNodes };
	}

	return { changed: false, nodes };
}

/**
 * Move `id` to the first or last position of its sibling group. This is the
 * shape a recency sort needs: the new timestamp is the maximum, so descending
 * puts the node first and ascending puts it last.
 */
export function moveNodeToSiblingEdge<TMeta = unknown>(
	nodes: TreeNode<TMeta>[],
	id: string,
	edge: SiblingEdge,
	options: SiblingEdgeOptions<TMeta> = {},
): NodeMoveResult<TMeta> {
	const { partitionOf } = options;
	if (!partitionOf) {
		return moveNodeWithinSiblings(
			nodes,
			id,
			edge === 'start' ? 0 : Number.MAX_SAFE_INTEGER,
		);
	}

	const index = nodes.findIndex((node) => node.id === id);
	if (index >= 0) {
		const bounds = partitionBounds(nodes, partitionOf(nodes[index]), partitionOf);
		const target = edge === 'start' ? bounds.first : bounds.last;
		if (target < 0 || target === index) return { changed: false, nodes };
		return { changed: true, nodes: moveWithin(nodes, index, target) };
	}

	for (let i = 0; i < nodes.length; i += 1) {
		const node = nodes[i];
		const children = node.children;
		if (!children?.length) continue;
		const result = moveNodeToSiblingEdge(children, id, edge, options);
		if (!result.changed) continue;
		const nextNodes = nodes.slice();
		nextNodes[i] = { ...node, children: result.nodes };
		return { changed: true, nodes: nextNodes };
	}

	return { changed: false, nodes };
}

/** Which edge a freshly-touched node belongs at for a given direction. */
export function recencyEdgeForDirection(direction: 'asc' | 'desc'): SiblingEdge {
	return direction === 'desc' ? 'start' : 'end';
}
