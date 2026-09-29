import { parseMembershipUrn } from './logicMembershipUrn';
import { entityIdOf, occurrenceOwnerOf } from './logicTreeGroupProjection';
import type { TreeNode } from '../types/typeTree';
import type { SasiRegistry } from './logicSasiRegistry';

/**
 * U130 transacción de selección (spec-01 §4 + spec-02 §4-5).
 *
 * El puerto fire-and-forget se sustituye por un resultado asíncrono
 * discriminado. El snapshot congela en el instante de invocación y nunca
 * viaja por referencia mutable.
 */

export type GroupMutationResult =
	| { status: 'committed'; groupId: string; affectedUrns: readonly string[] }
	| { status: 'cancelled' }
	| { status: 'rejected'; reason: string };

export interface GroupSelectionSnapshot {
	readonly selectionKey: string;
	/** Token monotónico por selectionKey (carrera ABA). */
	readonly token: number;
	readonly rowIds: readonly string[];
	readonly entityIds: readonly string[];
	readonly urns: readonly string[];
	readonly providerId: string;
	readonly scene: string;
	readonly instanceId: string | null;
	/** Revisión del registro de instancia (`WorkspaceInstanceRecord.revision`). */
	readonly revision: number | null;
	/** affected por entidad para reconciliación identity-scoped. */
	readonly affectedEntityIds: readonly string[];
}

export type CreateGroupHandler = (
	snapshot: GroupSelectionSnapshot,
) => Promise<GroupMutationResult>;

export type DegroupSelectedHandler = (
	snapshot: GroupSelectionSnapshot,
	owner: string,
) => Promise<GroupMutationResult>;

export const GROUP_SELECTED_SASI_ID = 'vaultman.group.selected';
export const DEGROUP_SELECTED_SASI_ID = 'vaultman.group.degroup-selected';

export const GROUP_SELECTED_LABEL_EN = 'Group selected';
export const GROUP_SELECTED_LABEL_ES = 'Agrupar selección';
export const DEGROUP_SELECTED_LABEL_EN = 'Degroup selected';
export const DEGROUP_SELECTED_LABEL_ES = 'Desagrupar selección';
export const GROUP_SELECTED_ICON = 'lucide-boxes';
export const DEGROUP_SELECTED_ICON = 'lucide-box';

/** Fila sintética action-only de Props Reveal: nunca es seleccionable ni agrupable. */
export const ADD_PROPERTY_ROW_ID = '__add_property__';

function freezeStrings(list: readonly string[]): readonly string[] {
	return Object.freeze([...list]);
}

// ---------------------------------------------------------------------------
// Tokens monotónicos por selectionKey + épocas por id (ABA)
// ---------------------------------------------------------------------------

const keyEpoch = new Map<string, number>();
const idEpochByKey = new Map<string, Map<string, number>>();

function liveIds(key: string): Map<string, number> {
	let live = idEpochByKey.get(key);
	if (!live) {
		live = new Map();
		idEpochByKey.set(key, live);
	}
	return live;
}

/**
 * Avanza el epoch de `selectionKey` al estado actual. Los ids que siguen
 * presentes conservan su época; los recién llegados (incluido un reselect
 * ABA) reciben la nueva; los ausentes se podan. Llamar en cada cambio de
 * selección y al capturar el snapshot.
 */
export function noteSelectionState(
	selectionKey: string,
	currentIds: ReadonlySet<string> | readonly string[],
): number {
	const next = (keyEpoch.get(selectionKey) ?? 0) + 1;
	keyEpoch.set(selectionKey, next);
	const live = liveIds(selectionKey);
	const current: ReadonlySet<string> =
		currentIds instanceof Set ? currentIds : new Set(currentIds);
	for (const id of current) {
		if (!live.has(id)) live.set(id, next);
	}
	for (const id of [...live.keys()]) {
		if (!current.has(id)) live.delete(id);
	}
	return next;
}

/** Solo tests: reinicia el registro global. */
export function __resetGroupSelectionTokens(): void {
	keyEpoch.clear();
	idEpochByKey.clear();
}

export function currentSelectionToken(selectionKey: string): number {
	return keyEpoch.get(selectionKey) ?? 0;
}

export function selectionEpochOfId(
	selectionKey: string,
	id: string,
): number | null {
	return liveIds(selectionKey).get(id) ?? null;
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

export function selectionKeyFor(
	providerId: string,
	scene: string,
	instanceId?: string | null,
): string {
	return `${instanceId ?? 'default'}:${scene}:${providerId}`;
}

export function captureGroupSelectionSnapshot(args: {
	selectionKey: string;
	rowIds: readonly string[];
	entityIds: readonly string[];
	urns: readonly string[];
	providerId: string;
	scene: string;
	instanceId?: string | null;
	revision?: number | null;
	affectedEntityIds?: readonly string[];
}): GroupSelectionSnapshot {
	const token = noteSelectionState(args.selectionKey, args.rowIds);
	const entityIds = [...new Set(args.entityIds)];
	return Object.freeze({
		selectionKey: args.selectionKey,
		token,
		rowIds: freezeStrings(args.rowIds),
		entityIds: freezeStrings(entityIds),
		urns: freezeStrings(args.urns),
		providerId: args.providerId,
		scene: args.scene,
		instanceId: args.instanceId ?? null,
		revision: args.revision ?? null,
		affectedEntityIds: freezeStrings(args.affectedEntityIds ?? []),
	});
}

/**
 * Snapshot desde el árbol proyectado visible: recorre en orden, deduplica
 * por entidad (identity-scoped) y congela. No interpreta `split('@')`: la
 * identidad viene de `entityIdOf` y el owner de `occurrenceOwnerOf`.
 */
export function snapshotFromProjectedTree<TMeta>(args: {
	tree: readonly TreeNode<TMeta>[];
	selectedIds: ReadonlySet<string>;
	urnOf: (node: TreeNode<TMeta>) => string;
	providerId: string;
	scene: string;
	instanceId?: string | null;
	revision?: number | null;
	selectionKey?: string;
	customGroupIds?: ReadonlySet<string>;
}): GroupSelectionSnapshot {
	const key =
		args.selectionKey ??
		selectionKeyFor(args.providerId, args.scene, args.instanceId);
	const rowIds: string[] = [];
	const entityIds: string[] = [];
	const urns: string[] = [];
	const seen = new Set<string>();
	const walk = (nodes: readonly TreeNode<TMeta>[]): void => {
		for (const node of nodes) {
			if (node.isGroupHeader === true) {
				if (node.children?.length) walk(node.children);
				continue;
			}
			const entity = entityIdOf(node);
			if (
				(args.selectedIds.has(node.id) || args.selectedIds.has(entity)) &&
				!seen.has(entity)
			) {
				seen.add(entity);
				rowIds.push(node.id);
				entityIds.push(entity);
				urns.push(args.urnOf(node));
			}
			if (node.children?.length) walk(node.children);
		}
	};
	walk(args.tree);
	return captureGroupSelectionSnapshot({
		selectionKey: key,
		rowIds,
		entityIds,
		urns,
		providerId: args.providerId,
		scene: args.scene,
		instanceId: args.instanceId,
		revision: args.revision,
	});
}

// ---------------------------------------------------------------------------
// Capabilities (spec-02 §2-4)
// ---------------------------------------------------------------------------

export interface GroupTargetFlags {
	readonly empty: boolean;
	readonly hasActionOnly: boolean;
	readonly groupableCount: number;
}

export function classifyGroupTargets(ids: ReadonlySet<string> | readonly string[]): GroupTargetFlags {
	const list = Array.isArray(ids) ? ids : [...ids];
	let hasActionOnly = false;
	let groupableCount = 0;
	for (const id of list) {
		if (id === ADD_PROPERTY_ROW_ID) {
			hasActionOnly = true;
			continue;
		}
		groupableCount += 1;
	}
	return { empty: list.length === 0, hasActionOnly, groupableCount };
}

export function groupSelectedAvailability(
	flags: GroupTargetFlags,
	hasHandler: boolean,
): { available: boolean; reason: string | null } {
	if (!hasHandler) return { available: false, reason: 'group.selected.no_handler' };
	if (flags.empty) return { available: false, reason: 'group.selected.empty' };
	// Ningún action-only entra silenciosamente en subset (spec-02 §4).
	if (flags.hasActionOnly)
		return { available: false, reason: 'group.selected.action_only' };
	if (flags.groupableCount === 0)
		return { available: false, reason: 'group.selected.empty' };
	return { available: true, reason: null };
}

// ---------------------------------------------------------------------------
// Reconciliación (spec-01 §4 + spec-02 §6)
// ---------------------------------------------------------------------------

export interface ReconcileScope {
	readonly instanceId?: string | null;
	readonly revision?: number | null;
}

export interface ReconcileOptions {
	readonly clearAllOnCommit?: boolean;
}

/**
 * Calcula la selección siguiente tras un `GroupMutationResult`.
 *
 * - `cancelled`/`rejected`: sin cambios (misma referencia).
 * - `committed`: elimina del axón solo los ids del snapshot realmente
 *   confirmados (o vacía todo el axón si `clearAllOnCommit` está activo).
 *   Sobreviven: selecciones nuevas durante el modal, ids
 *   re-seleccionados tras ABA (época por id posterior al snapshot) e
 *   ids cuya entidad no entró en `affected`.
 * - Cambio/unmount de instance/revision: no limpia el axón equivocado.
 */
export function reconcileCommittedSelection(
	snapshot: GroupSelectionSnapshot,
	result: GroupMutationResult,
	currentIds: ReadonlySet<string>,
	scope?: ReconcileScope,
	options?: ReconcileOptions,
): Set<string> {
	if (result.status !== 'committed') return currentIds as Set<string>;
	if (
		scope !== undefined &&
		((scope.instanceId !== undefined &&
			scope.instanceId !== null &&
			snapshot.instanceId !== null &&
			scope.instanceId !== snapshot.instanceId) ||
			(scope.revision !== undefined &&
				scope.revision !== null &&
				snapshot.revision !== null &&
				scope.revision !== snapshot.revision))
	) {
		return currentIds as Set<string>;
	}
	if (options?.clearAllOnCommit) {
		noteSelectionState(snapshot.selectionKey, []);
		return new Set<string>();
	}
	const affectedEntities = new Set<string>([
		...snapshot.affectedEntityIds,
		...entitiesOfUrns(result.affectedUrns),
	]);
	// Si el commit confirma URNs concretas, solo esas entidades salen; si el
	// commit no nombra ninguna (grupo vacío o add idempotente sin delta),
	// se confirma el snapshot completo.
	const useSnapshotFallback =
		result.affectedUrns.length === 0 && affectedEntities.size === snapshot.affectedEntityIds.length;
	const live = idEpochByKey.get(snapshot.selectionKey);
	const next = new Set<string>();
	for (const id of currentIds) {
		const inSnapshot =
			snapshot.rowIds.includes(id) || snapshot.entityIds.includes(id);
		if (!inSnapshot) {
			next.add(id);
			continue;
		}
		// ABA: re-seleccionado después del snapshot conserva el nuevo.
		const epoch = live?.get(id);
		if (epoch !== undefined && epoch > snapshot.token) {
			next.add(id);
			continue;
		}
		// Solo sale si su entidad fue realmente confirmada.
		const entity = entityOfSelectionId(id, snapshot);
		if (useSnapshotFallback || (entity !== null && affectedEntities.has(entity))) {
			continue;
		}
		next.add(id);
	}
	return next;
}

/**
 * U130-GGC-031: en Create/Group selected, un resultado `committed` vacía
 * a `0` la selección y anchor del mismo owner Scene/instancia tras resolver,
 * independiente de `affectedUrns` y de selecciones añadidas durante el modal.
 * `cancelled`/`rejected` conservan la selección exacta.
 * Si hubo unmount/revision/cambio de owner, no limpia otro panel.
 */
export function reconcileCommittedGroupCreation(
	snapshot: GroupSelectionSnapshot,
	result: GroupMutationResult,
	currentIds: ReadonlySet<string>,
	scope?: ReconcileScope,
): Set<string> {
	return reconcileCommittedSelection(snapshot, result, currentIds, scope, {
		clearAllOnCommit: true,
	});
}

function entityOfSelectionId(
	id: string,
	snapshot: GroupSelectionSnapshot,
): string | null {
	const at = snapshot.rowIds.indexOf(id);
	if (at >= 0) return snapshot.entityIds[Math.min(at, snapshot.entityIds.length - 1)] ?? id;
	if (snapshot.entityIds.includes(id)) return id;
	return null;
}

function entitiesOfUrns(urns: readonly string[]): string[] {
	const out: string[] = [];
	for (const urn of urns) {
		const ref = parseMembershipUrn(urn);
		if (ref) out.push(ref.canonicalId);
	}
	return out;
}

// ---------------------------------------------------------------------------
// Degroup (spec-02 §5)
// ---------------------------------------------------------------------------

/**
 * Targets efectivos = selección efectiva ∩ miembros del owner invocado.
 * Compara por identidad de membership (provider:kind:canonical), nunca por
 * `split('@')` de rowIds: la metadata de ocurrencia manda.
 */
export function intersectDegroupTargets(args: {
	selectedEntityIds: readonly string[];
	ownerMemberKeys: readonly string[];
	selectedUrns?: readonly string[];
	ownerUrns?: readonly string[];
}): string[] {
	if (args.selectedUrns !== undefined && args.ownerUrns !== undefined) {
		const ownerKeys = new Set(
			args.ownerUrns
				.map((urn) => parseMembershipUrn(urn))
				.filter((ref): ref is NonNullable<typeof ref> => ref !== null)
				.map((ref) => `${ref.providerId}:${ref.kind}:${ref.canonicalId}`),
		);
		const out: string[] = [];
		const seen = new Set<string>();
		for (const urn of args.selectedUrns) {
			const ref = parseMembershipUrn(urn);
			if (!ref) continue;
			const key = `${ref.providerId}:${ref.kind}:${ref.canonicalId}`;
			if (!ownerKeys.has(key) || seen.has(key)) continue;
			seen.add(key);
			out.push(ref.canonicalId);
		}
		return out;
	}
	const owner = new Set(args.ownerMemberKeys);
	return [...new Set(args.selectedEntityIds.filter((id) => owner.has(id)))];
}

/** Miembros (canonicalIds) de un grupo custom a partir de sus URNs. */
export function customOwnerMemberKeys(urns: readonly string[]): string[] {
	const out: string[] = [];
	for (const urn of urns) {
		const ref = parseMembershipUrn(urn);
		if (ref) out.push(ref.canonicalId);
	}
	return out;
}

/**
 * Custom: elimina esos memberships solo del owner. Atómico por mapa
 * (un solo grupo tocado). El grupo vacío sobrevive: borrarlo es otra acción.
 */
export function removeCustomMemberships(
	memberships: Readonly<Record<string, readonly string[]>>,
	groupId: string,
	memberCanonicalIds: readonly string[],
): Record<string, readonly string[]> {
	const current = memberships[groupId] ?? [];
	const doomed = new Set(memberCanonicalIds);
	const next = current.filter((urn) => {
		const ref = parseMembershipUrn(urn);
		if (!ref) return true;
		return !doomed.has(ref.canonicalId);
	});
	return { ...memberships, [groupId]: next };
}

/** Owner de la ocurrencia miembro invocada (metadata, sin parseo de texto). */
export function degroupOwnerOf<TMeta>(node: TreeNode<TMeta>): string | undefined {
	return occurrenceOwnerOf(node);
}

/**
 * U130 SASI: `vaultman.group.selected` y `vaultman.group.degroup-selected`.
 * Solo catálogo (list/resolve): el invoker por superficie aporta snapshot +
 * owner explícitos. Ninguna Action lee el nodo bajo el cursor.
 */
export function registerGroupSasiActions(registry: SasiRegistry): void {
	registry.register({
		id: GROUP_SELECTED_SASI_ID,
		axis: 'function',
		kind: 'action',
		labelKey: 'group.selected',
		icon: GROUP_SELECTED_ICON,
		supports: [{ surface: 'panel' }, { surface: 'contextMenu' }],
	});
	registry.register({
		id: DEGROUP_SELECTED_SASI_ID,
		axis: 'function',
		kind: 'action',
		labelKey: 'group.degroup_selected',
		icon: DEGROUP_SELECTED_ICON,
		supports: [{ surface: 'panel' }, { surface: 'contextMenu' }],
	});
}
