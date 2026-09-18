import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { registerMoveActions } from '../../src/logic/logicSasiMoveActions';
import { createSasiInvoker } from '../../src/logic/logicSasiInvoke';
import {
	searchCellFace,
	searchCellIds,
} from '../../src/logic/logicSearchCellProjection';

describe('U130-01 wiring de las move actions', () => {
	it('explorerProps expone sus handlers por id de SASI', () => {
		const src = readFileSync(
			new URL('../../src/components/containers/explorerProps.ts', import.meta.url),
			'utf8',
		);
		expect(src).toContain('sasiMoveHandlers');
		for (const id of [
			'vaultman.move.cancel',
			'vaultman.move.toggleWrite',
			'vaultman.move.toggleOriginDisposition',
		]) {
			expect(src).toContain(id);
		}
	});

	it('Files expone la cancelacion generica y la especifica', () => {
		const src = readFileSync(
			new URL('../../src/components/containers/explorerFiles.ts', import.meta.url),
			'utf8',
		);
		expect(src).toContain("'vaultman.move.cancel'");
		expect(src).toContain("'vaultman.nodemove.cancel'");
	});

	it('los metodos originales siguen existiendo', () => {
		const src = readFileSync(
			new URL('../../src/components/containers/explorerProps.ts', import.meta.url),
			'utf8',
		);
		// El cableado NO es un movimiento: si estos desaparecen, algo se llevo
		// comportamiento por delante y esta tarea se paso de alcance.
		expect(src).toContain('toggleValueMoveWrite(): void');
		expect(src).toContain('toggleValueMoveOriginDisposition(): void');
		expect(src).toContain('cancelValueMoveMode(): void');
	});
});

describe('U130-04: proceed solo escribe con consentimiento explicito', () => {
	const buildInvoker = (proceed: () => void) => {
		const registry = createSasiRegistry();
		registerMoveActions(registry);
		return createSasiInvoker(registry, {
			'vaultman.move.proceed': async () => {
				proceed();
			},
		});
	};

	it('sin confirmed NO ejecuta: se rechaza, no se ejecuta a ciegas', async () => {
		const proceed = vi.fn<() => void>();
		const invoke = buildInvoker(proceed);
		await expect(invoke('vaultman.move.proceed', {})).rejects.toThrow(
			/confirmation-required/,
		);
		expect(proceed).not.toHaveBeenCalled();
	});

	it('con confirmed ejecuta', async () => {
		const proceed = vi.fn<() => void>();
		const invoke = buildInvoker(proceed);
		await invoke('vaultman.move.proceed', { confirmed: true });
		expect(proceed).toHaveBeenCalledTimes(1);
	});

	it('la puerta vive en el adaptador, no en la UI', async () => {
		// Una puerta que vive en la superficie se salta llamando por debajo, y
		// por aqui pasan tambien las macros y los scripts.
		const proceed = vi.fn<() => void>();
		const registry = createSasiRegistry();
		registerMoveActions(registry);
		expect(registry.resolve('vaultman.move.proceed').def?.mutatesVault).toBe(true);
		const invoke = createSasiInvoker(registry, {
			'vaultman.move.proceed': async () => proceed(),
		});
		await expect(invoke('vaultman.move.proceed', { origins: ['a'] }))
			.rejects.toThrow(/confirmation-required/);
	});
});

describe('U130-04: el Proceed del panelWidget viaja por SASI', () => {
	const pageFiltersSrc = () =>
		readFileSync(
			new URL(
				'../../src/components/pages/pageFilters.svelte',
				import.meta.url,
			),
			'utf8',
		);

	it('registra proceed en sasiMoveHandlers', () => {
		const src = readFileSync(
			new URL('../../src/components/containers/explorerProps.ts', import.meta.url),
			'utf8',
		);
		expect(src).toContain('vaultman.move.proceed');
	});

	it('el panelWidget NO llama directo al metodo: va por el id estable', () => {
		// Guarda negativa: si este simbolo vuelve a pageFilters, el Proceed del
		// slot exclusivo ha dejado de viajar por SASI y hay dos caminos a la
		// escritura otra vez.
		expect(pageFiltersSrc()).not.toContain('propExplorer?.proceedValueMove()');
		expect(pageFiltersSrc()).toContain('vaultman.move.proceed');
	});
});

describe('U130-I01: Files proyecta NodeMove y llega a handlers SASI reales', () => {
	it('Files con toggles proyecta nodemove.* e invoca handlers sin no-handler; Props mantiene move.*', async () => {
		const ids = searchCellIds({
			tab: 'files',
			categoryIndex: 0,
			canCreate: false,
			createIcon: 'lucide-plus',
			moveToggles: { write: 'append', originDisposition: 'move' },
		});
		expect(ids).toEqual([
			'vaultman.nodemove.toggleWrite',
			'vaultman.nodemove.toggleOriginDisposition',
		]);
		// Guarda negativa (simbolo exacto): en Files NUNCA un alias move.*.
		expect(ids).not.toContain('vaultman.move.toggleWrite');
		expect(ids).not.toContain('vaultman.move.toggleOriginDisposition');

		const filesCtx = {
			tab: 'files' as const,
			categoryIndex: 0,
			canCreate: false,
			createIcon: 'lucide-plus',
			moveToggles: {
				write: 'append' as const,
				originDisposition: 'move' as const,
			},
		};
		for (const id of ids) {
			expect(searchCellFace(id, filesCtx)).not.toBeNull();
		}
		expect(
			searchCellFace('vaultman.move.toggleWrite', filesCtx),
		).toBeNull();
		expect(
			searchCellFace('vaultman.move.toggleOriginDisposition', filesCtx),
		).toBeNull();

		const registry = createSasiRegistry();
		registerMoveActions(registry);
		let writeCalls = 0;
		let originCalls = 0;
		const fileHandlers = {
			'vaultman.nodemove.toggleWrite': async () => {
				writeCalls += 1;
			},
			'vaultman.nodemove.toggleOriginDisposition': async () => {
				originCalls += 1;
			},
		};
		const invoke = createSasiInvoker(registry, fileHandlers);
		for (const id of ids) {
			try {
				await invoke(id, {});
			} catch (e) {
				const msg = e instanceof Error ? e.message : '';
				expect(msg).not.toContain('SASI: no-handler');
				throw e;
			}
		}
		expect(writeCalls).toBe(1);
		expect(originCalls).toBe(1);

		// Guarda de no-regresion: Props sigue proyectando vaultman.move.*.
		const propsIds = searchCellIds({
			tab: 'props',
			categoryIndex: 0,
			canCreate: false,
			createIcon: 'lucide-plus',
			moveToggles: { write: 'append', originDisposition: 'move' },
		});
		expect(propsIds).toEqual([
			'vaultman.move.toggleWrite',
			'vaultman.move.toggleOriginDisposition',
		]);
	});

	it('Snippets/Plugins con moveToggles null no proyectan toggles', () => {
		for (const tab of ['snippets', 'plugins'] as const) {
			const ids = searchCellIds({
				tab,
				categoryIndex: 0,
				canCreate: false,
				createIcon: 'lucide-plus',
				moveToggles: null,
			});
			expect(ids).not.toContain('vaultman.move.toggleWrite');
			expect(ids).not.toContain('vaultman.move.toggleOriginDisposition');
			expect(ids).not.toContain('vaultman.nodemove.toggleWrite');
			expect(ids).not.toContain('vaultman.nodemove.toggleOriginDisposition');
		}
	});
});
