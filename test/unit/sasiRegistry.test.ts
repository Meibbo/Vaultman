import { describe, expect, it } from 'vitest';

import {
	createSasiRegistry,
	type SasiDef,
} from '../../src/logic/logicSasiRegistry';
import { registerMoveActions } from '../../src/logic/logicSasiMoveActions';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

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

describe('U130-01 move actions en SASI', () => {
	it('registra las cinco con su categoria correcta', () => {
		const reg = createSasiRegistry();
		registerMoveActions(reg);
		expect(reg.listOperations().map((d) => d.id)).toEqual([
			'vaultman.move.proceed',
		]);
		expect(reg.listActions().map((d) => d.id)).toEqual([
			'vaultman.move.cancel',
			'vaultman.move.toggleWrite',
			'vaultman.move.toggleOriginDisposition',
			'vaultman.move.toggleMoveKind',
		]);
	});

	it('solo `proceed` muta el vault', () => {
		const reg = createSasiRegistry();
		registerMoveActions(reg);
		const mutating = reg
			.list('function')
			.filter((d) => d.mutatesVault)
			.map((d) => d.id);
		expect(mutating).toEqual(['vaultman.move.proceed']);
	});

	it('cada una tiene su etiqueta en en y es', () => {
		const reg = createSasiRegistry();
		registerMoveActions(reg);
		for (const def of reg.list('function')) {
			expect(en[def.labelKey]).toBeTruthy();
			expect(es[def.labelKey]).toBeTruthy();
		}
	});
});

describe('U130-04 toggle de tipo de movimiento', () => {
	it('esta registrado como action, no como operation', () => {
		const reg = createSasiRegistry();
		registerMoveActions(reg);
		const ids = reg.listActions().map((d) => d.id);
		expect(ids).toContain('vaultman.move.toggleMoveKind');
		expect(reg.listOperations().map((d) => d.id)).not.toContain(
			'vaultman.move.toggleMoveKind',
		);
	});

	it('declara la statusBar como superficie', () => {
		const reg = createSasiRegistry();
		registerMoveActions(reg);
		const def = reg.resolve('vaultman.move.toggleMoveKind').def;
		expect(def?.supports.map((s) => s.surface)).toContain('statusBar');
	});
});

