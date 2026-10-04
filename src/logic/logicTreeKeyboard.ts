/**
 * U130 native polish: owner-local tree keyboard controller.
 *
 * One event boundary per tree instance (attached to that tree's own
 * scrollport, never document-global). Navigation runs over the flattened
 * visible model — not merely mounted DOM rows — with stable occurrence
 * identity. Modifier activation uses a keyboard-appropriate callback and
 * never pretends a KeyboardEvent is a MouseEvent. No destructive Delete
 * binding ships by default; future bindings arrive through the owner-local
 * extension seam.
 */

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
	/** Escape: clear the current selection. */
	onClearSelection(): void;
	/** F2: rename when the scene offers it. */
	onRename(id: string): void;
	/** Whether F2 rename is available for this row. Absent = unavailable. */
	canRename?(id: string): boolean;
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
 * element itself (role=button, tabIndex=0) is NOT editable and stays handled.
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
 * Handle one keydown. Returns `true` when the event was consumed (the caller
 * then preventDefaults). Pure apart from the callbacks it invokes.
 */
export function handleTreeKeyboardKey(
	event: KeyboardEvent,
	state: TreeKeyboardState,
	callbacks: TreeKeyboardCallbacks,
	extensions?: TreeKeyboardExtensions,
): { handled: boolean; next: TreeKeyboardState } {
	const focused = state.focusedId;
	const ext = extensions?.[event.key];
	if (ext) {
		const consumed = ext(event, { focusedId: focused });
		if (consumed) return { handled: true, next: state };
	}
	const index = indexOf(state.rows, focused);
	const row = index >= 0 ? state.rows[index] : undefined;
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
				const anchor = state.anchorId ?? focused ?? next.id;
				callbacks.onRangeSelect(anchor, next.id);
				callbacks.onFocus(next.id);
				return {
					handled: true,
					next: { ...state, focusedId: next.id, anchorId: anchor },
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
		case 'ArrowRight': {
			if (!row) return { handled: false, next: state };
			if (row.hasChildren && !row.isExpanded) {
				callbacks.onToggleExpand(row.id, true);
				return { handled: true, next: state };
			}
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
		case 'Enter':
		case ' ': {
			if (!row) return { handled: false, next: state };
			callbacks.onActivate(row.id, modifiersOf(event));
			return { handled: true, next: state };
		}
		case 'Escape': {
			callbacks.onClearSelection();
			return { handled: true, next: state };
		}
		case 'F2': {
			// Rename only when the scene offers it (`canRename` absent = unavailable).
			if (!row || !callbacks.canRename || !callbacks.canRename(row.id)) {
				return { handled: false, next: state };
			}
			callbacks.onRename(row.id);
			return { handled: true, next: state };
		}
		default: {
			return { handled: false, next: state };
		}
	}
}
