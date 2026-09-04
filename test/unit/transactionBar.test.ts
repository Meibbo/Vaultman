import { describe, expect, it } from 'vitest';

import {
	barVisibility,
	buildTransactionTelemetry,
	resolveBarPlacement,
} from '../../src/logic/logicTransactionBar';

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

describe('U130-04 colocacion', () => {
	it('debajo del searchbox cuando es una row de desktop', () => {
		expect(resolveBarPlacement('row')).toBe('below-search');
	});

	it('encima cuando el searchbox es el del movil', () => {
		expect(resolveBarPlacement('phone')).toBe('above-search');
	});

	it('debajo cuando el searchbox esta plegado en pill', () => {
		// `inline` es la pastilla plegada: no hay row bajo la que colocarse, asi
		// que la barra cae al mismo sitio que en desktop.
		expect(resolveBarPlacement('inline')).toBe('below-search');
	});
});

describe('U130-04 visibilidad', () => {
	const live = { instanceId: 'i1', scene: 'files' };

	it('visible con transaccion viva en la Scene actual', () => {
		expect(barVisibility(live, { instanceId: 'i1', scene: 'files' })).toBe(
			'visible',
		);
	});

	it('oculta al navegar a otra Scene de la misma instancia', () => {
		// La transaccion no muere: se suspende. La barra se oculta y vuelve.
		expect(barVisibility(live, { instanceId: 'i1', scene: 'tags' })).toBe(
			'hidden',
		);
	});

	it('no se monta sin transaccion', () => {
		expect(barVisibility(null, { instanceId: 'i1', scene: 'files' })).toBe(
			'unmounted',
		);
	});

	it('no se monta en otra instancia', () => {
		// Dos instancias con la misma Scene no comparten modo, asi que tampoco
		// barra: veria el estado de una transaccion que no es suya.
		expect(barVisibility(live, { instanceId: 'i2', scene: 'files' })).toBe(
			'unmounted',
		);
	});
});


