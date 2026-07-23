import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import mainSource from '../../src/main.ts?raw';

describe('BT5-065 defaults for a new vault', () => {
	it('ships the compact preset without tab labels', () => {
		// `minimalStyle` is already the default preset, so the label default is
		// what decides what a new user actually sees.
		expect(DEFAULT_SETTINGS.minimalStyle).toBe(true);
		expect(DEFAULT_SETTINGS.filtersShowTabLabels).toBe(false);
	});

	it('cancels an operation badge with a single click', () => {
		expect(DEFAULT_SETTINGS.badgeCancelClickMode).toBe('single');
	});

	it('leaves the one-time tab label migration able to tell the cases apart', () => {
		// The migration re-enables labels for an existing vault that had them
		// off. It must key off a saved value, never off the default, or every
		// new vault would be migrated straight back to labels on.
		expect(mainSource).toContain('hasSavedTabLabelPref');
		expect(mainSource).toContain("saved.filtersShowTabLabels === false");
	});
});
