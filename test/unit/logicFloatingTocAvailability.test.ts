import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import { resolveFloatingTocToggle } from '../../src/logic/logicFloatingTocAvailability';

describe('resolveFloatingTocToggle', () => {
	it('rejects enabling when the active panel sort is incompatible', () => {
		expect(resolveFloatingTocToggle(false, false)).toEqual({
			nextEnabled: false,
			rejection: 'incompatible-sort',
		});
	});

	it('allows enabling for an indexable sort', () => {
		expect(resolveFloatingTocToggle(false, true)).toEqual({
			nextEnabled: true,
			rejection: null,
		});
	});

	it('always allows disabling', () => {
		expect(resolveFloatingTocToggle(true, false)).toEqual({
			nextEnabled: false,
			rejection: null,
		});
	});

	it('guides users to every compatible textual sort', () => {
		expect(en['floating_toc.incompatible_sort']).toContain(
			'name, path, or extension',
		);
		expect(es['floating_toc.incompatible_sort']).toContain(
			'nombre, ruta o extensión',
		);
	});
});
