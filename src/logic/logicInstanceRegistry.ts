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
	const merged: SceneConfig = cloneSceneConfig({ ...current, ...patch });
	const nextRecord: WorkspaceInstanceRecord = {
		...record,
		revision: record.revision + 1,
		scenes: { ...record.scenes, [scene]: merged },
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

/** Un registro sin nada configurado no aporta al adoptarlo: es residuo de una identidad perdida. */
function hasConfiguration(record: WorkspaceInstanceRecord): boolean {
	return Object.keys(record.scenes).length > 0 || Object.keys(record.self).length > 0;
}

/**
 * Cuando una hoja abre SIN ancla, adoptar antes que acuñar.
 *
 * POR QUE EXISTE. El ancla vive en el estado de vista, o sea en el layout del workspace, y
 * `reload app without saving` -o alternar `is-mobile`- descarta ese layout POR DEFINICION.
 * Sin esto, cada recarga acuña una identidad nueva, nace un registro vacio, y la configuracion
 * del usuario se queda huerfana en el registro mientras el ve los defaults. Medido en el smoke
 * del dev el 2026-08-20: **cinco instancias en el registro para dos paneles**, con la
 * configuracion real intacta pero sin nadie que la reclamara.
 *
 * Se adopta el candidato MAS ANTIGUO: si dos paneles reabren en el mismo orden en que se
 * crearon -que es lo normal-, cada uno recupera el suyo. Los tombstoned tambien son adoptables:
 * tras una recarga sin guardar, el tombstone solo significa «ninguna hoja viva lo reclamo», que
 * es exactamente el caso que esto arregla. `ensureInstance` ya los revive.
 */
export function adoptOrMintInstance(
	registry: InstanceRegistryData,
	claimedIds: readonly WorkspaceInstanceId[],
	random?: () => string,
): { id: WorkspaceInstanceId; adopted: boolean } {
	const claimed = new Set(claimedIds);
	const candidates = Object.values(registry.instances)
		.filter((record) => !claimed.has(record.id) && hasConfiguration(record))
		.sort((a, b) => a.createdAt - b.createdAt);
	if (candidates.length > 0) {
		return { id: candidates[0].id, adopted: true };
	}
	return { id: mintInstanceId(registry, random), adopted: false };
}
