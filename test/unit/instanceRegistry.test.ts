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

// añadir a test/unit/instanceRegistry.test.ts
import { ensureInstance, mintInstanceId, setSceneConfig } from '../../src/logic/logicInstanceRegistry';

describe('ensureInstance', () => {
	it('creates the record the first time and returns the same one afterwards', () => {
		let registry = { schema: 1 as const, instances: {} };
		const first = ensureInstance(registry, 'vm-1');
		registry = first.registry;
		expect(Object.keys(registry.instances)).toEqual(['vm-1']);

		const second = ensureInstance(registry, 'vm-1');
		expect(second.created).toBe(false);
		expect(second.record).toBe(registry.instances['vm-1']);
	});

	it('revives a tombstoned record instead of minting a second one', () => {
		let registry = ensureInstance({ schema: 1 as const, instances: {} }, 'vm-1').registry;
		registry.instances['vm-1'].tombstoned = true;
		const revived = ensureInstance(registry, 'vm-1');
		expect(revived.record.tombstoned).toBe(false);
		expect(Object.keys(revived.registry.instances)).toEqual(['vm-1']);
	});
});

describe('mintInstanceId', () => {
	it('never collides with an existing id', () => {
		const registry = { schema: 1 as const, instances: { 'vm-a': createInstanceRecord('vm-a') } };
		const id = mintInstanceId(registry, () => 'a');
		expect(id).not.toBe('vm-a');
	});
});

describe('setSceneConfig', () => {
	it('writes a sparse scene patch and bumps the revision', () => {
		const registry = ensureInstance({ schema: 1 as const, instances: {} }, 'vm-1').registry;
		const next = setSceneConfig(registry, 'vm-1', 'files', { viewMode: 'table' });
		expect(next.instances['vm-1'].scenes.files).toEqual({ viewMode: 'table' });
		expect(next.instances['vm-1'].revision).toBe(2);
	});

	it('merges into the existing scene patch instead of replacing it', () => {
		let registry = ensureInstance({ schema: 1 as const, instances: {} }, 'vm-1').registry;
		registry = setSceneConfig(registry, 'vm-1', 'files', { viewMode: 'table' });
		registry = setSceneConfig(registry, 'vm-1', 'files', { visibleCells: ['name'] });
		expect(registry.instances['vm-1'].scenes.files).toEqual({
			viewMode: 'table',
			visibleCells: ['name'],
		});
	});

	it('does not mutate the registry it was given', () => {
		const registry = ensureInstance({ schema: 1 as const, instances: {} }, 'vm-1').registry;
		const snapshot = JSON.stringify(registry);
		setSceneConfig(registry, 'vm-1', 'files', { viewMode: 'table' });
		expect(JSON.stringify(registry)).toBe(snapshot);
	});
});

describe('defensas del registro', () => {
	it('stores a defensive copy so the caller cannot mutate what was already saved', () => {
		const registry = ensureInstance({ schema: 1 as const, instances: {} }, 'vm-1').registry;
		const cells = ['name'];
		const next = setSceneConfig(registry, 'vm-1', 'files', { visibleCells: cells });
		cells.push('count');
		expect(next.instances['vm-1'].scenes.files?.visibleCells).toEqual(['name']);
	});

	it('does not hang when the id source is degenerate', () => {
		const registry = {
			schema: 1 as const,
			instances: { 'vm-instance-a': createInstanceRecord('vm-instance-a') },
		};
		const id = mintInstanceId(registry, () => 'a');
		expect(id).not.toBe('vm-instance-a');
		expect(id.startsWith('vm-instance-')).toBe(true);
	});
});
