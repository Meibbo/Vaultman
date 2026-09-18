import type { SasiFunctionKind } from './logicSasiRegistry';
import type { SasiRegistry } from './logicSasiRegistry';
import { SCENE_GOTO_TABS } from './logicSasiSceneActions';
import type { StatisticsDataTab } from './logicStatisticsNavigation';
import { formatMembershipUrn } from './logicMembershipUrn';
import type { NodeGroupDef } from './logicNodeGroup';
import { NO_GROUP_ID, projectGroupedTree } from './logicTreeGroupProjection';
import type { TreeNode } from '../types/typeTree';

/**
 * U130L apiScene: SASI proyectado como arbol compartido (TreeNode), no como
 * DOM propio del modal.
 *
 * Puro a proposito: sin Obsidian, sin DOM, sin i18n. El modal traduce las
 * `labelKey` al pintar; aqui viajan crudas para que los tests las lean sin
 * montar nada.
 *
 * Taxonomia formal (spec-01 + glossary):
 * - Identidades reales: `node_apis` (kind de la URN). Todo leaf del apiScene
 *   es un `node_apis` con URN estable `sasi:node_apis:<canonical>|<label>`.
 * - `node_groups` NO es kind de identidad: son los p-nodes virtuales que
 *   agrupan (las 8 cabeceras). Nunca llevan toggle ni URN propia.
 * - Cells: NO se inventa ningun kind nuevo (`counter`/`date`/`text` son
 *   types de celda del modelo, no kinds). El unico cell es el `toggle`
 *   existente de TreeNodeCell (`publish`), con tooltip, y SOLO en comandos
 *   publicables (los que tienen descriptor en el publisher).
 */

export const API_SCENE_PROVIDER_ID = 'sasi';
export const API_SCENE_IDENTITY_KIND = 'node_apis';
export const API_SCENE_GROUP_KIND = 'node_groups';

export const PUBLISH_CELL_ID = 'publish';

export type ApiSceneGroupName =
	| 'action'
	| 'operation'
	| 'command'
	| 'kind'
	| 'provider'
	| 'instance'
	| 'scene'
	| 'surface';

export const API_SCENE_GROUP_NAMES: readonly ApiSceneGroupName[] = [
	'action',
	'operation',
	'command',
	'kind',
	'provider',
	'instance',
	'scene',
	'surface',
];

export const API_SCENE_GROUP_IDS: Record<ApiSceneGroupName, string> = {
	action: 'sasi.group.action',
	operation: 'sasi.group.operation',
	command: 'sasi.group.command',
	kind: 'sasi.group.kind',
	provider: 'sasi.group.provider',
	instance: 'sasi.group.instance',
	scene: 'sasi.group.scene',
	surface: 'sasi.group.surface',
};

export const API_SCENE_GROUP_LABEL_KEYS: Record<ApiSceneGroupName, string> = {
	action: 'sasi.apiscene.group.action',
	operation: 'sasi.apiscene.group.operation',
	command: 'sasi.apiscene.group.command',
	kind: 'sasi.apiscene.group.kind',
	provider: 'sasi.apiscene.group.provider',
	instance: 'sasi.apiscene.group.instance',
	scene: 'sasi.apiscene.group.scene',
	surface: 'sasi.apiscene.group.surface',
};

/** Meta propia de cada leaf: identidad `node_apis`, nunca prestada. */
export interface ApiSceneNodeMeta {
	identityKind: typeof API_SCENE_IDENTITY_KIND;
	urn: string;
	group: ApiSceneGroupName;
	/** Id SASI estable que representa (`vaultman.move.proceed`, `apply-queue`...). */
	sasiId: string;
	labelKey: string;
	sasiKind: SasiFunctionKind | null;
	/** Conservados del def: a donde puede hospedarse y que compone. */
	supports: readonly string[];
	composes: readonly string[];
	mutatesVault: boolean;
	/** Tiene descriptor en el publisher (puede publicarse como comando). */
	publishable: boolean;
	published: boolean;
}

/** Meta propia de cada cabecera: `node_groups`, sin URN ni identidad. */
export interface ApiSceneGroupMeta {
	identityKind: typeof API_SCENE_GROUP_KIND;
	group: ApiSceneGroupName;
}

/**
 * Vista minima del publisher que el apiScene necesita. Estructural a
 * proposito: `SasiCommandPublisher` la satisface (incluido el futuro
 * `isPublishable(id)` del worker de persistencia), y los tests pueden
 * pasar un doble sin Obsidian.
 */
export interface ApiScenePublisherView {
	isPublished(id: string): boolean;
	snapshot(): readonly {
		id: string;
		published: boolean;
		descriptor?: { name?: string };
	}[];
	isPublishable?(id: string): boolean;
}

/** URN estable de un leaf. El canonical lleva categoria para no colisionar. */
export function apiSceneUrnFor(
	canonicalId: string,
	displayLabel: string,
): string {
	return formatMembershipUrn({
		providerId: API_SCENE_PROVIDER_ID,
		kind: API_SCENE_IDENTITY_KIND,
		canonicalId,
		displayLabel,
	});
}

export function buildApiSceneGroups(
	labelOf: (name: ApiSceneGroupName) => string = (name) =>
		API_SCENE_GROUP_LABEL_KEYS[name],
): readonly NodeGroupDef[] {
	return API_SCENE_GROUP_NAMES.map((name) => ({
		id: API_SCENE_GROUP_IDS[name],
		flavor: 'custom',
		label: labelOf(name),
		parentId: null,
		scope: 'all',
	}));
}

function resolvePublishable(
	publisher: ApiScenePublisherView | undefined,
	id: string,
	snapshotIds: ReadonlySet<string>,
): boolean {
	if (!publisher) return false;
	if (typeof publisher.isPublishable === 'function') {
		try {
			return publisher.isPublishable(id);
		} catch {
			return snapshotIds.has(id);
		}
	}
	return snapshotIds.has(id);
}

interface LeafSpec {
	group: ApiSceneGroupName;
	rowId: string;
	canonicalId: string;
	sasiId: string;
	label: string;
	labelKey: string;
	icon?: string;
	sasiKind: SasiFunctionKind | null;
	supports: readonly string[];
	composes: readonly string[];
	mutatesVault: boolean;
}

function toNode(
	spec: LeafSpec,
	publisher: ApiScenePublisherView | undefined,
	snapshotIds: ReadonlySet<string>,
): TreeNode<ApiSceneNodeMeta> {
	const publishable = resolvePublishable(publisher, spec.sasiId, snapshotIds);
	const published = publishable
		? (publisher?.isPublished(spec.sasiId) ?? false)
		: false;
	const urn = apiSceneUrnFor(spec.canonicalId, spec.label);
	return {
		id: spec.rowId,
		label: spec.label,
		...(spec.icon ? { icon: spec.icon } : {}),
		// `typeText` es campo estructural del TreeNode, no un cell kind nuevo:
		// dice la categoria sin inventar taxonomia.
		typeText: spec.sasiKind ?? spec.group,
		depth: 0,
		...(publishable
			? {
					cells: [
						{
							id: PUBLISH_CELL_ID,
							kind: 'toggle',
							enabled: published,
							style: 'native',
							label: published
								? 'sasi.inspector.toggle.on'
								: 'sasi.inspector.toggle.off',
						},
					],
				}
			: {}),
		meta: {
			identityKind: API_SCENE_IDENTITY_KIND,
			urn,
			group: spec.group,
			sasiId: spec.sasiId,
			labelKey: spec.labelKey,
			sasiKind: spec.sasiKind,
			supports: spec.supports,
			composes: spec.composes,
			mutatesVault: spec.mutatesVault,
			publishable,
			published,
		},
	};
}

/**
 * Filas planas del apiScene desde SASI real. Orden estable: el del registro
 * para functions/kinds/providers, el del snapshot para instancias, el de
 * SCENE_GOTO_TABS para scenes y alfabetico para superficies.
 */
export function buildApiSceneNodes(
	registry: SasiRegistry,
	publisher?: ApiScenePublisherView,
): readonly TreeNode<ApiSceneNodeMeta>[] {
	const snapshot = publisher?.snapshot() ?? [];
	const snapshotIds = new Set(snapshot.map((entry) => entry.id));
	const publishedById = new Map(
		snapshot.map((entry) => [entry.id, entry.published]),
	);
	// Vista local coherente: el toggle pinta `published` del snapshot, no una
	// lectura posterior que podria ser obsoleta tras el click.
	const coherentPublisher: ApiScenePublisherView | undefined = publisher
		? {
				isPublished: (id) => publishedById.get(id) ?? false,
				snapshot: () => snapshot,
				...(typeof publisher.isPublishable === 'function'
					? { isPublishable: (id: string) => publisher.isPublishable!(id) }
					: {}),
			}
		: undefined;

	const listCommands = (): readonly {
		id: string;
		labelKey: string;
		icon?: string;
		kind?: SasiFunctionKind;
		mutatesVault?: true;
		supports: readonly { surface: string }[];
		composes?: readonly string[];
	}[] => {
		const withMethod = registry as SasiRegistry & {
			listCommands?: () => readonly never[];
		};
		if (typeof withMethod.listCommands === 'function') {
			return withMethod.listCommands() as unknown as ReturnType<
				typeof listCommands
			>;
		}
		return registry
			.list('function')
			.filter((def) => def.kind === 'command');
	};

	const out: TreeNode<ApiSceneNodeMeta>[] = [];

	for (const def of registry.listActions()) {
		out.push(
			toNode(
				{
					group: 'action',
					rowId: `sasi:action:${def.id}`,
					canonicalId: `action:${def.id}`,
					sasiId: def.id,
					label: def.labelKey,
					labelKey: def.labelKey,
					...(def.icon ? { icon: def.icon } : {}),
					sasiKind: 'action',
					supports: def.supports.map((support) => support.surface),
					composes: def.composes ?? [],
					mutatesVault: false,
				},
				coherentPublisher ?? publisher,
				snapshotIds,
			),
		);
	}
	for (const def of registry.listOperations()) {
		out.push(
			toNode(
				{
					group: 'operation',
					rowId: `sasi:operation:${def.id}`,
					canonicalId: `operation:${def.id}`,
					sasiId: def.id,
					label: def.labelKey,
					labelKey: def.labelKey,
					...(def.icon ? { icon: def.icon } : {}),
					sasiKind: 'operation',
					supports: def.supports.map((support) => support.surface),
					composes: def.composes ?? [],
					mutatesVault: def.mutatesVault === true,
				},
				coherentPublisher ?? publisher,
				snapshotIds,
			),
		);
	}
	for (const def of listCommands()) {
		out.push(
			toNode(
				{
					group: 'command',
					rowId: `sasi:command:${def.id}`,
					canonicalId: `command:${def.id}`,
					sasiId: def.id,
					label: def.labelKey,
					labelKey: def.labelKey,
					...(def.icon ? { icon: def.icon } : {}),
					sasiKind: 'command',
					supports: def.supports.map((support) => support.surface),
					composes: def.composes ?? [],
					mutatesVault: def.mutatesVault === true,
				},
				coherentPublisher ?? publisher,
				snapshotIds,
			),
		);
	}
	for (const def of registry.list('kind')) {
		out.push(
			toNode(
				{
					group: 'kind',
					rowId: `sasi:kind:${def.id}`,
					canonicalId: `kind:${def.id}`,
					sasiId: def.id,
					label: def.labelKey,
					labelKey: def.labelKey,
					...(def.icon ? { icon: def.icon } : {}),
					sasiKind: def.kind ?? null,
					supports: def.supports.map((support) => support.surface),
					composes: def.composes ?? [],
					mutatesVault: false,
				},
				coherentPublisher ?? publisher,
				snapshotIds,
			),
		);
	}
	for (const def of registry.list('provider')) {
		out.push(
			toNode(
				{
					group: 'provider',
					rowId: `sasi:provider:${def.id}`,
					canonicalId: `provider:${def.id}`,
					sasiId: def.id,
					label: def.labelKey,
					labelKey: def.labelKey,
					...(def.icon ? { icon: def.icon } : {}),
					sasiKind: def.kind ?? null,
					supports: def.supports.map((support) => support.surface),
					composes: def.composes ?? [],
					mutatesVault: false,
				},
				coherentPublisher ?? publisher,
				snapshotIds,
			),
		);
	}
	// Instancias = descriptores vivos del publisher (comandos registrados con
	// su estado publicado). Es SASI real: el snapshot del bridge.
	for (const entry of snapshot) {
		const name = entry.descriptor?.name ?? entry.id;
		out.push(
			toNode(
				{
					group: 'instance',
					rowId: `sasi:instance:${entry.id}`,
					canonicalId: `instance:${entry.id}`,
					sasiId: entry.id,
					label: name,
					labelKey: name,
					sasiKind: 'command',
					supports: [],
					composes: [],
					mutatesVault: false,
				},
				coherentPublisher ?? publisher,
				snapshotIds,
			),
		);
	}
	// Scenes = las tabs con goto SASI real. `supports`/`icon` se heredan del
	// def del registro cuando existe; si no, vacio honesto, no inventado.
	const byId = new Map(
		registry.list('function').map((def) => [def.id, def] as const),
	);
	const sceneTab = (tab: StatisticsDataTab): void => {
		const gotoId = `vaultman.scene.goto.${tab}`;
		const def = byId.get(gotoId);
		out.push(
			toNode(
				{
					group: 'scene',
					rowId: `sasi:scene:${tab}`,
					canonicalId: `scene:${tab}`,
					sasiId: gotoId,
					label: def?.labelKey ?? `sasi.scene.goto.${tab}`,
					labelKey: def?.labelKey ?? `sasi.scene.goto.${tab}`,
					...(def?.icon ? { icon: def.icon } : {}),
					sasiKind: def?.kind ?? null,
					supports: def ? def.supports.map((s) => s.surface) : [],
					composes: def?.composes ?? [],
					mutatesVault: false,
				},
				coherentPublisher ?? publisher,
				snapshotIds,
			),
		);
	};
	for (const tab of SCENE_GOTO_TABS) sceneTab(tab);
	// Superficies = las `supports.surface` distintas declaradas en el
	// registro. Derivadas, no inventadas: si manana se registra una
	// superficie nueva, aparece aqui sin tocar este modulo.
	const surfaces = new Set<string>();
	for (const axis of ['function', 'kind', 'provider'] as const) {
		for (const def of registry.list(axis)) {
			for (const support of def.supports) surfaces.add(support.surface);
		}
	}
	for (const surface of [...surfaces].sort()) {
		out.push(
			toNode(
				{
					group: 'surface',
					rowId: `sasi:surface:${surface}`,
					canonicalId: `surface:${surface}`,
					sasiId: `sasi:surface:${surface}`,
					label: surface,
					labelKey: surface,
					sasiKind: null,
					supports: [],
					composes: [],
					mutatesVault: false,
				},
				coherentPublisher ?? publisher,
				snapshotIds,
			),
		);
	}
	return out;
}

/** Mapa grupo -> URNs en orden de filas, para `projectGroupedTree`. */
export function apiSceneMemberships(
	nodes: readonly TreeNode<ApiSceneNodeMeta>[],
): Record<string, readonly string[]> {
	const memberships: Record<string, string[]> = {};
	for (const name of API_SCENE_GROUP_NAMES) {
		memberships[API_SCENE_GROUP_IDS[name]] = [];
	}
	for (const node of nodes) {
		memberships[API_SCENE_GROUP_IDS[node.meta.group]]?.push(node.meta.urn);
	}
	return memberships;
}

export function apiSceneUrnOf(
	node: TreeNode<ApiSceneNodeMeta>,
): string {
	return node.meta.urn;
}

export interface ProjectApiSceneOptions {
	expandedIds?: ReadonlySet<string>;
	labelOf?: (name: ApiSceneGroupName) => string;
	noGroupLabel?: string;
}

/**
 * El arbol del apiScene: hojas `node_apis` bajo 8 p-nodes `node_groups`
 * via el motor compartido (`projectGroupedTree`). Grupos vacios se
 * proyectan (cabecera sin hijos), no se ocultan.
 */
export function projectApiSceneTree(
	nodes: readonly TreeNode<ApiSceneNodeMeta>[],
	options: ProjectApiSceneOptions = {},
): readonly TreeNode<ApiSceneNodeMeta | ApiSceneGroupMeta>[] {
	type Meta = ApiSceneNodeMeta | ApiSceneGroupMeta;
	const groups = buildApiSceneGroups(options.labelOf);
	const memberships = apiSceneMemberships(nodes);
	const projected = projectGroupedTree<Meta>({
		nodes: nodes as readonly TreeNode<Meta>[],
		groups,
		memberships,
		providerId: API_SCENE_PROVIDER_ID,
		noGroupLabel: options.noGroupLabel ?? '',
		filtered: false,
		urnOf: (node) => (node.meta as ApiSceneNodeMeta).urn,
		enabled: true,
		preset: { kind: 'custom', direction: 'asc' },
		expandedIds: options.expandedIds,
		headerMeta: undefined,
		headerCoreCls: 'tree-item-self nav-file-title tappable is-clickable',
		decorateHeader: (header, members) => {
			const group = API_SCENE_GROUP_NAMES.find(
				(name) => API_SCENE_GROUP_IDS[name] === header.id,
			);
			if (group) {
				header.meta = { identityKind: API_SCENE_GROUP_KIND, group };
			}
			header.count = members.length;
		},
	});
	// Los 8 grupos particionan el conjunto: no hay huerfanos y el
	// complemento `no group` del motor sobra aqui. Se retira en vez de
	// pedir `filtered` (que podaria los grupos vacios que SI se muestran).
	return projected.filter((row) => row.id !== NO_GROUP_ID);
}

/** Guarda de identidad: solo los leaves `node_apis` la tienen. */
export function isApiSceneNode(
	node: TreeNode<ApiSceneNodeMeta | ApiSceneGroupMeta>,
): node is TreeNode<ApiSceneNodeMeta> {
	return (
		(node.meta as ApiSceneNodeMeta).identityKind === API_SCENE_IDENTITY_KIND
	);
}

/** El toggle publish solo existe en comandos publicables con descriptor. */
export function apiScenePublishState(
	node: TreeNode<ApiSceneNodeMeta>,
): { publishable: boolean; published: boolean } {
	return {
		publishable: node.meta.publishable,
		published: node.meta.published,
	};
}
