import type { NodeBadge } from '../../types/typeNode';

export type NodeBadgePressEvent = MouseEvent | KeyboardEvent;
export type NodeBadgeHost = { badges?: readonly NodeBadge[] };

export function ownNodeBadges(node: NodeBadgeHost): NodeBadge[] {
	return (node.badges ?? []).filter((badge) => !badge.isInherited);
}

export function inheritedNodeBadges(node: NodeBadgeHost): NodeBadge[] {
	return (node.badges ?? []).filter((badge) => badge.isInherited);
}

export function nodeBadgeKey(badge: NodeBadge, index: number): string {
	return `${badge.queueIndex ?? 'badge'}:${index}:${badge.text ?? ''}:${badge.icon ?? ''}:${badge.color ?? ''}:${badge.isInherited ?? false}`;
}

export function nodeBadgeTitle(badge: NodeBadge, inherited = false): string {
	if (badge.title) return badge.title;
	const label = badge.text ?? '';
	const prefix = inherited ? 'Hidden child ' : '';
	if (badge.queueIndex === undefined) return `${prefix}${label}`.trim();
	return `${prefix}${label} - click to remove from queue`.trim();
}

export function nodeBadgeAriaLabel(badge: NodeBadge, inherited = false): string {
	return badge.ariaLabel ?? nodeBadgeTitle(badge, inherited);
}

export function nodeBadgeIsActionable(badge: NodeBadge): boolean {
	return badge.queueIndex !== undefined || typeof badge.onClick === 'function';
}

export function handleNodeBadgePress(
	event: NodeBadgePressEvent,
	badge: NodeBadge,
	onQueueIndex?: (queueIndex: number) => void,
): void {
	if (!nodeBadgeIsActionable(badge)) return;
	event.stopPropagation();
	event.preventDefault();
	if (badge.queueIndex !== undefined) {
		onQueueIndex?.(badge.queueIndex);
		return;
	}
	void badge.onClick?.();
}
