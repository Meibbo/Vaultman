/**
 * U130 native polish: owner-local tree keyboard controller.
 *
 * One event boundary per tree instance (attached to that tree's own
 * scrollport, never document-global). Navigation runs over the flattened
 * visible model — not merely mounted DOM rows — with stable occurrence
 * identity. Modifier activation uses a keyboard-appropriate callback and
 * never pretends a KeyboardEvent is a MouseEvent. Delete prompts via native
 * host confirmation and never executes silent direct deletion.
 *
 * Native official source reference: Obsidian 1.14.4 app.js:
 * - offset 1489371 (initializeKeyboardNav / Scope allowlist)
 * - offset 1494236 (onKeyArrowDown)
 * - offset 1493836 (onKeyArrowUp)
 * - offset 1494533 (onKeyArrowLeft)
 * - offset 1495130 & 1505768 (onKeyArrowRight)
 * - offset 1494145 (onKeyEscape)
 * - offset 1490150 (Enter macOS rename vs open)
 * - offset 1490717 (Delete / Mod+Backspace deletion prompt)
 */

import { isNativeTreeKeyboardChord } from './logicTreeKeyboardAllowlist';

export interface TreeKeyboardRow {
	id: string;
	depth: number;
	hasChildren: boolean;
	isExpanded: boolean;
}

export interface TreeKeyboardModifiers {
	shift: boolean;
	ctrl: boolean;
	meta: boolean;
	alt: boolean;
}

export interface TreeKeyboardCallbacks {
	/** Move keyboard focus (the scene reveals/scrolls; selection untouched). */
	onFocus(id: string): void;
	/** Expand or collapse one row. */
	onToggleExpand(id: string, expand: boolean): void;
	/** Enter/Space activation with real modifier flags. */
	onActivate(id: string, modifiers: TreeKeyboardModifiers): void;
	/** Shift+Up/Down additive range from the anchor through the new focus. */
	onRangeSelect(anchorId: string, focusId: string): void;
	/** Shift+Up/Down native additive selection step (adds previous and current). */
	onAdditiveSelect?(previousId: string, currentId: string): void;
	/** Escape: clear the current selection. Returns false if selection was already empty. */
	onClearSelection(): boolean | void;
	/** F2 or macOS Enter: rename when the scene offers it. */
	onRename(id: string): void;
	/** Whether rename is available for this row. Absent = unavailable. */
	canRename?(id: string): boolean;
	/** Delete (Win/Linux) or Mod+Backspace (macOS): prompt deletion for the row or selection. */
	onDelete?(id: string): void;
	/** ArrowLeft on root-level file: collapse all folders across the scene. */
	onCollapseAll?(): void;
	/** Mod+ArrowDown/Up: open file in background without moving active focus. */
	onModStepOpen?(id: string): void;
}

/**
 * Owner-local extension seam: extra key bindings for one tree instance.
 * Handlers run before the native set; returning `true` consumes the event.
 * Registration is per-instance — nothing here touches the document.
 */
export type TreeKeyboardExtensionHandler = (
	event: KeyboardEvent,
	context: { focusedId: string | null },
) => boolean;

export type TreeKeyboardExtensions = Readonly<
	Record<string, TreeKeyboardExtensionHandler>
>;

export interface TreeKeyboardOptions {
	isMacOS?: boolean;
}

export function modifiersOf(event: KeyboardEvent): TreeKeyboardModifiers {
	return {
		shift: event.shiftKey,
		ctrl: event.ctrlKey,
		meta: event.metaKey,
		alt: event.altKey,
	};
}

/**
 * Editable-control guard: keyboard handling must not steal keystrokes from
 * rename boxes, filter inputs, textareas or contenteditable regions. The row
 * element itself (role=button) is NOT editable and stays handled.
 */
export function isEditableKeyboardTarget(
	target: unknown,
	rowEl: HTMLElement | null,
): boolean {
	if (!target || typeof target !== 'object') return false;
	const el = target as Partial<Element> & {
		isContentEditable?: boolean;
		tagName?: string;
	};
	if (rowEl && (target === rowEl || (el as Node) === rowEl)) return false;
	if (typeof el.closest === 'function') {
		try {
			const hit = el.closest(
				'input, textarea, select, button, a[href], [role="switch"], [role="checkbox"], [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]',
			);
			if (hit) return true;
		} catch {
			return false;
		}
	}
	if (el.isContentEditable === true) return true;
	const tag = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : '';
	return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function parentIndexOf(rows: readonly TreeKeyboardRow[], index: number): number {
	const depth = rows[index]?.depth ?? 0;
	for (let i = index - 1; i >= 0; i -= 1) {
		if ((rows[i]?.depth ?? 0) < depth) return i;
	}
	return -1;
}

export interface TreeKeyboardState {
	rows: readonly TreeKeyboardRow[];
	focusedId: string | null;
	anchorId: string | null;
}

function indexOf(rows: readonly TreeKeyboardRow[], id: string | null): number {
	if (id === null) return -1;
	return rows.findIndex((row) => row.id === id);
}

/**
 * Handle one keydown. Returns `handled: true` when the event was consumed.
 * Native Scope allowlist: plain/Shift/Mod Up/Down; plain/Mod Left/Right;
 * plain Esc, Enter, Space, F2, Delete (Win) / Mod+Backspace (Mac).
 * Alt modifier is never handled and bubbles to the platform.
 */
export function handleTreeKeyboardKey(
	event: KeyboardEvent,
	state: TreeKeyboardState,
	callbacks: TreeKeyboardCallbacks,
	extensions?: TreeKeyboardExtensions,
	options?: TreeKeyboardOptions,
): { handled: boolean; next: TreeKeyboardState } {
	const focused = state.focusedId;
	const ext = extensions?.[event.key];
	if (ext) {
		const consumed = ext(event, { focusedId: focused });
		if (consumed) return { handled: true, next: state };
	}

	const isMac = Boolean(options?.isMacOS);
	if (!isNativeTreeKeyboardChord(event, isMac)) {
		return { handled: false, next: state };
	}

	const index = indexOf(state.rows, focused);
	const row = index >= 0 ? state.rows[index] : undefined;
	const isMod = event.ctrlKey || event.metaKey;

	switch (event.key) {
		case 'ArrowDown':
		case 'ArrowUp': {
			const delta = event.key === 'ArrowDown' ? 1 : -1;
			const current = index >= 0 ? index : delta > 0 ? -1 : state.rows.length;
			const nextIndex = current + delta;
			if (nextIndex < 0 || nextIndex >= state.rows.length) {
				return { handled: true, next: state };
			}
			const next = state.rows[nextIndex];
			if (event.shiftKey) {
				if (callbacks.onAdditiveSelect) {
					callbacks.onAdditiveSelect(focused ?? next.id, next.id);
				} else {
					const anchor = state.anchorId ?? focused ?? next.id;
					callbacks.onRangeSelect(anchor, next.id);
				}
				callbacks.onFocus(next.id);
				return {
					handled: true,
					next: { ...state, focusedId: next.id, anchorId: state.anchorId ?? focused ?? next.id },
				};
			}
			if (isMod) {
				callbacks.onFocus(next.id);
				if (!next.hasChildren) {
					callbacks.onModStepOpen?.(next.id);
				}
				return {
					handled: true,
					next: { ...state, focusedId: next.id, anchorId: next.id },
				};
			}
			callbacks.onFocus(next.id);
			return {
				handled: true,
				next: { ...state, focusedId: next.id, anchorId: next.id },
			};
		}
		case 'ArrowLeft': {
			if (!row) return { handled: false, next: state };
			if (row.hasChildren && row.isExpanded) {
				callbacks.onToggleExpand(row.id, false);
				return { handled: true, next: state };
			}
			const parent = parentIndexOf(state.rows, index);
			if (row.hasChildren && !row.isExpanded) {
				if (parent >= 0) {
					const target = state.rows[parent];
					callbacks.onFocus(target.id);
					return {
						handled: true,
						next: { ...state, focusedId: target.id, anchorId: target.id },
					};
				}
				return { handled: true, next: state };
			}
			// File case (non-collapsible row):
			if (parent >= 0) {
				const target = state.rows[parent];
				callbacks.onToggleExpand(target.id, false);
				callbacks.onFocus(target.id);
				return {
					handled: true,
					next: { ...state, focusedId: target.id, anchorId: target.id },
				};
			}
			// Root file: collapse all
			callbacks.onCollapseAll?.();
			return { handled: true, next: state };
		}
		case 'ArrowRight': {
			if (!row) return { handled: false, next: state };
			if (row.hasChildren && !row.isExpanded) {
				callbacks.onToggleExpand(row.id, true);
				return { handled: true, next: state };
			}
			if (row.hasChildren && row.isExpanded) {
				const child = state.rows[index + 1];
				if (child && child.depth > row.depth) {
					callbacks.onFocus(child.id);
					return {
						handled: true,
						next: { ...state, focusedId: child.id, anchorId: child.id },
					};
				}
				return { handled: true, next: state };
			}
			// File case: opens the file (FO.prototype.onKeyArrowRight parity)
			callbacks.onActivate(row.id, modifiersOf(event));
			return { handled: true, next: state };
		}
		case 'Enter': {
			if (!row) return { handled: false, next: state };
			if (isMac && !isMod) {
				if (callbacks.canRename && callbacks.canRename(row.id)) {
					callbacks.onRename(row.id);
					return { handled: true, next: state };
				}
			}
			callbacks.onActivate(row.id, modifiersOf(event));
			return { handled: true, next: state };
		}
		case ' ': {
			if (!row) return { handled: false, next: state };
			callbacks.onActivate(row.id, modifiersOf(event));
			return { handled: true, next: state };
		}
		case 'Escape': {
			const cleared = callbacks.onClearSelection();
			if (cleared === false) {
				// No active selection to clear: bubble to global modals/popups.
				return { handled: false, next: state };
			}
			return { handled: true, next: state };
		}
		case 'F2': {
			if (!row || !callbacks.canRename || !callbacks.canRename(row.id)) {
				return { handled: false, next: state };
			}
			callbacks.onRename(row.id);
			return { handled: true, next: state };
		}
		case 'Delete': {
			if (isMac) return { handled: false, next: state };
			if (!callbacks.onDelete) return { handled: false, next: state };
			callbacks.onDelete(row?.id ?? focused ?? '');
			return { handled: true, next: state };
		}
		case 'Backspace': {
			if (isMac && isMod) {
				if (!callbacks.onDelete) return { handled: false, next: state };
				callbacks.onDelete(row?.id ?? focused ?? '');
				return { handled: true, next: state };
			}
			return { handled: false, next: state };
		}
		default: {
			return { handled: false, next: state };
		}
	}
}
