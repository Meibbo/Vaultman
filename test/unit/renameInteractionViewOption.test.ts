import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

// U130-06 supersede a U121-053: el submenu pasa de `Behavior` a `Interaction`,
// para alinear la etiqueta con el tipo InteractionMode, que es como se llama en
// el codigo. La guarda de paridad en/es se conserva: es lo unico de este fichero
// que no dependia del nombre concreto.
describe('U130-06: view option renamed from Behavior to Interaction', () => {
	it('shows "Interaction" as the UI label in en', () => {
		expect(en['viewmenu.interaction']).toBe('Interaction');
	});

	it('translates the label in es', () => {
		expect(es['viewmenu.interaction']).toBe('Interacción');
	});

	it('keeps the i18n key and its four children unchanged', () => {
		for (const dict of [en, es]) {
			expect(dict['viewmenu.interaction.open']).toBeTruthy();
			expect(dict['viewmenu.interaction.add']).toBeTruthy();
			expect(dict['viewmenu.interaction.select']).toBeTruthy();
			expect(dict['viewmenu.interaction.filter']).toBeTruthy();
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
