import { buildIndexGroups, type IndexNodeRef } from './logicIndexGroups';
import { parseMembershipUrn, type MembershipRef } from './logicMembershipUrn';
import type { NodeGroupDef } from './logicNodeGroup';
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
 * U130-03: deriva los NodeGroupDef custom de las claves de groupMemberships.
 * Si SavedLayout no guarda label ni orden de grupo, el label del grupo es su id.
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
}

function headerNode<TMeta>(
	id: string,
	label: string,
	children: TreeNode<TMeta>[],
	meta: TMeta,
): TreeNode<TMeta> {
	return {
		id,
		label,
		depth: 0,
		// `viewTree.ts:1161` aplica `cls` como clases extra de la fila, y el
		// colapso ya lo gobierna `expandedIds`. Una cabecera no necesita un
		// renderizador nuevo: necesita ser un TreeNode bien formado.
		cls: GROUP_HEADER_CLS,
		showCaret: true,
		count: children.length,
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
	} = input;
	if (!enabled) return nodes;

	// --- Grupos CUSTOM: pertenencia explicita -------------------------------
	if (groups.length > 0) {
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
			out.push(
				headerNode(
					group.id,
					group.label,
					reparent(members, group.id, 1, suffixed),
					nodes[0]?.meta as TMeta,
				),
			);
		});
		// `no group` es el COMPLEMENTO, no un grupo mas: no se borra ni se
		// renombra, y por eso no lleva id de grupo custom.
		const orphans = nodes.filter((node) => !claimed.has(node.id));
		if (orphans.length > 0 || !filtered) {
			out.push(
				headerNode(
					NO_GROUP_ID,
					noGroupLabel,
					reparent(orphans, NO_GROUP_ID, 1, suffixed),
					nodes[0]?.meta as TMeta,
				),
			);
		}
		return out;
	}

	// --- Grupos PRESET: predicado, en memoria, sin tocar settings ------------
	// Es LA MISMA derivacion que alimenta el rail del indice flotante. Escribir
	// aqui un segundo motor de agrupacion dejaria a vaultman con dos.
	const refs: IndexNodeRef[] = nodes.map((node) => ({
		id: node.id,
		label: node.label,
		isContainer: (node.children?.length ?? 0) > 0,
	}));
	const indexGroups = buildIndexGroups(refs);
	if (indexGroups.length === 0) return nodes;
	const byKey = new Map(indexGroups.map((group) => [group.key, group]));
	const buckets = new Map<string, TreeNode<TMeta>[]>();
	for (const node of nodes) {
		const [first] = Array.from((node.label ?? '').trim());
		if (!first) continue;
		const [key] = Array.from(first.toLocaleUpperCase());
		if (!byKey.has(key)) continue;
		const bucket = buckets.get(key) ?? [];
		bucket.push(node);
		buckets.set(key, bucket);
	}
	// Cada nodo cae en exactamente un bucket (una letra), asi que nunca hay
	// dos ocurrencias del mismo id: las filas conservan su identidad.
	return indexGroups.map((group) =>
		headerNode(
			`${PRESET_GROUP_PREFIX}${group.key}`,
			group.label,
			reparent(buckets.get(group.key) ?? [], group.key, 1, NO_SUFFIX),
			nodes[0]?.meta as TMeta,
		),
	);
}
