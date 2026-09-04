import { describe, expect, it } from 'vitest';

import {
	buildIndexGroups,
	type IndexNodeRef,
} from '../../src/logic/logicIndexGroups';

const NODES: IndexNodeRef[] = [
	{ id: '1', label: 'alfa', isContainer: false },
	{ id: '2', label: 'Beta', isContainer: false },
	{ id: '3', label: 'alba', isContainer: false },
];

describe('U130-03 predicado de agrupacion', () => {
	it('sin predicado agrupa por primer glifo, como hoy', () => {
		// REGRESION CERO DEL RAIL: si esto cambia, el indice flotante cambia, y
		// el indice flotante esta fuera del alcance de esta iniciativa.
		expect(buildIndexGroups(NODES).map((g) => [g.key, g.count])).toEqual([
			['A', 2],
			['B', 1],
		]);
	});

	it('acepta un predicado y agrupa por el', () => {
		const byLength = (n: IndexNodeRef) => String(n.label.length);
		expect(buildIndexGroups(NODES, byLength).map((g) => g.key)).toEqual(['4']);
	});

	it('el predicado decide la clave, NO el orden', () => {
		// Se sigue emitiendo en orden de primer encuentro. El orden DE los
		// grupos es un ScopeSort aparte (Tarea 4), no cosa del predicado.
		const byLast = (n: IndexNodeRef) => n.label.slice(-1).toUpperCase();
		expect(buildIndexGroups(NODES, byLast).map((g) => g.key)).toEqual([
			'A',
		]);
	});

	it('un predicado que devuelve null salta el nodo', () => {
		const skipBeta = (n: IndexNodeRef) =>
			n.label === 'Beta' ? null : n.label[0].toUpperCase();
		expect(buildIndexGroups(NODES, skipBeta).map((g) => g.key)).toEqual(['A']);
	});
});
