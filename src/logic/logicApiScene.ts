import type { SasiFunctionKind } from './logicSasiRegistry';
import type { SasiRegistry } from './logicSasiRegistry';
import { formatMembershipUrn } from './logicMembershipUrn';
import type { NodeGroupDef } from './logicNodeGroup';
import { NO_GROUP_ID, projectGroupedTree } from './logicTreeGroupProjection';
import type { TreeNode } from '../types/typeTree';
import type { InstanceRegistryData } from '../types/typeInstance';
import type { ExplorerTabId } from '../types/typeUI';

/**
 * U130L apiScene: SASI proyectado como arbol compartido (TreeNode), no como
 * DOM propio del modal.
 *
 * Puro a proposito: sin Obsidian, sin DOM, sin i18n. El modal traduce las
 * `labelKey` al pintar; aqui viajan crudas para que los tests las lean sin
 * montar nada.
 *
 * Taxonomia formal (spec-01 + glossary + correctiva U130L):
 * - Identidades reales: `node_apis` (kind de la URN). Todo leaf del apiScene
 *   es un `node_apis` con URN estable `sasi:node_apis:<canonical>|<label>`.
 * - `node_groups` NO es kind de identidad: son los p-nodes virtuales que
 *   agrupan (las 8 cabeceras). Nunca llevan toggle ni URN propia, y nunca se
 *   registran como kind SASI.
 * - Ejes `kind`/`provider`/`surface` poblados en el bootstrap: `node_apis`,
 *   proveedores del contrato Scene e identidades chrome concretas.
 * - Instancias: `InstanceRegistryData` de settings (ids durables con
 *   activeScene/tombstoned/revision), NUNCA descriptores del publisher.
 * - Scenes: `SceneDefinitionId` reales + el apiScene mismo. `content` es tab
 *   de UI, no escena, y no sale.
 * - Cells: NO se inventa ningun kind nuevo (`counter`/`date`/`text` son
 *   types de celda del modelo, no kinds). El unico cell es el `toggle`
 *   existente de TreeNodeCell (`publish`), con tooltip, y SOLO en nodos
 *   `command` registrados con descriptor publicable.
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
	/**
	 * Solo `true` en nodos `command` registrados (`axis=function`,
	 * `kind=command`) con descriptor en el publisher. Instancias, scenes,
	 * actions, operations, providers, kinds y surfaces nunca lo son.
	 */
	publishable: boolean;
	published: boolean;
	/** Solo grupo `instance`: scene activa durable del registro. */
	activeScene?: string;
	/** Solo grupo `instance`: tombstone visible del registro. */
	tombstoned?: boolean;
	/** Solo grupo `instance`: revision durable del registro. */
	revision?: number;
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
	activeScene?: string;
	tombstoned?: boolean;
	revision?: number;
}

function toNode(
	spec: LeafSpec,
	publisher: ApiScenePublisherView | undefined,
	snapshotIds: ReadonlySet<string>,
	isCommand = false,
): TreeNode<ApiSceneNodeMeta> {
	// Puerta command-only: el toggle `cell_toggle` existe SOLO en nodos
	// `command` registrados (axis=function, kind=command) con descriptor en
	// el publisher (`isPublishable`). Un descriptor con el mismo id NO abre
	// toggle en action/operation/instance/scene/provider/kind/surface.
	const publishable =
		isCommand && resolvePublishable(publisher, spec.sasiId, snapshotIds);
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
			...(spec.activeScene !== undefined
				? { activeScene: spec.activeScene }
				: {}),
			...(spec.tombstoned !== undefined
				? { tombstoned: spec.tombstoned }
				: {}),
			...(spec.revision !== undefined ? { revision: spec.revision } : {}),
		},
	};
}

/**
 * Escenas reales: los `SceneDefinitionId` del contrato (`ExplorerTabId`:
 * files, props, tags, snippets, plugins). `content` es tab de UI, no
 * `SceneDefinitionId`, y no sale aqui. El apiScene mismo cierra la lista
 * como identidad de escena propia.
 */
export const API_SCENE_TABS: readonly ExplorerTabId[] = [
	'files',
	'props',
	'tags',
	'snippets',
	'plugins',
];

export const API_SCENE_SELF_ID = 'vaultman.scene.apiscene';

/**
 * Filas planas del apiScene desde SASI real. Orden estable: el del registro
 * para functions/kinds/providers/surfaces, el de `API_SCENE_TABS` (+
 * apiScene) para scenes y alfabetico por id durable para instancias.
 * El snapshot del publisher SOLO da estado de publicacion de comandos:
 * nunca genera filas de instancia.
 */
export function buildApiSceneNodes(
	registry: SasiRegistry,
	publisher?: ApiScenePublisherView,
	instances?: InstanceRegistryData,
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
				true,
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
	// Instancias = el registro durable de settings (`InstanceRegistryData`),
	// NUNCA descriptores del publisher. Sin toggle de publicacion: la fila
	// muestra id durable, activeScene, tombstone y revision.
	const records = Object.values(instances?.instances ?? {}).sort((a, b) =>
		a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
	);
	for (const record of records) {
		out.push(
			toNode(
				{
					group: 'instance',
					rowId: `sasi:instance:${record.id}`,
					canonicalId: `instance:${record.id}`,
					sasiId: record.id,
					label: record.id,
					labelKey: record.id,
					sasiKind: null,
					supports: [],
					composes: [],
					mutatesVault: false,
					...(record.activeScene !== undefined
						? { activeScene: record.activeScene }
						: {}),
					tombstoned: record.tombstoned,
					revision: record.revision,
				},
				coherentPublisher ?? publisher,
				snapshotIds,
			),
		);
	}
	// Scenes = los `SceneDefinitionId` reales con su goto SASI.
	// `supports`/`icon` se heredan del def del registro cuando existe; si
	// no, vacio honesto, no inventado. El apiScene cierra como identidad.
	const byId = new Map(
		registry.list('function').map((def) => [def.id, def] as const),
	);
	const sceneTab = (tab: ExplorerTabId): void => {
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
	for (const tab of API_SCENE_TABS) sceneTab(tab);
	out.push(
		toNode(
			{
				group: 'scene',
				rowId: 'sasi:scene:apiscene',
				canonicalId: 'scene:apiscene',
				sasiId: API_SCENE_SELF_ID,
				label: 'sasi.apiscene.scene',
				labelKey: 'sasi.apiscene.scene',
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
			},
			coherentPublisher ?? publisher,
			snapshotIds,
		),
	);
	// Superficies = identidades del eje `surface` (chrome concretas).
	// Derivadas del registro, no de los strings de `supports`: si manana se
	// registra una superficie nueva, aparece aqui sin tocar este modulo.
	for (const def of registry.list('surface')) {
		out.push(
			toNode(
				{
					group: 'surface',
					rowId: `sasi:surface:${def.id}`,
					canonicalId: `surface:${def.id}`,
					sasiId: def.id,
					label: def.labelKey,
					labelKey: def.labelKey,
					...(def.icon ? { icon: def.icon } : {}),
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
