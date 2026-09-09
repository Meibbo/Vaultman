import { describe, expect, it } from 'vitest';

import { fileMoveStrategy } from '../../src/logic/logicMoveRouting';
import {
	enterNodeMoveMode,
	selectNodeMoveDestination,
	proceedEnabled,
	buildNodeMoveOperations,
	reconcileNodeMoveOwner,
	resolveOriginSet,
	pruneDeadOrigins,
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

describe('U130-02 seleccion jerarquica', () => {
	const dentro = (p: string) =>
		['x/a.md', 'x/b.md', 'x/sub/c.md'].filter((f) => f.startsWith(p + '/'));

	it('seleccionar un p-node incluye a sus c-nodes', () => {
		expect(resolveOriginSet(['x'], [], dentro)).toEqual([
			'x/a.md',
			'x/b.md',
			'x/sub/c.md',
		]);
	});

	it('permite descartar un hijo concreto', () => {
		expect(resolveOriginSet(['x'], ['x/b.md'], dentro)).toEqual([
			'x/a.md',
			'x/sub/c.md',
		]);
	});

	it('excluir una carpeta se lleva su subarbol', () => {
		expect(resolveOriginSet(['x'], ['x/sub'], dentro)).toEqual([
			'x/a.md',
			'x/b.md',
		]);
	});

	it('reincluir algo bajo un ancestro excluido lo devuelve', () => {
		// `hasReleasedAncestor` de logicDeletionDecoration: el usuario excluyo
		// `x/sub` y luego reincluyo `x/sub/c.md`. La reinclusion mas especifica
		// gana. Sin esto, el usuario no puede deshacer una exclusion parcial.
		expect(resolveOriginSet(['x'], ['x/sub'], dentro, ['x/sub/c.md'])).toEqual(
			['x/a.md', 'x/b.md', 'x/sub/c.md'],
		);
	});
});

describe('U130-02 liveness al reanudar', () => {
	it('poda los origenes que ya no existen y dice cuales', () => {
		const s = enter();
		const result = pruneDeadOrigins(s, (ref) => ref.canonicalId !== 'x/a.md');
		expect(result.state.origin).toEqual([]);
		expect(result.pruned).toEqual(['x/a.md']);
	});

	it('sin bajas devuelve el mismo estado y nada podado', () => {
		const s = enter();
		const result = pruneDeadOrigins(s, () => true);
		expect(result.state).toBe(s);
		expect(result.pruned).toEqual([]);
	});

	it('no deja destinos muertos en una transaccion pendiente', () => {
		const withDst = selectNodeMoveDestination(enter(), {
			id: 'dst',
			kind: 'folder',
			canonicalId: 'archivo',
		});
		expect(proceedEnabled(withDst)).toBe(true);
		const result = pruneDeadOrigins(
			withDst,
			(ref) => ref.canonicalId !== 'archivo',
		);
		expect(result.state.destinations).toEqual([]);
		expect(result.state.destinationRefs).toEqual([]);
		expect(result.pruned).toEqual([]);
		expect(result.prunedDestinations).toEqual(['archivo']);
		expect(proceedEnabled(result.state)).toBe(false);
		expect(buildNodeMoveOperations(result.state)).toEqual([]);
	});

	it('reconciliar al reanudar no deja destinos muertos', () => {
		const withDst = selectNodeMoveDestination(enter(), {
			id: 'dst',
			kind: 'folder',
			canonicalId: 'archivo',
		});
		const resumed = reconcileNodeMoveOwner(
			withDst,
			{ instanceId: 'inst-1', scene: 'tags' },
			(ref) => ref.canonicalId !== 'archivo',
		);
		expect(resumed).not.toBeNull();
		expect(resumed?.destinations).toEqual([]);
		expect(resumed?.destinationRefs).toEqual([]);
	});
});

describe('U130-02 resolveOriginSet sin duplicados', () => {
	it('deduplica raices solapadas padre+hijo', () => {
		const childrenOf = (root: string): readonly string[] => {
			if (root === 'x') return ['x/a.md', 'x/sub/c.md'];
			if (root === 'x/sub') return ['x/sub/c.md'];
			return [];
		};
		expect(resolveOriginSet(['x', 'x/sub'], [], childrenOf)).toEqual([
			'x/a.md',
			'x/sub/c.md',
		]);
	});

	it('deduplica raices repetidas y released solapados', () => {
		const dentro = (p: string): readonly string[] =>
			['x/a.md', 'x/b.md', 'x/sub/c.md'].filter((f) =>
				f.startsWith(p + '/'),
			);
		expect(
			resolveOriginSet(
				['x', 'x'],
				['x/sub'],
				dentro,
				['x/sub/c.md', 'x/sub/c.md'],
			),
		).toEqual(['x/a.md', 'x/b.md', 'x/sub/c.md']);
	});
});

