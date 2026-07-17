import { Component, Menu, Notice, setTooltip } from 'obsidian';
import type { VaultmanPlugin } from '../../main';
import { translate } from '../../i18n/index';
import type { PluginMeta, TreeNode } from '../../types/typeTree';
import {
	listCommunityPluginEntries,
	setCommunityPluginEnabled,
} from '../../utils/obsidianAddons';
import { UnifiedTreeView } from '../layout/viewTree';

export class PluginsExplorerPanel extends Component {
	private readonly containerEl: HTMLElement;
	private readonly plugin: VaultmanPlugin;
	private treeView: UnifiedTreeView | null = null;
	private nodes: TreeNode<PluginMeta>[] = [];
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
		const manifestId = this.plugin.manifest.id;
		this.nodes = listCommunityPluginEntries(this.plugin.app).map((entry) => {
			const meta: PluginMeta = {
				...entry,
				isVaultman: entry.pluginId === manifestId,
			};
			return {
				id: `plugin:${entry.pluginId}`,
				label: entry.name,
				icon: 'lucide-plug',
				typeText: entry.version,
				depth: 0,
				badges: [
					{
						icon: meta.isVaultman
							? 'lucide-shield'
							: entry.enabled
								? 'lucide-toggle-right'
								: 'lucide-toggle-left',
						text: translate(
							meta.isVaultman
								? 'addons.plugins.self_protected'
								: entry.enabled
									? 'addons.enabled'
									: 'addons.disabled',
						),
						color: meta.isVaultman
							? 'warning'
							: entry.enabled
								? 'success'
								: 'faint',
						solid: true,
					},
				],
				meta,
				coreCls: 'tree-item-self nav-file-title tappable is-clickable',
			};
		});
		if (!this.destroyed) this.render();
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
				text: translate('addons.plugins.empty'),
			});
		}
	}

	private findNode(id: string): TreeNode<PluginMeta> | undefined {
		return this.nodes.find((node) => node.id === id);
	}

	private tooltip(meta: PluginMeta): string {
		return [
			meta.name,
			meta.version ? `v${meta.version}` : '',
			meta.author ?? '',
			meta.description ?? '',
			translate(
				meta.isVaultman
					? 'addons.plugins.self_protected'
					: meta.enabled
						? 'addons.enabled'
						: 'addons.disabled',
			),
		]
			.filter(Boolean)
			.join('\n');
	}

	private openMenu(meta: PluginMeta, event: MouseEvent): void {
		const menu = new Menu();
		if (meta.isVaultman) {
			menu.addItem((item) =>
				item
					.setTitle(translate('addons.plugins.self_protected'))
					.setIcon('lucide-shield')
					.setDisabled(true),
			);
		} else {
			const next = !meta.enabled;
			menu.addItem((item) =>
				item
					.setTitle(
						translate(next ? 'addons.enable' : 'addons.disable'),
					)
					.setIcon(next ? 'lucide-toggle-right' : 'lucide-toggle-left')
					.onClick(() => void this.toggle(meta)),
			);
		}
		menu.showAtMouseEvent(event);
	}

	private async toggle(meta: PluginMeta): Promise<void> {
		if (meta.isVaultman) {
			new Notice(translate('addons.plugins.self_protected'));
			return;
		}
		try {
			const changed = await setCommunityPluginEnabled(
				this.plugin.app,
				meta.pluginId,
				!meta.enabled,
			);
			if (!changed) {
				new Notice(translate('addons.plugins.unavailable'));
				return;
			}
			await this.refresh();
		} catch (error) {
			new Notice(translate('addons.plugins.failed'));
			console.error('Vaultman community plugin toggle failed', error);
		}
	}
}
