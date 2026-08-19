import type { UserShortcuts } from 'unocss';

export const shortcutsIslands: UserShortcuts = [
	['vm-popup-island', 'rounded-xl border border-[var(--background-modifier-border)] bg-[var(--background-primary)] p-3 shadow-xl backdrop-blur-md flex flex-col gap-2 z-50'],
	['vm-dialog-content', 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg rounded-2xl border border-[var(--background-modifier-border)] bg-[var(--background-primary)] p-6 shadow-2xl'],
	['vm-dialog-overlay', 'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm'],
	['vm-fnr-bar', 'flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--background-secondary)] border border-[var(--background-modifier-border)] shadow-sm'],
];
