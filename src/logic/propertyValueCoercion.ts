import type { PropertyType } from '../types/typeOps';

/**
 * The eight property widget types Obsidian Core ships. Core's own `property:set`
 * handler declares `text|list|number|checkbox|date|datetime` as assignable, and
 * `tags`/`aliases` are the derived kinds it renders separately.
 */
export type CorePropertyWidget =
	| 'text'
	| 'multitext'
	| 'number'
	| 'checkbox'
	| 'date'
	| 'datetime'
	| 'tags'
	| 'aliases'
	| 'unknown';

export const LIST_WIDGETS: ReadonlySet<CorePropertyWidget> = new Set([
	'tags',
	'aliases',
	'multitext',
]);

const WIDGET_ALIASES: Readonly<Record<string, CorePropertyWidget>> = {
	list: 'multitext',
	multitext: 'multitext',
	boolean: 'checkbox',
	toggle: 'checkbox',
	numeric: 'number',
	'date-time': 'datetime',
	date_time: 'datetime',
	cssclasses: 'multitext',
};

const KNOWN_WIDGETS: ReadonlySet<string> = new Set<CorePropertyWidget>([
	'text',
	'multitext',
	'number',
	'checkbox',
	'date',
	'datetime',
	'tags',
	'aliases',
	'unknown',
]);

/**
 * Resolves whatever `PropertyInfo.widget`/`type` reported into one of the eight
 * Core kinds. An unrecognized type renders as text rather than disappearing,
 * because a value the plugin cannot classify is still a value the user wrote.
 */
export function resolveCorePropertyWidget(
	propType: string | undefined,
): CorePropertyWidget {
	const normalized = (propType ?? '').trim().toLowerCase();
	const aliased = WIDGET_ALIASES[normalized];
	if (aliased) return aliased;
	if (KNOWN_WIDGETS.has(normalized)) return normalized as CorePropertyWidget;
	return 'text';
}

const FALSEY_CHECKBOX_VALUES = new Set([
	'false',
	'0',
	'no',
	'none',
	'null',
	'',
]);

export type PropertyValueConversionId =
	| 'lowercase'
	| 'uppercase'
	| 'titlecase'
	| 'wikilink'
	| 'plain';

export interface PropertyValueConversionOption {
	id: PropertyValueConversionId;
	actionId: string;
	labelKey: string;
	icon: string;
}

export const PROPERTY_VALUE_CONVERSION_OPTIONS: readonly PropertyValueConversionOption[] =
	[
		{
			id: 'lowercase',
			actionId: 'value.case-lower',
			labelKey: 'explorer.ctx.lowercase',
			icon: 'lucide-case-lower',
		},
		{
			id: 'uppercase',
			actionId: 'value.case-upper',
			labelKey: 'explorer.ctx.uppercase',
			icon: 'lucide-case-upper',
		},
		{
			id: 'titlecase',
			actionId: 'value.case-title',
			labelKey: 'explorer.ctx.titlecase',
			icon: 'lucide-type',
		},
		{
			id: 'wikilink',
			actionId: 'value.convert-wikilink',
			labelKey: 'explorer.ctx.wikilink',
			icon: 'lucide-link',
		},
		{
			id: 'plain',
			actionId: 'value.convert-plain',
			labelKey: 'explorer.ctx.plain_text',
			icon: 'lucide-unlink',
		},
	];

function isFullWikilink(value: string): boolean {
	const trimmed = value.trim();
	return (
		trimmed.length > 4 &&
		trimmed.startsWith('[[') &&
		trimmed.endsWith(']]')
	);
}

export function convertPropertyValue(
	raw: string,
	conversion: PropertyValueConversionId,
): string {
	switch (conversion) {
		case 'lowercase':
			return raw.toLowerCase();
		case 'uppercase':
			return raw.toUpperCase();
		case 'titlecase':
			return raw
				.toLowerCase()
				// Brackets and parens open a word too, otherwise `[[release]]`
				// would come back unchanged and Titlecase would be a duplicate
				// of lowercase for every linked value.
				.replace(
					/(^|[\s\-_./[(])(\p{L})/gu,
					(_match, prefix: string, letter: string) =>
						`${prefix}${letter.toUpperCase()}`,
				);
		case 'wikilink': {
			const value = raw.trim();
			if (!value || isFullWikilink(value)) return raw;
			return `[[${value}]]`;
		}
		// The inverse of `wikilink`: Convert takes a text/list value into a link
		// and back out again. Unwrapping keeps the inner text verbatim, so
		// `[[note|alias]]` round-trips instead of silently losing its alias.
		case 'plain': {
			const value = raw.trim();
			if (!isFullWikilink(value)) return raw;
			return value.slice(2, -2);
		}
	}
}

export function availablePropertyValueConversions(
	propType: string | undefined,
	raw: string,
	isTypeIncompatible = false,
): PropertyValueConversionOption[] {
	const normalizedType = propType === 'multitext' ? 'list' : propType;
	if (
		isTypeIncompatible ||
		(normalizedType !== 'text' && normalizedType !== 'list') ||
		!raw.trim()
	) {
		return [];
	}
	// An already-linked value used to bail here, which hid the whole Convert
	// submenu. Convert is bidirectional, so a wikilink still offers the case
	// conversions (they apply to its name) and the inverse `plain` option.
	return PROPERTY_VALUE_CONVERSION_OPTIONS.filter(
		(option) => convertPropertyValue(raw, option.id) !== raw,
	);
}

export function replaceMatchingPropertyValue(
	currentValue: unknown,
	oldValue: string,
	newValue: unknown,
): { changed: boolean; value: unknown } {
	if (Array.isArray(currentValue)) {
		const values: unknown[] = currentValue;
		let changed = false;
		const value = values.map((item) => {
			if (String(item) !== oldValue) return item;
			changed = true;
			return newValue;
		});
		return { changed, value: changed ? value : currentValue };
	}
	if (String(currentValue) === oldValue) {
		return { changed: true, value: newValue };
	}
	return { changed: false, value: currentValue };
}

export function parsePropertyValue(raw: string, type: PropertyType): unknown {
	switch (type) {
		case 'number': {
			const n = Number(raw);
			return isNaN(n) ? 0 : n;
		}
		case 'checkbox':
			return !FALSEY_CHECKBOX_VALUES.has(raw.toLowerCase().trim());
		case 'list':
			return raw
				.split(',')
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
		// `date`, `datetime` and `text` are stored verbatim: the widgets read and
		// write the exact string, so parsing must not reshape what the input
		// already produced.
		case 'date':
		case 'datetime':
		case 'text':
		default:
			return raw;
	}
}

/**
 * Coerces a value a widget just committed back into the runtime type its
 * property actually holds. Every inline control reports a string — a checkbox
 * reports `'true'`, a number field reports `'42'` — and writing that string into
 * the frontmatter makes Obsidian re-infer the property's type from the data,
 * which silently converts a boolean property into text.
 *
 * A value node under a list property is ONE element of that list, so list-shaped
 * widgets coerce like text: parsing the element as a list would nest an array
 * inside the array on write.
 */
export function coercePropertyValueForWidget(
	raw: string,
	propType: string | undefined,
): unknown {
	const widget = resolveCorePropertyWidget(propType);
	switch (widget) {
		// The `LIST_WIDGETS` members, spelled out so the remaining widgets narrow
		// to the assignable `PropertyType` set `parsePropertyValue` accepts.
		// `unknown` is read-only (Core's own widget has no input either), so it
		// never reaches here in practice — handled for exhaustiveness.
		case 'tags':
		case 'aliases':
		case 'multitext':
		case 'unknown':
			return raw;
		default:
			return parsePropertyValue(raw, widget);
	}
}

export function convertPropertyValueType(
	value: unknown,
	targetType: PropertyType,
): unknown {
	switch (targetType) {
		case 'wikilink': {
			const toWikilink = (v: unknown): string => {
				const s = String((v as string | number | boolean) ?? '').replace(
					/^\[\[|\]\]$/g,
					'',
				);
				return s ? `[[${s}]]` : '';
			};
			if (Array.isArray(value)) return value.map(toWikilink);
			return toWikilink(value);
		}
		case 'text':
			if (Array.isArray(value)) return value.map(String).join(', ');
			return String((value as string | number | boolean) ?? '').replace(
				/^\[\[|\]\]$/g,
				'',
			);
		case 'number': {
			if (Array.isArray(value)) {
				const first = (value as unknown[])[0];
				const n = Number(first);
				return isNaN(n) ? 0 : n;
			}
			const n = Number(value);
			return isNaN(n) ? 0 : n;
		}
		case 'checkbox': {
			if (typeof value === 'string') {
				return parsePropertyValue(value, 'checkbox');
			}
			return Boolean(value);
		}
		case 'list': {
			if (Array.isArray(value)) return value;
			if (typeof value === 'string') {
				return value
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean);
			}
			if (value == null) return [];
			if (
				typeof value === 'number' ||
				typeof value === 'boolean' ||
				typeof value === 'bigint'
			) {
				return [String(value)];
			}
			if (typeof value === 'symbol') {
				return [value.description ?? value.toString()];
			}
			if (typeof value === 'function') return [value.name];
			const serialized = JSON.stringify(value);
			return serialized ? [serialized] : [];
		}
		case 'date': {
			if (Array.isArray(value)) return String(value[0] ?? '');
			const str = String((value as string | number | boolean) ?? '');
			const dateMatch = str.match(
				/(\d{4}-\d{2}-\d{2})(?:T|\s)?(\d{2}:\d{2}:\d{2})?/,
			);
			if (dateMatch) {
				return dateMatch[2] ? `${dateMatch[1]}T${dateMatch[2]}` : dateMatch[1];
			}
			return str;
		}
		// `datetime-local` inputs are minute-precision, so a converted value is
		// normalized to what the widget can actually round-trip: seconds are
		// dropped rather than serialized into a value the input would discard,
		// and a bare date gains an explicit zero time instead of staying a date.
		case 'datetime': {
			if (Array.isArray(value)) {
				return convertPropertyValueType(value[0] ?? '', 'datetime');
			}
			const str = String((value as string | number | boolean) ?? '');
			const dateTimeMatch = str.match(
				/(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/,
			);
			if (dateTimeMatch) {
				return `${dateTimeMatch[1]}T${dateTimeMatch[2] ?? '00:00'}`;
			}
			return str;
		}
	}
}
