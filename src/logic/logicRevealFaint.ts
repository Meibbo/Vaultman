/**
 * When the toolbar reveal node must render faint.
 *
 * The reveal icon is the only thing its toolbar node carries, so faintness is
 * the only channel that can say "pressing me cannot land where you are": the
 * current file is outside the scene's list AND the scene narrows to that list
 * (`filtered=on`). Either criterion alone is business as usual — an unfiltered
 * scene always contains the file, and a listed file reveals normally.
 *
 * Exception: a held reveal-this-file toggle (props/tags) already wears the
 * activated decoration, so faint would fight it. The always-reveal Files
 * setting is not an exception: with the focus hopping between notes, some in
 * and some out of the list, the faint still only applies while both criteria
 * hold.
 */
export interface RevealFaintInput {
	/** The scene's `filtered` sort option. */
	filtered: boolean;
	/** Workspace active file path, or null when there is none. */
	currentPath: string | null | undefined;
	/** Whether that path belongs to the scene's current list. */
	isListed: boolean;
	/** Whether the reveal-this-file toggle is held (props/tags). */
	toggleActive: boolean;
}

export function shouldFaintRevealNode(input: RevealFaintInput): boolean {
	if (!input.filtered) return false;
	if (input.currentPath == null || input.currentPath === '') return false;
	if (input.toggleActive) return false;
	return !input.isListed;
}
