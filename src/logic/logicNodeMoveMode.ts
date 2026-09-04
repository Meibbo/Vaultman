import type { OperationTarget } from './logicOperationTargetSet';
import type {
	MoveNodeRef,
	MoveRejectionReason,
	MoveRoutingStrategy,
} from './logicMoveRouting';

/**
 * U130-02: generaliza `logicValueMoveMode`. Se mantiene puro y sin Obsidian,
 * settings ni queue, para que el ciclo de vida siga siendo testable sin DOM.
 */

export type NodeMoveOrigin = OperationTarget<MoveNodeRef>;
export type NodeMoveWrite = 'append' | 'replace';
export type NodeMoveOriginDisposition = 'move' | 'copy';

/**
 * El dueno es (instancia, Scene), no (providerId, generation).
 *
 * Dos instancias con la misma Scene NO comparten modo: eso romperia la
 * individualidad de cada instancia. Pero cambiar de Scene DENTRO de una
 * instancia no lo mata -- es un gesto de navegacion, y cancelarlo obligaria al
 * usuario a reactivarlo tras un vistazo a otra lista.
 */
export interface NodeMoveOwner {
	instanceId: string;
	scene: string;
}

export interface NodeMoveRejection {
	destination: string;
	reason: MoveRejectionReason;
}

export interface NodeMoveModeState {
	origin: readonly NodeMoveOrigin[];
	destinations: readonly string[];
	destinationRefs: readonly MoveNodeRef[];
	write: NodeMoveWrite;
	originDisposition: NodeMoveOriginDisposition;
	restore: { interactionMode: string; searchOpen: boolean };
	owner: NodeMoveOwner;
	strategy: MoveRoutingStrategy;
	rejection: NodeMoveRejection | null;
}

export interface NodeMoveOperation {
	originId: string;
	originCanonicalId: string;
	originKind: string;
	destinationId: string;
	destinationCanonicalId: string;
	write: NodeMoveWrite;
	originDisposition: NodeMoveOriginDisposition;
}

export function enterNodeMoveMode({
	origin,
	restore,
	owner,
	strategy,
}: {
	origin: readonly NodeMoveOrigin[];
	restore: NodeMoveModeState['restore'];
	owner: NodeMoveOwner;
	strategy: MoveRoutingStrategy;
}): NodeMoveModeState {
	return {
		origin: Object.freeze([...origin]),
		destinations: Object.freeze([]),
		destinationRefs: Object.freeze([]),
		write: 'append',
		originDisposition: 'move',
		restore: { ...restore },
		owner: { ...owner },
		strategy,
		rejection: null,
	};
}

export function proceedEnabled(state: NodeMoveModeState): boolean {
	return state.origin.length > 0 && state.destinations.length > 0;
}

export function toggleNodeMoveWrite(
	state: NodeMoveModeState,
): NodeMoveModeState {
	return { ...state, write: state.write === 'append' ? 'replace' : 'append' };
}

export function toggleNodeMoveOriginDisposition(
	state: NodeMoveModeState,
): NodeMoveModeState {
	return {
		...state,
		originDisposition: state.originDisposition === 'move' ? 'copy' : 'move',
	};
}

export function selectNodeMoveDestination(
	state: NodeMoveModeState,
	candidate: MoveNodeRef,
): NodeMoveModeState {
	// Un destino invalido se EXPLICA. Ignorarlo en silencio hace que el usuario
	// crea que el clic no llego.
	for (const target of state.origin) {
		const verdict = state.strategy.validate(target.node, candidate);
		if (!verdict.ok) {
			return {
				...state,
				rejection: { destination: candidate.id, reason: verdict.reason },
			};
		}
	}

	const selected = state.destinations.includes(candidate.id);
	const destinations = selected
		? state.destinations.filter((id) => id !== candidate.id)
		: [...state.destinations, candidate.id];
	const destinationRefs = selected
		? state.destinationRefs.filter((ref) => ref.id !== candidate.id)
		: [...state.destinationRefs, candidate];

	return {
		...state,
		destinations: Object.freeze(destinations),
		destinationRefs: Object.freeze(destinationRefs),
		rejection: null,
	};
}

/**
 * Devuelve el estado mientras su instancia siga viva. Cambiar de Scene NO lo
 * invalida: la transaccion se suspende y se restaura al volver.
 */
export function reconcileNodeMoveOwner(
	state: NodeMoveModeState | null,
	owner: NodeMoveOwner,
): NodeMoveModeState | null {
	if (!state) return null;
	if (state.owner.instanceId !== owner.instanceId) return null;
	return state;
}

/** El par (origen, destino) es la unidad: un fallo parcial es atribuible. */
export function buildNodeMoveOperations(
	state: NodeMoveModeState,
): readonly NodeMoveOperation[] {
	if (!proceedEnabled(state)) return Object.freeze([]);
	const operations: NodeMoveOperation[] = [];
	for (const target of state.origin) {
		for (const destination of state.destinationRefs) {
			operations.push({
				originId: target.id,
				originCanonicalId: target.node.canonicalId,
				originKind: target.node.kind,
				destinationId: destination.id,
				destinationCanonicalId: destination.canonicalId,
				write: state.write,
				originDisposition: state.originDisposition,
			});
		}
	}
	return Object.freeze(operations);
}
