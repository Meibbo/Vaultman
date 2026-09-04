import { describe, expect, it } from 'vitest';

import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { registerMoveActions } from '../../src/logic/logicSasiMoveActions';
import { createSasiProvider } from '../../src/services/serviceSasiProvider';

describe('U130-01 SASI como provider', () => {
	it('expone las entradas como nodos con id y etiqueta', () => {
		const reg = createSasiRegistry();
		registerMoveActions(reg);
		const provider = createSasiProvider(reg);
		const nodes = provider.nodesFor('function');
		expect(nodes).toHaveLength(5);
		expect(nodes[0]).toMatchObject({
			id: 'vaultman.move.proceed',
			labelKey: 'sasi.move.proceed',
			kind: 'operation',
		});
	});

	it('un eje vacio devuelve lista vacia, no lanza', () => {
		const provider = createSasiProvider(createSasiRegistry());
		expect(provider.nodesFor('kind')).toEqual([]);
		expect(provider.nodesFor('provider')).toEqual([]);
	});

	it('marca los nodos que mutan el vault', () => {
		const reg = createSasiRegistry();
		registerMoveActions(reg);
		const provider = createSasiProvider(reg);
		const dangerous = provider
			.nodesFor('function')
			.filter((n) => n.mutatesVault);
		expect(dangerous.map((n) => n.id)).toEqual(['vaultman.move.proceed']);
	});
});
