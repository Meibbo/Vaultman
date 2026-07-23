import type { PropertyType } from '../types/typeOps';

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
	| 'wikilink';

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
				.replace(
					/(^|[\s\-_./])(\p{L})/gu,
					(_match, prefix: string, letter: string) =>
						`${prefix}${letter.toUpperCase()}`,
				);
		case 'wikilink': {
			const value = raw.trim();
			if (!value || isFullWikilink(value)) return raw;
			return `[[${value}]]`;
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
		!raw.trim() ||
		isFullWikilink(raw)
	) {
		return [];
	}
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
		case 'date':
		case 'text':
		default:
			return raw;
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
	}
}
