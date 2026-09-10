import { describe, expect, it, vi } from 'vitest';

import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { createSasiInvoker } from '../../src/logic/logicSasiInvoke';

function setup() {
	const reg = createSasiRegistry();
	reg.register({
		id: 'vaultman.move.proceed',
		axis: 'function',
		kind: 'operation',
		labelKey: 'sasi.move.proceed',
		mutatesVault: true,
		supports: [{ surface: 'panelWidget' }],
	});
	reg.register({
		id: 'vaultman.move.cancel',
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.move.cancel',
		supports: [{ surface: 'panelWidget' }],
	});
	return reg;
}

describe('U130-01 SASI invoker', () => {
	it('invoca un action SIN montar ningun explorer', async () => {
		// Esta es LA puerta del encargo. Si para invocar hace falta una UI, el
		// Action depende de contexto ambiente y esta mal hecho.
		const reg = setup();
		const handler = vi.fn(async () => ({ ok: true }));
		const invoke = createSasiInvoker(reg, {
			'vaultman.move.cancel': handler,
		});
		await expect(invoke('vaultman.move.cancel', {})).resolves.toEqual({
			ok: true,
		});
		expect(handler).toHaveBeenCalledOnce();
	});

	it('rechaza una operation que muta el vault sin confirmed', async () => {
		const reg = setup();
		const handler = vi.fn(async () => ({ ok: true }));
		const invoke = createSasiInvoker(reg, {
			'vaultman.move.proceed': handler,
		});
		await expect(
			invoke('vaultman.move.proceed', { origins: ['a'], destinations: ['b'] }),
		).rejects.toThrow(/confirmation-required/);
		// La guarda vive en el adaptador, no en la UI: una puerta que vive en la
		// superficie se salta llamando por debajo, y por aqui pasan las macros.
		expect(handler).not.toHaveBeenCalled();
	});

	it('ejecuta la operation con confirmed:true', async () => {
		const reg = setup();
		const handler = vi.fn(async () => ({ ok: true }));
		const invoke = createSasiInvoker(reg, {
			'vaultman.move.proceed': handler,
		});
		await expect(
			invoke('vaultman.move.proceed', {
				origins: ['a'],
				destinations: ['b'],
				confirmed: true,
			}),
		).resolves.toEqual({ ok: true });
	});

	it('un id no registrado falla con su nombre, no en silencio', async () => {
		const reg = setup();
		const invoke = createSasiInvoker(reg, {});
		await expect(invoke('vaultman.move.noexiste', {})).rejects.toThrow(
			/vaultman.move.noexiste/,
		);
	});

	it('un id registrado sin handler falla diciendo cual falta', async () => {
		const reg = setup();
		const invoke = createSasiInvoker(reg, {});
		await expect(invoke('vaultman.move.cancel', {})).rejects.toThrow(
			/no-handler/,
		);
	});
});
