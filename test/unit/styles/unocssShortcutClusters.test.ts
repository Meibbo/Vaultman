import { describe, it, expect } from 'vitest';
import { createGenerator } from 'unocss';
import unoConfig from '../../../uno.config';
import {
	shortcutsButtons,
	shortcutsCards,
	shortcutsNavigation,
	shortcutsTree,
	shortcutsTable,
	shortcutsIslands,
	allShortcuts,
} from '../../../src/styles/shortcuts/index';

describe('UnoCSS SOLID Shortcut Clusters & Token Layer (Slice 1)', () => {
	it('should export discrete, single-responsibility shortcut clusters', () => {
		expect(shortcutsButtons).toBeDefined();
		expect(shortcutsCards).toBeDefined();
		expect(shortcutsNavigation).toBeDefined();
		expect(shortcutsTree).toBeDefined();
		expect(shortcutsTable).toBeDefined();
		expect(shortcutsIslands).toBeDefined();
		expect(allShortcuts).toBeDefined();
		expect(Array.isArray(allShortcuts)).toBe(true);
	});

	it('should strictly contain only canonical .vm-* shortcuts and zero .vaultman-* leftovers', () => {
		for (const [name] of allShortcuts) {
			expect(name).not.toMatch(/^vaultman-/);
			expect(name.startsWith('vm-') || name.startsWith('obsidian-mimic-')).toBe(true);
		}
	});

	it('should generate CSS rules for core UI button and card shortcuts', async () => {
		const uno = await createGenerator(unoConfig);
		const { css } = await uno.generate(['vm-btn', 'vm-btn-primary', 'vm-btn-squircle', 'vm-card']);

		expect(css).toContain('.vm-btn');
		expect(css).toContain('.vm-btn-primary');
		expect(css).toContain('.vm-btn-squircle');
		expect(css).toContain('.vm-card');
		expect(css).not.toContain('.vaultman-btn');
	});

	it('should generate CSS rules for navigation docks, pills and FABs', async () => {
		const uno = await createGenerator(unoConfig);
		const { css } = await uno.generate(['vm-nav-pill', 'vm-nav-fab', 'vm-nav-icon']);

		expect(css).toContain('.vm-nav-pill');
		expect(css).toContain('.vm-nav-fab');
		expect(css).toContain('.vm-nav-icon');
	});

	it('should generate CSS rules for tree rows, tables, badges and islands', async () => {
		const uno = await createGenerator(unoConfig);
		const { css } = await uno.generate(['vm-tree-row', 'vm-badge', 'vm-node-table', 'vm-popup-island']);

		expect(css).toContain('.vm-tree-row');
		expect(css).toContain('.vm-badge');
		expect(css).toContain('.vm-node-table');
		expect(css).toContain('.vm-popup-island');
	});

	it('should emit theme tokens with --vm-* prefix and correct densities in presetTheme', async () => {
		const uno = await createGenerator(unoConfig);
		const { css } = await uno.generate(['vm-theme-native', 'vm-theme-vaultman']);

		expect(css).toContain('--vm-row-height');
		expect(css).toContain('--vm-icon-size');
		expect(css).toContain('.vm-theme-native');
		expect(css).toContain('.vm-theme-vaultman');
		expect(css).not.toContain('--vaultman-');
	});
});
