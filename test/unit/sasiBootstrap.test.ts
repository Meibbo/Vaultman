import { describe, expect, it } from 'vitest';
import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';

describe('U130 SASI bootstrap', () => {
	it('nace con los tres ejes aunque solo rellene function', () => {
		const { registry } = createVaultmanSasi();
		// Los ejes vacios EXISTEN: es la puerta que prueba que el registro no
		// habra que rehacerlo cuando llegue el sceneBuilder.
		expect(registry.list('kind')).toEqual([]);
		expect(registry.list('provider')).toEqual([]);
		expect(registry.list('function').length).toBeGreaterThan(0);
	});

	it('separa operations de actions en vez de un saco unico', () => {
		const { registry } = createVaultmanSasi();
		const operations = registry.listOperations().map((def) => def.id);
		const actions = registry.listActions().map((def) => def.id);
		// Solo los `proceed` escriben en el vault (valueMove + nodemove U130-02).
		expect(operations).toEqual([
			'vaultman.move.proceed',
			'vaultman.nodemove.proceed',
		]);
		expect(actions).toContain('vaultman.move.cancel');
		expect(actions).toContain('vaultman.move.toggleMoveKind');
		expect(actions).toContain('vaultman.search.cycleCategory');
		expect(actions).toContain('vaultman.search.createTarget');
		// Ninguna action puede declararse mutatesVault: es el campo que obliga a
		// confirmar, y una action que lo llevara saltaria esa puerta.
		expect(registry.listActions().every((def) => !def.mutatesVault)).toBe(true);
	});

	it('el provider proyecta lo mismo que el registro', () => {
		const { registry, provider } = createVaultmanSasi();
		expect(provider.nodesFor('function').map((node) => node.id)).toEqual(
			registry.list('function').map((def) => def.id),
		);
	});

	it('un id no registrado degrada, no lanza', () => {
		const { registry } = createVaultmanSasi();
		const resolved = registry.resolve('vaultman.move.retirada');
		expect(resolved.available).toBe(false);
		expect(resolved.def).toBeNull();
	});

	it('llamarlo dos veces da registros independientes', () => {
		// Si compartieran el Map, la segunda llamada lanzaria `id duplicado`. Es
		// la puerta contra hacerlo singleton de modulo por accidente.
		expect(() => {
			createVaultmanSasi();
			createVaultmanSasi();
		}).not.toThrow();
	});
});
