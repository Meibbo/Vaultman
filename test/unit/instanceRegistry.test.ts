import { describe, expect, it } from 'vitest';
import type { InstanceRegistryData } from '../../src/types/typeInstance';
import {
	createInstanceRecord,
	EMPTY_REGISTRY,
	setActiveScene,
	setInstanceFloatingToc,
} from '../../src/logic/logicInstanceRegistry';
import { reconcileRegistry, TOMBSTONE_CAP, TOMBSTONE_GRACE_MS, TOMBSTONE_HARD_CAP } from '../../src/logic/logicInstanceRegistry';

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
		// After touch, lastActiveAt may have updated → check value equality, not identity.
		expect(second.record.id).toBe('vm-1');
		expect(second.record.tombstoned).toBe(false);
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

	it('keeps at most TOMBSTONE_CAP tombstones, pruning the oldest by lastActiveAt (LRU)', () => {
		const now = Date.now();
		let registry: InstanceRegistryData = { schema: 1, instances: {} };
		// 25 tombstones: 20 recent (inside grace) + 5 old (outside grace)
		for (let i = 0; i < 20; i += 1) {
			const id = `vm-dead-${String(i).padStart(2, '0')}`;
			registry = {
				...registry,
				instances: {
					...registry.instances,
					[id]: { ...createInstanceRecord(id), lastActiveAt: now - 1000 * (i + 1) },
				},
			};
		}
		for (let i = 20; i < 25; i += 1) {
			const id = `vm-dead-${String(i).padStart(2, '0')}`;
			registry = {
				...registry,
				instances: {
					...registry.instances,
					[id]: { ...createInstanceRecord(id), lastActiveAt: now - TOMBSTONE_GRACE_MS - 1000 * (i + 1) },
				},
			};
		}
		// One live anchor.
		registry = {
			...registry,
			instances: {
				...registry.instances,
				'vm-live': { ...createInstanceRecord('vm-live'), lastActiveAt: now - 3600 * 1000 },
			},
		};
		const reconciled = reconcileRegistry(registry, ['vm-live'], now);
		const tombstones = Object.values(reconciled.instances).filter((r) => r.tombstoned);
		expect(tombstones).toHaveLength(TOMBSTONE_CAP);
		expect(reconciled.instances['vm-live']?.tombstoned).toBe(false);
		// The 5 out-of-grace tombstones are pruned: dead-20..24.
		for (let i = 20; i < 25; i += 1) {
			expect(reconciled.instances[`vm-dead-${String(i).padStart(2, '0')}`]).toBeUndefined();
		}
		expect(reconciled.instances['vm-dead-00']).toBeDefined();
		expect(reconciled.instances['vm-dead-19']).toBeDefined();
	});

	it('treats a missing or non-finite lastActiveAt as the oldest instead of poisoning the sort', () => {
		const now = Date.now();
		let registry: InstanceRegistryData = { schema: 1, instances: {} };
		// 21 tombstones outside grace window (dead-00 is the newest among them).
		for (let i = 0; i < 21; i += 1) {
			const id = `vm-dead-${String(i).padStart(2, '0')}`;
			registry = { ...registry, instances: { ...registry.instances, [id]: { ...createInstanceRecord(id), lastActiveAt: now - TOMBSTONE_GRACE_MS - 100 - i } } };
		}
		// Corrupt: lastActiveAt missing, createdAt also old → migrates to stamp=0 (oldest of all).
		const corrupt = { ...createInstanceRecord('vm-corrupt'), createdAt: 1, lastActiveAt: undefined as unknown as number };
		registry = { ...registry, instances: { ...registry.instances, 'vm-corrupt': corrupt } };
		const reconciled = reconcileRegistry(registry, [], now);
		// 22 tombstones, all outside grace → prune 2 oldest: corrupt (stamp=1) + dead-20 (oldest dead).
		expect(Object.keys(reconciled.instances)).toHaveLength(TOMBSTONE_CAP);
		expect(reconciled.instances['vm-corrupt']).toBeUndefined();
		expect(reconciled.instances['vm-dead-20']).toBeUndefined();
		expect(reconciled.instances['vm-dead-00']).toBeDefined();
		expect(reconciled.instances['vm-dead-01']).toBeDefined();
	});

	it('is idempotent once under the cap: a second reconcile changes nothing', () => {
		const now = Date.now();
		let registry: InstanceRegistryData = { schema: 1, instances: {} };
		// 30 tombstones all outside grace window.
		for (let i = 0; i < 30; i += 1) {
			const id = `vm-dead-${i}`;
			registry = { ...registry, instances: { ...registry.instances, [id]: { ...createInstanceRecord(id), createdAt: i, lastActiveAt: now - TOMBSTONE_GRACE_MS - 1000 * (i + 1) } } };
		}
		const once = reconcileRegistry(registry, [], now);
		expect(reconcileRegistry(once, [], now)).toEqual(once);
		expect(Object.keys(once.instances)).toHaveLength(TOMBSTONE_CAP);
	});

	it('LRU: un maestro antiguo pero activo ayer sobrevive; una efímera cae', () => {
		const now = Date.now();
		const yesterday = now - 24 * 60 * 60 * 1000;
		let registry: InstanceRegistryData = { schema: 1, instances: {} };
		// 20 efímeras recientes (lastActiveAt = now - 1000..now - 20000) — dentro de grace window
		for (let i = 0; i < 20; i += 1) {
			const id = `vm-efimera-${String(i).padStart(2, '0')}`;
			registry = { ...registry, instances: { ...registry.instances, [id]: { ...createInstanceRecord(id), lastActiveAt: now - 1000 * (i + 1) } } };
		}
		// 5 viejas fuera de grace window
		for (let i = 0; i < 5; i += 1) {
			const id = `vm-old-${String(i).padStart(2, '0')}`;
			registry = { ...registry, instances: { ...registry.instances, [id]: { ...createInstanceRecord(id), lastActiveAt: now - TOMBSTONE_GRACE_MS - 1000 } } };
		}
		// Un maestro vivo con lastActiveAt de ayer (dentro de grace window) — nunca tombstone
		registry = { ...registry, instances: { ...registry.instances, 'vm-maestro': { ...createInstanceRecord('vm-maestro'), createdAt: 1, lastActiveAt: yesterday } } };
		// Total: 25 tombstones + 1 live = 26 records; debe podar 5 viejas
		const reconciled = reconcileRegistry(registry, ['vm-maestro'], now);
		expect(reconciled.instances['vm-maestro']?.tombstoned).toBe(false);
		expect(reconciled.instances['vm-maestro']?.lastActiveAt).toBe(yesterday);
		// Las 5 viejas son las que caen (LRU por lastActiveAt)
		for (let i = 0; i < 5; i += 1) {
			expect(reconciled.instances[`vm-old-${String(i).padStart(2, '0')}`]).toBeUndefined();
		}
		// Las 20 efímeras sobreviven (dentro de grace window)
		for (let i = 0; i < 20; i += 1) {
			expect(reconciled.instances[`vm-efimera-${String(i).padStart(2, '0')}`]).toBeDefined();
		}
		const tombstones = Object.values(reconciled.instances).filter((r) => r.tombstoned);
		expect(tombstones.length).toBe(TOMBSTONE_CAP);
	});

	it('grace window: tombstones dentro de TOMBSTONE_GRACE_MS nunca se podan, aunque se supere el cupo', () => {
		const now = Date.now();
		let registry: InstanceRegistryData = { schema: 1, instances: {} };
		// 25 tombstones todos dentro de la ventana de gracia (activos hace 1 hora)
		for (let i = 0; i < 25; i += 1) {
			const id = `vm-grace-${String(i).padStart(2, '0')}`;
			registry = { ...registry, instances: { ...registry.instances, [id]: { ...createInstanceRecord(id), lastActiveAt: now - 3600 * 1000 } } };
		}
		const reconciled = reconcileRegistry(registry, [], now);
		// Ninguno podado: el registro pasa de 20 temporalmente
		expect(Object.keys(reconciled.instances)).toHaveLength(25);
		for (let i = 0; i < 25; i += 1) {
			expect(reconciled.instances[`vm-grace-${String(i).padStart(2, '0')}`]?.tombstoned).toBe(true);
		}
	});

	it('grace window: tombstone JUSTO fuera de la ventana sí se poda', () => {
		const now = Date.now();
		let registry: InstanceRegistryData = { schema: 1, instances: {} };
		// 20 dentro de la ventana + 5 fuera = 25 tombstones
		for (let i = 0; i < 20; i += 1) {
			const id = `vm-in-${String(i).padStart(2, '0')}`;
			registry = { ...registry, instances: { ...registry.instances, [id]: { ...createInstanceRecord(id), lastActiveAt: now - 3600 * 1000 } } };
		}
		for (let i = 0; i < 5; i += 1) {
			const id = `vm-out-${String(i).padStart(2, '0')}`;
			registry = { ...registry, instances: { ...registry.instances, [id]: { ...createInstanceRecord(id), lastActiveAt: now - TOMBSTONE_GRACE_MS - 1000 } } };
		}
		const reconciled = reconcileRegistry(registry, [], now);
		// Los 5 fuera de la ventana son los LRU y deben podarse
		for (let i = 0; i < 5; i += 1) {
			expect(reconciled.instances[`vm-out-${String(i).padStart(2, '0')}`]).toBeUndefined();
		}
		// Los 20 dentro de la ventana sobreviven
		for (let i = 0; i < 20; i += 1) {
			expect(reconciled.instances[`vm-in-${String(i).padStart(2, '0')}`]).toBeDefined();
		}
	});
});

describe('reconcileRegistry hard cap', () => {
	it('never keeps more than TOMBSTONE_HARD_CAP tombstones, even inside the grace window', () => {
		const now = 1_000_000_000;
		let registry: InstanceRegistryData = { schema: 1, instances: {} };
		for (let i = 0; i < TOMBSTONE_HARD_CAP + 30; i += 1) {
			const id = `vm-burst-${String(i).padStart(3, '0')}`;
			registry = {
				...registry,
				instances: {
					...registry.instances,
					[id]: { ...createInstanceRecord(id), createdAt: now - i, lastActiveAt: now - i },
				},
			};
		}
		const reconciled = reconcileRegistry(registry, [], now);
		expect(Object.keys(reconciled.instances)).toHaveLength(TOMBSTONE_HARD_CAP);
		// The least recently active go first.
		expect(reconciled.instances['vm-burst-129']).toBeUndefined();
		expect(reconciled.instances['vm-burst-000']).toBeDefined();
	});
});

describe('setActiveScene', () => {
	it('remembers the scene and bumps the revision', () => {
		const registry = ensureInstance(EMPTY_REGISTRY, 'vm-1').registry;
		const next = setActiveScene(registry, 'vm-1', 'props');
		expect(next.instances['vm-1'].activeScene).toBe('props');
		expect(next.instances['vm-1'].revision).toBe(2);
	});

	it('returns the same registry when nothing changed, so nothing is persisted', () => {
		let registry = ensureInstance(EMPTY_REGISTRY, 'vm-1').registry;
		registry = setActiveScene(registry, 'vm-1', 'props');
		expect(setActiveScene(registry, 'vm-1', 'props')).toBe(registry);
	});

	it('ignores an unknown instance instead of throwing', () => {
		expect(setActiveScene(EMPTY_REGISTRY, 'nope', 'props')).toBe(EMPTY_REGISTRY);
	});
});

describe('setInstanceFloatingToc', () => {
	it('remembers the floatingToc state and bumps the revision', () => {
		const registry = ensureInstance(EMPTY_REGISTRY, 'vm-1').registry;
		const next = setInstanceFloatingToc(registry, 'vm-1', {
			enabled: true,
			kind: 'files',
			rootId: 'folder-a',
		});
		expect(next.instances['vm-1'].floatingToc).toEqual({
			enabled: true,
			kind: 'files',
			rootId: 'folder-a',
		});
		expect(next.instances['vm-1'].revision).toBe(2);
	});

	it('returns the same registry when nothing changed, so nothing is persisted', () => {
		let registry = ensureInstance(EMPTY_REGISTRY, 'vm-1').registry;
		const toc = { enabled: true, kind: 'folders' as const, rootId: null };
		registry = setInstanceFloatingToc(registry, 'vm-1', toc);
		expect(setInstanceFloatingToc(registry, 'vm-1', toc)).toBe(registry);
	});

	it('ignores an unknown instance instead of throwing', () => {
		expect(
			setInstanceFloatingToc(EMPTY_REGISTRY, 'nope', {
				enabled: true,
				kind: 'folders',
				rootId: null,
			}),
		).toBe(EMPTY_REGISTRY);
	});
});
