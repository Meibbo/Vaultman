import { describe, expect, it } from 'vitest';

import {
	convertPropertyValueType,
	parsePropertyValue,
} from '../../src/logic/propertyValueCoercion';

describe('property value coercion', () => {
	it('parses checkbox values as booleans for shared property update paths', () => {
		expect(parsePropertyValue('true', 'checkbox')).toBe(true);
		expect(parsePropertyValue('yes', 'checkbox')).toBe(true);
		expect(parsePropertyValue('false', 'checkbox')).toBe(false);
		expect(parsePropertyValue('0', 'checkbox')).toBe(false);
	});

	it('converts existing values to checkbox booleans without stringifying them', () => {
		expect(convertPropertyValueType('false', 'checkbox')).toBe(false);
		expect(convertPropertyValueType('release', 'checkbox')).toBe(true);
	});

	// U121-003 shard 07: the datetime widget shipped in cac504a9 had no matching
	// member in PropertyType, so no operation could carry the value it edits.
	it('parses datetime values in the form the datetime-local widget reads', () => {
		expect(parsePropertyValue('2026-08-01T10:30', 'datetime')).toBe(
			'2026-08-01T10:30',
		);
	});

	it('normalizes converted datetimes to minute precision', () => {
		expect(convertPropertyValueType('2026-08-01T10:30:45', 'datetime')).toBe(
			'2026-08-01T10:30',
		);
	});

	it('gives a bare date a zero time when converted to datetime', () => {
		expect(convertPropertyValueType('2026-08-01', 'datetime')).toBe(
			'2026-08-01T00:00',
		);
	});

	it('takes the first entry when converting a list to datetime', () => {
		expect(convertPropertyValueType(['2026-08-01T10:30'], 'datetime')).toBe(
			'2026-08-01T10:30',
		);
	});

	it('keeps a datetime verbatim when converted to text', () => {
		expect(convertPropertyValueType('2026-08-01T10:30', 'text')).toBe(
			'2026-08-01T10:30',
		);
	});
});
