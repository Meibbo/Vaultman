import { describe, expect, it } from 'vitest';
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import {
	SEARCH_CREATE_TARGET_ID,
	SEARCH_CYCLE_CATEGORY_ID,
	registerSearchActions,
} from '../../src/logic/logicSasiSearchActions';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

describe('U130-05b: los controles del searchbox en SASI', () => {
	it('registra los dos como actions de la superficie searchbox', () => {
		const registry = createSasiRegistry();
		registerSearchActions(registry);
		for (const id of [SEARCH_CYCLE_CATEGORY_ID, SEARCH_CREATE_TARGET_ID]) {
			const resolved = registry.resolve(id);
			expect(resolved.available).toBe(true);
			expect(resolved.def?.kind).toBe('action');
			// No se les inventa alcance mas alla del searchbox: no hay quien los
			// consuma en otra superficie y seria alcance imaginado.
			expect(resolved.def?.supports).toEqual([{ surface: 'searchbox' }]);
			expect(resolved.def?.mutatesVault).toBeUndefined();
		}
	});

	it('sus labelKey estan traducidas en los dos idiomas', () => {
		const registry = createSasiRegistry();
		registerSearchActions(registry);
		for (const id of [SEARCH_CYCLE_CATEGORY_ID, SEARCH_CREATE_TARGET_ID]) {
			const key = registry.resolve(id).def!.labelKey;
			expect(en[key]).toBeTruthy();
			expect(es[key]).toBeTruthy();
		}
	});

	it('no pisa los ids del move mode', () => {
		// `register` lanza con id duplicado, pero un choque de NAMESPACE no lo
		// detecta nadie: `vaultman.search.*` y `vaultman.move.*` son familias
		// distintas y tienen que seguir siendolo.
		expect(SEARCH_CYCLE_CATEGORY_ID.startsWith('vaultman.search.')).toBe(true);
		expect(SEARCH_CREATE_TARGET_ID.startsWith('vaultman.search.')).toBe(true);
	});
});
