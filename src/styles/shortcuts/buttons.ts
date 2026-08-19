import type { UserShortcuts } from 'unocss';

export const shortcutsButtons: UserShortcuts = [
	['vm-btn', 'inline-flex items-center justify-center font-medium select-none cursor-pointer transition-colors duration-150 rounded px-2.5 py-1 text-sm bg-transparent border-none text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)] active:bg-[var(--background-modifier-active)]'],
	['vm-btn-primary', 'bg-[var(--interactive-accent)] text-[var(--text-on-accent)] hover:bg-[var(--interactive-accent-hover)] font-semibold'],
	['vm-btn-ghost', 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]'],
	['vm-btn-danger', 'bg-[var(--text-error)] text-white hover:opacity-90'],
	['vm-btn-squircle', 'rounded-[10px] p-1.5 flex items-center justify-center transition-all duration-200 border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] hover:bg-[var(--background-modifier-hover)] active:scale-95 shadow-sm'],
	['vm-btn-squircle-sm', 'vm-btn-squircle h-7 w-7 text-xs'],
	['vm-btn-squircle-md', 'vm-btn-squircle h-8 w-8 text-sm'],
	['vm-btn-squircle-lg', 'vm-btn-squircle h-9 w-9 text-base'],
];
