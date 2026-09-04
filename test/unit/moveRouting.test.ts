import { describe, expect, it } from 'vitest';

import {
	fileMoveStrategy,
	tagMoveStrategy,
	propMoveStrategy,
} from '../../src/logic/logicMoveRouting';

describe('U130-02 fileScene routing', () => {
	it('acepta una carpeta hermana como destino', () => {
		expect(
			fileMoveStrategy.validate(
				{ id: 'a', kind: 'folder', canonicalId: 'proyectos/alfa' },
				{ id: 'b', kind: 'folder', canonicalId: 'archivo' },
			),
		).toEqual({ ok: true });
	});

	it('rechaza mover una carpeta dentro de su propio descendiente', () => {
		expect(
			fileMoveStrategy.validate(
				{ id: 'a', kind: 'folder', canonicalId: 'proyectos' },
				{ id: 'b', kind: 'folder', canonicalId: 'proyectos/alfa/sub' },
			),
		).toEqual({ ok: false, reason: 'would-create-cycle' });
	});

	it('rechaza el destino que es el propio origen', () => {
		expect(
			fileMoveStrategy.validate(
				{ id: 'a', kind: 'folder', canonicalId: 'proyectos' },
				{ id: 'a', kind: 'folder', canonicalId: 'proyectos' },
			),
		).toEqual({ ok: false, reason: 'origin-is-destination' });
	});

	it('rechaza un fichero como destino: solo carpetas y root', () => {
		expect(
			fileMoveStrategy.validate(
				{ id: 'a', kind: 'file', canonicalId: 'a.md' },
				{ id: 'b', kind: 'file', canonicalId: 'b.md' },
			),
		).toEqual({ ok: false, reason: 'incompatible-kind' });
	});

	it('acepta root como destino', () => {
		expect(
			fileMoveStrategy.validate(
				{ id: 'a', kind: 'file', canonicalId: 'x/a.md' },
				{ id: 'root', kind: 'root', canonicalId: '' },
			),
		).toEqual({ ok: true });
	});
});

describe('U130-02 tagScene routing', () => {
	it('rechaza reanidar un tag bajo su propio descendiente', () => {
		expect(
			tagMoveStrategy.validate(
				{ id: 't1', kind: 'tag', canonicalId: 'proyecto' },
				{ id: 't2', kind: 'tag', canonicalId: 'proyecto/alfa' },
			),
		).toEqual({ ok: false, reason: 'would-create-cycle' });
	});

	it('acepta desanidar a root', () => {
		expect(
			tagMoveStrategy.validate(
				{ id: 't1', kind: 'tag', canonicalId: 'proyecto/alfa' },
				{ id: 'root', kind: 'root', canonicalId: '' },
			),
		).toEqual({ ok: true });
	});

	it('no confunde un prefijo de texto con un ancestro', () => {
		// `proyectos` NO es ancestro de `proyecto/alfa`: el corte es por
		// segmento, no por substring. Sin esto, renombrar un tag a algo que
		// empiece igual bloquearia movimientos legitimos.
		expect(
			tagMoveStrategy.validate(
				{ id: 't1', kind: 'tag', canonicalId: 'proyectos' },
				{ id: 't2', kind: 'tag', canonicalId: 'proyecto/alfa' },
			),
		).toEqual({ ok: true });
	});
});

describe('U130-02 propScene routing', () => {
	it('acepta node_value hacia node_prop', () => {
		expect(
			propMoveStrategy.validate(
				{ id: 'v1', kind: 'value', canonicalId: 'lugar/cocina' },
				{ id: 'p1', kind: 'prop', canonicalId: 'sitio' },
			),
		).toEqual({ ok: true });
	});

	it('rechaza prop como origen: el movimiento es de valores', () => {
		expect(
			propMoveStrategy.validate(
				{ id: 'p1', kind: 'prop', canonicalId: 'lugar' },
				{ id: 'p2', kind: 'prop', canonicalId: 'sitio' },
			),
		).toEqual({ ok: false, reason: 'incompatible-kind' });
	});

	it('no tiene guard de ciclo: es heterogeneo y de un salto', () => {
		// Documentado como test para que nadie le anada uno "por simetria":
		// un value nunca puede ser ancestro de un prop.
		expect(propMoveStrategy.guardsCycles).toBe(false);
	});
});
