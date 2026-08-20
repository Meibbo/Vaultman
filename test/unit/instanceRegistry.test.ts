import { describe, expect, it } from 'vitest';
import type { InstanceRegistryData } from '../../src/types/typeInstance';
import { createInstanceRecord, EMPTY_REGISTRY } from '../../src/logic/logicInstanceRegistry';
import { reconcileRegistry } from '../../src/logic/logicInstanceRegistry';

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
		let registry: InstanceRegistryData = { schema: 1, instances: {} };
		const first = ensureInstance(registry, 'vm-1');
		registry = first.registry;
		expect(Object.keys(registry.instances)).toEqual(['vm-1']);

		const second = ensureInstance(registry, 'vm-1');
		expect(second.created).toBe(false);
		expect(second.record).toBe(registry.instances['vm-1']);
	});

	it('revives a tombstoned record instead of minting a second one', () => {
		let registry = ensureInstance(EMPTY_REGISTRY, 'vm-1').registry;
		registry.instances['vm-1'].tombstoned = true;
		const revived = ensureInstance(registry, 'vm-1');
		expect(revived.record.tombstoned).toBe(false);
		expect(Object.keys(revived.registry.instances)).toEqual(['vm-1']);
	});
});

describe('mintInstanceId', () => {
	it('never collides with an existing id', () => {
		const registry: InstanceRegistryData = { schema: 1, instances: { 'vm-a': createInstanceRecord('vm-a') } };
		const id = mintInstanceId(registry, () => 'a');
		expect(id).not.toBe('vm-a');
	});
});

describe('setSceneConfig', () => {
	it('writes a sparse scene patch and bumps the revision', () => {
		const registry = ensureInstance(EMPTY_REGISTRY, 'vm-1').registry;
		const next = setSceneConfig(registry, 'vm-1', 'files', { viewMode: 'table' });
		expect(next.instances['vm-1'].scenes.files).toEqual({ viewMode: 'table' });
		expect(next.instances['vm-1'].revision).toBe(2);
	});

	it('merges into the existing scene patch instead of replacing it', () => {
		let registry = ensureInstance(EMPTY_REGISTRY, 'vm-1').registry;
		registry = setSceneConfig(registry, 'vm-1', 'files', { viewMode: 'table' });
		registry = setSceneConfig(registry, 'vm-1', 'files', { visibleCells: ['name'] });
		expect(registry.instances['vm-1'].scenes.files).toEqual({
			viewMode: 'table',
			visibleCells: ['name'],
		});
	});

	it('does not mutate the registry it was given', () => {
		const registry = ensureInstance(EMPTY_REGISTRY, 'vm-1').registry;
		const snapshot = JSON.stringify(registry);
		setSceneConfig(registry, 'vm-1', 'files', { viewMode: 'table' });
		expect(JSON.stringify(registry)).toBe(snapshot);
	});
});

describe('defensas del registro', () => {
	it('stores a defensive copy so the caller cannot mutate what was already saved', () => {
		const registry = ensureInstance(EMPTY_REGISTRY, 'vm-1').registry;
		const cells = ['name'];
		const next = setSceneConfig(registry, 'vm-1', 'files', { visibleCells: cells });
		cells.push('count');
		expect(next.instances['vm-1'].scenes.files?.visibleCells).toEqual(['name']);
	});

	it('does not hang when the id source is degenerate', () => {
		const registry: InstanceRegistryData = {
			schema: 1,
			instances: { 'vm-instance-a': createInstanceRecord('vm-instance-a') },
		};
		const id = mintInstanceId(registry, () => 'a');
		expect(id).not.toBe('vm-instance-a');
		expect(id.startsWith('vm-instance-')).toBe(true);
	});
});

describe('reconcileRegistry', () => {
	it('accepts a well-formed registry unchanged', () => {
		const registry = ensureInstance({ schema: 1 as const, instances: {} }, 'vm-1').registry;
		expect(reconcileRegistry(registry, ['vm-1'])).toEqual(registry);
	});

	it('replaces a missing or corrupt registry with the empty one', () => {
		expect(reconcileRegistry(undefined, [])).toEqual(EMPTY_REGISTRY);
		expect(reconcileRegistry({ schema: 99 } as never, [])).toEqual(EMPTY_REGISTRY);
	});

	it('tombstones records whose anchor no longer exists in the workspace', () => {
		let registry = ensureInstance({ schema: 1 as const, instances: {} }, 'vm-1').registry;
		registry = ensureInstance(registry, 'vm-2').registry;
		const reconciled = reconcileRegistry(registry, ['vm-1']);
		expect(reconciled.instances['vm-1'].tombstoned).toBe(false);
		expect(reconciled.instances['vm-2'].tombstoned).toBe(true);
	});

	it('keeps the tombstoned payload so a reopened leaf gets its configuration back', () => {
		let registry = ensureInstance({ schema: 1 as const, instances: {} }, 'vm-1').registry;
		registry = setSceneConfig(registry, 'vm-1', 'files', { viewMode: 'table' });
		const reconciled = reconcileRegistry(registry, []);
		expect(reconciled.instances['vm-1'].scenes.files).toEqual({ viewMode: 'table' });
	});
});
