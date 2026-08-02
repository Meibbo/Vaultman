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

export function collectExplorerDeletionIds(
	nodes: readonly TreeNode[],
): Set<string> {
	const ids = new Set<string>();
	const visit = (node: TreeNode): void => {
		if (
			node.badges?.some(
				(badge) => badge.color === 'red' && badge.isInherited !== true,
			)
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
