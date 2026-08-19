export const shortcutsTable: [string, string][] = [
	['vm-node-table', 'w-full text-left border-collapse select-none'],
	['vm-node-table-header', 'sticky top-0 z-20 bg-[var(--background-secondary)] text-xs font-semibold text-[var(--text-muted)] border-b border-[var(--background-modifier-border)]'],
	['vm-node-table-cell', 'px-2.5 py-1.5 text-sm text-[var(--text-normal)] border-b border-[var(--background-modifier-border)]/50 truncate'],
	['vm-node-table-row', 'hover:bg-[var(--background-modifier-hover)] transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke] ease-in-out duration-100 cursor-pointer'],
	['vm-node-table-row-selected', 'bg-[var(--background-modifier-active-hover)]'],
	['vm-node-table-header-resizer', 'absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--interactive-accent)] transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke] ease-in-out duration-150 z-30'],
];
