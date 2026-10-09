/**
 * U130 native polish: owner-local keyboard boundary and active frame fallback.
 * Relays the active Obsidian view scope to the event's own tree, with owner
 * fallback when document.body is the active target.
 */

import { isEditableKeyboardTarget } from './logicTreeKeyboard';

interface TreeKeyboardBoundary {
	readonly owner: HTMLElement;
	readonly handle: (event: KeyboardEvent) => boolean;
	readonly isActive: () => boolean;
}
const boundaries = new WeakMap<EventTarget, TreeKeyboardBoundary>();
const activeTreeOwners = new Set<HTMLElement>();

export interface RouteTreeKeyboardOptions {
	frameEl?: HTMLElement | null;
}

/** Relays the active Obsidian view scope to the event's own tree only. */
export function bindTreeKeyboardBoundary(
	owner: HTMLElement,
	handler: (event: KeyboardEvent) => boolean,
	isActive: () => boolean = () => owner.getClientRects().length > 0,
): () => void {
	boundaries.set(owner, { owner, handle: handler, isActive });
	activeTreeOwners.add(owner);
	return () => {
		boundaries.delete(owner);
		activeTreeOwners.delete(owner);
	};
}

/**
 * Routes keyboard event to the matching tree boundary.
 * Supports owner fallback for active frame events where target is document.body
 * without capturing editable inputs or unrelated workspace leaves.
 */
export function routeTreeKeyboardEvent(
	event: KeyboardEvent,
	options?: RouteTreeKeyboardOptions,
): false | undefined {
	const target = event.target;

	// 1. Editable guard: never steal from inputs, textareas, contenteditable.
	if (isEditableKeyboardTarget(target, null)) {
		return undefined;
	}

	const frameEl = options?.frameEl;
	const path = event.composedPath();
	for (const pathTarget of path) {
		const boundary = boundaries.get(pathTarget);
		if (!boundary) continue;
		if (frameEl && !frameEl.contains(boundary.owner)) return undefined;
		return boundary.handle(event) ? false : undefined;
	}

	// Only the active view scope supplies a frame. Never pick a global tree.
	if (!frameEl) return undefined;
	const doc = frameEl.ownerDocument;
	if (target && target !== doc && target !== doc.body && target !== doc.documentElement && !path.includes(frameEl)) {
		return undefined;
	}
	for (const owner of activeTreeOwners) {
		const boundary = boundaries.get(owner);
		if (frameEl.contains(owner) && boundary?.isActive()) {
			return boundary.handle(event) ? false : undefined;
		}
	}

	return undefined;
}
