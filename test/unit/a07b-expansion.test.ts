import { describe, expect, it } from 'vitest';

import { expansionActionAvailable } from '../../src/logic/logicTreeExpansion';

/**
 * A07b-1 · El boton toolbar expand/collapse debe aparecer en plugins/snippets
 * con grupos activos. B-groups2 doto a los explorers de addons de la misma
 * maquinaria de expansion que files/props/tags (cabeceras de grupo como
 * unicos nodos expandibles, `preset !== 'none'` como interruptor), asi que la
 * lista cerrada de `expansionActionAvailable` ya no tiene razon para
 * excluirlos. RED: hoy devuelve false para addons.
 */
describe('A07b-1 expansion availability in addon explorers', () => {
	it.each([['snippets'], ['plugins']] as const)(
		'tab=%s con nested visible ofrece la accion',
		(tab) => {
			expect(expansionActionAvailable(tab, ['nested'])).toBe(true);
		},
	);

	it.each([['snippets'], ['plugins']] as const)(
		'tab=%s con agrupacion activa y sin nested ofrece la accion',
		(tab) => {
			expect(expansionActionAvailable(tab, [], true)).toBe(true);
		},
	);

	it.each([['snippets'], ['plugins']] as const)(
		'tab=%s sin agrupacion ni nested sigue sin ofrecerla',
		(tab) => {
			expect(expansionActionAvailable(tab, [], false)).toBe(false);
		},
	);
});
