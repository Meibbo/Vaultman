import type { VaultmanPlugin } from '../main';
import type { PluginNode } from '../types/typeContracts';
import type { MenuCtx } from '../types/typeCtxMenu';
import type { ExplorerProvider, ExplorerViewMode } from '../types/typeExplorer';
import type { NodeBadge, PluginMeta, TreeNode } from '../types/typeNode';
import { setCommunityPluginEnabled } from '../types/typeObsidian';

export class explorerPlugins implements ExplorerProvider<PluginMeta> {
	id = 'plugins';
	private plugin: VaultmanPlugin;
	private searchTerm = '';
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private unsubscribePluginsIndex: () => void;
	private subscribers = new Set<() => void>();

	constructor(plugin: VaultmanPlugin) {
		this.plugin = plugin;
		this.unsubscribePluginsIndex = this.plugin.pluginsIndex.subscribe(() => {
			this.notifySubscribers();
		});
		this.registerActions();
	}

	destroy(): void {
		this.unsubscribePluginsIndex();
	}

	getTree(): TreeNode<PluginMeta>[] {
		const term = this.searchTerm.trim().toLowerCase();
		const source = [...this.plugin.pluginsIndex.nodes].filter((node) =>
			term ? this.searchText(node).includes(term) : true,
		);
		return this.sortNodes(source).map((node) => this.toTreeNode(node));
	}

	handleNodeClick(_node: TreeNode<PluginMeta>): void {}

	handleNodeSecondaryAction(node: TreeNode<PluginMeta>): void {
		void this.togglePlugin(node.meta);
	}

	handleContextMenu(
		node: TreeNode<PluginMeta>,
		e: MouseEvent,
		selectedNodes: TreeNode<PluginMeta>[] = [],
	): void {
		this.plugin.contextMenuService.openPanelMenu(
			{ nodeType: 'plugin', node, selectedNodes, surface: 'panel' },
			e,
		);
	}

	getNodeType(_node: TreeNode<PluginMeta>): 'plugin' {
		return 'plugin';
	}

	subscribe(cb: () => void): () => void {
		this.subscribers.add(cb);
		return () => {
			this.subscribers.delete(cb);
		};
	}

	setSearchTerm(term: string): void {
		this.searchTerm = term;
	}

	setSortBy(sortBy: string, direction: 'asc' | 'desc'): void {
		this.sortBy = sortBy;
		this.sortDir = direction;
	}

	setViewMode(_mode: ExplorerViewMode): void {}

	private registerActions(): void {
		this.plugin.contextMenuService.registerAction({
			id: 'plugin.bindingNote',
			nodeTypes: ['plugin'],
			surfaces: ['panel'],
			label: 'Create / open binding note',
			icon: 'lucide-link',
			run: (ctx: MenuCtx) => {
				const node = ctx.node as TreeNode<PluginMeta>;
				void this.plugin.nodeBindingService?.bindOrCreate({
					kind: 'plugin',
					label: node.meta.name,
					pluginId: node.meta.pluginId,
				});
			},
		});
	}

	private sortNodes(nodes: PluginNode[]): PluginNode[] {
		const dir = this.sortDir === 'asc' ? 1 : -1;
		return [...nodes].sort((a, b) => {
			if (this.sortBy === 'count') {
				return dir * Number(a.enabled === b.enabled ? 0 : a.enabled ? 1 : -1);
			}
			return dir * (a.name.localeCompare(b.name) || a.pluginId.localeCompare(b.pluginId));
		});
	}

	private toTreeNode(node: PluginNode): TreeNode<PluginMeta> {
		const meta: PluginMeta = {
			pluginId: node.pluginId,
			name: node.name,
			enabled: node.enabled,
			loaded: node.loaded,
			version: node.version,
			author: node.author,
			description: node.description,
			isDesktopOnly: node.isDesktopOnly,
			isVaultman: this.isVaultmanPlugin(node),
		};
		return {
			id: node.id,
			label: node.name,
			icon: 'lucide-plug',
			depth: 0,
			countLabel: node.enabled ? 'on' : 'off',
			badges: [this.toggleBadge(meta)],
			meta,
		};
	}

	private toggleBadge(meta: PluginMeta): NodeBadge {
		if (meta.isVaultman) {
			return {
				icon: 'lucide-shield',
				color: 'warning',
				quickAction: true,
				title: 'Vaultman cannot disable itself',
				ariaLabel: 'Vaultman cannot disable itself',
			};
		}
		const next = !meta.enabled;
		return {
			icon: meta.enabled ? 'lucide-toggle-right' : 'lucide-toggle-left',
			color: meta.enabled ? 'success' : 'faint',
			quickAction: true,
			title: `${next ? 'Enable' : 'Disable'} community plugin "${meta.name}"`,
			ariaLabel: `${next ? 'Enable' : 'Disable'} community plugin "${meta.name}"`,
			onClick: () => this.togglePlugin(meta),
		};
	}

	private async togglePlugin(meta: PluginMeta): Promise<void> {
		if (meta.isVaultman) return;
		const changed = await setCommunityPluginEnabled(this.plugin.app, meta.pluginId, !meta.enabled);
		if (changed) await this.plugin.pluginsIndex.refresh();
	}

	private isVaultmanPlugin(node: PluginNode): boolean {
		const manifestId = (this.plugin as VaultmanPlugin & { manifest?: { id?: string } }).manifest
			?.id;
		return Boolean(manifestId && node.pluginId === manifestId);
	}

	private searchText(node: PluginNode): string {
		return [node.name, node.pluginId, node.author, node.description]
			.filter((value): value is string => typeof value === 'string')
			.join(' ')
			.toLowerCase();
	}

	private notifySubscribers(): void {
		for (const cb of this.subscribers) cb();
	}
}
