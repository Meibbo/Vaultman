import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

// The submenu names the selected input mode and keeps the implementation key
// stable for saved layouts.
describe('view option uses the Input label', () => {
	it('shows "Input:" as the UI label in en', () => {
		expect(en['viewmenu.interaction']).toBe('Input:');
	});

	it('translates the label in es', () => {
		expect(es['viewmenu.interaction']).toBe('Entrada:');
	});

	it('keeps the i18n key and its five children unchanged', () => {
		for (const dict of [en, es]) {
			expect(dict['viewmenu.interaction.open']).toBeTruthy();
			expect(dict['viewmenu.interaction.add']).toBeTruthy();
			expect(dict['viewmenu.interaction.select']).toBeTruthy();
			expect(dict['viewmenu.interaction.filter']).toBeTruthy();
			expect(dict['viewmenu.interaction.input']).toBeTruthy();
		}
	});

	it('retires the legacy key entirely', () => {
		// Una clave huerfana se traduce a si misma: el usuario veria
		// `viewmenu.in_mode` literal en el menu.
		for (const dict of [en, es]) {
			expect(dict['viewmenu.in_mode']).toBeUndefined();
		}
	});

	it('keeps en/es parity for the viewmenu block', () => {
		const keys = Object.keys(en).filter((k) => k.startsWith('viewmenu.'));
		for (const k of keys) {
			expect(es).toHaveProperty(k);
		}
	});
});
