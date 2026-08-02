import { describe, expect, it } from 'vitest';
import {
	checkPropertyValueConflict,
	type PropertyConflictReasonCode,
} from '../../src/logic/logicProps';

describe('checkPropertyValueConflict detailed reasons', () => {
	it('returns null when values match expected type', () => {
		const conflict = checkPropertyValueConflict('checkbox', 'true');
		expect(conflict).toBeNull();
	});

	it('returns type-mismatch reason for invalid checkbox value', () => {
		const conflict = checkPropertyValueConflict('checkbox', 'invalid-string');
		expect(conflict).not.toBeNull();
		expect(conflict?.reasonCode).toBe<PropertyConflictReasonCode>('type-mismatch');
		expect(conflict?.reasonText).toContain('checkbox');
	});

	it('returns parse-error reason for invalid date string', () => {
		const conflict = checkPropertyValueConflict('date', 'not-a-date');
		expect(conflict).not.toBeNull();
		expect(conflict?.reasonCode).toBe<PropertyConflictReasonCode>('parse-error');
	});
});
