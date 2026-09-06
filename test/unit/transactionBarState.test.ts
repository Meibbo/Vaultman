import { describe, expect, it } from 'vitest';
import {
	buildTransactionBarState,
	type BarTransaction,
} from '../../src/logic/logicTransactionBarState';
import type { BarNode } from '../../src/logic/logicTransactionBar';

// Una propiedad con 10 valores. El conteo tiene que dar 11, no 1.
const nodes: BarNode[] = [
	{
		id: 'prop:lugar',
		label: 'lugar',
		childIds: Array.from({ length: 10 }, (_, i) => `val:lugar:${i}`),
	},
	...Array.from({ length: 10 }, (_, i) => ({
		id: `val:lugar:${i}`,
		label: `v${i}`,
		childIds: [] as string[],
	})),
	{ id: 'prop:sitio', label: 'sitio', childIds: [] },
];

const owner = { instanceId: 'inst-1', scene: 'props' };
const transaction: BarTransaction = {
	owner,
	originIds: ['prop:lugar'],
	destinationIds: ['prop:sitio'],
	rejection: null,
	moveKind: 'node',
};

describe('U130-04: el estado que la barra pinta', () => {
	it('cuenta los origenes jerarquicamente: una prop con 10 valores son 11', () => {
		const state = buildTransactionBarState({
			transaction,
			current: owner,
			nodes,
			variant: 'row',
			groupsAvailable: false,
		});
		expect(state.originCount).toBe(11);
		expect(state.destinationCount).toBe(1);
	});

	it('las etiquetas enumeran lo que compone cada metrica', () => {
		// Un numero sin desglose no deja verificar antes de escribir en el vault.
		const state = buildTransactionBarState({
			transaction,
			current: owner,
			nodes,
			variant: 'row',
			groupsAvailable: false,
		});
		expect(state.originLabels).toHaveLength(11);
		expect(state.originLabels[0]).toBe('lugar');
		expect(state.destinationLabels).toEqual(['sitio']);
	});

	it('sin transaccion no se monta: no hay estado vacio que pintar', () => {
		const state = buildTransactionBarState({
			transaction: null,
			current: owner,
			nodes,
			variant: 'row',
			groupsAvailable: true,
		});
		expect(state.visibility).toBe('unmounted');
	});

	it('cambiar de Scene la OCULTA; no la desmonta', () => {
		// hidden y unmounted no son lo mismo: hidden dice que hay trabajo
		// pendiente en otro sitio de tu misma instancia.
		const state = buildTransactionBarState({
			transaction,
			current: { instanceId: 'inst-1', scene: 'files' },
			nodes,
			variant: 'row',
			groupsAvailable: true,
		});
		expect(state.visibility).toBe('hidden');
	});

	it('otra instancia no ve la transaccion ajena', () => {
		const state = buildTransactionBarState({
			transaction,
			current: { instanceId: 'inst-2', scene: 'props' },
			nodes,
			variant: 'row',
			groupsAvailable: true,
		});
		expect(state.visibility).toBe('unmounted');
	});

	it('en movil va ENCIMA del searchbox; en desktop debajo', () => {
		const phone = buildTransactionBarState({
			transaction,
			current: owner,
			nodes,
			variant: 'phone',
			groupsAvailable: true,
		});
		const desktop = buildTransactionBarState({
			transaction,
			current: owner,
			nodes,
			variant: 'row',
			groupsAvailable: true,
		});
		expect(phone.placement).toBe('above-search');
		expect(desktop.placement).toBe('below-search');
	});

	it('sin grupos proyectados el toggle NO esta disponible', () => {
		// Es el hueco declarado de la Slice 3: sin ContainerNodes no hay a donde
		// mover, y un toggle que conmuta una etiqueta y nada mas es una mentira.
		const state = buildTransactionBarState({
			transaction,
			current: owner,
			nodes,
			variant: 'row',
			groupsAvailable: false,
		});
		expect(state.moveKindAvailable).toBe(false);
	});

	it('el rechazo llega con su motivo, no se traga', () => {
		const state = buildTransactionBarState({
			transaction: {
				...transaction,
				rejection: { destination: 'prop:lugar', reason: 'origin-is-destination' },
			},
			current: owner,
			nodes,
			variant: 'row',
			groupsAvailable: true,
		});
		expect(state.rejection).toEqual({
			destination: 'prop:lugar',
			reason: 'origin-is-destination',
		});
	});

	it('un destino que ya no existe no infla el conteo', () => {
		// El origen puede sobrevivir a la Scene suspendida; el destino tambien
		// puede desaparecer. Contar un id fantasma mentiria antes de escribir.
		const state = buildTransactionBarState({
			transaction: { ...transaction, destinationIds: ['prop:borrada'] },
			current: owner,
			nodes,
			variant: 'row',
			groupsAvailable: true,
		});
		expect(state.destinationCount).toBe(0);
	});
});
