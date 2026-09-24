import { resolveCollapsedBubbleDots } from './logicBadgeBubbling';
import {
	buildPresetBuckets,
	type PresetValueOf,
	type RangeLabels,
} from './logicGroupPresets';
import { parseMembershipUrn, type MembershipRef } from './logicMembershipUrn';
import { parseScopedGroupKey } from './logicScopedCustomGroups';
import type { NodeGroupDef } from './logicNodeGroup';
import type { GroupPreset } from '../types/typeGroupPreset';
import type { TreeNode } from '../types/typeTree';
import type { ScopeState, ScopeTarget, SortScopeKey } from '../types/typeUI';
import { resolveScopeSet } from './logicScopedSort';

export const NO_GROUP_ID = 'vaultman.group.none';
export const PRESET_GROUP_PREFIX = 'vaultman.group.preset:';
export const GROUP_PRESET_PREFIX = PRESET_GROUP_PREFIX;
export const SCOPED_GROUP_HEADER_PREFIX = 'vaultman.group.header:';
const GROUP_HEADER_CLS = 'vaultman-tree-row--group-header';

/**
 * U130-03: determina si un identificador corresponde a una cabecera de grupo
 * (sin entidad asociada, sin menu contextual ni accion de click normal).
 */
export function isGroupHeader(
	id: string,
	customGroupIds?: ReadonlySet<string>,
): boolean {
	return (
		id === NO_GROUP_ID ||
		id.startsWith(PRESET_GROUP_PREFIX) ||
		id.startsWith(SCOPED_GROUP_HEADER_PREFIX) ||
		Boolean(customGroupIds?.has(id))
	);
}

export const _isGroupHeader = isGroupHeader;

/** Locate the first materialized counter header at any scoped tree depth. */
export function findCounterGroupHeader<TMeta>(
	nodes: readonly TreeNode<TMeta>[],
	target?: ScopeTarget,
): TreeNode<TMeta> | undefined {
	for (const node of nodes) {
		if (
			node.isGroupHeader === true &&
			node.counterDomain &&
			node.counterRanges?.length &&
			(target === undefined || node.groupScopeTarget === target)
		) {
			return node;
		}
		const nested = node.children
			? findCounterGroupHeader(node.children, target)
			: undefined;
		if (nested) return nested;
	}
	return undefined;
}

/** The sibling-list(s) on which the selected grouping preset is projected. */
export type GroupProjectionScope =
	| { kind: 'all' }
	| { kind: 'parent'; parentId: string }
	| { kind: 'level'; level: number };

/** Translate the persisted sort scope into the sibling-list grouping target. */
export function groupProjectionScope(
	activeScope: SortScopeKey,
	drillNodeId?: string | null,
): GroupProjectionScope {
	if (activeScope === 'drill') {
		return drillNodeId
			? { kind: 'parent', parentId: drillNodeId }
			: { kind: 'all' };
	}
	if (activeScope.startsWith('parent:')) {
		const parentId = activeScope.slice('parent:'.length);
		return parentId ? { kind: 'parent', parentId } : { kind: 'all' };
	}
	if (activeScope.startsWith('level:')) {
		const level = Number(activeScope.slice('level:'.length));
		if (Number.isInteger(level) && level >= 1) return { kind: 'level', level };
	}
	return { kind: 'all' };
}

/**
 * U130-03: deriva los NodeGroupDef custom de las claves de groupMemberships.
 * U130-09: el mapa es el de UNA scene (`SceneConfig.groupMemberships`), asi
 * que todas sus claves son grupos de esta scene y no hay nada que filtrar.
 * U130-GGC-011: la clave es la identidad interna (canonica scoped o legacy);
 * el label es el nombre visible y el scope el target (`all` para legacy).
 * El `id` conserva la clave de almacenamiento tal cual para que
 * `memberships[group.id]` siga casando con mapas sin normalizar.
 */
export function resolveCustomGroups(
	memberships?: Readonly<Record<string, readonly string[]>>,
): readonly NodeGroupDef[] {
	if (!memberships) return [];
	return Object.keys(memberships).map((key) => {
		const parsed = parseScopedGroupKey(key);
		return {
			id: key,
			flavor: 'custom',
			label: parsed.name,
			parentId: null,
			scope: parsed.target,
		};
	});
}

export interface GroupProjectionInput<TMeta> {
	nodes: readonly TreeNode<TMeta>[];
	/** Solo los CUSTOM. Los presets son predicado, no datos: no tocan settings. */
	groups: readonly NodeGroupDef[];
	memberships: Readonly<Record<string, readonly string[]>>;
	providerId: string;
	noGroupLabel: string;
	/** Regla del grupo vacio: con filtros activos, un grupo sin miembros no se proyecta. */
	filtered: boolean;
	/** Construye la URN de un nodo. Obligatoria si hay grupos custom. */
	urnOf?: (node: TreeNode<TMeta>) => string;
	/** `false` devuelve la lista TAL CUAL, por identidad. */
	enabled?: boolean;
	/** Header ids hidden by the scene, including derived preset buckets. */
	hiddenGroupIds?: ReadonlySet<string>;
	/**
	 * U130-GGC-007: folders converted from groups. They project as physical
	 * `node_folder` items at their slot instead of being grouped into virtual buckets.
	 */
	convertedFolderPaths?: ReadonlySet<string>;
	/**
	 * Spec 08 §3.2: el group preset seleccionado. `custom` proyecta `groups`
	 * (pertenencia explicita); el resto son predicados sobre los nodos. Sin
	 * preset se conserva la derivacion historica: custom si los hay, si no
	 * por primera letra.
	 */
	preset?: GroupPreset;
	/** Extractor de valor para los presets `type`, counters y fechas. */
	presetValueOf?: PresetValueOf<TreeNode<TMeta>>;
	/** Etiquetas de los rangos (§3.2.1); la escena pasa las traducidas. */
	rangeLabels?: RangeLabels;
	/** "Hoy" para las fechas; los tests lo fijan. */
	now?: number;
	/**
	 * Dev 2026-09-14: una cabecera es un p-node como una carpeta y lleva lo
	 * mismo que ella. Con `expandedIds` la cabecera COLAPSADA recibe el
	 * `bubbleDot` de los badges de sus descendientes (BT5-017), en toda scene.
	 */
	expandedIds?: ReadonlySet<string>;
	/** Contadores/fechas agregados de la escena (Files: lo mismo que una carpeta). */
	decorateHeader?: (
		header: TreeNode<TMeta>,
		members: readonly TreeNode<TMeta>[],
	) => void;
	/**
	 * S07A: nested/deduped member totals (`bubbleMemberCountsToGroups`).
	 * When present, a custom header shows its total instead of
	 * `children.length` — the dev's «total de ficheros de todos sus c-nodes».
	 * Absent ids fall back to `children.length`, so today's flat groups render
	 * exactly as before until a caller passes totals.
	 */
	groupTotals?: ReadonlyMap<string, number>;
	/**
	 * U130-t33 (L-PNODE): la meta propia de la cabecera. Sin ella la cabecera
	 * pedia prestada la del primer hijo (`nodes[0]?.meta`) y se colaba por los
	 * caminos que leen meta: el predicado `isFolder` de `expandAll`, el icono
	 * y las celdas de `prepareNode`, el `data-path` de la fila y el tooltip.
	 * Cada escena pasa la meta de sus p-nodes contenedor (carpeta/tag/prop).
	 * Ausente: se conserva el prestamo historico para no romper a quien no
	 * haya migrado.
	 */
	headerMeta?: TMeta;
	/**
	 * U130-t33 (L-PNODE): las clases nativas de fila de los p-nodes de la
	 * escena (`tree-item-self ... is-clickable`). La cabecera ya es una fila
	 * (`vaultman-tree-row`) con su clase propia, pero sin estas no entra por
	 * el camino comun: temas, densidad movil y geometria nativa la ignoran.
	 */
	headerCoreCls?: string;
	/** U130-09: Note groups uses list order when active sort is 'note'. */
	sortByNote?: boolean;
	/** U130-09: Note groups extractor of member key from node. */
	memberKeyOf?: (node: TreeNode<TMeta>) => string;
}

/** What a folder gets, a group header gets: the collapsed-activity dot and the scene's aggregates. */
function finishHeader<TMeta>(
	header: TreeNode<TMeta>,
	members: readonly TreeNode<TMeta>[],
	expandedIds: ReadonlySet<string> | undefined,
	decorateHeader: GroupProjectionInput<TMeta>['decorateHeader'],
): TreeNode<TMeta> {
	decorateHeader?.(header, members);
	if (expandedIds && !expandedIds.has(header.id)) {
		const dot = resolveCollapsedBubbleDots([header], expandedIds).get(header.id);
		if (dot) header.bubbleDot = dot;
	}
	return header;
}

function headerNode<TMeta>(
	id: string,
	label: string,
	children: TreeNode<TMeta>[],
	meta: TMeta,
	count?: number,
	coreCls?: string,
	range?: import('../types/typeGroupPreset').CounterRange,
	ranges?: readonly import('../types/typeGroupPreset').CounterRange[],
	domain?: import('../types/typeGroupPreset').CounterDomain,
): TreeNode<TMeta> {
	return {
		id,
		label,
		depth: 0,
		// B-groupbody: el motor reconoce a la cabecera por esta marca, sin
		// `_groupIds`. `reparent`/`shiftDepth` la conservan por spread en los
		// miembros que no la llevan; `withGroupToggleCells` tambien.
		isGroupHeader: true,
		// `viewTree.ts:1161` aplica `cls` como clases extra de la fila, y el
		// colapso ya lo gobierna `expandedIds`. Una cabecera no necesita un
		// renderizador nuevo: necesita ser un TreeNode bien formado.
		cls: GROUP_HEADER_CLS,
		// Camino comun de `applyCoreRowClasses`: sin esto la cabecera no es
		// `tree-item-self` y la densidad movil le da otra geometria que al
		// resto de p-nodes, lo que tuerce la ventana virtualizada.
		...(coreCls ? { coreCls } : {}),
		showCaret: true,
		count: count ?? children.length,
		children,
		meta,
		...(range ? { counterRange: { ...range } } : {}),
		...(ranges ? { counterRanges: ranges.map((item) => ({ ...item })) } : {}),
		...(domain ? { counterDomain: { ...domain } } : {}),
	};
}

/**
 * U130 Spec 01 §1: ocurrencia proyectada como datos, no como texto.
 * `rowId` es `TreeNode.id`; `entityId`/`membershipOwner`/`occurrenceRoot`
 * viajan en el nodo (`typeTree.ts`). La unica API canonica es
 * `entityIdOf`/`occurrenceOwnerOf`/`rowIdForOccurrence`: ningun consumidor
 * nuevo extrae identidad con separadores.
 */
export interface ProjectedOccurrence {
	entityId: string;
	rowId: string;
	membershipOwner?: string;
	occurrenceRoot?: string;
}

/**
 * U130 Spec 01 §1: identidad semantica de una fila. Las filas proyectadas
 * llevan `entityId` explicito (exacto aunque contenga `@`). Los nodos sin
 * proyectar devuelven su `id` literalmente: la API canonica nunca interpreta
 * separadores de texto.
 */
export function entityIdOf(
	node: Pick<TreeNode<unknown>, 'id'> & { entityId?: string },
): string {
	return node.entityId ?? node.id;
}

/**
 * U130 Spec 01 §1 + requisito 5: grupo custom/note (o complemento/bucket)
 * dueno de esta ocurrencia. Sin parseo: si la fila no lleva el campo, no hay
 * dueno conocido (mejor que adivinar y sacar a la fila del grupo equivocado
 * en un futuro Degroup). Toda raiz agrupada proyectada lo expone.
 */
export function occurrenceOwnerOf(
	node: Pick<TreeNode<unknown>, 'id'> & { membershipOwner?: string },
): string | undefined {
	return node.membershipOwner;
}

/**
 * U130 Spec 01 §2: rowId estable derivado de owner + ocurrencia raiz + ruta
 * relativa. Raices: `entity@owner`. Descendientes de una raiz duplicada:
 * `entity@owner::root::relPath`, donde `relPath` es la ruta de indices desde
 * la raiz (`0`, `0/2`). Determinista para el mismo input ordenado; la
 * unicidad global la garantiza `cloneOccurrence` (sufijo `#n` si el
 * provisional colisiona con un id crudo o una cabecera).
 */
export function rowIdForOccurrence(
	entityId: string,
	owner: string,
	opts?: { rootEntityId?: string; relPath?: string },
): string {
	if (opts?.rootEntityId !== undefined && opts?.relPath !== undefined) {
		return `${entityId}@${owner}::${opts.rootEntityId}::${opts.relPath}`;
	}
	return `${entityId}@${owner}`;
}

/** Reserva un rowId unico en `used`; con colision anade `#n` (determinista). */
function claimRowId(proposed: string, used: Set<string>): string {
	if (!used.has(proposed)) {
		used.add(proposed);
		return proposed;
	}
	let n = 2;
	while (used.has(`${proposed}#${n}`)) n += 1;
	const out = `${proposed}#${n}`;
	used.add(out);
	return out;
}

interface OccurrenceCloneCtx {
	owner: string;
	rootEntityId: string;
	/** La raiz aparece en >1 grupo: toda la ocurrencia usa keys compuestas. */
	composite: boolean;
	used: Set<string>;
	shift: number;
}

/**
 * U130 Spec 01 §2: clon recursivo de una ocurrencia. Una ocurrencia
 * duplicada de un p-node clona TODO su subarbol visible (nunca cero hijos
 * por construction: se clona lo que el nodo trae); cada clon recibe rowId
 * unico y conserva `entityId`. El `depth` se desplaza exactamente una vez en
 * todo el subarbol. Los hijos no crean memberships: heredan `owner`/`root`.
 */
function cloneOccurrence<TMeta>(
	node: TreeNode<TMeta>,
	ctx: OccurrenceCloneCtx,
	relPath: string | null,
): TreeNode<TMeta> {
	const entity = node.entityId ?? node.id;
	const provisional =
		relPath === null
			? ctx.composite
				? rowIdForOccurrence(entity, ctx.owner)
				: entity
			: ctx.composite
				? rowIdForOccurrence(entity, ctx.owner, {
						rootEntityId: ctx.rootEntityId,
						relPath,
					})
				: entity;
	const rowId = claimRowId(provisional, ctx.used);
	const children = node.children?.map((child, index) =>
		cloneOccurrence(
			child,
			ctx,
			relPath === null ? String(index) : `${relPath}/${index}`,
		),
	);
	return {
		...node,
		id: rowId,
		entityId: entity,
		membershipOwner: ctx.owner,
		occurrenceRoot: ctx.rootEntityId,
		depth: node.depth + ctx.shift,
		children,
	};
}

/**
 * Los hijos bajan un nivel: la cabecera es depth 0 y ocupa el sitio del p-node.
 *
 * `viewTree` indexa las filas por id en un `Map`, asi que dos ocurrencias del
 * mismo nodo en dos grupos necesitan ids de FILA distintos o solo se pintaria
 * una. Pero reescribir el id SIEMPRE rompe la identidad de la fila en el caso
 * comun (una ocurrencia): por eso solo se compone (`entity@owner`, hijos
 * `entity@owner::root::relPath`) cuando la raiz aparece en mas de un grupo,
 * y la entidad que solo aparece una vez conserva su ID historico salvo
 * colision (requisito 4). La identidad de la entidad viaja en `entityId`, sin
 * heuristicas `split('@')`.
 */
function reparent<TMeta>(
	nodes: readonly TreeNode<TMeta>[],
	groupId: string,
	shift: number,
	suffixed: ReadonlySet<string>,
	used?: Set<string>,
): TreeNode<TMeta>[] {
	const registry = used ?? new Set<string>();
	return nodes.map((node) => {
		const entity = node.entityId ?? node.id;
		return cloneOccurrence(
			node,
			{
				owner: groupId,
				rootEntityId: entity,
				composite: suffixed.has(entity),
				used: registry,
				shift,
			},
			null,
		);
	});
}

const NO_SUFFIX: ReadonlySet<string> = new Set<string>();

/**
 * Identidad de pertenencia: la tripleta `providerId:kind:canonicalId`.
 *
 * El `displayLabel` es etiqueta, no identidad: cambia al renombrar y no
 * puede emparejar. Y el `canonicalId` solo tampoco basta: spec-03 exige el
 * prefijo `providerId:kind:` justo para que una ruta que coincide entre
 * kinds no empareje por accidente.
 */
function identityKey(ref: MembershipRef): string {
	return `${ref.providerId}:${ref.kind}:${ref.canonicalId}`;
}

export function isConvertedFolder<TMeta>(
	node: TreeNode<TMeta>,
	convertedFolderPaths?: ReadonlySet<string>,
): boolean {
	if (!convertedFolderPaths || convertedFolderPaths.size === 0) return false;
	const meta = node.meta as { folderPath?: string; folder?: { path?: string }; isFolder?: boolean } | null;
	const isFolder = meta?.isFolder === true || Boolean(meta?.folder);
	if (!isFolder) return false;
	const rawPath = meta?.folderPath ?? meta?.folder?.path ?? (node.id.startsWith('folder:') ? node.id.slice(7) : node.id);
	if (!rawPath) return false;
	const clean = rawPath.replace(/^\/+|\/+$/g, '');
	return convertedFolderPaths.has(clean) || convertedFolderPaths.has(rawPath);
}

/**
 * B-groupbody (legacy): la entidad detras de un row id opaco. Solo para
 * arboles sin `entityId` explicito; ambiguo por diseno cuando la entidad
 * contiene `@` (no distingue `a@b` crudo de `a` en `b`). El camino principal
 * es `entityIdOf(nodo)`. Se conserva por compat con callers que solo tienen
 * el string.
 */
export function groupMemberEntityId(rowId: string): string {
	const at = rowId.lastIndexOf('@');
	return at < 0 ? rowId : rowId.slice(0, at);
}

/**
 * B-groupbody: entity ids of every descendant of a group header, deduped, so
 * a scene in `select` mode can toggle the MEMBERS instead of the header id
 * (which is not a path and means nothing to the selection).
 * U130 Spec 01: usa `entityIdOf` (campo explicito; legacy solo sin campo).
 */
export function collectGroupMemberIds<TMeta>(
	children: readonly TreeNode<TMeta>[] | undefined,
): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	const walk = (rows: readonly TreeNode<TMeta>[] | undefined): void => {
		for (const row of rows ?? []) {
			const entityId = entityIdOf(row);
			if (!seen.has(entityId)) {
				seen.add(entityId);
				out.push(entityId);
			}
			walk(row.children);
		}
	};
	walk(children);
	return out;
}

/**
 * B-groupbody: toggle a member block as one unit. Any member selected → the
 * whole block is dropped; none selected → the whole block is added.
 */
export function toggleGroupMembers(
	selected: ReadonlySet<string>,
	members: readonly string[],
): { next: Set<string>; anySelected: boolean } {
	const next = new Set(selected);
	const anySelected = members.some((memberId) => next.has(memberId));
	for (const memberId of members) {
		if (anySelected) next.delete(memberId);
		else next.add(memberId);
	}
	return { next, anySelected };
}

/**
 * Spec 08 §3.3: the membership URNs of the selected rows, in tree order.
 * U130 Spec 01: la identidad viene de `entityIdOf` (campo explicito; sin
 * `split('@')`). Acepta tanto rowIds como entityIds en `selectedIds` y
 * deduplica por entidad (actions identity-scoped).
 */
export function collectSelectedMembershipUrns<TMeta>(
	tree: readonly TreeNode<TMeta>[],
	selectedIds: ReadonlySet<string>,
	urnOf: (node: TreeNode<TMeta>) => string,
	customGroupIds?: ReadonlySet<string>,
): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	const walk = (nodes: readonly TreeNode<TMeta>[]) => {
		for (const node of nodes) {
			const entityId = entityIdOf(node);
			if (
				!isGroupHeader(node.id, customGroupIds) &&
				(selectedIds.has(node.id) || selectedIds.has(entityId)) &&
				!seen.has(entityId)
			) {
				seen.add(entityId);
				out.push(urnOf(node));
			}
			if (node.children?.length) walk(node.children);
		}
	};
	walk(tree);
	return out;
}

/**
 * Spec 08 §3.2 (F1 of the SOTR pass): a group header shows its members the
 * first time it appears — a file manager opens groups, it does not hand the
 * user a list of closed folders. A header the user collapsed stays collapsed:
 * only ids never seen by this explorer get expanded.
 */
export function expandNewGroupHeaders<TMeta>(
	projected: readonly TreeNode<TMeta>[],
	seen: Set<string>,
	expanded: Set<string>,
	customGroupIds?: ReadonlySet<string>,
): void {
	const visit = (nodes: readonly TreeNode<TMeta>[]) => {
		for (const node of nodes) {
			if (isGroupHeader(node.id, customGroupIds) && !seen.has(node.id)) {
				seen.add(node.id);
				expanded.add(node.id);
			}
			if (node.children?.length) visit(node.children);
		}
	};
	visit(projected);
}

export function projectGroupedTree<TMeta>(
	input: GroupProjectionInput<TMeta>,
): readonly TreeNode<TMeta>[] {
	const {
		nodes,
		groups,
		memberships,
		providerId,
		noGroupLabel,
		filtered,
		urnOf,
		enabled = true,
		groupTotals,
		hiddenGroupIds,
		convertedFolderPaths,
		headerCoreCls,
		headerMeta,
		preset,
		presetValueOf,
		rangeLabels,
		now,
		expandedIds,
		decorateHeader,
	} = input;
	if (!enabled) return nodes;
	if (preset?.kind === 'none') return nodes;
	// Meta propia de la cabecera (L-PNODE): la escena la aporta; sin ella se
	// conserva el prestamo historico del primer hijo.
	const fallbackMeta = nodes[0]?.meta;
	const ownMeta = (headerMeta ?? fallbackMeta);

	// --- Grupos CUSTOM: pertenencia explicita -------------------------------
	// Con preset declarado solo `custom` entra aqui; sin preset (llamadores
	// aun no migrados) se conserva "custom si los hay".
	const wantsCustom = preset ? preset.kind === 'custom' : groups.length > 0;
	if (wantsCustom) {
		// U130-09: guarda de provider, defensa y no logica de negocio. El mapa
		// es el de esta scene, pero una URN de otro provider (datos corruptos,
		// una foto aplicada a la tab equivocada) no puede casar ni contar; y
		// un grupo cuyas URNs son TODAS ajenas no es de esta scene: sin
		// cabecera, no un «Foo (3)» con 0 hijos. Un grupo propio vacio sigue
		// siendo un p-node (regla del grupo vacio, mas abajo).
		const ownGroups = groups.filter((group) => {
			const urns = memberships[group.id] ?? [];
			if (urns.length === 0) return true;
			return urns.some(
				(urn) => parseMembershipUrn(urn)?.providerId === providerId,
			);
		});
		if (ownGroups.length === 0) return nodes;
		if (!urnOf) {
			throw new Error(
				'projectGroupedTree: hay grupos custom y falta urnOf. Sin ella no ' +
					'se puede casar un nodo con su pertenencia, y adivinarlo seria ' +
					'tapar un hueco de diseno con una heuristica.',
			);
		}
		const membersPerGroup = ownGroups.map((group) => {
			const urns = new Set(memberships[group.id] ?? []);
			const identities = new Set(
				[...urns]
					.map((urn) => {
						const ref = parseMembershipUrn(urn);
						return ref && ref.providerId === providerId
							? identityKey(ref)
							: null;
					})
					.filter((id): id is string => Boolean(id)),
			);
			return nodes.filter((node) => {
				const ref = parseMembershipUrn(urnOf(node));
				return ref ? identities.has(identityKey(ref)) : false;
			});
		});
		// Caso S-26: un nodo en dos grupos es UNA identidad y DOS ocurrencias.
		// Solo esas raices multi-grupo usan keys compuestas; la entidad que
		// solo aparece una vez conserva su ID historico salvo colision
		// (requisito 4, resuelta en `cloneOccurrence` via `used`).
		const occurrences = new Map<string, number>();
		for (const members of membersPerGroup) {
			for (const member of members) {
				const entity = member.entityId ?? member.id;
				occurrences.set(entity, (occurrences.get(entity) ?? 0) + 1);
			}
		}
		const suffixed = new Set(
			[...occurrences]
				.filter(([, count]) => count > 1)
				.map(([id]) => id),
		);
		// Reserva global de rowIds: cabeceras + cada ocurrencia, para cero
		// duplicados en todo el arbol (Spec 01 §6). Incluye NO_GROUP aunque el
		// complemento acabe podado: reservar de mas nunca crea una fila.
		const used = new Set<string>([
			...ownGroups.map((group) => group.id),
			NO_GROUP_ID,
		]);
		const claimed = new Set<string>();
		const out: TreeNode<TMeta>[] = [];
		ownGroups.forEach((group, index) => {
			const members = membersPerGroup[index] ?? [];
			for (const member of members) claimed.add(member.entityId ?? member.id);
			// Poda normal del pipeline, no inmunidad.
			if (members.length === 0 && filtered) return;
			const reparented = reparent(members, group.id, 1, suffixed, used);
			out.push(
				finishHeader(
					headerNode(
						group.id,
						group.label,
						reparented,
						ownMeta,
						groupTotals?.get(group.id),
						headerCoreCls,
					),
					reparented,
					expandedIds,
					decorateHeader,
				),
			);
		});
		// `no group` es el COMPLEMENTO, no un grupo mas: no se borra ni se
		// renombra, y por eso no lleva id de grupo custom.
		const orphans = nodes.filter(
			(node) => !claimed.has(node.entityId ?? node.id),
		);
		const convertedOrphans = convertedFolderPaths && convertedFolderPaths.size > 0
			? orphans.filter((node) => isConvertedFolder(node, convertedFolderPaths))
			: [];
		const unassignedOrphans = convertedOrphans.length > 0
			? orphans.filter((node) => !isConvertedFolder(node, convertedFolderPaths))
			: orphans;
		for (const folder of convertedOrphans) {
			out.push(folder);
		}
		if (unassignedOrphans.length > 0 || !filtered) {
			const reparented = reparent(unassignedOrphans, NO_GROUP_ID, 1, suffixed, used);
			out.push(
				finishHeader(
					headerNode(
						NO_GROUP_ID,
						noGroupLabel,
						reparented,
						ownMeta,
						undefined,
						headerCoreCls,
					),
					reparented,
					expandedIds,
					decorateHeader,
				),
			);
		}
		return out;
	}

	// --- Grupos NOTE: definidos en frontmatter de la nota reveal ------------
	const wantsNote = preset?.kind === 'note';
	if (wantsNote) {
		const ownGroups =
			preset.direction === 'desc' ? [...groups].reverse() : groups;
		const getKey =
			input.memberKeyOf ??
			((node: TreeNode<TMeta>) => {
				const meta = node.meta as { propName?: string; isValueNode?: boolean; rawValue?: unknown; tagPath?: string } | null;
			if (meta) {
				if ('propName' in meta && meta.propName !== undefined) {
					if (meta.isValueNode) {
						const raw = meta.rawValue ?? node.label;
						if (typeof raw === 'string') return raw;
						if (typeof raw === 'number' || typeof raw === 'boolean')
							return String(raw);
						return node.label ?? node.id;
					}
					return meta.propName;
				}
					if ('tagPath' in meta && meta.tagPath !== undefined) {
						const p = String(meta.tagPath ?? node.label);
						return p.startsWith('#') ? p.slice(1) : p;
					}
				}
				return node.label ?? node.id;
			});

		const membersPerGroup = ownGroups.map((group) => {
			const rawList = memberships[group.id] ?? [];
			const dedupedList: string[] = [];
			const seenInGroup = new Set<string>();
			for (const m of rawList) {
				const clean = m.startsWith('#') ? m.slice(1) : m;
				if (!seenInGroup.has(clean)) {
					seenInGroup.add(clean);
					dedupedList.push(clean);
				}
			}

			if (input.sortByNote) {
				const members: TreeNode<TMeta>[] = [];
				for (const memberKey of dedupedList) {
					for (const node of nodes) {
						const k = getKey(node);
						const cleanK = k.startsWith('#') ? k.slice(1) : k;
						if (cleanK === memberKey) {
							members.push(node);
							break;
						}
					}
				}
				return members;
			} else {
				return nodes.filter((node) => {
					const k = getKey(node);
					const cleanK = k.startsWith('#') ? k.slice(1) : k;
					return seenInGroup.has(cleanK);
				});
			}
		});

		const occurrences = new Map<string, number>();
		for (const members of membersPerGroup) {
			for (const member of members) {
				const entity = member.entityId ?? member.id;
				occurrences.set(entity, (occurrences.get(entity) ?? 0) + 1);
			}
		}
		const suffixed = new Set(
			[...occurrences]
				.filter(([, count]) => count > 1)
				.map(([id]) => id),
		);
		const used = new Set<string>([
			...ownGroups.map((group) => group.id),
			NO_GROUP_ID,
		]);
		const claimed = new Set<string>();
		const out: TreeNode<TMeta>[] = [];
		ownGroups.forEach((group, index) => {
			const members = membersPerGroup[index] ?? [];
			for (const member of members) claimed.add(member.entityId ?? member.id);
			if (members.length === 0 && filtered) return;
			const reparented = reparent(members, group.id, 1, suffixed, used);
			out.push(
				finishHeader(
					headerNode(
						group.id,
						group.label,
						reparented,
						ownMeta,
						groupTotals?.get(group.id),
						headerCoreCls,
					),
					reparented,
					expandedIds,
					decorateHeader,
				),
			);
		});

		const orphans = nodes.filter(
			(node) => !claimed.has(node.entityId ?? node.id),
		);
		if (orphans.length > 0 || !filtered) {
			const reparented = reparent(orphans, NO_GROUP_ID, 1, suffixed, used);
			out.push(
				finishHeader(
					headerNode(
						NO_GROUP_ID,
						noGroupLabel,
						reparented,
						ownMeta,
						undefined,
						headerCoreCls,
					),
					reparented,
					expandedIds,
					decorateHeader,
				),
			);
		}
		return out;
	}

	// --- Grupos PRESET: predicado, en memoria, sin tocar settings ------------
	// U130-GGC-007: Converted physical folders are excluded from preset bucketing
	// so the newly created folder visibly replaces the virtual group at its slot.
	const converted = convertedFolderPaths && convertedFolderPaths.size > 0
		? nodes.filter((node) => isConvertedFolder(node, convertedFolderPaths))
		: [];
	const candidateNodes = converted.length > 0
		? nodes.filter((node) => !isConvertedFolder(node, convertedFolderPaths))
		: nodes;

	const resolved = buildPresetBuckets(
		candidateNodes,
		preset ?? { kind: 'letter', direction: 'asc' },
		{ extract: presetValueOf, labels: rangeLabels, now },
	);
	if (!resolved || resolved.buckets.length === 0) {
		if (converted.length > 0) {
			const direction = preset?.direction === 'desc' ? -1 : 1;
			return [...nodes].sort((a, b) =>
				direction * a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
			);
		}
		return nodes;
	}
	const visibleBuckets = resolved.buckets.filter(
		(bucket) => !hiddenGroupIds?.has(`${PRESET_GROUP_PREFIX}${bucket.key}`),
	);
	const hiddenMembers = resolved.buckets
		.filter((bucket) => hiddenGroupIds?.has(`${PRESET_GROUP_PREFIX}${bucket.key}`))
		.flatMap((bucket) => bucket.members);
	const ungrouped = [...resolved.ungrouped, ...hiddenMembers];
	if (visibleBuckets.length === 0 && ungrouped.length === 0 && converted.length === 0) return nodes;
	// Cada nodo cae en exactamente un bucket, asi que nunca hay dos
	// ocurrencias del mismo id: las filas conservan su identidad, pero llevan
	// `entityId`/owner para la API canonica.
	const used = new Set<string>([
		...visibleBuckets.map((bucket) => `${PRESET_GROUP_PREFIX}${bucket.key}`),
		NO_GROUP_ID,
	]);
	const bucketHeaders = visibleBuckets.map((bucket) => {
		const reparented = reparent(
			bucket.members,
			`${PRESET_GROUP_PREFIX}${bucket.key}`,
			1,
			NO_SUFFIX,
			used,
		);
		return finishHeader(
			headerNode(
				`${PRESET_GROUP_PREFIX}${bucket.key}`,
				bucket.label,
				reparented,
				ownMeta,
				undefined,
				headerCoreCls,
				bucket.range,
				visibleBuckets.flatMap((item) =>
					item.range ? [item.range] : [],
				),
				resolved.counterDomain,
			),
			reparented,
			expandedIds,
			decorateHeader,
		);
	});

	type SiblingEntry =
		| { kind: 'header'; label: string; node: TreeNode<TMeta> }
		| { kind: 'folder'; label: string; node: TreeNode<TMeta> };

	const entries: SiblingEntry[] = [
		...bucketHeaders.map((header) => ({ kind: 'header' as const, label: header.label, node: header })),
		...converted.map((folder) => ({ kind: 'folder' as const, label: folder.label, node: folder })),
	];

	const direction = preset?.direction === 'desc' ? -1 : 1;
	entries.sort((a, b) => {
		const cmp = direction * a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
		if (cmp !== 0) return cmp;
		return a.kind === 'folder' ? -1 : 1;
	});

	const out: TreeNode<TMeta>[] = entries.map((entry) => entry.node);
	if (ungrouped.length > 0) {
		const reparented = reparent(
			ungrouped,
			NO_GROUP_ID,
			1,
			NO_SUFFIX,
			used,
		);
		out.push(
			finishHeader(
				headerNode(
					NO_GROUP_ID,
					noGroupLabel,
					reparented,
					ownMeta,
					undefined,
					headerCoreCls,
				),
				reparented,
				expandedIds,
				decorateHeader,
			),
		);
	}
	return out;
}

/**
 * Project an All-level preset at every structural sibling list. Group headers
 * occupy the current sibling slot; their members retain the recursively
 * projected descendants that were present before the current list was
 * grouped. This is deliberately a separate wrapper around the existing
 * single-list projector so custom/note/counter/date buckets share one walker.
 */
export function projectGroupedTreeAllLevels<TMeta>(
	input: GroupProjectionInput<TMeta>,
): readonly TreeNode<TMeta>[] {
	if (input.enabled === false || input.preset?.kind === 'none') return input.nodes;
	const nested: TreeNode<TMeta>[] = input.nodes.map((node) =>
		node.children?.length
			? {
					...node,
					children: [...projectGroupedTreeAllLevels({
						...input,
						nodes: node.children,
					})],
				}
			: node,
	);
	return projectGroupedTree({ ...input, nodes: nested });
}

/**
 * Project the effective group preset independently at every structural
 * sibling list. Parent overrides level, level overrides all, and the editing
 * cursor is deliberately irrelevant. This is the runtime half of cumulative
 * scope sets: choosing another scope never erases projections already stored
 * for other parents/levels.
 */
export function projectGroupedTreeScopeState<TMeta>(
	input: GroupProjectionInput<TMeta>,
	state: ScopeState,
): readonly TreeNode<TMeta>[] {
	const visit = (
		nodes: readonly TreeNode<TMeta>[],
		parentId: string | null,
		level: number,
	): readonly TreeNode<TMeta>[] => {
		const resolved = resolveScopeSet(
			state,
			{ level, parentId },
			{
				groupPreset: {
					kind: 'none',
					direction: input.preset?.direction ?? 'asc',
				},
			},
		);
		const cellToggles = resolved.cellToggles
			? { ...resolved.cellToggles }
			: undefined;
		const nested: TreeNode<TMeta>[] = nodes.map((node) =>
			node.children?.length
				? {
						...node,
						...(cellToggles ? { scopeCellToggles: { ...cellToggles } } : {}),
						children: [...visit(node.children, node.id, level + 1)],
					}
				: {
						...node,
						...(cellToggles ? { scopeCellToggles: { ...cellToggles } } : {}),
					},
		);
		const preset = resolved.groupPreset;
		if (!preset || preset.kind === 'none') return nested;
		const parentTarget = parentId === null ? null : (`parent:${parentId}` as ScopeTarget);
		const levelTarget = `level:${level}` as ScopeTarget;
		const sourceTarget = (
			parentTarget && state.sets[parentTarget]?.hidden !== true &&
			state.sets[parentTarget]?.groupPreset !== undefined
				? parentTarget
				: state.sets[levelTarget]?.hidden !== true &&
					state.sets[levelTarget]?.groupPreset !== undefined
					? levelTarget
					: 'all'
		) as ScopeTarget;
		const owner = parentId === null ? `level:${level}:root` : `parent:${parentId}`;
		const depth = nested[0]?.depth ?? level - 1;
		return projectGroupedTree({
			...input,
			nodes: nested,
			enabled: true,
			preset,
			groups: preset.kind === 'custom'
				? input.groups.filter((group) => group.scope === sourceTarget)
				: input.groups,
		}).map((node) => {
			if (node.isGroupHeader !== true) return node;
			const rowId = scopedHeaderRowId(entityIdOf(node), owner);
			return {
				...node,
				id: rowId,
				entityId: entityIdOf(node),
				groupScopeTarget: sourceTarget,
				depth,
				...(input.expandedIds?.has(rowId) ? { bubbleDot: undefined } : {}),
				...(cellToggles ? { scopeCellToggles: { ...cellToggles } } : {}),
			};
		});
	};
	return visit(input.nodes, null, 1);
}

function scopedHeaderRowId(groupId: string, owner: string): string {
	return `${SCOPED_GROUP_HEADER_PREFIX}${encodeURIComponent(owner)}:${encodeURIComponent(groupId)}`;
}

/**
 * Project grouping at the sibling-list selected by Scope instead of always at
 * the root. Parent scopes affect only that parent's direct children; level
 * scopes affect every sibling-list whose rows live at that 1-based level.
 *
 * Repeated level buckets need distinct row ids because ViewTree indexes DOM
 * rows by id. Their canonical group id stays in `entityId`, so hide/delete,
 * membership and preset materialization still address one semantic group.
 */
export function projectGroupedTreeInScope<TMeta>(
	input: GroupProjectionInput<TMeta>,
	scope: GroupProjectionScope,
): readonly TreeNode<TMeta>[] {
	if (scope.kind === 'all') return projectGroupedTreeAllLevels(input);

	const projectSiblings = (
		nodes: readonly TreeNode<TMeta>[],
		owner: string,
	): TreeNode<TMeta>[] => {
		if (nodes.length === 0) return nodes as TreeNode<TMeta>[];
		const depth = nodes[0]?.depth ?? 0;
		return projectGroupedTree({ ...input, nodes }).map((node) => {
			if (node.isGroupHeader !== true) return node;
			const groupId = entityIdOf(node);
			const rowId = scopedHeaderRowId(groupId, owner);
			return {
				...node,
				id: rowId,
				entityId: groupId,
				depth,
				// `finishHeader` saw the canonical id before it became an
				// occurrence. Expansion itself is row-owned, so clear a stale
				// collapsed dot when this concrete occurrence is expanded.
				...(input.expandedIds?.has(rowId) ? { bubbleDot: undefined } : {}),
			};
		});
	};

	if (scope.kind === 'parent') {
		const visit = (nodes: readonly TreeNode<TMeta>[]): TreeNode<TMeta>[] =>
			nodes.map((node) => {
				// Scope is occurrence-owned: selecting one duplicated p-node must
				// not mutate every occurrence of the same semantic entity.
				if (node.id === scope.parentId) {
					return {
						...node,
						children: projectSiblings(
							node.children ?? [],
							`parent:${node.id}`,
						),
					};
				}
				if (!node.children?.length) return node;
				return { ...node, children: visit(node.children) };
			});
		return visit(input.nodes);
	}

	if (!Number.isInteger(scope.level) || scope.level < 1)
		return input.nodes as TreeNode<TMeta>[];
	const visitLevel = (
		nodes: readonly TreeNode<TMeta>[],
		level: number,
		owner: string,
	): TreeNode<TMeta>[] => {
		if (level === scope.level) return projectSiblings(nodes, owner);
		return nodes.map((node) =>
			node.children?.length
				? {
						...node,
						children: visitLevel(
							node.children,
							level + 1,
							`parent:${node.id}`,
						),
					}
				: node,
		);
	};
	return visitLevel(input.nodes, 1, 'level:1:root');
}
