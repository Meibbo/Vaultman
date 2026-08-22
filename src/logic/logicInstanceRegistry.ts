import type {
	InstanceRegistryData,
	SceneConfig,
	SceneDefinitionId,
	WorkspaceInstanceId,
	WorkspaceInstanceRecord,
} from '../types/typeInstance';

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
	const current: SceneConfig = record.scenes[scene] ?? {};
	return writeSceneLayer(registry, id, scene, { ...current, ...patch });
}

/**
 * U121-101: la capa de scene SUSTITUIDA, no fusionada.
 *
 * `setSceneConfig` fusiona, y para un parche suelto ("cambia solo el viewMode")
 * eso es lo correcto. Pero el puerto de configuracion no manda parches sueltos:
 * manda el parche MINIMO COMPLETO que `diffSceneConfig` calcula contra el
 * baseline, y ahi la fusion es justo lo que rompe. Cuando un valor vuelve a su
 * baseline, el diff **omite** esa clave -- porque ya no hay nada que anular-, y
 * la fusion conserva el override anterior para siempre.
 *
 * Ese es el defecto que reporto el dev: en propScene, Tree -> table -> tree
 * dejaba `viewMode: 'table'` guardado, porque el ultimo paso no escribia nada.
 * Al volver a la escena reaparecia en Table.
 *
 * Las dos semanticas siguen existiendo y ahora tienen nombre distinto, para que
 * elegir la equivocada sea una decision visible y no un descuido.
 */
export function replaceSceneConfig(
	registry: InstanceRegistryData,
	id: WorkspaceInstanceId,
	scene: SceneDefinitionId,
	layer: SceneConfig,
): InstanceRegistryData {
	if (!registry.instances[id]) return registry;
	return writeSceneLayer(registry, id, scene, layer);
}

function writeSceneLayer(
	registry: InstanceRegistryData,
	id: WorkspaceInstanceId,
	scene: SceneDefinitionId,
	layer: SceneConfig,
): InstanceRegistryData {
	const record = registry.instances[id];
	if (!record) return registry;
	const nextRecord: WorkspaceInstanceRecord = {
		...record,
		revision: record.revision + 1,
		scenes: { ...record.scenes, [scene]: cloneSceneConfig(layer) },
	};
	return { ...registry, instances: { ...registry.instances, [id]: nextRecord } };
}

/**
 * Se corre UNA vez al arrancar, con la lista de anclas vivas leídas del workspace.
 * Es idempotente y no borra nada: marcar tombstone conserva el payload, que es lo que permite
 * que reabrir un panel cerrado recupere su configuración en vez de empezar de cero.
 */
export function reconcileRegistry(
	raw: InstanceRegistryData | undefined,
	liveAnchors: readonly WorkspaceInstanceId[],
): InstanceRegistryData {
	if (!raw || raw.schema !== 1 || typeof raw.instances !== 'object' || raw.instances === null) {
		return EMPTY_REGISTRY;
	}
	const live = new Set(liveAnchors);
	const instances: Record<WorkspaceInstanceId, WorkspaceInstanceRecord> = {};
	for (const [id, record] of Object.entries(raw.instances)) {
		if (!record || typeof record !== 'object' || record.id !== id) continue;
		instances[id] = { ...record, tombstoned: !live.has(id) };
	}
	return { schema: 1, instances };
}

/** Recuerda en que scene estaba la instancia. Sin efecto si el id no existe. */
export function setActiveScene(
	registry: InstanceRegistryData,
	id: WorkspaceInstanceId,
	activeScene: string,
): InstanceRegistryData {
	const record = registry.instances[id];
	if (!record || record.activeScene === activeScene) return registry;
	const nextRecord: WorkspaceInstanceRecord = {
		...record,
		revision: record.revision + 1,
		activeScene,
	};
	return { ...registry, instances: { ...registry.instances, [id]: nextRecord } };
}
