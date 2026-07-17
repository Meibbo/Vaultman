import { Component, Menu, Notice, setTooltip } from 'obsidian';
import type { VaultmanPlugin } from '../../main';
import { translate } from '../../i18n/index';
import type { SnippetMeta, TreeNode } from '../../types/typeTree';
import {
	listCssSnippetEntries,
	setCssSnippetEnabled,
} from '../../utils/obsidianAddons';
import { UnifiedTreeView } from '../layout/viewTree';

export class SnippetsExplorerPanel extends Component {
	private readonly containerEl: HTMLElement;
	private readonly plugin: VaultmanPlugin;
	private treeView: UnifiedTreeView | null = null;
	private nodes: TreeNode<SnippetMeta>[] = [];
	private emptyEl: HTMLElement | null = null;
	private destroyed = false;

	constructor(containerEl: HTMLElement, plugin: VaultmanPlugin) {
		super();
		this.containerEl = containerEl;
		this.plugin = plugin;
	}

	onload(): void {
		this.destroyed = false;
		this.treeView = new UnifiedTreeView(this.containerEl);
		void this.refresh();
	}

	onunload(): void {
		this.destroyed = true;
		this.treeView?.destroy();
		this.treeView = null;
		this.emptyEl?.remove();
		this.emptyEl = null;
		super.onunload();
	}

	async refresh(): Promise<void> {
		const entries = await listCssSnippetEntries(this.plugin.app);
		if (this.destroyed) return;
		this.nodes = entries.map((entry) => ({
			id: `snippet:${entry.name}`,
			label: entry.name,
			icon: 'lucide-file-code',
			depth: 0,
			badges: [
				{
					icon: entry.enabled
						? 'lucide-toggle-right'
						: 'lucide-toggle-left',
					text: translate(
						entry.enabled ? 'addons.enabled' : 'addons.disabled',
					),
					color: entry.enabled ? 'success' : 'faint',
					solid: true,
				},
			],
			meta: entry,
			coreCls: 'tree-item-self nav-file-title tappable is-clickable',
		}));
		this.render();
	}

	private render(): void {
		if (!this.treeView) return;
		this.emptyEl?.remove();
		this.emptyEl = null;
		this.treeView.render({
			nodes: this.nodes,
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onRowDoubleClick: (id) => {
				const node = this.findNode(id);
				if (node) void this.toggle(node.meta);
			},
			onRowHover: (id, row) => {
				const node = this.findNode(id);
				if (node) setTooltip(row, this.tooltip(node.meta));
			},
			onContextMenu: (id, event) => {
				const node = this.findNode(id);
				if (node) this.openMenu(node.meta, event);
			},
		});
		if (this.nodes.length === 0) {
			this.emptyEl = this.containerEl.createDiv({
				cls: 'vaultman-files-empty-state',
				text: translate('addons.snippets.empty'),
			});
		}
	}

	private findNode(id: string): TreeNode<SnippetMeta> | undefined {
		return this.nodes.find((node) => node.id === id);
	}

	private tooltip(meta: SnippetMeta): string {
		return `${meta.name}\n${translate(meta.enabled ? 'addons.enabled' : 'addons.disabled')}`;
	}

	private openMenu(meta: SnippetMeta, event: MouseEvent): void {
		const next = !meta.enabled;
		new Menu()
			.addItem((item) =>
				item
					.setTitle(
						translate(next ? 'addons.enable' : 'addons.disable'),
					)
					.setIcon(next ? 'lucide-toggle-right' : 'lucide-toggle-left')
					.onClick(() => void this.toggle(meta)),
			)
			.showAtMouseEvent(event);
	}

	private async toggle(meta: SnippetMeta): Promise<void> {
		try {
			const changed = await setCssSnippetEnabled(
				this.plugin.app,
				meta.name,
				!meta.enabled,
			);
			if (!changed) {
				new Notice(translate('addons.snippets.unavailable'));
				return;
			}
			await this.refresh();
		} catch (error) {
			new Notice(translate('addons.snippets.failed'));
			console.error('Vaultman CSS snippet toggle failed', error);
		}
	}
}
