import { describe, expect, it } from 'vitest';
import { createInstanceRecord, EMPTY_REGISTRY } from '../../src/logic/logicInstanceRegistry';

describe('createInstanceRecord', () => {
	it('mints a record with an opaque id and revision 1', () => {
		const record = createInstanceRecord('vm-instance-abc');
		expect(record.id).toBe('vm-instance-abc');
		expect(record.revision).toBe(1);
		expect(record.tombstoned).toBe(false);
		expect(record.scenes).toEqual({});
		expect(record.self).toEqual({});
	});

	it('starts from an empty registry at schema 1', () => {
		expect(EMPTY_REGISTRY).toEqual({ schema: 1, instances: {} });
	});
});
