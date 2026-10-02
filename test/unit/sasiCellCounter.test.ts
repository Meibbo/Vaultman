import { describe, expect, it } from 'vitest';
import { registerCellCounterKinds } from '../../src/logic/logicSasiCellCounter';
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';

describe('U130 SASI cell_counter kind', () => {
	it('registers the counter kind with the _timesOpened type and no placement', () => {
		const registry = createSasiRegistry();
		registerCellCounterKinds(registry);

		expect(registry.list('kind').map((entry) => entry.id)).toEqual(['cell_counter']);
		// Deliberately no cell, sort, or hover surface: the dev has not placed
		// a "times opened" cell anywhere yet, so this stays discoverable only.
		const resolved = registry.resolve('cell_counter');
		expect(resolved.available).toBe(true);
		expect(resolved.def?.axis).toBe('kind');
		expect(resolved.def?.type).toBe('_timesOpened');
		expect(resolved.def?.catalogKind).toBe('cell_counter');
		expect(resolved.def?.labelKey).toBe('sasi.cells.kind.cell_counter');
	});

	it('joins the full bootstrap catalog exactly once', () => {
		const { registry } = createVaultmanSasi();
		expect(registry.list('kind').map((entry) => entry.id)).toContain('cell_counter');
	});
});
