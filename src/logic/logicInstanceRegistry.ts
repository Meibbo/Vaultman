import type { InstanceRegistryData, WorkspaceInstanceId, WorkspaceInstanceRecord } from '../types/typeInstance';

export const EMPTY_REGISTRY: InstanceRegistryData = { schema: 1, instances: {} };

export function createInstanceRecord(id: WorkspaceInstanceId): WorkspaceInstanceRecord {
	return {
		id,
		createdAt: Date.now(),
		revision: 1,
		tombstoned: false,
		self: {},
		scenes: {},
	};
}

// añadir a src/logic/logicInstanceRegistry.ts

/** Prefijo estable: hace legible el `workspace.json` y evita colisionar con otros plugins. */
const ID_PREFIX = 'vm-instance-';

export function mintInstanceId(
	registry: InstanceRegistryData,
	random: () => string = () => Math.random().toString(36).slice(2, 10),
): WorkspaceInstanceId {
	let candidate = ID_PREFIX + random();
	while (registry.instances[candidate]) {
		candidate = ID_PREFIX + random() + random();
	}
	return candidate;
}

export interface EnsureResult {
	registry: InstanceRegistryData;
	record: WorkspaceInstanceRecord;
	created: boolean;
}

/**
 * Idempotente a propósito: el montaje puede repetirse (restauración de sesión, remontaje del
 * host) y NUNCA debe acuñar una segunda identidad para la misma hoja.
 */
export function ensureInstance(
	registry: InstanceRegistryData,
	id: WorkspaceInstanceId,
): EnsureResult {
	const existing = registry.instances[id];
	if (existing && !existing.tombstoned) {
		return { registry, record: existing, created: false };
	}
	if (existing) {
		// Revivir, no duplicar: el tombstone es reversible hasta que pase el GC.
		const revived: WorkspaceInstanceRecord = { ...existing, tombstoned: false, revision: existing.revision + 1 };
		return {
			registry: { ...registry, instances: { ...registry.instances, [id]: revived } },
			record: revived,
			created: false,
		};
	}
	const record = createInstanceRecord(id);
	return {
		registry: { ...registry, instances: { ...registry.instances, [id]: record } },
		record,
		created: true,
	};
}

export function setSceneConfig(
	registry: InstanceRegistryData,
	id: WorkspaceInstanceId,
	scene: SceneDefinitionId,
	patch: SceneConfig,
): InstanceRegistryData {
	const record = registry.instances[id];
	if (!record) return registry;
	const merged: SceneConfig = { ...record.scenes[scene], ...patch };
	const nextRecord: WorkspaceInstanceRecord = {
		...record,
		revision: record.revision + 1,
		scenes: { ...record.scenes, [scene]: merged },
	};
	return { ...registry, instances: { ...registry.instances, [id]: nextRecord } };
}
