import {
	convertPropertyValueType,
	LIST_WIDGETS,
	resolveCorePropertyWidget,
} from './propertyValueCoercion';
import { NATIVE_SET_PROP_TYPE } from '../types/typeOps';
import type { EditablePropType } from './propTypes';

/**
 * `Move to prop...` can land a value in a property whose type does not admit
 * it: a date into a number, or a second value into a scalar. The developer
 * chose a setting with three behaviors rather than one fixed rule, so this
 * module decides per destination and never writes anything itself. The type
 * change it describes is emitted as part of the same OperationNode, which is
 * how the coercion stays visible in the summary and cancellable in the queue.
 */
export type PropMoveTypeConflictPolicy = 'coerce' | 'block' | 'ask';

const POLICIES: ReadonlySet<string> = new Set<PropMoveTypeConflictPolicy>([
	'coerce',
	'block',
	'ask',
]);

export const DEFAULT_PROP_MOVE_TYPE_CONFLICT: PropMoveTypeConflictPolicy =
	'coerce';

/** An unrecognized persisted choice falls back rather than throwing at load. */
export function normalizePropMoveTypeConflict(
	value: unknown,
): PropMoveTypeConflictPolicy {
	if (typeof value === 'string' && POLICIES.has(value)) {
		return value as PropMoveTypeConflictPolicy;
	}
	return DEFAULT_PROP_MOVE_TYPE_CONFLICT;
}

export interface PropMoveDestination {
	property: string;
	/** The destination's resolved property type; absent means untyped. */
	currentType?: string;
	/** Whether the destination already holds a value in the file being written. */
	occupied: boolean;
}

export interface PropMoveIncoming {
	rawValue: string;
	/** The origin property's type, used when the destination has to become something. */
	propType?: string;
}

export type PropMoveDecisionKind = 'compatible' | 'coerce' | 'blocked' | 'ask';

export type PropMoveBlockReasonKey =
	| 'explorer.prop_move.blocked.scalar_occupied'
	| 'explorer.prop_move.blocked.type_mismatch';

export interface PropMoveTypeChange {
	property: string;
	fromType: string;
	toType: EditablePropType;
	/** The one sentinel that reaches the native type writer, through the queue. */
	sentinel: typeof NATIVE_SET_PROP_TYPE;
	/** `buscar: date -> list` — the change stated the way the summary shows it. */
	declaration: string;
}

export interface PropMoveDecision {
	destination: string;
	kind: PropMoveDecisionKind;
	typeChange: PropMoveTypeChange | null;
	reasonKey: PropMoveBlockReasonKey | null;
}

const ASSIGNABLE: ReadonlySet<string> = new Set<EditablePropType>([
	'text',
	'number',
	'checkbox',
	'date',
	'datetime',
	'list',
]);

const BOOLEAN_LITERAL = /^(true|false|yes|no|0|1)$/i;

function isListShaped(currentType: string | undefined): boolean {
	if (currentType === undefined) return false;
	return LIST_WIDGETS.has(resolveCorePropertyWidget(currentType));
}

/**
 * Whether the destination's scalar type can hold this value as written. `text`
 * holds anything, which is why an untyped destination never conflicts.
 */
function valueFitsType(rawValue: string, currentType: string | undefined): boolean {
	const widget = resolveCorePropertyWidget(currentType);
	switch (widget) {
		case 'number': {
			const trimmed = rawValue.trim();
			return trimmed !== '' && Number.isFinite(Number(trimmed));
		}
		case 'checkbox':
			return BOOLEAN_LITERAL.test(rawValue.trim());
		case 'date':
		case 'datetime':
			return !Number.isNaN(Date.parse(rawValue));
		default:
			return true;
	}
}

/** The incoming value's own assignable type, or `text` when it has none. */
function incomingAssignableType(incoming: PropMoveIncoming): EditablePropType {
	const declared = (incoming.propType ?? '').trim().toLowerCase();
	if (ASSIGNABLE.has(declared)) return declared as EditablePropType;
	if (declared === 'multitext') return 'list';
	return 'text';
}

function typeChange(
	destination: PropMoveDestination,
	toType: EditablePropType,
): PropMoveTypeChange {
	const fromType = destination.currentType ?? 'text';
	return {
		property: destination.property,
		fromType,
		toType,
		sentinel: NATIVE_SET_PROP_TYPE,
		declaration: `${destination.property}: ${fromType} -> ${toType}`,
	};
}

/**
 * The minimum type that satisfies the write, or `null` when the destination
 * already satisfies it.
 *
 * Appending into an occupied scalar needs a container, so the answer is `list`.
 * Replacing discards what was there, so the answer is only as wide as the
 * incoming value itself — widening to text would lose the value's meaning for
 * no reason.
 */
function requiredType(
	destination: PropMoveDestination,
	incoming: PropMoveIncoming,
	write: 'append' | 'replace',
): { toType: EditablePropType; reasonKey: PropMoveBlockReasonKey } | null {
	if (isListShaped(destination.currentType)) return null;

	if (write === 'append' && destination.occupied) {
		return {
			toType: 'list',
			reasonKey: 'explorer.prop_move.blocked.scalar_occupied',
		};
	}

	if (valueFitsType(incoming.rawValue, destination.currentType)) return null;

	return {
		toType: incomingAssignableType(incoming),
		reasonKey: 'explorer.prop_move.blocked.type_mismatch',
	};
}

export function decidePropMoveConflict(
	destination: PropMoveDestination,
	incoming: PropMoveIncoming,
	write: 'append' | 'replace',
	policy: PropMoveTypeConflictPolicy,
): PropMoveDecision {
	const required = requiredType(destination, incoming, write);

	if (!required) {
		return {
			destination: destination.property,
			kind: 'compatible',
			typeChange: null,
			reasonKey: null,
		};
	}

	if (policy === 'block') {
		// The only behavior that never changes a type implicitly: the
		// incompatible destination is excluded and says why, and the compatible
		// ones still run.
		return {
			destination: destination.property,
			kind: 'blocked',
			typeChange: null,
			reasonKey: required.reasonKey,
		};
	}

	return {
		destination: destination.property,
		kind: policy === 'ask' ? 'ask' : 'coerce',
		typeChange: typeChange(destination, required.toType),
		reasonKey: required.reasonKey,
	};
}

/**
 * Converts the values the destination already holds into its new type. It
 * delegates to the existing converter so a coercing move and a plain type
 * change agree on what a converted value looks like.
 */
export function coerceDestinationValues(
	current: unknown,
	targetType: EditablePropType,
): unknown {
	return convertPropertyValueType(current, targetType);
}
