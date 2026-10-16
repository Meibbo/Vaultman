/**
 * U130 tree Navco: pure PageUp/PageDown viewport paging resolvers.
 *
 * Shares the Navco seam with Home/End (`logicTreeHomeEnd`), letter-jump and
 * the TAREA 7 incremental prefix jump (`logicTreePrefixJump`): navigation
 * runs over the flattened visible model in rendered order, never re-sorts,
 * and never mutates selection — the caller focuses the target through the
 * existing reveal/focus path.
 *
 * Frame semantics (Windows Explorer style):
 * - PageDown: focus the last VISIBLE row of the frame; when already there,
 *   advance one full frame and focus the new last visible row, clamping at
 *   the last row of the whole list.
 * - PageUp: mirror — focus the first VISIBLE row; when already there, go
 *   back one full frame and focus the new first visible row, clamping at
 *   the first row of the whole list.
 *
 * The viewport window (`firstVisibleIndex`, `visibleCount`) is owned by the
 * view (scrollport geometry); this lane only resolves the target id.
 */

import type { TreeKeyboardRow } from './logicTreeKeyboard';

/** Build fingerprint: proves which bundle is live via dev:console. */
console.debug('[vaultman-navco] page-jump wiring live');

export interface TreePageChord {
	readonly isPage: boolean;
	readonly shiftKey?: boolean;
	readonly isMod?: boolean;
	readonly key: 'PageUp' | 'PageDown';
}

/**
 * PageUp/PageDown chord (plain, Shift for range selection, or Mod+Shift for additive range).
 * Plain Mod+Page or Alt+Page bubble to the platform. IME/composing is guarded by caller.
 */
export function isTreePageChord(event: KeyboardEvent, isMacOS = false): TreePageChord | null {
	if (event.key !== 'PageUp' && event.key !== 'PageDown') return null;
	if (event.isComposing || event.altKey) return null;
	const isMod = isMacOS ? event.metaKey : event.ctrlKey;
	const nonModKey = isMacOS ? event.ctrlKey : event.metaKey;
	if (nonModKey) return null;
	if (isMod && !event.shiftKey) return null;
	return {
		isPage: true,
		...(event.shiftKey ? { shiftKey: true } : {}),
		...(isMod ? { isMod: true } : {}),
		key: event.key,
	};
}

export interface FrameEdgeTargetArgs {
	readonly rows: readonly TreeKeyboardRow[];
	readonly firstVisibleIndex: number;
	readonly visibleCount: number;
	readonly key: 'Home' | 'End' | 'PageUp' | 'PageDown';
}

/**
 * Focus-free frame edge: Home/PageUp -> first VISIBLE row, End/PageDown ->
 * last VISIBLE row (clamped). The view uses this when no tree row holds
 * keyboard focus, so plain Home/End and paging never degrade to bare
 * scroll while the focus-free whole-explorer chords keep working.
 */
export function resolveFrameEdgeTarget(
	args: FrameEdgeTargetArgs,
): string | null {
	const { rows, firstVisibleIndex, visibleCount, key } = args;
	if (rows.length === 0 || visibleCount <= 0) return null;
	const lastRow = rows.length - 1;
	const first = clampIndex(firstVisibleIndex, lastRow);
	const page = Math.max(1, Math.floor(visibleCount));
	const last = Math.min(first + page - 1, lastRow);
	const target = key === 'Home' || key === 'PageUp' ? first : last;
	return rows[target]?.id ?? null;
}
export interface ResolveTreePageTargetArgs {
	readonly key: 'PageUp' | 'PageDown';
	readonly rows: readonly TreeKeyboardRow[];
	readonly focusedId: string | null;
	/** Index into `rows` of the first row currently visible in the frame. */
	readonly firstVisibleIndex: number;
	/** How many rows fit in the frame at once (frame size). */
	readonly visibleCount: number;
}

function clampIndex(value: number, max: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(Math.max(Math.floor(value), 0), max);
}

/**
 * Pure PageUp/PageDown target resolver over the flattened visible model.
 * Returns `null` when rows is empty, the frame is degenerate, or focus
 * cannot be resolved (mirrors the Home/End resolver contract).
 */
export function resolveTreePageTarget(
	args: ResolveTreePageTargetArgs,
): string | null {
	const { key, rows, focusedId, firstVisibleIndex, visibleCount } = args;
	if (rows.length === 0 || visibleCount <= 0) return null;
	if (focusedId === null) return null;
	const focusedIndex = rows.findIndex((row) => row.id === focusedId);
	if (focusedIndex < 0) return null;

	const lastRow = rows.length - 1;
	const first = clampIndex(firstVisibleIndex, lastRow);
	const page = Math.max(1, Math.floor(visibleCount));
	const last = Math.min(first + page - 1, lastRow);

	let target: number;
	if (key === 'PageDown') {
		target =
			focusedIndex < last
				? last
				: Math.min(last + page, lastRow);
	} else {
		target =
			focusedIndex > first
				? first
				: Math.max(first - page, 0);
	}
	return rows[target]?.id ?? null;
}
