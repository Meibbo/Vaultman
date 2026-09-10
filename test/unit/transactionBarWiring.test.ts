import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('U130-04 wiring del bar', () => {
	it('el panelWidget declara el estado del bar transaccional', () => {
		const src = readFileSync(
			new URL('../../src/types/typePanelWidget.ts', import.meta.url),
			'utf8',
		);
		expect(src).toContain('transactionBar?:');
		// Y con sus campos: `transactionBar?: unknown` satisfaria la linea de
		// arriba sin declarar nada.
		for (const field of ['visibility', 'placement', 'moveKind', 'originCount']) {
			expect(src).toMatch(new RegExp(`transactionBar\\?:[\\s\\S]{0,600}${field}`));
		}
	});

	it('el bar NO expone proceed', () => {
		// La puerta contra el segundo camino de escritura al vault.
		const src = readFileSync(
			new URL('../../src/types/typePanelWidget.ts', import.meta.url),
			'utf8',
		);
		const block = src.slice(
			src.indexOf('transactionBar?:'),
			src.indexOf('transactionBar?:') + 400,
		);
		expect(block).not.toContain('proceed');
	});
});
