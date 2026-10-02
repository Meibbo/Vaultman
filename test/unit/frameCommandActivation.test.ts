import { describe, expect, it } from 'vitest';

import { shouldToggleCloseFrame } from '../../src/logic/logicFrameActivation';
import mainSource from '../../src/main.ts?raw';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

describe('BT5-067 frame command activation', () => {
	it('never closes regardless of open mode (all modes are new instances)', () => {
		expect(shouldToggleCloseFrame('sidebar', 1)).toBe(false);
		expect(shouldToggleCloseFrame('main', 2)).toBe(false);
		expect(shouldToggleCloseFrame('left_sidebar', 1)).toBe(false);
		expect(shouldToggleCloseFrame('right_sidebar', 1)).toBe(false);
		expect(shouldToggleCloseFrame('new_instance', 3)).toBe(false);
		expect(shouldToggleCloseFrame('both', 3)).toBe(false);
	});

	it('routes commands that act on the frame away from the toggle', () => {
		// The regression: vaultmanFrameForCommand awaited activateView, which
		// detaches every frame in sidebar/main mode. Running "focus search" with
		// Vaultman open therefore closed it and then focused nothing.
		const helper = mainSource.slice(
			mainSource.indexOf('private async vaultmanFrameForCommand'),
			mainSource.indexOf('private async focusVaultmanContentSearch'),
		);
		expect(helper).toContain('ensureVaultmanFrame');
		expect(helper).not.toContain('activateView');
	});

	it('keeps the explicit open command available', () => {
		expect(mainSource).toContain('async activateView');
		expect(mainSource).toContain('void this.activateView()');
	});

	it('creates a declared leased instance before normal open renders a frame', () => {
		const openBlock = mainSource.slice(
			mainSource.indexOf('private async openVaultmanView'),
			mainSource.indexOf('private openRibbonLocationMenu'),
		);
		expect(openBlock).toContain('createAndOpenWorkspaceInstance');
		expect(openBlock).toContain('opened.address.leaf');
		expect(openBlock).not.toContain('setViewState');
	});

	it('routes direct reveal creation through the declared instance path', () => {
		const revealBlock = mainSource.slice(
			mainSource.indexOf('async revealNodeInVaultman'),
			mainSource.indexOf('async revealFrontmatterProperty'),
		);
		expect(revealBlock).toContain('createAndOpenWorkspaceInstance');
		expect(revealBlock).not.toContain('setViewState');
	});

	it('gives the ribbon Open Vaultman node its own location alt-cmenu', () => {
		expect(mainSource).toContain('registerDomEvent');
		expect(mainSource).toContain("'contextmenu'");
		expect(mainSource).toContain('openRibbonLocationMenu');
		expect(mainSource).toContain('showAtMouseEvent');
		expect(mainSource).toContain("translate('ribbon.open.left_sidebar')");
		expect(mainSource).toContain("translate('ribbon.open.main')");
		expect(mainSource).toContain("translate('ribbon.open.right_sidebar')");
		expect(mainSource).toContain("this.openVaultmanView('left_sidebar')");
		expect(mainSource).toContain("this.openVaultmanView('main')");
		expect(mainSource).toContain("this.openVaultmanView('right_sidebar')");
		for (const key of [
			'ribbon.open.left_sidebar',
			'ribbon.open.main',
			'ribbon.open.right_sidebar',
		]) {
			expect(en[key], `en: ${key}`).toBeTruthy();
			expect(es[key], `es: ${key}`).toBeTruthy();
			expect(es[key], `es!=en: ${key}`).not.toBe(en[key]);
		}
	});
});
