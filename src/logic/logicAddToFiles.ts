import { coercePropertyValueForWidget } from './propertyValueCoercion';

/**
 * `Add to files` writes one explorer node into every file the current filter
 * produced. The three node kinds it accepts write different things, which is
 * why a mixed target set has no single operation to offer.
 */
export type AddToFilesTarget =
	| { id: string; kind: 'tag'; tag: string }
	| { id: string; kind: 'prop'; property: string }
	| {
			id: string;
			kind: 'value';
			property: string;
			rawValue: string;
			propType?: string;
	  };

export type AddToFilesStatus = 'written' | 'unchanged' | 'collision';

export interface AddToFilesOutcome {
	status: AddToFilesStatus;
	/** The frontmatter to write, or `null` when this file is not written. */
	frontmatter: Record<string, unknown> | null;
}

export interface AddToFilesAvailability {
	available: boolean;
	enabled: boolean;
	kind: AddToFilesTarget['kind'] | null;
	destinationCount: number;
}

const unchanged: AddToFilesOutcome = { status: 'unchanged', frontmatter: null };
const collision: AddToFilesOutcome = { status: 'collision', frontmatter: null };

/**
 * The text form of a scalar frontmatter value, or `null` when the value is a
 * map or a list. A map never equals a value the explorer projected, and
 * stringifying it would compare against `[object Object]`.
 */
function scalarText(value: unknown): string | null {
	if (value === null || typeof value === 'object') return null;
	return String(value as string | number | boolean | bigint);
}

function asStringList(raw: unknown): string[] {
	if (Array.isArray(raw)) return (raw as unknown[]).map((v) => String(v));
	if (typeof raw === 'string') return [raw];
	return [];
}

function addTag(
	tag: string,
	frontmatter: Record<string, unknown>,
): AddToFilesOutcome {
	const existing = asStringList(frontmatter.tags);
	if (existing.includes(tag)) return unchanged;
	return {
		status: 'written',
		frontmatter: { ...frontmatter, tags: [...existing, tag] },
	};
}

function addProperty(
	property: string,
	frontmatter: Record<string, unknown>,
): AddToFilesOutcome {
	// An existing key is left exactly as it is: the empty value is what makes
	// this operation useful for seeding a schema, not a way to blank a value.
	if (property in frontmatter) return unchanged;
	return { status: 'written', frontmatter: { ...frontmatter, [property]: '' } };
}

function addValue(
	target: Extract<AddToFilesTarget, { kind: 'value' }>,
	frontmatter: Record<string, unknown>,
): AddToFilesOutcome {
	const { property, rawValue, propType } = target;
	// The value keeps the property's runtime type on the way in, for the same
	// reason inline edits do: writing the string makes Obsidian re-infer the
	// property's type from the data.
	const value = coercePropertyValueForWidget(rawValue, propType);

	if (!(property in frontmatter) || frontmatter[property] === undefined) {
		return { status: 'written', frontmatter: { ...frontmatter, [property]: value } };
	}

	const current = frontmatter[property];
	if (Array.isArray(current)) {
		const existing: unknown[] = current;
		if (existing.some((item) => scalarText(item) === rawValue)) return unchanged;
		return {
			status: 'written',
			frontmatter: { ...frontmatter, [property]: [...existing, value] },
		};
	}

	if (scalarText(current) === rawValue) return unchanged;
	// A scalar already holding a different value is the collision the
	// `Move to prop...` conflict policy resolves. Overwriting it here would be a
	// second, quieter answer to the same question.
	return collision;
}

/**
 * Applies one target to one file's frontmatter. Pure: it neither reads the
 * vault nor queues anything, so the same decision is testable and reusable by
 * the gesture and the menu entry alike.
 */
export function applyAddToFile(
	target: AddToFilesTarget,
	frontmatter: Record<string, unknown>,
): AddToFilesOutcome {
	switch (target.kind) {
		case 'tag':
			return addTag(target.tag, frontmatter);
		case 'prop':
			return addProperty(target.property, frontmatter);
		case 'value':
			return addValue(target, frontmatter);
	}
}

/**
 * Decides whether the menu entry is offered, and with which destination count.
 *
 * An empty filter result keeps the entry visible and disabled: a missing entry
 * reads as a bug, while a disabled one with `0` states its own reason.
 */
export function addToFilesAvailability(
	targets: readonly AddToFilesTarget[],
	destinationCount: number,
): AddToFilesAvailability {
	const kinds = new Set(targets.map((target) => target.kind));
	const kind = kinds.size === 1 ? [...kinds][0] : null;

	return {
		available: kind !== null,
		enabled: kind !== null && destinationCount > 0,
		kind,
		destinationCount,
	};
}
