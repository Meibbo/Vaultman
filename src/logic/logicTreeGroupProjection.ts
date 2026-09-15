import { resolveCollapsedBubbleDots } from './logicBadgeBubbling';
import {
	buildPresetBuckets,
	type PresetValueOf,
	type RangeLabels,
} from './logicGroupPresets';
import { parseMembershipUrn, type MembershipRef } from './logicMembershipUrn';
import type { NodeGroupDef } from './logicNodeGroup';
import type { GroupPreset } from '../types/typeGroupPreset';
import type { TreeNode } from '../types/typeTree';

export const NO_GROUP_ID = 'vaultman.group.none';
export const PRESET_GROUP_PREFIX = 'vaultman.group.preset:';
export const GROUP_PRESET_PREFIX = PRESET_GROUP_PREFIX;
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
		Boolean(customGroupIds?.has(id))
	);
}

export const _isGroupHeader = isGroupHeader;

/**
 * U130-09: igualdad estructural de dos mapas de grupos. El orden de las
 * claves cuenta: es el orden de las cabeceras. Los explorers la usan para no
 * re-renderizar cuando el navbar les vuelve a aplicar el mismo mapa.
 */
export function sameGroupMemberships(
	a: Readonly<Record<string, readonly string[]>>,
	b: Readonly<Record<string, readonly string[]>>,
): boolean {
	const aKeys = Object.keys(a);
	const bKeys = Object.keys(b);
	if (aKeys.length !== bKeys.length) return false;
	return aKeys.every((id, i) => {
		if (bKeys[i] !== id) return false;
		const aUrns = a[id] ?? [];
		const bUrns = b[id] ?? [];
		return (
			aUrns.length === bUrns.length &&
			aUrns.every((urn, j) => urn === bUrns[j])
		);
	});
}

/** U130-09: copia clave a clave, para que el explorer nunca guarde la referencia de la scene. */
export function cloneGroupMemberships(
	memberships: Readonly<Record<string, readonly string[]>>,
): Record<string, readonly string[]> {
	return Object.fromEntries(
		Object.entries(memberships).map(([id, urns]) => [id, [...urns]]),
	);
}

/**
 * U130-03: deriva los NodeGroupDef custom de las claves de groupMemberships.
 * U130-09: el mapa es el de UNA scene (`SceneConfig.groupMemberships`), asi
 * que todas sus claves son grupos de esta scene y no hay nada que filtrar.
 * Sin label ni orden guardados, el label del grupo es su id.
 */
export function resolveCustomGroups(
	memberships?: Readonly<Record<string, readonly string[]>>,
): readonly NodeGroupDef[] {
	if (!memberships) return [];
	return Object.keys(memberships).map((id) => ({
		id,
		flavor: 'custom',
		label: id,
		parentId: null,
		scope: 'all',
	}));
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
	};
}

/**
 * Los hijos bajan un nivel: la cabecera es depth 0 y ocupa el sitio del p-node.
 *
 * `viewTree` indexa las filas por id en un `Map`, asi que dos ocurrencias del
 * mismo nodo en dos grupos necesitarian ids de FILA distintos o solo se
 * pintaria una. Pero reescribir el id SIEMPRE rompe la identidad de la fila
 * en el caso comun (una ocurrencia): por eso solo se sufija (`id@groupId`)
 * cuando el nodo aparece en mas de un grupo. La identidad de la entidad
 * sigue siendo el id original, que va delante.
 */
function reparent<TMeta>(
	nodes: readonly TreeNode<TMeta>[],
	groupId: string,
	shift: number,
	suffixed: ReadonlySet<string>,
): TreeNode<TMeta>[] {
	return nodes.map((node) => ({
		...node,
		id: suffixed.has(node.id) ? `${node.id}@${groupId}` : node.id,
		depth: node.depth + shift,
		children: shiftDepth(node.children, shift),
	}));
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

/** Desplaza la profundidad del subarbol entero, recursivamente. */
function shiftDepth<TMeta>(
	nodes: readonly TreeNode<TMeta>[] | undefined,
	shift: number,
): TreeNode<TMeta>[] | undefined {
	if (!nodes) return undefined;
	return nodes.map((child) => ({
		...child,
		depth: child.depth + shift,
		children: shiftDepth(child.children, shift),
	}));
}

/**
 * B-groupbody: the entity id behind a projected row id. Multi-group rows are
 * suffixed `id@groupId` by `reparent`; single occurrences keep the raw id.
 */
export function groupMemberEntityId(rowId: string): string {
	const at = rowId.lastIndexOf('@');
	return at < 0 ? rowId : rowId.slice(0, at);
}

/**
 * B-groupbody: entity ids of every descendant of a group header, deduped, so
 * a scene in `select` mode can toggle the MEMBERS instead of the header id
 * (which is not a path and means nothing to the selection).
 */
export function collectGroupMemberIds<TMeta>(
	children: readonly TreeNode<TMeta>[] | undefined,
): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	const walk = (rows: readonly TreeNode<TMeta>[] | undefined): void => {
		for (const row of rows ?? []) {
			const entityId = groupMemberEntityId(row.id);
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
 * Rows under a group header keep their entity id (only multi-group
 * occurrences are suffixed `id@group`), so the suffix is stripped before
 * matching the selection.
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
			const entityId = node.id.split('@')[0] ?? node.id;
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
	for (const node of projected) {
		if (!isGroupHeader(node.id, customGroupIds) || seen.has(node.id)) continue;
		seen.add(node.id);
		expanded.add(node.id);
	}
}

export function projectGroupedTree<TMeta>(
	input: GroupProjectionInput<TMeta>,
): readonly TreeNode<TMeta>[] {
	const {
		nodes,
		groups,
		memberships,
		noGroupLabel,
		filtered,
		urnOf,
		enabled = true,
		groupTotals,
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
		if (groups.length === 0) return nodes;
		if (!urnOf) {
			throw new Error(
				'projectGroupedTree: hay grupos custom y falta urnOf. Sin ella no ' +
					'se puede casar un nodo con su pertenencia, y adivinarlo seria ' +
					'tapar un hueco de diseno con una heuristica.',
			);
		}
		const membersPerGroup = groups.map((group) => {
			const urns = new Set(memberships[group.id] ?? []);
			const identities = new Set(
				[...urns]
					.map((urn) => {
						const ref = parseMembershipUrn(urn);
						return ref ? identityKey(ref) : null;
					})
					.filter((id): id is string => Boolean(id)),
			);
			return nodes.filter((node) => {
				const ref = parseMembershipUrn(urnOf(node));
				return ref ? identities.has(identityKey(ref)) : false;
			});
		});
		// Caso S-26: un nodo en dos grupos es UNA identidad y DOS ocurrencias.
		// Solo esos nodos multi-grupo necesitan ids de FILA distintos.
		const occurrences = new Map<string, number>();
		for (const members of membersPerGroup) {
			for (const member of members) {
				occurrences.set(member.id, (occurrences.get(member.id) ?? 0) + 1);
			}
		}
		const suffixed = new Set(
			[...occurrences]
				.filter(([, count]) => count > 1)
				.map(([id]) => id),
		);
		const claimed = new Set<string>();
		const out: TreeNode<TMeta>[] = [];
		groups.forEach((group, index) => {
			const members = membersPerGroup[index] ?? [];
			for (const member of members) claimed.add(member.id);
			// Poda normal del pipeline, no inmunidad.
			if (members.length === 0 && filtered) return;
			const reparented = reparent(members, group.id, 1, suffixed);
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
		const orphans = nodes.filter((node) => !claimed.has(node.id));
		if (orphans.length > 0 || !filtered) {
			const reparented = reparent(orphans, NO_GROUP_ID, 1, suffixed);
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
	// Es LA MISMA familia de derivaciones que alimenta el rail del indice
	// flotante (`letter`); los demas presets son predicados hermanos en
	// `logicGroupPresets`. Escribir aqui un segundo motor dejaria dos.
	const resolved = buildPresetBuckets(
		nodes,
		preset ?? { kind: 'letter', direction: 'asc' },
		{ extract: presetValueOf, labels: rangeLabels, now },
	);
	if (!resolved || resolved.buckets.length === 0) return nodes;
	// Cada nodo cae en exactamente un bucket, asi que nunca hay dos
	// ocurrencias del mismo id: las filas conservan su identidad.
	const out = resolved.buckets.map((bucket) => {
		const reparented = reparent(bucket.members, bucket.key, 1, NO_SUFFIX);
		return finishHeader(
			headerNode(
				`${PRESET_GROUP_PREFIX}${bucket.key}`,
				bucket.label,
				reparented,
				ownMeta,
				undefined,
				headerCoreCls,
			),
			reparented,
			expandedIds,
			decorateHeader,
		);
	});
	if (resolved.ungrouped.length > 0) {
		const reparented = reparent(resolved.ungrouped, NO_GROUP_ID, 1, NO_SUFFIX);
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
