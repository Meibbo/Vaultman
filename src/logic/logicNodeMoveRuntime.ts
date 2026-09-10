import type { MoveNodeRef } from './logicMoveRouting';
import {
	pruneDeadOrigins,
	type NodeMoveModeState,
} from './logicNodeMoveMode';
import type { BarNode, BarOwner, SearchVariant } from './logicTransactionBar';
import {
	buildTransactionBarState,
	type BarTransaction,
	type TransactionBarState,
} from './logicTransactionBarState';

/**
 * U130-02 runtime-wire: consumidor/runtime puro para WorkspaceInstance+Scene.
 *
 * El motor (`logicNodeMoveMode`) ya sabe suspenderse al cambiar de Scene y
 * podar al reanudar; lo que faltaba era el dueño de ese ciclo por
 * `(WorkspaceInstanceId, SceneDefinitionId)`: quien guarda un estado por
 * clave, lo devuelve solo a su dueño, lo poda con liveness al reanudar y lo
 * proyecta de forma determinista al `TransactionBarState` que el host ya
 * pinta. Puro y sin Obsidian/DOM para seguir siendo testable sin montaje.
 */

/** Clave estable del store. `\0` no aparece en ids, así `::` no colisiona. */
export function nodeMoveRuntimeKey(
	instanceId: string,
	scene: string,
): string {
	return `${instanceId}\0${scene}`;
}

export interface NodeMoveResume {
	state: NodeMoveModeState | null;
	/** `canonicalId` de orígenes podados. Se REPORTAN, no se callan. */
	pruned: readonly string[];
	/** `canonicalId` de destinos podados. También se reportan. */
	prunedDestinations: readonly string[];
}

/**
 * Guarda un `NodeMoveModeState` por cada `(instancia, Scene)`.
 *
 * - Dos instancias con la misma Scene NO comparten entrada.
 * - Dos Scenes de la misma instancia guardan entradas distintas: cambiar de
 *   Scene suspende (la entrada queda), no mata.
 * - `finish` (cancel, Proceed o teardown) retira solo su clave.
 */
export class NodeMoveSceneRuntime {
	private readonly byKey = new Map<string, NodeMoveModeState>();

	start(state: NodeMoveModeState): void {
		this.byKey.set(
			nodeMoveRuntimeKey(state.owner.instanceId, state.owner.scene),
			state,
		);
	}

	get(instanceId: string, scene: string): NodeMoveModeState | null {
		return this.byKey.get(nodeMoveRuntimeKey(instanceId, scene)) ?? null;
	}

	/**
	 * Reanuda la entrada de `(instanceId, scene)` podando con `isAlive`.
	 * Solo toca su clave: jamás publica ni muta la Scene ajena. Sin bajas
	 * devuelve el MISMO estado para que el llamador pueda comparar por
	 * referencia.
	 */
	resume(
		instanceId: string,
		scene: string,
		isAlive?: (ref: MoveNodeRef) => boolean,
	): NodeMoveResume {
		const key = nodeMoveRuntimeKey(instanceId, scene);
		const stored = this.byKey.get(key) ?? null;
		if (!stored) {
			return {
				state: null,
				pruned: Object.freeze([]),
				prunedDestinations: Object.freeze([]),
			};
		}
		if (!isAlive) return { state: stored, pruned: Object.freeze([]), prunedDestinations: Object.freeze([]) };
		const { state, pruned, prunedDestinations } = pruneDeadOrigins(
			stored,
			isAlive,
		);
		if (state !== stored) this.byKey.set(key, state);
		return { state, pruned, prunedDestinations };
	}

	/** Cancel/Proceed/teardown terminan: retira solo su clave. */
	finish(instanceId: string, scene: string): boolean {
		return this.byKey.delete(nodeMoveRuntimeKey(instanceId, scene));
	}
}

/**
 * Activo significa consumible AQUÍ y AHORA: misma instancia Y misma Scene.
 * `reconcileNodeMoveOwner` devuelve el estado también suspendido (misma
 * instancia, otra Scene); esto distingue activo de suspendido para que la
 * Scene no emita sobre algo que está pendiente en otro sitio.
 */
export function isNodeMoveActiveIn(
	state: NodeMoveModeState | null,
	current: BarOwner,
): boolean {
	if (!state) return false;
	return (
		state.owner.instanceId === current.instanceId &&
		state.owner.scene === current.scene
	);
}

/**
 * Puerto mínimo para que el estado de la Scene sea consumible: el motor al
 * `BarTransaction` que el host ya sabe pintar. Determinista: mismo estado →
 * misma transacción. `moveKind` es siempre `node`; `group` vive en U130-03.
 */
export function nodeMoveBarTransaction(
	state: NodeMoveModeState | null,
): BarTransaction | null {
	if (!state) return null;
	return {
		owner: {
			instanceId: state.owner.instanceId,
			scene: state.owner.scene,
		},
		originIds: state.origin.map((target) => target.id),
		destinationIds: [...state.destinations],
		rejection: state.rejection
			? {
					destination: state.rejection.destination,
					reason: state.rejection.reason,
				}
			: null,
		moveKind: 'node',
	};
}

/**
 * Proyección determinista al envelope/host existente (`TransactionBarState`
 * vía `buildTransactionBarState`). La visibilidad la decide el contrato que
 * ya existe (`barVisibility`): misma instancia + otra Scene → `hidden`;
 * otra instancia o sin estado → `unmounted`. Nunca publica sobre Scene
 * ajena: el `owner` proyectado es siempre el del estado.
 */
export function projectNodeMoveBar({
	state,
	current,
	nodes,
	variant,
	groupsAvailable,
}: {
	state: NodeMoveModeState | null;
	current: BarOwner;
	nodes: readonly BarNode[];
	variant: SearchVariant;
	groupsAvailable: boolean;
}): TransactionBarState {
	return buildTransactionBarState({
		transaction: nodeMoveBarTransaction(state),
		current,
		nodes,
		variant,
		groupsAvailable,
	});
}
