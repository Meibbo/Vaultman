import {
	barVisibility,
	buildTransactionTelemetry,
	resolveBarPlacement,
	type BarNode,
	type BarOwner,
	type BarRejection,
	type BarPlacement,
	type BarVisibility,
	type SearchVariant,
} from './logicTransactionBar';

export type MoveKind = 'node' | 'group';

export interface BarTransaction {
	owner: BarOwner;
	originIds: readonly string[];
	destinationIds: readonly string[];
	rejection: BarRejection | null;
	moveKind: MoveKind;
}

export interface TransactionBarState {
	visibility: BarVisibility;
	placement: BarPlacement;
	originCount: number;
	originLabels: readonly string[];
	destinationCount: number;
	destinationLabels: readonly string[];
	rejection: BarRejection | null;
	moveKind: MoveKind;
	/**
	 * U130: `groupMoveMode` necesita ContainerNodes a los que mover. Mientras la
	 * proyeccion de grupos (Slice 3) no exista, el toggle no tiene destino y la
	 * barra dice por que en vez de ofrecer un conmutador que no conmuta nada.
	 */
	moveKindAvailable: boolean;
}

/**
 * U130-04: junta las tres piezas de `logicTransactionBar` en el estado que el
 * host proyecta. La barra no calcula: pinta esto.
 */
export function buildTransactionBarState({
	transaction,
	current,
	nodes,
	variant,
	groupsAvailable,
}: {
	transaction: BarTransaction | null;
	current: BarOwner;
	nodes: readonly BarNode[];
	variant: SearchVariant;
	groupsAvailable: boolean;
}): TransactionBarState {
	const visibility = barVisibility(transaction?.owner ?? null, current);
	const telemetry = buildTransactionTelemetry({
		originIds: transaction?.originIds ?? [],
		destinationIds: transaction?.destinationIds ?? [],
		nodes,
		rejection: transaction?.rejection ?? null,
	});
	return {
		visibility,
		placement: resolveBarPlacement(variant),
		originCount: telemetry.originCount,
		originLabels: telemetry.originLabels,
		destinationCount: telemetry.destinationCount,
		destinationLabels: telemetry.destinationLabels,
		rejection: telemetry.rejection,
		moveKind: transaction?.moveKind ?? 'node',
		moveKindAvailable: groupsAvailable,
	};
}
