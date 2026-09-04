import { describe, expect, it } from 'vitest';

import { fileMoveStrategy } from '../../src/logic/logicMoveRouting';
import {
	enterNodeMoveMode,
	selectNodeMoveDestination,
	proceedEnabled,
	buildNodeMoveOperations,
	reconcileNodeMoveOwner,
} from '../../src/logic/logicNodeMoveMode';

const OWNER = { instanceId: 'inst-1', scene: 'files' };
const RESTORE = { interactionMode: 'open', searchOpen: false };

function enter() {
	return enterNodeMoveMode({
		origin: [
			{
				id: 'a',
				kind: 'file',
				node: { id: 'a', kind: 'file', canonicalId: 'x/a.md' },
			},
		],
		restore: RESTORE,
		owner: OWNER,
		strategy: fileMoveStrategy,
	});
}

describe('U130-02 nodeMoveMode', () => {
	it('proceed exige las dos mitades del emparejamiento', () => {
		const s = enter();
		expect(proceedEnabled(s)).toBe(false);
	});

	it('selecciona un destino valido', () => {
		const next = selectNodeMoveDestination(enter(), {
			id: 'dst',
			kind: 'folder',
			canonicalId: 'archivo',
		});
		expect(next.destinations).toEqual(['dst']);
		expect(next.rejection).toBeNull();
		expect(proceedEnabled(next)).toBe(true);
	});

	it('rechaza con motivo en vez de ignorar en silencio', () => {
		const next = selectNodeMoveDestination(enter(), {
			id: 'otro',
			kind: 'file',
			canonicalId: 'y/b.md',
		});
		expect(next.rejection).toEqual({
			destination: 'otro',
			reason: 'incompatible-kind',
		});
		expect(next.destinations).toEqual([]);
	});

	it('el par (origen, destino) es la unidad de la operacion', () => {
		const next = selectNodeMoveDestination(enter(), {
			id: 'dst',
			kind: 'folder',
			canonicalId: 'archivo',
		});
		expect(buildNodeMoveOperations(next)).toEqual([
			{
				originId: 'a',
				originCanonicalId: 'x/a.md',
				originKind: 'file',
				destinationId: 'dst',
				destinationCanonicalId: 'archivo',
				write: 'append',
				originDisposition: 'move',
			},
		]);
	});

	it('el modo NO muere al cambiar de Scene: se suspende', () => {
		// Correccion del dev: navegar es navegar. Lo que lo mata es cancelar,
		// culminar, o cerrar la instancia.
		const s = enter();
		expect(
			reconcileNodeMoveOwner(s, { instanceId: 'inst-1', scene: 'tags' }),
		).toBe(s);
	});

	it('dos instancias con la misma Scene NO comparten modo', () => {
		const s = enter();
		expect(
			reconcileNodeMoveOwner(s, { instanceId: 'inst-2', scene: 'files' }),
		).toBeNull();
	});
});
