import { Modal, Notice, type App } from 'obsidian';
import { translate } from '../i18n/index';
import type {
	SasiAxis,
	SasiFunctionKind,
	SasiRegistry,
} from '../logic/logicSasiRegistry';
import type { SasiCommandPublisher } from '../logic/logicSasiCommands';
import { mount, unmount } from 'svelte';
import { PluginsExplorerPanel } from '../components/containers/explorerPlugins';
import ApiSceneHost from '../components/layout/apiSceneHost.svelte';
import { createApiSceneConfigPort } from '../logic/logicApiSceneConfig';
import type { VaultmanPlugin } from '../main';
import { formatAddonTimestamp } from '../logic/logicAddonExplorer';
import { isBlankPanelSelectionTarget } from '../logic/logicPanelBlankSelection';
import {
	API_SCENE_GROUP_LABEL_KEYS,
	PUBLISH_CELL_ID,
	apiSceneUrnOf,
	buildApiSceneNodes,
	nestApiScenePluginKinds,
	isApiSceneNode,
	type ApiSceneGroupMeta,
	type ApiSceneNodeMeta,
	type ApiScenePublisherView,
} from '../logic/logicApiScene';
import { entityIdOf } from '../logic/logicTreeGroupProjection';
import type { PluginMeta, TreeNode } from '../types/typeTree';
import type { InstanceRegistryData } from '../types/typeInstance';

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

export function apiSceneInstanceIdFromRow(
	rowId: string,
	nodes: readonly TreeNode<ApiSceneNodeMeta>[],
): string | null {
	const node = nodes.find((candidate) => candidate.id === rowId);
	return node?.meta.group === 'instance' ? node.meta.sasiId : null;
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
type InstanceOpenOutcome =
	| boolean
	| { readonly ok: boolean; readonly reason?: string }
	| void;

export function apiSceneInstanceFailureNoticeKey(reason: string): string {
	switch (reason) {
		case 'tombstoned-instance':
			return 'sasi.apiscene.instance_open_failed.tombstoned';
		case 'unsupported-surface':
			return 'sasi.apiscene.instance_open_failed.unsupported';
		case 'mount-conflict':
			return 'sasi.apiscene.instance_open_failed.conflict';
		case 'surface-unavailable':
			return 'sasi.apiscene.instance_open_failed.surface_unavailable';
		case 'stale-reservation':
			return 'sasi.apiscene.instance_open_failed.stale';
		default:
			return 'sasi.apiscene.instance_open_failed';
	}
}

export function createApiScenePublisherView(
	publisher: SasiCommandPublisher,
): ApiScenePublisherView {
	return {
		isPublished: (id) => publisher.isPublished(id),
		snapshot: () =>
			publisher.snapshot().map((entry) => ({
				id: entry.id,
				published: entry.published,
				descriptor: { name: entry.descriptor.name },
			})),
		isPublishable: (id) => publisher.isPublishable(id),
	};
}

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
	private readonly instances:
		| InstanceRegistryData
		| (() => InstanceRegistryData | undefined)
		| undefined;
	private readonly onOpenInstance?: (
		id: string,
	) => Promise<InstanceOpenOutcome> | InstanceOpenOutcome;
	private panel: PluginsExplorerPanel | null = null;
	private disposeToolbar: (() => Promise<void>) | null = null;
	private host: HTMLElement | null = null;
	private flat: readonly TreeNode<ApiSceneNodeMeta>[] = [];
	private readonly plugin: VaultmanPlugin;

	constructor(
		app: App,
		plugin: VaultmanPlugin,
	) {
		super(app);
		this.plugin = plugin;
		this.registry = plugin.sasiRegistry;
		this.publisher = plugin.sasiCommandPublisher;
		this.instances = () => plugin.settings.instanceRegistry;
		this.onOpenInstance = (id) => plugin.openWorkspaceInstance(id);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vaultman-sasi-inspector');
		contentEl.createEl('h2', { text: translate('sasi.inspector.title') });
		const toolbarHost = contentEl.createDiv();
		this.host = contentEl.createDiv({ cls: 'vaultman-sasi-apiscene' });
		this.panel = new PluginsExplorerPanel(this.host, this.plugin, {
			providerId: 'sasi',
			groups: [],
			nodes: () => this.addonNodes(),
			memberships: () => ({}),
			urnOf: (node) => this.flat.find((row) => row.id === entityIdOf(node))?.meta.urn ?? '',
			activate: (id) => { void this.openInstanceFromRow(id); },
			cell: (id, cellId) => this.handleCell(id, cellId === 'state' ? PUBLISH_CELL_ID : cellId),
			tooltip: (node) => {
				const row = this.flat.find((candidate) => candidate.id === entityIdOf(node));
				return row ? this.rowTooltip(row) : node.label;
			},
		});
		this.panel.load();
		const toolbar = mount(ApiSceneHost, {
			target: toolbarHost,
			props: { plugin: this.plugin, explorer: this.panel, sceneConfigPort: createApiSceneConfigPort(this.plugin) },
		});
		this.disposeToolbar = () => unmount(toolbar);
		contentEl.addEventListener('click', this.clearBlankSelection);
	}

	private readonly clearBlankSelection = (event: MouseEvent): void => {
		if (event.target instanceof Element && isBlankPanelSelectionTarget(event.target)) this.panel?.clearSelection();
	};

	/** Vista coherente del publisher: relee el snapshot en cada render. */
	private publisherView(): ApiScenePublisherView | undefined {
		const publisher = this.publisher;
		if (!publisher) return undefined;
		return createApiScenePublisherView(publisher);
	}

	private addonNodes(): TreeNode<PluginMeta>[] {
		const publisherView = this.publisherView();
		const instances =
			typeof this.instances === 'function' ? this.instances() : this.instances;
		const flat = buildApiSceneNodes(
			this.registry,
			publisherView,
			instances,
		);
		this.flat = flat;
		const nodes = flat.map((node) => {
			const lifecycle = this.plugin.sasiProvider.lifecycleFor(node.meta.sasiId);
			const instance = node.meta.group === 'instance' ? instances?.instances[node.meta.sasiId] : undefined;
			const createdAt = instance?.createdAt ?? lifecycle?.createdAt;
			const updatedAt = instance?.lastActiveAt ?? lifecycle?.updatedAt;
			return {
			...node,
			children: undefined,
			ctimeText: formatAddonTimestamp(createdAt),
			mtimeText: formatAddonTimestamp(updatedAt),
			label: translate(node.meta.labelKey) || node.label,
			cells: node.cells?.map((cell) =>
				'label' in cell
					? { ...cell, id: cell.id === PUBLISH_CELL_ID ? 'state' : cell.id, label: translate(cell.label) || cell.label }
					: cell,
			),
			// Compatibility projection for the shared addon engine; semantic API identity stays intact.
			meta: { ...node.meta, pluginId: node.id, name: node.label, enabled: node.meta.published, loaded: false, isVaultman: false, installedTime: createdAt, updatedTime: updatedAt },
			};
		});
		return nestApiScenePluginKinds(nodes);
	}

	private async openInstanceFromRow(rowId: string): Promise<void> {
		const instanceId = apiSceneInstanceIdFromRow(rowId, this.flat);
		if (!instanceId || !this.onOpenInstance) return;
		let result: InstanceOpenOutcome;
		try {
			result = await this.onOpenInstance(instanceId);
		} catch (error) {
			const detail = error instanceof Error ? `: ${error.message}` : '';
			new Notice(`${translate('sasi.apiscene.instance_open_failed')}${detail}`);
			return;
		}
		if (result === true || (typeof result === 'object' && result?.ok === true)) {
			this.close();
		} else if (result === false || (typeof result === 'object' && result?.ok === false)) {
			const reason = typeof result === 'object' ? result.reason : undefined;
			new Notice(translate(apiSceneInstanceFailureNoticeKey(reason ?? '')));
		}
	}

	private handleCell(rowId: string, cellId: string): void {
		if (cellId !== PUBLISH_CELL_ID || !this.publisher) return;
		const node = this.flat.find((leaf) => leaf.id === rowId);
		if (!node || !node.meta.publishable) return;
		const next = !node.meta.published;
		this.publisher.setPublished(node.meta.sasiId, next);
		// Relee registry + publisher: sin snapshot obsoleta tras el click.
		void this.panel?.refresh();
	}

	private rowTooltip(node: TreeNode<ApiMeta>): string {
		if (!isApiSceneNode(node)) {
			const meta = node.meta;
			return translate(API_SCENE_GROUP_LABEL_KEYS[meta.group]) || node.label;
		}
		const meta = node.meta;
		if (meta.group === 'instance') {
			const parts = [meta.sasiId];
			if (meta.tombstoned === true) parts.push('tombstoned');
			if (meta.revision !== undefined) parts.push(`rev ${meta.revision}`);
			if (meta.activeScene !== undefined) parts.push(meta.activeScene);
			parts.push(apiSceneUrnOf(node));
			return parts.filter(Boolean).join(' · ');
		}
		const parts = [meta.sasiId];
		parts.push(meta.sasiKind ?? meta.group);
		if (meta.mutatesVault)
			parts.push(translate('sasi.inspector.mutates_vault'));
		if (meta.supports.length > 0) {
			parts.push(meta.supports.join(', '));
		}
		if (meta.composes.length > 0) {
			parts.push(`composes: ${meta.composes.join(', ')}`);
		}
		parts.push(apiSceneUrnOf(node));
		return parts.filter(Boolean).join(' · ');
	}

	onClose(): void {
		this.contentEl.removeEventListener('click', this.clearBlankSelection);
		this.panel?.unload();
		this.panel = null;
		void this.disposeToolbar?.();
		this.disposeToolbar = null;
		this.host = null;
		this.contentEl.empty();
	}
}
