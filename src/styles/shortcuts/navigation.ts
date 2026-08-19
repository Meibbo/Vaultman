export const shortcutsNavigation: [string, string][] = [
	['vm-nav-pill', 'rounded-full px-3 py-1 text-xs font-medium transition-property-all ease-in-out duration-150 cursor-pointer select-none bg-[var(--background-secondary)] text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]'],
	['vm-nav-pill-active', 'bg-[var(--interactive-accent)] text-[var(--text-on-accent)] font-semibold shadow-sm'],
	['vm-nav-fab', 'fixed bottom-4 right-4 z-40 h-11 w-11 rounded-full bg-[var(--interactive-accent)] text-[var(--text-on-accent)] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-property-transform ease-in-out duration-150 cursor-pointer'],
	['vm-nav-icon', 'flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-normal)] transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke] ease-in-out duration-150'],
	['vm-toolbar', 'flex items-center gap-1.5 p-1 border-b border-[var(--background-modifier-border)] bg-[var(--background-primary)]'],
	['vm-dock', 'fixed bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-2 p-2 bg-transparent border-none'],
];
