import { describe, expect, it } from 'vitest';

import {
	buildValueMoveOperations,
	enterValueMoveMode,
	exitValueMoveMode,
	proceedEnabled,
	reconcileValueMoveOwner,
	selectValueMoveDestination,
	toggleValueMoveOriginDisposition,
	toggleValueMoveWrite,
	type ValueMoveOrigin,
	type ValueMoveModeState,
} from '../../src/logic/logicValueMoveMode';
import moveModeSource from '../../src/logic/logicValueMoveMode.ts?raw';

const restore = { interactionMode: 'browse', searchOpen: false };
const owner = { providerId: 'props', generation: 7 };

function origin(
	id: string,
	property: string,
	rawValue: string,
	propType?: string,
): ValueMoveOrigin {
	return { id, kind: 'value', node: { property, rawValue, propType } };
}

function enterWith(origins: readonly ValueMoveOrigin[]): ValueMoveModeState {
	return enterValueMoveMode({ origin: origins, restore, owner });
}

describe('value move mode state machine', () => {
	it('enters with a non-empty origin and cannot proceed until a destination exists', () => {
		const state = enterWith([origin('v1', 'lugar', 'cocina')]);
		expect(state.origin).toHaveLength(1);
		expect(state.destinations).toEqual([]);
		expect(proceedEnabled(state)).toBe(false);

		const withDestination = selectValueMoveDestination(state, {
			kind: 'prop',
			property: 'buscar',
		});
		expect(withDestination.destinations).toEqual(['buscar']);
		expect(proceedEnabled(withDestination)).toBe(true);
	});

	it('enters with an empty origin as an active mode whose proceed stays disabled', () => {
		// An empty origin is a state the user can see and cancel, not an empty
		// operation that queues nothing and reports success.
		const state = enterWith([]);
		expect(state.origin).toEqual([]);
		expect(proceedEnabled(state)).toBe(false);

		const withDestination = selectValueMoveDestination(state, {
			kind: 'prop',
			property: 'buscar',
		});
		expect(withDestination.destinations).toEqual(['buscar']);
		expect(proceedEnabled(withDestination)).toBe(false);
		expect(buildValueMoveOperations(withDestination)).toEqual([]);
	});

	it('starts both toggles at their defaults and flips each independently', () => {
		const state = enterWith([origin('v1', 'lugar', 'cocina')]);
		expect(state.write).toBe('append');
		expect(state.originDisposition).toBe('move');

		const flippedWrite = toggleValueMoveWrite(state);
		expect(flippedWrite.write).toBe('replace');
		expect(flippedWrite.originDisposition).toBe('move');

		const flippedBoth = toggleValueMoveOriginDisposition(flippedWrite);
		expect(flippedBoth.write).toBe('replace');
		expect(flippedBoth.originDisposition).toBe('copy');

		expect(toggleValueMoveWrite(flippedBoth).write).toBe('append');
		expect(toggleValueMoveOriginDisposition(flippedBoth).originDisposition).toBe(
			'move',
		);
	});

	it('registers a selected value node as its parent property', () => {
		const state = enterWith([origin('v1', 'lugar', 'cocina')]);
		const selected = selectValueMoveDestination(state, {
			kind: 'value',
			property: 'buscar',
		});
		expect(selected.destinations).toEqual(['buscar']);
		expect(selected.rejection).toBeNull();
	});

	it('registers several destination properties in selection order', () => {
		let state = enterWith([origin('v1', 'lugar', 'cocina')]);
		for (const property of ['buscar', 'archivo', 'tema']) {
			state = selectValueMoveDestination(state, { kind: 'prop', property });
		}
		expect(state.destinations).toEqual(['buscar', 'archivo', 'tema']);
	});

	it("rejects the origin's own property with a stated reason", () => {
		const state = enterWith([origin('v1', 'lugar', 'cocina')]);
		const rejected = selectValueMoveDestination(state, {
			kind: 'prop',
			property: 'lugar',
		});
		expect(rejected.destinations).toEqual([]);
		expect(rejected.rejection).toEqual({
			destination: 'lugar',
			reason: 'origin-is-destination',
		});
		expect(proceedEnabled(rejected)).toBe(false);
	});

	it('clears a previous rejection once an accepted destination arrives', () => {
		let state = enterWith([origin('v1', 'lugar', 'cocina')]);
		state = selectValueMoveDestination(state, {
			kind: 'prop',
			property: 'lugar',
		});
		expect(state.rejection).not.toBeNull();
		state = selectValueMoveDestination(state, {
			kind: 'prop',
			property: 'buscar',
		});
		expect(state.rejection).toBeNull();
	});

	it('treats a destination as one property, whichever node names it', () => {
		// Selection is per-property, so a second selection of the same key is a
		// deselection — and a value node names the same destination its parent
		// property does.
		let state = enterWith([origin('v1', 'lugar', 'cocina')]);
		state = selectValueMoveDestination(state, {
			kind: 'prop',
			property: 'buscar',
		});
		state = selectValueMoveDestination(state, {
			kind: 'prop',
			property: 'buscar',
		});
		expect(state.destinations).toEqual([]);

		state = selectValueMoveDestination(state, {
			kind: 'prop',
			property: 'archivo',
		});
		state = selectValueMoveDestination(state, {
			kind: 'value',
			property: 'archivo',
		});
		expect(state.destinations).toEqual([]);
	});

	it.each(['cancel', 'escape', 're-invoke'] as const)(
		'exits on %s without producing operations',
		() => {
			let state = enterWith([origin('v1', 'lugar', 'cocina')]);
			state = selectValueMoveDestination(state, {
				kind: 'prop',
				property: 'buscar',
			});
			const exit = exitValueMoveMode(state);
			expect(exit.state).toBeNull();
			expect(exit.operations).toEqual([]);
			expect(exit.restore).toEqual(restore);
		},
	);

	it('restores the interaction mode and search preference captured on enter', () => {
		const captured = { interactionMode: 'add', searchOpen: true };
		const state = enterValueMoveMode({
			origin: [origin('v1', 'lugar', 'cocina')],
			restore: captured,
			owner,
		});
		expect(state.restore).toEqual(captured);
		expect(exitValueMoveMode(state).restore).toEqual(captured);
	});

	it('cancels on a provider change or a generation bump', () => {
		const state = enterWith([origin('v1', 'lugar', 'cocina')]);
		expect(reconcileValueMoveOwner(state, owner)).toBe(state);
		expect(
			reconcileValueMoveOwner(state, { providerId: 'tags', generation: 7 }),
		).toBeNull();
		expect(
			reconcileValueMoveOwner(state, { providerId: 'props', generation: 8 }),
		).toBeNull();
		expect(reconcileValueMoveOwner(null, owner)).toBeNull();
	});

	it('builds one operation per origin value and destination property pair', () => {
		let state = enterWith([
			origin('v1', 'lugar', 'cocina', 'text'),
			origin('v2', 'lugar', 'salon', 'text'),
		]);
		state = selectValueMoveDestination(state, {
			kind: 'prop',
			property: 'buscar',
		});
		state = selectValueMoveDestination(state, {
			kind: 'prop',
			property: 'archivo',
		});

		const operations = buildValueMoveOperations(state);
		expect(operations).toHaveLength(4);
		expect(
			operations.map((op) => `${op.originId}->${op.destinationProperty}`),
		).toEqual([
			'v1->buscar',
			'v1->archivo',
			'v2->buscar',
			'v2->archivo',
		]);
		expect(operations[0]).toMatchObject({
			originProperty: 'lugar',
			rawValue: 'cocina',
			propType: 'text',
			write: 'append',
			originDisposition: 'move',
		});
	});

	it('carries the current toggle values into every built operation', () => {
		let state = enterWith([origin('v1', 'lugar', 'cocina')]);
		state = selectValueMoveDestination(state, {
			kind: 'prop',
			property: 'buscar',
		});
		state = toggleValueMoveWrite(state);
		state = toggleValueMoveOriginDisposition(state);

		for (const operation of buildValueMoveOperations(state)) {
			expect(operation.write).toBe('replace');
			expect(operation.originDisposition).toBe('copy');
		}
	});

	it('is free of Obsidian, settings and queue imports', () => {
		expect(moveModeSource).not.toContain("from 'obsidian'");
		expect(moveModeSource).not.toContain('queueService');
		expect(moveModeSource).not.toContain('../services/');
		expect(moveModeSource).not.toContain('typeSettings');
	});
});
