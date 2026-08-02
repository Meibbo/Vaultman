import {
	coercePropertyValueForWidget,
	LIST_WIDGETS,
	resolveCorePropertyWidget,
} from './propertyValueCoercion';
import {
	coerceDestinationValues,
	type PropMoveDecision,
	type PropMoveTypeChange,
} from './logicPropMoveConflict';
import type { ValueMoveOperation } from './logicValueMoveMode';

/**
 * Applies one (origin value, destination property) pair to one file. Pure: it
 * takes the file's frontmatter and returns the frontmatter to write, so the
 * same decision is testable without a vault and the queue stays the only
 * writer.
 *
 * The origin is the value node set — every file carrying `lugar: cocina`, not
 * one file — so a file that does not carry the value is simply unchanged.
 */
export type ValueMoveStatus = 'written' | 'unchanged' | 'skipped';

export interface ValueMoveApplyOutcome {
	status: ValueMoveStatus;
	/** The frontmatter to write, or `null` when this file is not written. */
	frontmatter: Record<string, unknown> | null;
	/** The destination type change this write carries, if the policy coerced one. */
	typeChange: PropMoveTypeChange | null;
}

const skipped: ValueMoveApplyOutcome = {
	status: 'skipped',
	frontmatter: null,
	typeChange: null,
};
const unchanged: ValueMoveApplyOutcome = {
	status: 'unchanged',
	frontmatter: null,
	typeChange: null,
};

/**
 * The text form of a scalar, or `null` for a map or list — a map never equals a
 * value the explorer projected, and stringifying it compares `[object Object]`.
 */
function scalarText(value: unknown): string | null {
	if (value === null || typeof value === 'object') return null;
	return String(value as string | number | boolean | bigint);
}

function isListType(type: string | undefined): boolean {
	if (type === undefined) return false;
	return LIST_WIDGETS.has(resolveCorePropertyWidget(type));
}

/** Removes the moved value from the origin, dropping the key once it empties. */
function removeOriginValue(
	frontmatter: Record<string, unknown>,
	property: string,
	rawValue: string,
): Record<string, unknown> {
	const current = frontmatter[property];
	const next = { ...frontmatter };

	if (Array.isArray(current)) {
		const remaining = (current as unknown[]).filter(
			(item) => scalarText(item) !== rawValue,
		);
		if (remaining.length > 0) {
			next[property] = remaining;
			return next;
		}
	}

	delete next[property];
	return next;
}

function fileCarriesOriginValue(
	frontmatter: Record<string, unknown>,
	property: string,
	rawValue: string,
): boolean {
	const current = frontmatter[property];
	if (Array.isArray(current)) {
		return (current as unknown[]).some((item) => scalarText(item) === rawValue);
	}
	return scalarText(current) === rawValue;
}

export function applyValueMove(
	operation: ValueMoveOperation,
	frontmatter: Record<string, unknown>,
	decision: PropMoveDecision,
	destinationType: string | undefined,
): ValueMoveApplyOutcome {
	// A blocked destination takes the origin with it: removing the value after
	// refusing to write it elsewhere would delete data on the user's behalf.
	if (decision.kind === 'blocked') return skipped;

	if (
		!fileCarriesOriginValue(
			frontmatter,
			operation.originProperty,
			operation.rawValue,
		)
	) {
		return unchanged;
	}

	const typeChange = decision.typeChange;
	const effectiveType = typeChange?.toType ?? destinationType;
	const value = coercePropertyValueForWidget(operation.rawValue, effectiveType);

	// What the destination already holds, converted first when the policy is
	// changing its type, so the existing values survive the coercion.
	const held =
		operation.destinationProperty in frontmatter
			? typeChange
				? coerceDestinationValues(
						frontmatter[operation.destinationProperty],
						typeChange.toType,
					)
				: frontmatter[operation.destinationProperty]
			: undefined;

	let destinationValue: unknown;
	if (operation.write === 'replace' || held === undefined) {
		destinationValue = isListType(effectiveType) ? [value] : value;
	} else if (Array.isArray(held)) {
		const existing: unknown[] = held;
		destinationValue = existing.some(
			(item) => scalarText(item) === operation.rawValue,
		)
			? existing
			: [...existing, value];
	} else {
		// A scalar that still holds something under `append` only reaches here
		// when the policy already widened the destination, so the widened value
		// is a list of both.
		destinationValue = isListType(effectiveType) ? [held, value] : value;
	}

	let next: Record<string, unknown> = {
		...frontmatter,
		[operation.destinationProperty]: destinationValue,
	};

	if (operation.originDisposition === 'move') {
		next = removeOriginValue(next, operation.originProperty, operation.rawValue);
	}

	return { status: 'written', frontmatter: next, typeChange: typeChange ?? null };
}
