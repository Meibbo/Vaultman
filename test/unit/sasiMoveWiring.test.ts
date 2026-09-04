import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

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
