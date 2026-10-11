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
 * Standard focusable/interactive control semantics.
 * Keyboard events targeting these controls outside the tree must never fall back
 * to the tree, ensuring toolbar buttons, links, tabs, and menus retain their keys.
 */
export function isInteractiveControlTarget(target: unknown): boolean {
	if (!target || typeof target !== 'object') return false;
	const el = target as Partial<Element> & { isContentEditable?: boolean };
	if (el.isContentEditable === true) return true;
	if (typeof el.closest === 'function') {
		try {
			const interactive = el.closest(
				'button, input, textarea, select, a[href], area[href], summary, ' +
				'[role="button"], [role="link"], [role="checkbox"], [role="radio"], ' +
				'[role="switch"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], ' +
				'[role="menuitemradio"], [role="option"], [role="combobox"], [role="searchbox"], ' +
				'[role="slider"], [role="spinbutton"], [role="textbox"], ' +
				'[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]',
			);
			if (interactive) return true;
			const tabIndexed = el.closest('[tabindex]');
			if (tabIndexed) {
				const raw = tabIndexed.getAttribute('tabindex');
				if (raw !== null && raw.trim() !== '' && raw.trim() !== '-1') {
					return true;
				}
			}
		} catch {
			return false;
		}
	}
	return false;
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

	// 2. Tree path first: if target is within a tree boundary, route to that tree.
	for (const pathTarget of path) {
		const boundary = boundaries.get(pathTarget);
		if (!boundary) continue;
		if (frameEl && !frameEl.contains(boundary.owner)) return undefined;
		return boundary.handle(event) ? false : undefined;
	}

	// 3. Neutral fallback: only active view scope supplies a frame. Never pick a global tree.
	if (!frameEl) return undefined;
	const doc = frameEl.ownerDocument;

	// Reject targets from unrelated workspace leaves.
	if (
		target &&
		target !== doc &&
		target !== doc.body &&
		target !== doc.documentElement &&
		target !== frameEl &&
		!path.includes(frameEl)
	) {
		return undefined;
	}

	// Reject explicit interactive controls outside the tree (buttons, role=button, links, tabs, etc.).
	// Never steal keystrokes from toolbar buttons, menus, or explicit focusable controls.
	if (isInteractiveControlTarget(target)) {
		return undefined;
	}

	// Fall back to active tree owner within the frame for neutral targets (body, doc, frame shell).
	for (const owner of activeTreeOwners) {
		const boundary = boundaries.get(owner);
		if (frameEl.contains(owner) && boundary?.isActive()) {
			return boundary.handle(event) ? false : undefined;
		}
	}

	return undefined;
}
