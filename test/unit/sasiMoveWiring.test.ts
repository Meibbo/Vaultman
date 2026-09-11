import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { registerMoveActions } from '../../src/logic/logicSasiMoveActions';
import { createSasiInvoker } from '../../src/logic/logicSasiInvoke';

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
