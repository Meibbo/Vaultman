import { defineConfig, presetAttributify, presetIcons, presetWind3 } from 'unocss';

export default defineConfig({
	presets: [
		presetWind3({ preflight: false }),
		presetAttributify(),
		presetIcons({ scale: 1.0, warn: false }),
	],
	safelist: [
		'vm-root',
		'vm-mode-thin',
		'vm-mode-balanced',
		'vm-mode-thick',
		'vm-id-native',
		'vm-id-bases',
		'vm-id-outline',
		'vm-id-bookmarks',
		'vm-faint',
		'vm-reduced-motion',
		'vm-foul-detect',
		'obsidian-mimic-file',
		'obsidian-mimic-folder',
		'obsidian-mimic-tree-item',
		'obsidian-mimic-property',
	],
	shortcuts: [
		// Mimic shortcuts emit ONLY UnoCSS-known utilities; the native
		// Obsidian classes (nav-file, tree-item, metadata-property, etc.)
		// must be applied directly on the element via Svelte class arbitration
		// because they are not Uno utilities — they are pass-through scoping
		// hooks for community CSS snippets.
		['obsidian-mimic-file-layout', 'flex items-center px-2'],
		['obsidian-mimic-folder-layout', 'flex items-center'],
		[
			'vm-btn-squircle',
			'inline-flex items-center justify-center rounded-md p-1 hover:bg-[var(--background-modifier-hover)]',
		],
		[
			'vm-card',
			'rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-2',
		],
		[
			'vm-btn-primary',
			'inline-flex items-center justify-center rounded-md px-3 py-1 bg-[var(--interactive-accent)] text-[var(--text-on-accent)] hover:bg-[var(--interactive-accent-hover)]',
		],
	],
	rules: [],
});
