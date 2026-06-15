import type { PropertyType } from '../types/typeOps';

const FALSEY_CHECKBOX_VALUES = new Set(['false', '0', 'no', 'none', 'null', '']);

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
