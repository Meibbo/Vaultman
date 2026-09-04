import { describe, expect, it } from 'vitest';

import {
	createSasiRegistry,
	type SasiDef,
} from '../../src/logic/logicSasiRegistry';

const PROCEED: SasiDef = {
	id: 'vaultman.move.proceed',
	axis: 'function',
	kind: 'operation',
	labelKey: 'sasi.move.proceed',
	mutatesVault: true,
	supports: [{ surface: 'panelWidget' }],
};

const CANCEL: SasiDef = {
	id: 'vaultman.move.cancel',
	axis: 'function',
	kind: 'action',
	labelKey: 'sasi.move.cancel',
	supports: [{ surface: 'panelWidget' }],
};

describe('U130-01 SASI registry', () => {
	it('nace con los tres ejes, aunque solo se rellene uno', () => {
		const reg = createSasiRegistry();
		// Es la puerta que prueba que el registro NO es una lista de acciones:
		// si `kind` y `provider` no existen como ejes, hay que rehacerlo entero
		// cuando llegue el sceneBuilder.
		expect(reg.list('kind')).toEqual([]);
		expect(reg.list('provider')).toEqual([]);
		expect(reg.list('function')).toEqual([]);
	});

	it('separa operations de actions, no las mete en un saco', () => {
		const reg = createSasiRegistry();
		reg.register(PROCEED);
		reg.register(CANCEL);
		expect(reg.listOperations().map((d) => d.id)).toEqual([
			'vaultman.move.proceed',
		]);
		expect(reg.listActions().map((d) => d.id)).toEqual([
			'vaultman.move.cancel',
		]);
	});

	it('resuelve por id estable', () => {
		const reg = createSasiRegistry();
		reg.register(PROCEED);
		expect(reg.resolve('vaultman.move.proceed')).toEqual({
			def: PROCEED,
			available: true,
		});
	});

	it('un id retirado resuelve available:false, no undefined', () => {
		const reg = createSasiRegistry();
		// Mismo contrato que resolveCommandAction en logicCommandActions.ts:
		// un hueco con nombre es informacion; desaparecer es irreparable.
		expect(reg.resolve('vaultman.move.noexiste')).toEqual({
			def: null,
			available: false,
			id: 'vaultman.move.noexiste',
		});
	});

	it('rechaza un alta duplicada en vez de pisarla en silencio', () => {
		const reg = createSasiRegistry();
		reg.register(PROCEED);
		expect(() => reg.register(PROCEED)).toThrow(/vaultman.move.proceed/);
	});
});
