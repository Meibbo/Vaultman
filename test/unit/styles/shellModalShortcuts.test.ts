import { describe, it, expect } from 'vitest';
import { createGenerator } from 'unocss';
import unoConfig from '../../../uno.config';
import { shortcutsNavigation, shortcutsIslands } from '../../../src/styles/shortcuts/index';

describe('Layout Shell, Navigation Dock, Modals and Popovers Shortcuts (Slice 2)', () => {
	it('should provide shortcuts for navbar pill, dock actions, and FAB badges', () => {
		const names = shortcutsNavigation.map(([name]) => name);
		expect(names).toContain('vm-nav-pill');
		expect(names).toContain('vm-nav-fab');
		expect(names).toContain('vm-toolbar');
		expect(names).toContain('vm-dock');
	});

	it('should provide shortcuts for popup islands, dialog content and overlays', () => {
		const names = shortcutsIslands.map(([name]) => name);
		expect(names).toContain('vm-popup-island');
		expect(names).toContain('vm-dialog-content');
		expect(names).toContain('vm-dialog-overlay');
		expect(names).toContain('vm-fnr-bar');
	});

	it('should generate valid CSS rules for shell and modal shortcuts without legacy prefixes', async () => {
		const uno = await createGenerator(unoConfig);
		const { css } = await uno.generate([
			'vm-nav-pill',
			'vm-nav-pill-active',
			'vm-nav-fab',
			'vm-toolbar',
			'vm-dock',
			'vm-popup-island',
			'vm-dialog-content',
			'vm-dialog-overlay',
			'vm-fnr-bar',
		]);

		expect(css).toContain('.vm-nav-pill');
		expect(css).toContain('.vm-nav-pill-active');
		expect(css).toContain('.vm-nav-fab');
		expect(css).toContain('.vm-toolbar');
		expect(css).toContain('.vm-dock');
		expect(css).toContain('.vm-popup-island');
		expect(css).toContain('.vm-dialog-content');
		expect(css).toContain('.vm-dialog-overlay');
		expect(css).toContain('.vm-fnr-bar');
		expect(css).not.toContain('.vaultman-nav-pill');
		expect(css).not.toContain('.vaultman-dialog');
	});
});
