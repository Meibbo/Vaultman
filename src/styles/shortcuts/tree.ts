export const shortcutsTree: [string, string][] = [
	['vm-tree-row', 'flex items-center gap-1.5 px-2 py-0.5 select-none cursor-pointer rounded-[var(--nav-item-radius,var(--radius-s))] transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke] ease-in-out duration-100 text-[var(--text-normal)] hover:bg-[var(--nav-item-background-hover,var(--background-modifier-hover))]'],
	['vm-tree-row-active', 'bg-[var(--nav-item-background-active,var(--background-modifier-active-hover))] font-medium text-[var(--interactive-accent)] rounded-[var(--nav-item-radius,var(--radius-s))]'],
	['vm-tree-row-focused', 'outline outline-1 outline-[var(--interactive-accent)]'],
	['vm-badge', 'inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-[var(--background-modifier-hover)] text-[var(--text-muted)] border border-[var(--background-modifier-border)]'],
	['vm-badge-accent', 'bg-[var(--interactive-accent)]/15 text-[var(--interactive-accent)] border-[var(--interactive-accent)]/30'],
	['vm-badge-warning', 'bg-[var(--text-warning)]/15 text-[var(--text-warning)] border-[var(--text-warning)]/30'],
	['vm-badge-error', 'bg-[var(--text-error)]/15 text-[var(--text-error)] border-[var(--text-error)]/30'],
	['vm-toggle-chevron', 'transition-property-transform ease-in-out duration-200 text-[var(--text-muted)] hover:text-[var(--text-normal)] cursor-pointer'],
	['vm-toggle-chevron-open', 'rotate-90'],
];
