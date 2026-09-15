import type {
	InstanceRegistryData,
	SceneConfig,
	SceneDefinitionId,
	WorkspaceInstanceId,
	WorkspaceInstanceRecord,
} from '../types/typeInstance';
import type { SavedFloatingTocState } from '../types/typeSettings';

export const EMPTY_REGISTRY: InstanceRegistryData = { schema: 1, instances: {} };

export function createInstanceRecord(id: WorkspaceInstanceId): WorkspaceInstanceRecord {
	return {
		id,
		createdAt: Date.now(),
		lastActiveAt: Date.now(),
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
		// Instancia viva: toca → actualiza lastActiveAt.
		const now = Date.now();
		if (existing.lastActiveAt === now) return { registry, record: existing, created: false };
		const touched: WorkspaceInstanceRecord = { ...existing, lastActiveAt: now };
		return {
			registry: { ...registry, instances: { ...registry.instances, [id]: touched } },
			record: touched,
			created: false,
		};
	}
	if (existing) {
		// Revivir, no duplicar: el tombstone es reversible hasta que lo poda `reconcileRegistry` (cupo `TOMBSTONE_CAP`).
		const revived: WorkspaceInstanceRecord = { ...existing, tombstoned: false, lastActiveAt: Date.now(), revision: existing.revision + 1 };
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
		lastActiveAt: Date.now(),
		revision: record.revision + 1,
		scenes: { ...record.scenes, [scene]: cloneSceneConfig(layer) },
	};
	return { ...registry, instances: { ...registry.instances, [id]: nextRecord } };
}

/**
 * Cupo de tombstones que sobreviven a la reconciliación (decisión del dev, 2026-09-14, A01).
 * Sin cupo el registro crecía sin límite: cada panel cerrado dejaba su tombstone para siempre
 * porque el GC que prometía `ensureInstance` nunca existió. Los vivos no cuentan para el cupo.
 */
export const TOMBSTONE_CAP = 20;

/**
 * U130: ventana de gracia para tombstones. Un tombstone cuyo `lastActiveAt`
 * cae dentro de esta ventana (7 días) NUNCA se poda por cupo, incluso si
 * se supera `TOMBSTONE_CAP`. Solo se poda tombstones fuera de la ventana,
 * por `lastActiveAt` ascendente (LRU). Si TODOS están dentro de la ventana,
 * no se poda nada — es preferible exceder el cupo antes que destruir un
 * workspace activo.
 */
export const TOMBSTONE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cota absoluta de emergencia (dictamen adversarial 11 §2.2): dentro de la ventana de gracia
 * el cupo de 20 no actúa, y una ráfaga (50 pestañas/día × 7 días = 350) inflaría `data.json`
 * sin freno. Por encima de este número se poda por LRU AUNQUE el tombstone esté en gracia.
 */
export const TOMBSTONE_HARD_CAP = 100;

/**
 * Se corre UNA vez al arrancar, con la lista de anclas vivas leídas del workspace.
 * Es idempotente. Marcar tombstone conserva el payload; solo se conservan los
 * `TOMBSTONE_CAP` tombstones más recientes por `lastActiveAt` (LRU): los demás se podan.
 * Un tombstone cuyo `lastActiveAt` cae dentro de `TOMBSTONE_GRACE_MS` NUNCA se poda,
 * aunque se supere el cupo. Si todos los tombstones están dentro de la ventana,
 * no se poda nada — es preferible exceder `TOMBSTONE_CAP` antes que destruir un workspace.
 *
 * @param now reloj inyectable para tests; por defecto `Date.now()`.
 */
export function reconcileRegistry(
	raw: InstanceRegistryData | undefined,
	liveAnchors: readonly WorkspaceInstanceId[],
	now: number = Date.now(),
): InstanceRegistryData {
	if (!raw || raw.schema !== 1 || typeof raw.instances !== 'object' || raw.instances === null) {
		return EMPTY_REGISTRY;
	}
	const live = new Set(liveAnchors);
	const instances: Record<WorkspaceInstanceId, WorkspaceInstanceRecord> = {};
	const tombstones: WorkspaceInstanceRecord[] = [];
	for (const [id, record] of Object.entries(raw.instances)) {
		if (!record || typeof record !== 'object' || record.id !== id) continue;
		// Migración: si `lastActiveAt` falta o no es finito, usar `createdAt`.
		const lastActiveAt = Number.isFinite(record.lastActiveAt) ? record.lastActiveAt : (Number.isFinite(record.createdAt) ? record.createdAt : 0);
		const next: WorkspaceInstanceRecord = { ...record, lastActiveAt, tombstoned: !live.has(id) };
		instances[id] = next;
		if (next.tombstoned) tombstones.push(next);
	}
	if (tombstones.length > TOMBSTONE_CAP) {
		// Solo podar tombstones FUERA de la ventana de gracia, por LRU (`lastActiveAt` ascendente).
		const stamp = (r: WorkspaceInstanceRecord): number =>
			Number.isFinite(r.lastActiveAt) ? r.lastActiveAt : 0;
		const outsideGrace = tombstones.filter((r) => now - stamp(r) > TOMBSTONE_GRACE_MS);
		if (outsideGrace.length > 0) {
			outsideGrace.sort((a, b) => stamp(a) - stamp(b) || (a.id < b.id ? -1 : 1));
			const pruneCount = Math.min(tombstones.length - TOMBSTONE_CAP, outsideGrace.length);
			for (const stale of outsideGrace.slice(0, pruneCount)) {
				delete instances[stale.id];
			}
		}
		// Cota dura: lo que la gracia haya dejado por encima de TOMBSTONE_HARD_CAP se poda
		// igualmente, del menos activo al más activo.
		const remaining = tombstones.filter((r) => r.id in instances);
		if (remaining.length > TOMBSTONE_HARD_CAP) {
			remaining.sort((a, b) => stamp(a) - stamp(b) || (a.id < b.id ? -1 : 1));
			for (const stale of remaining.slice(0, remaining.length - TOMBSTONE_HARD_CAP)) {
				delete instances[stale.id];
			}
		}
	}
	return { schema: 1, instances };
}

/**
 * U121-109, fuga de anclas provisionales: `onOpen()` acuña un id ANTES de que `setState()`
 * traiga el ancla real, y al adoptarla el registro provisional quedaba huérfano para siempre
 * (cada apertura de una hoja anclada dejaba un tombstone). Un registro es «prístino» si nadie
 * lo configuró (revisión inicial y sin scenes); solo esos se retiran, y sin dejar tombstone.
 */
export function dropPristineInstance(
	registry: InstanceRegistryData,
	id: WorkspaceInstanceId,
): InstanceRegistryData {
	const record = registry.instances[id];
	if (!record) return registry;
	const pristine =
		record.revision === 1 &&
		Object.keys(record.scenes).length === 0 &&
		record.activeScene === undefined &&
		record.floatingToc === undefined;
	if (!pristine) return registry;
	const { [id]: _dropped, ...rest } = registry.instances;
	return { ...registry, instances: rest };
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
		lastActiveAt: Date.now(),
		revision: record.revision + 1,
		activeScene,
	};
	return { ...registry, instances: { ...registry.instances, [id]: nextRecord } };
}

/** Guarda el estado del índice flotante para la instancia. Sin efecto si el id no existe. */
export function setInstanceFloatingToc(
	registry: InstanceRegistryData,
	id: WorkspaceInstanceId,
	floatingToc: SavedFloatingTocState,
): InstanceRegistryData {
	const record = registry.instances[id];
	if (!record) return registry;
	const current = record.floatingToc;
	if (
		current &&
		current.enabled === floatingToc.enabled &&
		current.kind === floatingToc.kind &&
		current.rootId === floatingToc.rootId
	) {
		return registry;
	}
	const nextRecord: WorkspaceInstanceRecord = {
		...record,
		lastActiveAt: Date.now(),
		revision: record.revision + 1,
		floatingToc: { ...floatingToc },
	};
	return { ...registry, instances: { ...registry.instances, [id]: nextRecord } };
}
