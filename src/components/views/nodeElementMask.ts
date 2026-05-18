import type { NodeBadge } from '../../types/typeNode';
import type { NodeElementMask } from '../../types/typeViewHost';
import type { ViewBadge, ViewBadgeLayers } from '../../types/typeViews';

export const DEFAULT_NODE_ELEMENT_MASK: NodeElementMask = {
	icon: true,
	label: true,
	detail: true,
	media: false,
	badges: {
		ops: true,
		filters: true,
		warnings: true,
		inherited: true,
		counts: true,
	},
	actions: true,
};

export function visibleViewBadgesForMask(
	badges: ViewBadgeLayers | undefined,
	mask: NodeElementMask,
): ViewBadge[] {
	return [
		...(mask.badges.ops ? (badges?.ops ?? []) : []),
		...(mask.badges.filters ? (badges?.filters ?? []) : []),
		...(mask.badges.warnings ? (badges?.warnings ?? []) : []),
		...(mask.badges.inherited ? (badges?.inherited ?? []) : []),
		...(mask.badges.counts ? (badges?.counts ?? []) : []),
	];
}

export function visibleNodeBadgesForMask(
	badges: readonly NodeBadge[],
	mask: NodeElementMask,
): NodeBadge[] {
	return badges.filter((badge) => nodeBadgeVisibleForMask(badge, mask));
}

export function nodeBadgeVisibleForMask(badge: NodeBadge, mask: NodeElementMask): boolean {
	if (!anyBadgeKindVisible(mask)) return false;
	if (badge.isInherited) return mask.badges.inherited;
	if (badge.queueIndex !== undefined) return mask.badges.ops;
	if (isWarningBadge(badge)) return mask.badges.warnings;
	return mask.badges.filters;
}

function anyBadgeKindVisible(mask: NodeElementMask): boolean {
	return (
		mask.badges.ops ||
		mask.badges.filters ||
		mask.badges.warnings ||
		mask.badges.inherited ||
		mask.badges.counts
	);
}

function isWarningBadge(badge: NodeBadge): boolean {
	return (
		badge.color === 'warning' ||
		badge.color === 'error' ||
		badge.color === 'red' ||
		badge.color === 'orange'
	);
}
