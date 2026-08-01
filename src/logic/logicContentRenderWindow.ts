/**
 * U121-019 #51 — the Text results render window.
 *
 * `MAX_FILES = 200` and `MAX_SNIPPETS = 3` truncated the **results**: past the
 * two-hundredth file there was nothing to find, and a file's fourth match did
 * not exist. Both are gone from the data — every matching file and every match
 * is in the model.
 *
 * What stands in their place truncates only the **document**. This branch has
 * no virtualiser (that work is deferred), so rendering ten thousand rows at once
 * would trade a truncated result for a frozen pane. The window is how many files
 * have rows right now; it grows as the user reaches the end of the list, and
 * never shrinks, so nothing that was on screen disappears.
 *
 * The distinction that matters: a cap loses results, a window only delays them.
 */

/** Rows added each time the list is scrolled to its end. */
export const CONTENT_WINDOW_STEP = 200;

/** Where the window starts, before the user has scrolled anywhere. */
export const CONTENT_WINDOW_INITIAL = CONTENT_WINDOW_STEP;

/**
 * The same idea one level down: how many of an expanded file's matches have
 * rows. Removing `MAX_SNIPPETS` put every match in the model, and file rows are
 * expanded by default — measured on a common letter, that alone put 25521 match
 * rows in the document. The matches are all still there; this bounds the slice
 * that is rendered.
 *
 * Smaller than the file step on purpose: a file's matches are read a screen at a
 * time, while files are scrolled past in bulk.
 */
export const CONTENT_MATCH_WINDOW_STEP = 20;

/** Distance from the bottom, in pixels, that counts as "at the end". */
const GROW_THRESHOLD_PX = 200;

/** How many files have rows, given the window. */
export function visibleContentCount(total: number, windowSize: number): number {
	// A zero window would render an empty list for a search that matched, which
	// reads as "no results" — the caps' failure in a subtler form.
	const effective = windowSize > 0 ? windowSize : CONTENT_WINDOW_STEP;
	return Math.min(total, effective);
}

/** Files that matched but do not have a row yet. */
export function remainingContentFiles(
	total: number,
	windowSize: number,
): number {
	return Math.max(0, total - visibleContentCount(total, windowSize));
}

/** The next window size, one step larger and never past the total. */
export function grownContentWindow(
	windowSize: number,
	total: number,
	step: number = CONTENT_WINDOW_STEP,
): number {
	return Math.min(total, windowSize + step);
}

export interface ContentWindowGrowthInput {
	scrollTop: number;
	scrollHeight: number;
	clientHeight: number;
	total: number;
	windowSize: number;
}

/** Whether reaching this scroll position should pull in the next step. */
export function shouldGrowContentWindow({
	scrollTop,
	scrollHeight,
	clientHeight,
	total,
	windowSize,
}: ContentWindowGrowthInput): boolean {
	if (remainingContentFiles(total, windowSize) === 0) return false;
	// A window whose rows do not fill the pane can never be scrolled to its end,
	// so scrolling alone would never ask for the rest.
	if (scrollHeight <= clientHeight) return true;
	return scrollTop + clientHeight >= scrollHeight - GROW_THRESHOLD_PX;
}
