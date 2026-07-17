import { describe, expect, it } from 'vitest';

import { shouldShowUpdates } from '../../src/logic/logicUpdateNotice';
import mainSource from '../../src/main.ts?raw';
import modalSource from '../../src/modals/modalUpdates.ts?raw';

describe('versioned Updates welcome', () => {
	it('shows once when the installed version changes', () => {
		expect(shouldShowUpdates('', '1.2.0-beta.2')).toBe(true);
		expect(shouldShowUpdates('1.2.0-beta.1', '1.2.0-beta.2')).toBe(true);
		expect(shouldShowUpdates('1.2.0-beta.2', '1.2.0-beta.2')).toBe(false);
		expect(shouldShowUpdates('1.2.0-beta.2', '')).toBe(false);
	});

	it('opens after layout readiness, persists the seen version, and remains reopenable', () => {
		expect(mainSource).toContain('showUpdatesIfNeeded');
		expect(mainSource).toContain('this.app.workspace.onLayoutReady');
		expect(mainSource).toContain('lastSeenUpdatesVersion');
		expect(mainSource).toContain("id: 'open-updates'");
		expect(modalSource).toContain("'updates.clean_filters'");
		expect(modalSource).toContain('translate(key)');
	});
});
