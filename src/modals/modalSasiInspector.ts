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
import { createApiSceneDataSource } from '../logic/logicApiSceneDataSource';
import type { VaultmanPlugin } from '../main';
import { isBlankPanelSelectionTarget } from '../logic/logicPanelBlankSelection';
import type {
	ApiSceneNodeMeta,
	ApiScenePublisherEntry,
	ApiScenePublisherView,
} from '../logic/logicApiScene';
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

export function buildSasiInspectorModel(
	registry: SasiRegistry,
	publisher?: SasiCommandPublisher,
): SasiInspectorSection[] {
	return AXES.map(({ axis, labelKey }) => ({
		axis,
		labelKey,
		entries: registry.list(axis).map((def) => ({
			id: def.id,
			labelKey: def.labelKey,
			icon: def.icon ?? null,
			kind: def.kind ?? null,
			mutatesVault: def.mutatesVault === true,
			surfaces: def.supports.map((s) => s.surface),
			composes: def.composes ?? [],
			published: publisher?.isPublished(def.id) ?? false,
		})),
	}));
}

export type InstanceOpenOutcome =
	| boolean
	| {
			ok: boolean;
			reason?: string;
	  };

export function apiSceneInstanceFailureNoticeKey(
	reason?: string,
): string {
	switch (reason) {
		case 'tombstoned':
		case 'tombstoned-instance':
			return 'sasi.apiscene.instance_open_failed.tombstoned';
		case 'unsupported':
		case 'unsupported-surface':
			return 'sasi.apiscene.instance_open_failed.unsupported';
		case 'conflict':
		case 'mount-conflict':
			return 'sasi.apiscene.instance_open_failed.conflict';
		case 'surface_unavailable':
		case 'surface-unavailable':
			return 'sasi.apiscene.instance_open_failed.surface_unavailable';
		case 'stale':
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
		snapshot: (): readonly ApiScenePublisherEntry[] => publisher.snapshot(),
		isPublishable: (id) => publisher.isPublishable(id),
	};
}

export class SasiInspectorModal extends Modal {
	private panel: PluginsExplorerPanel | null = null;
	private disposeToolbar: (() => Promise<void>) | null = null;
	private host: HTMLElement | null = null;
	private readonly plugin: VaultmanPlugin;

	constructor(
		app: App,
		plugin: VaultmanPlugin,
	) {
		super(app);
		this.plugin = plugin;
		
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vaultman-sasi-inspector');
		contentEl.createEl('h2', { text: translate('sasi.inspector.title') });
		const toolbarHost = contentEl.createDiv();
		this.host = contentEl.createDiv({ cls: 'vaultman-sasi-apiscene' });

		const dataSource = createApiSceneDataSource(this.plugin, {
			onClose: () => this.close(),
			onOpenInstance: async (id) => {
				try {
					const result = await this.plugin.openWorkspaceInstance(id);
					if (result.ok) {
						this.close();
						return true;
					}
					new Notice(translate(apiSceneInstanceFailureNoticeKey(result.reason)));
					return false;
				} catch (error) {
					const detail = error instanceof Error ? `: ${error.message}` : '';
					new Notice(`${translate('sasi.apiscene.instance_open_failed')}${detail}`);
					return false;
				}
			},
		});

		this.panel = new PluginsExplorerPanel(this.host, this.plugin, dataSource);
		this.panel.load();
		const toolbar = mount(ApiSceneHost, {
			target: toolbarHost,
			props: {
				plugin: this.plugin,
				explorer: this.panel,
				sceneConfigPort: createApiSceneConfigPort(this.plugin),
			},
		});
		this.disposeToolbar = () => unmount(toolbar);
		contentEl.addEventListener('click', this.clearBlankSelection);
	}

	private readonly clearBlankSelection = (event: MouseEvent): void => {
		if (event.target instanceof Element && isBlankPanelSelectionTarget(event.target)) {
			this.panel?.clearSelection();
		}
	};

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
