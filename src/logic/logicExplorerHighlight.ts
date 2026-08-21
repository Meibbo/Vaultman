export type ExplorerHighlightChannel =
	| 'hover'
	| 'inclusive'
	| 'exclusive'
	| 'deletion';

export type ExplorerHighlightChannels = Partial<
	Record<ExplorerHighlightChannel, boolean>
>;

export type ExplorerHighlightState = Record<ExplorerHighlightChannel, boolean>;

export type ExplorerHighlightIdSets = Partial<
	Record<ExplorerHighlightChannel, ReadonlySet<string>>
>;

export interface ExplorerStatusDot {
	channel: Exclude<ExplorerHighlightChannel, 'hover'>;
	tone: 'filter' | 'filter-excluded' | 'deletion';
}

/**
 * U121-077: the red channel must cover EVERY node the queue will delete, not
 * only the one the operation happens to name. "Has an own red badge" missed
 * the values that go with a deleted property and the files inside a deleted
 * folder, and -- before U121-072 -- wrongly caught the parent property of a
 * deleted value. The `is-deleted-*` classes are already the resolver's verdict
 * for each scene, so read those.
 */
const DELETION_CLASS_MARKER = 'is-deleted-';

export function collectExplorerDeletionIds(
	nodes: readonly TreeNode[],
): Set<string> {
	const ids = new Set<string>();
	const visit = (node: TreeNode): void => {
		if (
			typeof node.cls === 'string' &&
			node.cls.includes(DELETION_CLASS_MARKER)
		) {
			ids.add(node.id);
		}
		for (const child of node.children ?? []) visit(child);
	};
	for (const node of nodes) visit(node);
	return ids;
}

const FILTER_STATUS_DOTS: readonly ExplorerStatusDot[] = [
	{ channel: 'inclusive', tone: 'filter' },
	{ channel: 'exclusive', tone: 'filter-excluded' },
];

const DELETION_STATUS_PRIORITY: readonly ExplorerStatusDot[] = [
	{ channel: 'deletion', tone: 'deletion' },
	{ channel: 'exclusive', tone: 'filter-excluded' },
	{ channel: 'inclusive', tone: 'filter' },
];

export function resolveExplorerHighlight(
	channels: ExplorerHighlightChannels = {},
): ExplorerHighlightState {
	return {
		hover: channels.hover === true,
		inclusive: channels.inclusive === true,
		exclusive: channels.exclusive === true,
		deletion: channels.deletion === true,
	};
}

export function resolveExplorerHighlightForId(
	id: string,
	sets: ExplorerHighlightIdSets = {},
): ExplorerHighlightState {
	return resolveExplorerHighlight({
		hover: sets.hover?.has(id),
		inclusive: sets.inclusive?.has(id),
		exclusive: sets.exclusive?.has(id),
		deletion: sets.deletion?.has(id),
	});
}

export function resolveExplorerStatusDots(
	channels: ExplorerHighlightChannels = {},
): ExplorerStatusDot[] {
	const priority = channels.deletion
		? DELETION_STATUS_PRIORITY
		: FILTER_STATUS_DOTS;
	return priority
		.filter((dot) => channels[dot.channel] === true)
		.slice(0, 2);
}
import type { TreeNode } from '../types/typeTree';
