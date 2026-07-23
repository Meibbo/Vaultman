import { describe, expect, it } from 'vitest';

import { shouldToggleCloseFrame } from '../../src/logic/logicFrameActivation';
import mainSource from '../../src/main.ts?raw';

describe('BT5-067 frame command activation', () => {
	it('closes only for the toggling modes, and only when a frame exists', () => {
		expect(shouldToggleCloseFrame('sidebar', 1)).toBe(true);
		expect(shouldToggleCloseFrame('main', 2)).toBe(true);
		expect(shouldToggleCloseFrame('sidebar', 0)).toBe(false);
	});

	it('never closes in new_instance mode, which always adds one', () => {
		expect(shouldToggleCloseFrame('new_instance', 3)).toBe(false);
		// `both` is the legacy spelling of new_instance and must behave the same.
		expect(shouldToggleCloseFrame('both', 3)).toBe(false);
	});

	it('routes commands that act on the frame away from the toggle', () => {
		// The regression: `vaultmanFrameForCommand` awaited `activateView`, which
		// detaches every frame in sidebar/main mode. Running "focus search" with
		// Vaultman open therefore closed it and then focused nothing.
		const helper = mainSource.slice(
			mainSource.indexOf('private async vaultmanFrameForCommand'),
			mainSource.indexOf('private async focusVaultmanContentSearch'),
		);
		expect(helper).toContain('ensureVaultmanFrame');
		expect(helper).not.toContain('activateView');
	});

	it('keeps the toggle available to the explicit open command', () => {
		expect(mainSource).toContain('async activateView');
		expect(mainSource).toContain('void this.activateView()');
	});
});
