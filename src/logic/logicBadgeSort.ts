export type NodeBadgeKind =
	| 'pending-delete'
	| 'pending-rename'
	| 'pending-move'
	| 'pending-convert'
	| 'conflict'
	| 'filter-include'
	| 'filter-exclude';

export interface BadgedNode {
	badge?: {
		// A provider may publish a badge kind this module does not classify yet;
		// `string & {}` keeps the known kinds visible to editors without letting
		// the wide `string` swallow the union.
		kind?: NodeBadgeKind | (string & {}) | null;
	} | null;
}

const PRIORITY_BADGE_KINDS = new Set<string>([
	'pending-delete',
	'pending-rename',
	'pending-move',
	'pending-convert',
	'conflict',
	'filter-include',
	'filter-exclude',
]);

export function hasPriorityBadge(node: BadgedNode): boolean {
	if (!node?.badge?.kind) return false;
	return PRIORITY_BADGE_KINDS.has(node.badge.kind);
}

export function sortNodesByBadges<T extends BadgedNode>(nodes: readonly T[]): T[] {
	const priorityGroup: T[] = [];
	const regularGroup: T[] = [];

	for (const node of nodes) {
		if (hasPriorityBadge(node)) {
			priorityGroup.push(node);
		} else {
			regularGroup.push(node);
		}
	}

	return [...priorityGroup, ...regularGroup];
}
