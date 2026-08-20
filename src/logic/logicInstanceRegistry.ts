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

/** Prefijo estable: hace legible el `workspace.json` y evita colisionar con otros plugins. */
const ID_PREFIX = 'vm-instance-';

export function mintInstanceId(
	registry: InstanceRegistryData,
	random: () => string = () => Math.random().toString(36).slice(2, 10),
): WorkspaceInstanceId {
	// El bucle esta ACOTADO a proposito: con un `random` pobre o determinista -y en los tests
	// lo es- recalcular el candidato daria siempre el mismo valor y colgaria el arranque del
	// plugin. Tras varios intentos se desempata con un sufijo que no depende del azar.
	let candidate = ID_PREFIX + random();
	for (let attempt = 0; registry.instances[candidate] && attempt < 8; attempt += 1) {
		candidate = ID_PREFIX + random() + random() + attempt;
	}
	while (registry.instances[candidate]) {
		candidate = `${candidate}-x`;
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

/**
 * Copia defensiva de los campos compuestos. Sin esto, el array `visibleCells` del parche se
 * guarda POR REFERENCIA y quien lo paso puede seguir mutandolo, corrompiendo un registro que
 * ya se dio por escrito.
 */
function cloneSceneConfig(config: SceneConfig): SceneConfig {
	const out: SceneConfig = { ...config };
	if (config.visibleCells) out.visibleCells = [...config.visibleCells];
	if (config.sortState) out.sortState = { ...config.sortState };
	return out;
}

export function setSceneConfig(
	registry: InstanceRegistryData,
	id: WorkspaceInstanceId,
	scene: SceneDefinitionId,
	patch: SceneConfig,
): InstanceRegistryData {
	const record = registry.instances[id];
	if (!record) return registry;
	const merged: SceneConfig = cloneSceneConfig({ ...record.scenes[scene], ...patch });
	const nextRecord: WorkspaceInstanceRecord = {
		...record,
		revision: record.revision + 1,
		scenes: { ...record.scenes, [scene]: merged },
	};
	return { ...registry, instances: { ...registry.instances, [id]: nextRecord } };
}
