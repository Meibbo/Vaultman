import { describe, expect, it } from 'vitest';

import settingsSource from '../../src/VaultmanSettings.ts?raw';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';
import nodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import {
	badgeCancelInteractionEvent,
	normalizeBadgeCancelClickMode,
} from '../../src/utils/badgeInteraction';

describe('badge cancel interaction setting', () => {
	it('defaults to single-click cancel and still normalizes a missing value', () => {
		// BT5-065: cancelling a staged operation is reversible, so a new vault
		// gets the single click. `normalizeBadgeCancelClickMode` keeps its own
		// fallback, which is about repairing corrupt data, not about the default.
		expect(DEFAULT_SETTINGS.badgeCancelClickMode).toBe('single');
		expect(normalizeBadgeCancelClickMode(undefined)).toBe('double');
		expect(badgeCancelInteractionEvent('double')).toBe('dblclick');
	});

	it('supports single-click cancel mode', () => {
		expect(normalizeBadgeCancelClickMode('single')).toBe('single');
		expect(badgeCancelInteractionEvent('single')).toBe('click');
	});

	it('exposes localized settings for the cancel click mode', () => {
		expect(settingsSource).toContain(
			"translate('settings.badge_cancel_click')",
		);
		expect(settingsSource).toContain('badgeCancelClickMode');
		for (const messages of [en, es]) {
			expect(messages['settings.badge_cancel_click']).toBeTruthy();
			expect(messages['settings.badge_cancel_click.desc']).toBeTruthy();
			expect(messages['settings.badge_cancel_click.double']).toBeTruthy();
			expect(messages['settings.badge_cancel_click.single']).toBeTruthy();
		}
	});

	it('routes every current cancelable badge renderer through the shared helper', () => {
		for (const source of [treeSource, nodeTableSource, propsSource, tagsSource]) {
			expect(source).toContain('attachBadgeCancelInteraction');
			expect(source).toContain('badgeCancelClickMode');
		}
	});
});
