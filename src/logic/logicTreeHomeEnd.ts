/**
 * U130 tree Navco: pure Home/End and Ctrl+Home/End navigation resolvers.
 *
 * Home / End: navigate within the focused node's visible sibling level in
 * rendered order. Independent of sort type (name, mtime, size, etc.).
 *
 * Ctrl+Home / Ctrl+End (Win/Linux) or Cmd+Home / Cmd+End (macOS): navigate to the
 * first / last visible row of the whole explorer model.
 *
 * Modifiers:
 * - On Windows/Linux: Ctrl is whole-explorer Mod; Meta is ignored.
 * - On macOS: Meta (Cmd) is whole-explorer Mod; Ctrl is non-tree (bubbles).
 * - Alt and Shift: never tree Home/End navigation (bubble to platform).
 * - IME/composing: guarded by caller and excluded here.
 */

import type { TreeKeyboardRow } from './logicTreeKeyboard';
import { collectSiblingMembers } from './logicTreeNavigation';

export interface TreeHomeEndChord {
	readonly isHomeEnd: boolean;
	readonly isWholeExplorer: boolean;
	readonly shiftKey?: boolean;
	readonly key: 'Home' | 'End';
}

/**
 * Checks whether a keyboard event is a valid Tree Home/End chord.
 * Returns chord details or null if the event is not a recognized Home/End tree chord.
 */
export function isTreeHomeEndChord(
	event: KeyboardEvent,
	isMacOS: boolean,
): TreeHomeEndChord | null {
	if (event.key !== 'Home' && event.key !== 'End') return null;
	if (event.isComposing || event.altKey) return null;

	if (isMacOS) {
		// macOS: Ctrl is non-tree; Meta is Mod (whole-explorer).
		if (event.ctrlKey) return null;
		return {
			isHomeEnd: true,
			isWholeExplorer: event.metaKey,
			...(event.shiftKey ? { shiftKey: true } : {}),
			key: event.key,
		};
	}

	// Linux / Windows: Meta is non-tree; Ctrl is Mod (whole-explorer).
	if (event.metaKey) return null;
	return {
		isHomeEnd: true,
		isWholeExplorer: event.ctrlKey,
		...(event.shiftKey ? { shiftKey: true } : {}),
		key: event.key,
	};
}

export interface ResolveTreeHomeEndTargetArgs {
	readonly key: 'Home' | 'End';
	readonly isWholeExplorer: boolean;
	readonly rows: readonly TreeKeyboardRow[];
	readonly focusedId: string | null;
}

/**
 * Pure resolver for Home/End and Ctrl+Home/End targets over the flattened visible model.
 *
 * - Whole-explorer (isWholeExplorer = true): returns first row (Home) or last row (End) in rows.
 * - Sibling-level (isWholeExplorer = false): returns first sibling (Home) or last sibling (End)
 *   at the focused node's depth under the same parent in rendered order.
 * - Returns null when rows is empty or when sibling scope cannot be resolved (e.g. missing focus).
 */
export function resolveTreeHomeEndTarget(
	args: ResolveTreeHomeEndTargetArgs,
): string | null {
	const { key, isWholeExplorer, rows, focusedId } = args;
	if (rows.length === 0) return null;

	if (isWholeExplorer) {
		return key === 'Home' ? (rows[0]?.id ?? null) : (rows[rows.length - 1]?.id ?? null);
	}

	if (focusedId === null) return null;
	const focusedIndex = rows.findIndex((row) => row.id === focusedId);
	if (focusedIndex < 0) return null;

	const siblings = collectSiblingMembers(rows, focusedIndex, (id) => id);
	if (siblings.length === 0) return null;

	return key === 'Home' ? (siblings[0]?.id ?? null) : (siblings[siblings.length - 1]?.id ?? null);
}
