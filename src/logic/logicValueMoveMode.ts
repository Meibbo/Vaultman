import type { OperationTarget } from './logicOperationTargetSet';

/**
 * `Move to prop...` is a hidden operation mode on one PanelExplorer, not a
 * modal: the destination property is chosen with the explorer's own selection
 * machinery. This module is the whole decision surface of that mode — enter,
 * two toggles, destination selection, exit and the operations it builds — kept
 * free of Obsidian, settings and the queue so the adapter passes in what it
 * needs and the lifecycle stays testable without a DOM.
 */

/** The part of a value node the move needs: which key it sits under, and what it holds. */
export interface ValueMoveOriginNode {
	property: string;
	rawValue: string;
	propType?: string;
}

export type ValueMoveOrigin = OperationTarget<ValueMoveOriginNode>;

/** A node offered as a destination. A value counts as its parent property. */
export interface ValueMoveDestinationCandidate {
	kind: 'prop' | 'value';
	property: string;
}

/**
 * The owner the mode entered under. A pending invisible operation state in
 * another provider or another generation cannot be reasoned about by the user,
 * so the mode dies with its owner rather than following it.
 */
export interface ValueMoveOwner {
	providerId: string;
	generation: number;
}

export type ValueMoveWrite = 'append' | 'replace';
export type ValueMoveOriginDisposition = 'move' | 'copy';

export type ValueMoveRejectionReason = 'origin-is-destination';

export interface ValueMoveRejection {
	destination: string;
	reason: ValueMoveRejectionReason;
}

export interface ValueMoveModeState {
	origin: readonly ValueMoveOrigin[];
	destinations: readonly string[];
	write: ValueMoveWrite;
	originDisposition: ValueMoveOriginDisposition;
	restore: { interactionMode: string; searchOpen: boolean };
	owner: ValueMoveOwner;
	rejection: ValueMoveRejection | null;
}

/**
 * One (origin value, destination property) pair. The pairing is the unit of the
 * operation so a partial failure is attributable and each pair is cancellable
 * on its own.
 */
export interface ValueMoveOperation {
	originId: string;
	originProperty: string;
	destinationProperty: string;
	rawValue: string;
	propType?: string;
	write: ValueMoveWrite;
	originDisposition: ValueMoveOriginDisposition;
}

export interface ValueMoveExit {
	state: null;
	operations: readonly ValueMoveOperation[];
	restore: ValueMoveModeState['restore'];
}

export function enterValueMoveMode({
	origin,
	restore,
	owner,
}: {
	origin: readonly ValueMoveOrigin[];
	restore: ValueMoveModeState['restore'];
	owner: ValueMoveOwner;
}): ValueMoveModeState {
	return {
		origin: Object.freeze([...origin]),
		destinations: Object.freeze([]),
		write: 'append',
		originDisposition: 'move',
		restore: { ...restore },
		owner: { ...owner },
		rejection: null,
	};
}

/** `Proceed` needs both halves of the pairing; either one empty is not an operation. */
export function proceedEnabled(state: ValueMoveModeState): boolean {
	return state.origin.length > 0 && state.destinations.length > 0;
}

export function toggleValueMoveWrite(
	state: ValueMoveModeState,
): ValueMoveModeState {
	return { ...state, write: state.write === 'append' ? 'replace' : 'append' };
}

export function toggleValueMoveOriginDisposition(
	state: ValueMoveModeState,
): ValueMoveModeState {
	return {
		...state,
		originDisposition: state.originDisposition === 'move' ? 'copy' : 'move',
	};
}

export function selectValueMoveDestination(
	state: ValueMoveModeState,
	candidate: ValueMoveDestinationCandidate,
): ValueMoveModeState {
	const property = candidate.property;

	// Writing a value back into the key it already lives in is a no-op, and a
	// silent one would look like the operation ran. It is stated instead.
	if (state.origin.some((target) => target.node.property === property)) {
		return {
			...state,
			rejection: { destination: property, reason: 'origin-is-destination' },
		};
	}

	const selected = state.destinations.includes(property);
	const destinations = selected
		? state.destinations.filter((existing) => existing !== property)
		: [...state.destinations, property];

	return {
		...state,
		destinations: Object.freeze(destinations),
		rejection: null,
	};
}

/**
 * Cancel, escape and re-invoking the originating action are the same
 * transition: leave with no operations and hand back what `enter` captured.
 */
export function exitValueMoveMode(state: ValueMoveModeState): ValueMoveExit {
	return {
		state: null,
		operations: Object.freeze([]),
		restore: { ...state.restore },
	};
}

/** Returns the state unchanged while its owner holds, and `null` once it does not. */
export function reconcileValueMoveOwner(
	state: ValueMoveModeState | null,
	owner: ValueMoveOwner,
): ValueMoveModeState | null {
	if (!state) return null;
	if (
		state.owner.providerId !== owner.providerId ||
		state.owner.generation !== owner.generation
	) {
		return null;
	}
	return state;
}

export function buildValueMoveOperations(
	state: ValueMoveModeState,
): readonly ValueMoveOperation[] {
	if (!proceedEnabled(state)) return Object.freeze([]);

	const operations: ValueMoveOperation[] = [];
	for (const target of state.origin) {
		for (const destinationProperty of state.destinations) {
			operations.push({
				originId: target.id,
				originProperty: target.node.property,
				destinationProperty,
				rawValue: target.node.rawValue,
				propType: target.node.propType,
				write: state.write,
				originDisposition: state.originDisposition,
			});
		}
	}
	return Object.freeze(operations);
}
