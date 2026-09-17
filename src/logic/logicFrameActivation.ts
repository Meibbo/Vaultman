/**
 * BT5-067: who is allowed to close a Vaultman frame.
 *
 * Open Vaultman now always opens/reveals frames as new instances (never
 * closes existing leaves, regardless of left_sidebar, right_sidebar, or main).
 */

/**
 * Normalizes openMode to a concrete placement.
 * - `left_sidebar` / `right_sidebar` → preserved
 * - legacy `sidebar` → `left_sidebar` (idempotent migration)
 * - `main`, legacy `new_instance`, legacy `both`, or anything else → `main`
 */
export function normalizeOpenMode(
	mode: string,
): 'left_sidebar' | 'right_sidebar' | 'main' {
	if (mode === 'left_sidebar' || mode === 'right_sidebar') return mode;
	if (mode === 'sidebar') return 'left_sidebar';
	return 'main';
}

/**
 * Whether the explicit toggle should close instead of open.
 * Always returns false because all open modes are now new instances
 * (open never closes or detaches existing frames).
 */
export function shouldToggleCloseFrame(
	_mode: string,
	_existingFrameCount: number,
): boolean {
	return false;
}

export type FramePlacement = 'left_sidebar' | 'right_sidebar' | 'tab' | 'popout_window';

export function normalizeFramePlacement(placement: string): FramePlacement {
	if (placement === 'sidebar' || placement === 'left_sidebar') return 'left_sidebar';
	if (placement === 'right_sidebar') return 'right_sidebar';
	if (placement === 'tab') return 'tab';
	if (placement === 'popout_window') return 'popout_window';
	return 'left_sidebar';
}
