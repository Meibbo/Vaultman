/**
 * BT5-067: who is allowed to close a Vaultman frame.
 *
 * `Open Vaultman` is a toggle in sidebar/main mode, which is intended. The
 * regression was that every command needing a frame went through that same
 * toggle, so "focus search" on an open Vaultman detached it and then had
 * nothing left to focus. Commands that act on the frame must be idempotent;
 * only the explicit open command may toggle.
 */

/**
 * Normalizes openMode to a concrete placement.
 * - `both` and `new_instance` → `new_instance`
 * - `left_sidebar` / `right_sidebar` → preserved
 * - legacy `sidebar` → `left_sidebar` (idempotent migration)
 * - anything else → `main`
 */
export function normalizeOpenMode(
	mode: string,
): 'left_sidebar' | 'right_sidebar' | 'main' | 'new_instance' {
	if (mode === 'both' || mode === 'new_instance') return 'new_instance';
	if (mode === 'left_sidebar' || mode === 'right_sidebar') return mode;
	if (mode === 'sidebar') return 'left_sidebar';
	return 'main';
}

/**
 * Whether the explicit toggle should close instead of open. `new_instance`
 * never closes, because that mode's contract is to always add one more.
 */
export function shouldToggleCloseFrame(
	mode: string,
	existingFrameCount: number,
): boolean {
	return normalizeOpenMode(mode) !== 'new_instance' && existingFrameCount > 0;
}

export type FramePlacement = 'left_sidebar' | 'right_sidebar' | 'tab' | 'popout_window';

export function normalizeFramePlacement(placement: string): FramePlacement {
	if (placement === 'sidebar' || placement === 'left_sidebar') return 'left_sidebar';
	if (placement === 'right_sidebar') return 'right_sidebar';
	if (placement === 'tab') return 'tab';
	if (placement === 'popout_window') return 'popout_window';
	return 'left_sidebar';
}
