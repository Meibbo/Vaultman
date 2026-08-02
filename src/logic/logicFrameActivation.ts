/**
 * BT5-067: who is allowed to close a Vaultman frame.
 *
 * `Open Vaultman` is a toggle in sidebar/main mode, which is intended. The
 * regression was that every command needing a frame went through that same
 * toggle, so "focus search" on an open Vaultman detached it and then had
 * nothing left to focus. Commands that act on the frame must be idempotent;
 * only the explicit open command may toggle.
 */

/** `both` is the legacy spelling of `new_instance`. */
export function normalizeOpenMode(mode: string): 'new_instance' | 'sidebar' | 'main' {
	if (mode === 'both' || mode === 'new_instance') return 'new_instance';
	return mode === 'sidebar' ? 'sidebar' : 'main';
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
