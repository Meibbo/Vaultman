import type { BadgeKind } from '../badges/serviceBadge';
import type { NodeMouseAction, NodeMouseActionConfig } from '../services/serviceMouse';

export interface RowInteractionContract {
	onToggle: (id: string, e?: MouseEvent | KeyboardEvent) => void;
	onRowClick: (id: string, e: MouseEvent) => void;
	onPrimaryAction?: (id: string, e: MouseEvent) => void;
	onSecondaryAction?: (id: string, e: MouseEvent) => void;
	onTertiaryAction?: (id: string, e: MouseEvent | KeyboardEvent) => void;
	onBoxSelect?: (ids: string[], e: PointerEvent) => void;
	onContextMenu: (id: string, e: MouseEvent) => void;
	onRowKeydown?: (id: string, e: KeyboardEvent) => void;
	onSelectAll?: (ids: string[], e: Event) => void;
	onBadgeDoubleClick?: (queueIndex: number) => void;
	onHoverBadgeAction?: (id: string, kind: BadgeKind, e: MouseEvent | KeyboardEvent) => void;
}

export type ActionSurface = 'row' | 'caret' | 'button' | 'fab' | 'badge';
export type ActionGesture =
	| 'click'
	| 'aux'
	| 'dblclick'
	| 'keyboard'
	| 'longpress'
	| 'swipe-left'
	| 'swipe-right'
	| 'drag'
	| 'hover';
export type ActionPointer = 'mouse' | 'touch' | 'pen' | 'keyboard';

export interface ActionModifiers {
	additive: boolean;
	range: boolean;
	alt: boolean;
}

export interface ActionIntentQuery {
	surface: ActionSurface;
	gesture: ActionGesture;
	modifiers: ActionModifiers;
	pointerType: ActionPointer;
}

export type NodeActionKind =
	| NodeMouseAction
	| 'toggle'
	| 'context-menu'
	| 'activate'
	| 'ignored';

export interface ActionIntent {
	kind: NodeActionKind;
	selection?: { additive: boolean; range: boolean };
}

export function selectionModifiersFromEvent(e: {
	ctrlKey: boolean;
	metaKey: boolean;
	shiftKey: boolean;
}): { additive: boolean; range: boolean } {
	return {
		additive: e.ctrlKey || e.metaKey,
		range: e.shiftKey,
	};
}

export function modifiersFromEvent(e: MouseEvent | KeyboardEvent): ActionModifiers {
	return {
		...selectionModifiersFromEvent(e),
		alt: e.altKey,
	};
}

export function resolveActionIntent(
	query: ActionIntentQuery,
	mouseConfig: NodeMouseActionConfig,
): ActionIntent {
	const selection = {
		additive: query.modifiers.additive,
		range: query.modifiers.range,
	};

	if (query.surface === 'caret') {
		return query.gesture === 'click' ? { kind: 'toggle' } : { kind: 'ignored' };
	}

	if (query.surface === 'row' && query.pointerType === 'keyboard') {
		return query.gesture === 'keyboard' ? { kind: 'activate', selection } : { kind: 'ignored' };
	}

	if (query.surface === 'row' && query.pointerType === 'mouse') {
		if (query.gesture === 'click') return { kind: mouseConfig.primary, selection };
		if (query.gesture === 'aux') return { kind: mouseConfig.tertiary };
	}

	// Reserved for later A.R slices: hover, touch/pen gestures, drag, buttons, FABs and badges.
	return { kind: 'ignored' };
}
