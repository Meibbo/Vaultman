import type { VaultmanPlugin } from '../main';
import type { SnippetNode } from '../types/typeContracts';
import type { MenuCtx } from '../types/typeCtxMenu';
import type { ExplorerProvider, ExplorerViewMode } from '../types/typeExplorer';
import type { NodeBadge, SnippetMeta, TreeNode } from '../types/typeNode';
import { setCssSnippetEnabled } from '../types/typeObsidian';

export class explorerSnippets implements ExplorerProvider<SnippetMeta> {
	id = 'snippets';
	private plugin: VaultmanPlugin;
	private searchTerm = '';
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private unsubscribeSnippetsIndex: () => void;
	private subscribers = new Set<() => void>();

	constructor(plugin: VaultmanPlugin) {
		this.plugin = plugin;
		this.unsubscribeSnippetsIndex = this.plugin.cssSnippetsIndex.subscribe(() => {
			this.notifySubscribers();
		});
		this.registerActions();
	}

	destroy(): void {
		this.unsubscribeSnippetsIndex();
	}

	getTree(): TreeNode<SnippetMeta>[] {
		const term = this.searchTerm.trim().toLowerCase();
		const source = [...this.plugin.cssSnippetsIndex.nodes].filter((node) =>
			term ? node.name.toLowerCase().includes(term) : true,
		);
		const sorted = this.sortNodes(source);
		return sorted.map((node) => this.toTreeNode(node));
	}

	handleNodeClick(_node: TreeNode<SnippetMeta>): void {}

	handleNodeSecondaryAction(node: TreeNode<SnippetMeta>): void {
		void this.toggleSnippet(node.meta);
	}

	handleContextMenu(
		node: TreeNode<SnippetMeta>,
		e: MouseEvent,
		selectedNodes: TreeNode<SnippetMeta>[] = [],
	): void {
		this.plugin.contextMenuService.openPanelMenu(
			{ nodeType: 'snippet', node, selectedNodes, surface: 'panel' },
			e,
		);
	}

	getNodeType(_node: TreeNode<SnippetMeta>): 'snippet' {
		return 'snippet';
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
			id: 'snippet.bindingNote',
			nodeTypes: ['snippet'],
			surfaces: ['panel'],
			label: 'Create / open binding note',
			icon: 'lucide-link',
			run: (ctx: MenuCtx) => {
				const node = ctx.node as TreeNode<SnippetMeta>;
				void this.plugin.nodeBindingService?.bindOrCreate({
					kind: 'snippet',
					label: node.meta.name,
				});
			},
		});
	}

	private sortNodes(nodes: SnippetNode[]): SnippetNode[] {
		const dir = this.sortDir === 'asc' ? 1 : -1;
		return [...nodes].sort((a, b) => {
			if (this.sortBy === 'count') {
				return dir * Number(a.enabled === b.enabled ? 0 : a.enabled ? 1 : -1);
			}
			return dir * a.name.localeCompare(b.name);
		});
	}

	private toTreeNode(node: SnippetNode): TreeNode<SnippetMeta> {
		const meta = { name: node.name, enabled: node.enabled };
		return {
			id: node.id,
			label: node.name,
			icon: 'lucide-file-code',
			depth: 0,
			countLabel: node.enabled ? 'on' : 'off',
			badges: [this.toggleBadge(meta)],
			meta,
		};
	}

	private toggleBadge(meta: SnippetMeta): NodeBadge {
		const next = !meta.enabled;
		return {
			icon: meta.enabled ? 'lucide-toggle-right' : 'lucide-toggle-left',
			color: meta.enabled ? 'success' : 'faint',
			quickAction: true,
			title: `${next ? 'Enable' : 'Disable'} CSS snippet "${meta.name}"`,
			ariaLabel: `${next ? 'Enable' : 'Disable'} CSS snippet "${meta.name}"`,
			onClick: () => this.toggleSnippet(meta),
		};
	}

	private async toggleSnippet(meta: SnippetMeta): Promise<void> {
		const changed = await setCssSnippetEnabled(this.plugin.app, meta.name, !meta.enabled);
		if (changed) await this.plugin.cssSnippetsIndex.refresh();
	}

	private notifySubscribers(): void {
		for (const cb of this.subscribers) cb();
	}
}
