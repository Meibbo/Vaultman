import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

describe('U121-053: view option [In mode] renamed to Behavior', () => {
	it('shows "Behavior" as the UI label in en', () => {
		expect(en['viewmenu.in_mode']).toBe('Behavior');
	});

	it('translates the label in es', () => {
		expect(es['viewmenu.in_mode']).toBe('Comportamiento');
	});

	it('keeps the i18n key and its four children unchanged', () => {
		for (const dict of [en, es]) {
			expect(dict['viewmenu.in_mode.open']).toBeTruthy();
			expect(dict['viewmenu.in_mode.add']).toBeTruthy();
			expect(dict['viewmenu.in_mode.select']).toBeTruthy();
			expect(dict['viewmenu.in_mode.filter']).toBeTruthy();
		}
	});

	it('keeps en/es parity for the viewmenu block', () => {
		const keys = Object.keys(en).filter((k) => k.startsWith('viewmenu.'));
		for (const k of keys) {
			expect(es).toHaveProperty(k);
		}
	});
});
