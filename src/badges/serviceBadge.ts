export type BadgeKind = 'set' | 'rename' | 'convert' | 'delete' | 'filter' | 'node-note';
export type FabBadgeKind = 'queue' | 'filters';
export type BadgeSeverity = 'info' | 'success' | 'warning' | 'error';

export interface BadgeRegistryNode {
	id: string;
}

export interface BadgeDescriptor {
	kind: BadgeKind;
	label: string;
	icon: string;
	order: number;
	hover: boolean;
}

export interface FabBadgeDescriptor {
	kind: FabBadgeKind;
	count: number;
	text: string;
	label: string;
	title: string;
}

export interface BadgeContradiction {
	code: 'delete-with-mutation';
	severity: Extract<BadgeSeverity, 'warning'>;
	badgeKinds: BadgeKind[];
	message: string;
}

type ActiveOpsByNodeMap = ReadonlyMap<string, ReadonlySet<BadgeKind>>;
type ActiveOpsByNodeRecord = Record<string, readonly BadgeKind[] | ReadonlySet<BadgeKind>>;

export type ActiveOpsByNode = ActiveOpsByNodeMap | ActiveOpsByNodeRecord;

export const BADGE_KIND_ORDER: readonly BadgeKind[] = [
	'set',
	'rename',
	'convert',
	'delete',
	'filter',
	'node-note',
];

export const ORDER = BADGE_KIND_ORDER;

const BADGE_DEFINITIONS: Record<BadgeKind, Omit<BadgeDescriptor, 'kind' | 'order'>> = {
	set: {
		label: 'Set',
		icon: 'lucide-pencil-line',
		hover: true,
	},
	rename: {
		label: 'Rename',
		icon: 'lucide-text-cursor-input',
		hover: true,
	},
	convert: {
		label: 'Convert',
		icon: 'lucide-replace',
		hover: false,
	},
	delete: {
		label: 'Delete',
		icon: 'lucide-trash-2',
		hover: true,
	},
	filter: {
		label: 'Filter',
		icon: 'lucide-filter',
		hover: true,
	},
	'node-note': {
		label: 'Node note',
		icon: 'lucide-notebook-tabs',
		hover: true,
	},
};

const FAB_BADGE_LABEL_KEYS: Record<FabBadgeKind, string> = {
	queue: 'ops.queue',
	filters: 'filters.active',
};

const EMPTY_SET: ReadonlySet<BadgeKind> = new Set();
const MUTATING_KINDS: readonly BadgeKind[] = ['set', 'rename', 'convert'];

function isActiveOpsMap(activeOpsByNode: ActiveOpsByNode): activeOpsByNode is ActiveOpsByNodeMap {
	return activeOpsByNode instanceof Map;
}

function lookupActive(
	activeOpsByNode: ActiveOpsByNode,
	nodeId: string,
): ReadonlySet<BadgeKind> {
	if (isActiveOpsMap(activeOpsByNode)) {
		return activeOpsByNode.get(nodeId) ?? EMPTY_SET;
	}
	const value = activeOpsByNode[nodeId];
	if (!value) return EMPTY_SET;
	if (value instanceof Set) return value;
	return new Set(value);
}

function sortByOrder(kinds: Iterable<BadgeKind>): BadgeKind[] {
	const seen = new Set<BadgeKind>();
	for (const kind of kinds) seen.add(kind);
	return BADGE_KIND_ORDER.filter((kind) => seen.has(kind));
}

export function describeBadge(kind: BadgeKind): BadgeDescriptor {
	const definition = BADGE_DEFINITIONS[kind];
	return {
		kind,
		...definition,
		order: BADGE_KIND_ORDER.indexOf(kind),
	};
}

export function describeHoverBadge(kind: BadgeKind): BadgeDescriptor | null {
	const descriptor = describeBadge(kind);
	return descriptor.hover ? descriptor : null;
}

export function visibleHoverBadges(
	node: BadgeRegistryNode,
	activeOpsByNode: ActiveOpsByNode,
): BadgeKind[] {
	const active = lookupActive(activeOpsByNode, node.id);
	if (active.has('delete')) return ['filter'];
	const visible: BadgeKind[] = [];
	for (const kind of BADGE_KIND_ORDER) {
		const descriptor = describeHoverBadge(kind);
		if (!descriptor || active.has(kind)) continue;
		visible.push(kind);
	}
	return sortByOrder(visible);
}

export function visibleHoverBadgeDescriptors(
	node: BadgeRegistryNode,
	activeOpsByNode: ActiveOpsByNode,
): BadgeDescriptor[] {
	return visibleHoverBadges(node, activeOpsByNode).map(describeBadge);
}

export function activeBadges(
	node: BadgeRegistryNode,
	activeOpsByNode: ActiveOpsByNode,
): BadgeKind[] {
	const active = lookupActive(activeOpsByNode, node.id);
	return sortByOrder(active);
}

export function activeBadgeDescriptors(
	node: BadgeRegistryNode,
	activeOpsByNode: ActiveOpsByNode,
): BadgeDescriptor[] {
	return activeBadges(node, activeOpsByNode).map(describeBadge);
}

export function describeFabBadge(
	kind: FabBadgeKind,
	count: number,
	translate: (key: string) => string,
): FabBadgeDescriptor | null {
	if (count <= 0) return null;
	const label = `${count} ${translate(FAB_BADGE_LABEL_KEYS[kind])}`;
	return {
		kind,
		count,
		text: String(count),
		label,
		title: label,
	};
}

export function detectBadgeContradictions(kinds: Iterable<BadgeKind>): BadgeContradiction[] {
	const ordered = sortByOrder(kinds);
	if (!ordered.includes('delete')) return [];
	const conflicts = ordered.filter((kind) => MUTATING_KINDS.includes(kind));
	if (conflicts.length === 0) return [];
	return [
		{
			code: 'delete-with-mutation',
			severity: 'warning',
			badgeKinds: sortByOrder([...conflicts, 'delete']),
			message: 'Delete conflicts with set or rename operations on the same node.',
		},
	];
}

export function badgeKindFromOpKind(opKind: string): BadgeKind | null {
	if (opKind.startsWith('rename')) return 'rename';
	if (opKind.startsWith('delete')) return 'delete';
	if (opKind === 'set_prop' || opKind === 'add_tag' || opKind === 'set_tag') return 'set';
	if (opKind === 'apply_template' || opKind === 'find_replace_content') return 'set';
	if (opKind === 'reorder_props' || opKind === 'move_file') return 'set';
	return null;
}

export function badgeKindFromNodeBadge(badge: {
	icon?: string;
	text?: string;
	color?: string;
}): BadgeKind | null {
	const text = (badge.text ?? '').toLowerCase();
	const icon = (badge.icon ?? '').toLowerCase();
	if (text.includes('delete') || icon.includes('trash')) return 'delete';
	if (text.includes('rename') || icon.includes('text-cursor') || icon.includes('pencil-line'))
		return 'rename';
	if (text.includes('convert') || icon.includes('replace') || icon.includes('refresh-cw'))
		return 'convert';
	if (text.includes('filter') || icon.includes('filter')) return 'filter';
	if (text.includes('set') || text.includes('add') || icon.includes('plus')) return 'set';
	return null;
}
