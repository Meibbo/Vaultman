import { Modal, type App } from 'obsidian';
import { translate } from '../i18n/index';
import type {
	SasiAxis,
	SasiFunctionKind,
	SasiRegistry,
} from '../logic/logicSasiRegistry';
import type { SasiCommandPublisher } from '../logic/logicSasiCommands';
import { UnifiedTreeView } from '../components/layout/viewTree';
import {
	API_SCENE_GROUP_IDS,
	API_SCENE_GROUP_LABEL_KEYS,
	PUBLISH_CELL_ID,
	apiSceneUrnOf,
	buildApiSceneNodes,
	projectApiSceneTree,
	type ApiSceneGroupMeta,
	type ApiSceneGroupName,
	type ApiSceneNodeMeta,
	type ApiScenePublisherView,
} from '../logic/logicApiScene';
import { expandNewGroupHeaders } from '../logic/logicTreeGroupProjection';
import type { TreeNode } from '../types/typeTree';

export interface SasiInspectorEntry {
	id: string;
	labelKey: string;
	icon: string | null;
	kind: SasiFunctionKind | null;
	mutatesVault: boolean;
	surfaces: readonly string[];
	composes: readonly string[];
	published: boolean;
}

export interface SasiInspectorSection {
	axis: SasiAxis;
	labelKey: string;
	entries: readonly SasiInspectorEntry[];
}

/** El orden del mapa del dev: Providers, Kinds, FUNCTIONS. */
const AXES: readonly { axis: SasiAxis; labelKey: string }[] = [
	{ axis: 'provider', labelKey: 'sasi.inspector.axis.provider' },
	{ axis: 'kind', labelKey: 'sasi.inspector.axis.kind' },
	{ axis: 'function', labelKey: 'sasi.inspector.axis.function' },
];

/**
 * U130-01: el modelo que el modal pinta. Puro a proposito -- el modal no
 * calcula nada, y asi esto se prueba sin DOM y sin Obsidian.
 *
 * Los tres ejes salen SIEMPRE, tambien los vacios: un eje que desaparece no le
 * dice al agente que consulta que existe pero esta sin poblar, que es justo lo
 * que necesita saber para no reinventar un kind que ya existe.
 *
 * `published` cruza el publisher con la registry: un toggle ON significa que
 * el id esta registrado y publicado como comando de Obsidian, OFF que no. Asi
 * el modal puede pintar y mutar el toggle sin tocar la registry.
 *
 * U130L: legado historico. El modal ahora aloja el apiScene
 * (`logicApiScene` + `UnifiedTreeView`); este modelo por ejes se conserva
 * para los tests que lo cubren y como vista resumida.
 */
export function buildSasiInspectorModel(
	registry: SasiRegistry,
	publisher?: SasiCommandPublisher,
): readonly SasiInspectorSection[] {
	return AXES.map(({ axis, labelKey }) => ({
		axis,
		labelKey,
		entries: registry.list(axis).map((def) => ({
			id: def.id,
			labelKey: def.labelKey,
			icon: def.icon ?? null,
			kind: def.kind ?? null,
			mutatesVault: def.mutatesVault === true,
			surfaces: def.supports.map((support) => support.surface),
			composes: def.composes ?? [],
			published: publisher?.isPublished(def.id) ?? false,
		})),
	}));
}

type ApiMeta = ApiSceneNodeMeta | ApiSceneGroupMeta;

/**
 * U130L: SASI proyectado como apiScene dentro de un Modal nativo, sobre el
 * MISMO renderer compartido (`UnifiedTreeView`/`TreeNode`) que cualquier
 * explorer. Sin DOM propio por seccion (nada de h2/ul paralelos) y sin
 * explorer paralelo: las filas salen de `buildApiSceneNodes` (SASI real) y
 * los grupos son p-nodes virtuales `node_groups` via `projectGroupedTree`.
 *
 * No se expone en el `providers_menu` del sidebar para no saturar al
 * usuario comun (intent §7.2).
 */
export class SasiInspectorModal extends Modal {
	private readonly registry: SasiRegistry;
	private readonly publisher: SasiCommandPublisher | undefined;
	private readonly onToggle?: (id: string, published: boolean) => void;
	private view: UnifiedTreeView | null = null;
	private host: HTMLElement | null = null;
	private readonly expandedIds = new Set<string>();
	private readonly seenHeaders = new Set<string>();
	private flat: readonly TreeNode<ApiSceneNodeMeta>[] = [];

	constructor(
		app: App,
		registry: SasiRegistry,
		publisher?: SasiCommandPublisher,
		onToggle?: (id: string, published: boolean) => void,
	) {
		super(app);
		this.registry = registry;
		this.publisher = publisher;
		this.onToggle = onToggle;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vaultman-sasi-inspector');
		contentEl.createEl('h2', { text: translate('sasi.inspector.title') });
		this.host = contentEl.createDiv({ cls: 'vaultman-sasi-apiscene' });
		this.view = new UnifiedTreeView(this.host);
		this.renderScene();
	}

	/** Vista coherente del publisher: relee el snapshot en cada render. */
	private publisherView(): ApiScenePublisherView | undefined {
		const publisher = this.publisher;
		if (!publisher) return undefined;
		const bridge = publisher as SasiCommandPublisher & {
			isPublishable?: (id: string) => boolean;
		};
		return {
			isPublished: (id) => publisher.isPublished(id),
			snapshot: () =>
				publisher
					.snapshot()
					.map((entry) => ({
						id: entry.id,
						published: entry.published,
						descriptor: {
							name: (entry as { descriptor?: { name?: string } })
								.descriptor?.name,
						},
					})),
			...(typeof bridge.isPublishable === 'function'
				? { isPublishable: (id: string) => bridge.isPublishable!(id) }
				: {}),
		};
	}

	private renderScene(): void {
		if (!this.view) return;
		const publisherView = this.publisherView();
		const flat = buildApiSceneNodes(this.registry, publisherView);
		this.flat = flat;
		const labeled = flat.map((node) => ({
			...node,
			label: translate(node.meta.labelKey) || node.label,
			cells: node.cells?.map((cell) =>
				'label' in cell
					? { ...cell, label: translate(cell.label) || cell.label }
					: cell,
			),
		}));
		const projected = projectApiSceneTree(labeled, {
			expandedIds: this.expandedIds,
			labelOf: (name: ApiSceneGroupName) =>
				translate(API_SCENE_GROUP_LABEL_KEYS[name]) ||
				API_SCENE_GROUP_IDS[name],
			noGroupLabel: translate('sasi.inspector.empty'),
		});
		// Los grupos se abren solos la primera vez (un file manager abre
		// grupos); el colapso del usuario se respeta despues.
		expandNewGroupHeaders(
			projected,
			this.seenHeaders,
			this.expandedIds,
		);
		this.view.render({
			nodes: projected as TreeNode[],
			expandedIds: this.expandedIds,
			indentGuides: true,
			onToggle: (id) => this.toggleExpanded(id),
			onGroupActivate: (id) => this.toggleExpanded(id),
			onRowClick: () => {},
			onContextMenu: () => {},
			onCellClick: (id, cellId) => this.handleCell(id, cellId),
			rowTooltip: (node) => this.rowTooltip(node as TreeNode<ApiMeta>),
		});
	}

	private toggleExpanded(id: string): void {
		if (this.expandedIds.has(id)) this.expandedIds.delete(id);
		else this.expandedIds.add(id);
		this.renderScene();
	}

	private handleCell(rowId: string, cellId: string): void {
		if (cellId !== PUBLISH_CELL_ID || !this.publisher) return;
		const node = this.flat.find((leaf) => leaf.id === rowId);
		if (!node || !node.meta.publishable) return;
		const next = !node.meta.published;
		try {
			this.publisher.setPublished(node.meta.sasiId, next);
		} catch {
			return;
		}
		if (this.onToggle) this.onToggle(node.meta.sasiId, next);
		// Relee registry + publisher: sin snapshot obsoleta tras el click.
		this.renderScene();
	}

	private rowTooltip(node: TreeNode<ApiMeta>): string {
		const meta = node.meta as ApiSceneNodeMeta;
		if (meta.identityKind !== 'node_apis') {
			return translate(API_SCENE_GROUP_LABEL_KEYS[meta.group]) || node.label;
		}
		const parts = [meta.sasiId];
		parts.push(meta.sasiKind ?? meta.group);
		if (meta.mutatesVault) parts.push(translate('sasi.inspector.mutates_vault'));
		if (meta.supports.length > 0) {
			parts.push(meta.supports.join(', '));
		}
		if (meta.composes.length > 0) {
			parts.push(`composes: ${meta.composes.join(', ')}`);
		}
		try {
			parts.push(apiSceneUrnOf(node as TreeNode<ApiSceneNodeMeta>));
		} catch {
			// La URN nunca puede tumbar el tooltip.
		}
		return parts.filter(Boolean).join(' · ');
	}

	onClose(): void {
		this.view?.destroy();
		this.view = null;
		this.host = null;
		this.contentEl.empty();
	}
}
