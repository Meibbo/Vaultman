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
});
