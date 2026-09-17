import { describe, expect, it } from 'vitest';

import { shouldToggleCloseFrame } from '../../src/logic/logicFrameActivation';
import mainSource from '../../src/main.ts?raw';

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
});
