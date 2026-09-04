import { describe, expect, it } from 'vitest';

import { buildTransactionTelemetry } from '../../src/logic/logicTransactionBar';

const NODES = [
	{ id: 'p1', label: 'lugar', childIds: ['v1', 'v2'] },
	{ id: 'v1', label: 'cocina', childIds: [] },
	{ id: 'v2', label: 'salon', childIds: [] },
];

describe('U130-04 telemetria', () => {
	it('cuenta los origenes en jerarquia total', () => {
		// 1 prop + sus 2 values = 3. Un `1` aqui mentiria justo antes de
		// escribir en el vault.
		const t = buildTransactionTelemetry({
			originIds: ['p1'],
			destinationIds: [],
			nodes: NODES,
			rejection: null,
		});
		expect(t.originCount).toBe(3);
		expect(t.originLabels).toEqual(['lugar', 'cocina', 'salon']);
	});

	it('no cuenta dos veces un hijo seleccionado aparte', () => {
		const t = buildTransactionTelemetry({
			originIds: ['p1', 'v1'],
			destinationIds: [],
			nodes: NODES,
			rejection: null,
		});
		expect(t.originCount).toBe(3);
	});

	it('cuenta destinos y los enumera para el tooltip', () => {
		const t = buildTransactionTelemetry({
			originIds: [],
			destinationIds: ['v2'],
			nodes: NODES,
			rejection: null,
		});
		expect(t.destinationCount).toBe(1);
		expect(t.destinationLabels).toEqual(['salon']);
	});

	it('expone el rechazo con su motivo', () => {
		const t = buildTransactionTelemetry({
			originIds: ['p1'],
			destinationIds: [],
			nodes: NODES,
			rejection: { destination: 'v1', reason: 'incompatible-kind' },
		});
		expect(t.rejection).toEqual({
			destination: 'v1',
			reason: 'incompatible-kind',
		});
	});

	it('un id desconocido no rompe el conteo', () => {
		const t = buildTransactionTelemetry({
			originIds: ['fantasma'],
			destinationIds: [],
			nodes: NODES,
			rejection: null,
		});
		expect(t.originCount).toBe(0);
	});
});
