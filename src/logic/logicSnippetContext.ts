/**
 * U121-019 #51 — "show more context", per node.
 *
 * Core has the same affordance view-wide: `SearchView.setExtraContext()` with
 * `onKeyShowMoreBefore` / `onKeyShowMoreAfter`, over a boolean. Ours is per file
 * row and stepped, because that is what was asked for — one node can be opened
 * up without widening every other result.
 *
 * The radius is the number of characters kept on each side of a match. The
 * adapter's fixed `CONTEXT = 40` is not removed, it becomes level 0: the
 * default slice is unchanged, and the levels above it are new reach.
 */

/** Characters kept on each side of the match, per level. */
export const SNIPPET_CONTEXT_LEVELS: readonly number[] = [40, 120, 320, 800];

function clampLevel(level: number): number {
	if (!Number.isFinite(level)) return 0;
	return Math.min(Math.max(Math.trunc(level), 0), SNIPPET_CONTEXT_LEVELS.length - 1);
}

/** How much text to keep around a match at this level. */
export function snippetContextRadius(level: number): number {
	return SNIPPET_CONTEXT_LEVELS[clampLevel(level)] ?? SNIPPET_CONTEXT_LEVELS[0];
}

/** The next wider level, or the same one when already at the widest. */
export function moreContextLevel(level: number): number {
	return clampLevel(clampLevel(level) + 1);
}

/** The next narrower level, or the same one when already at the narrowest. */
export function lessContextLevel(level: number): number {
	return clampLevel(clampLevel(level) - 1);
}

/** Whether a node has anywhere wider to go — so the control can say "no". */
export function canShowMoreContext(level: number): boolean {
	return clampLevel(level) < SNIPPET_CONTEXT_LEVELS.length - 1;
}

/** Whether a node has anywhere narrower to go. */
export function canShowLessContext(level: number): boolean {
	return clampLevel(level) > 0;
}
