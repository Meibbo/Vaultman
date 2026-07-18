import { Component, Menu, Notice, setTooltip } from 'obsidian';
import type { VaultmanPlugin } from '../../main';
import { translate } from '../../i18n/index';
import type { PluginMeta, TreeNode, TreeNodeCell } from '../../types/typeTree';
import type { ExplorerSortState, ExplorerViewMode } from '../../types/typeUI';
import type { AddonCellStyle } from '../../types/typeSettings';
import type { FloatingTocExpansionChange } from '../../services/routerFloatingToc';
import type { IndexNodeRef } from '../../logic/logicIndexGroups';
import {
	communityPluginStateSignature,
	listCommunityPluginEntries,
	setCommunityPluginEnabled,
} from '../../utils/obsidianAddons';
import {
	buildAddonHoverInfo,
	filterAddonEntries,
	formatAddonTimestamp,
	sortAddonEntries,
	type AddonExplorerPanelPort,
} from '../../logic/logicAddonExplorer';
import {
	activeScopeSort,
	normalizeExplorerSortState,
	sameExplorerSortState,
} from '../../logic/logicScopedSort';
import { isFloatingTocSortIndexable } from '../../logic/logicFloatingTocAvailability';
import { UnifiedTreeView } from '../layout/viewTree';
import {
	normalizeAddonCellStyle,
	openPluginSettings,
	pluginSettingTabIds,
} from '../../logic/logicAddonCells';

export class PluginsExplorerPanel
	extends Component
	implements AddonExplorerPanelPort
{
	private readonly containerEl: HTMLElement;
	private readonly plugin: VaultmanPlugin;
	private treeView: UnifiedTreeView | null = null;
	private nodes: TreeNode<PluginMeta>[] = [];
	private entries: PluginMeta[] = [];
	private searchTerm = '';
	private sortState = normalizeExplorerSortState('plugins', null);
	private visibleCells = new Set(['icon', 'text', 'state', 'config']);
	private emptyEl: HTMLElement | null = null;
	private destroyed = false;
	private refreshRevision = 0;
	private cellStyle: AddonCellStyle;
	private readonly pendingToggleIds = new Set<string>();

	constructor(containerEl: HTMLElement, plugin: VaultmanPlugin) {
		super();
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.cellStyle = normalizeAddonCellStyle(plugin.settings.addonCellStyle);
	}

	onload(): void {
		this.destroyed = false;
		this.treeView = new UnifiedTreeView(this.containerEl);
		void this.refresh();
		// Core Settings toggles emit no event; poll a cheap signature while the
		// panel is visible and refresh only on a real delta (BT4-006).
		this.registerInterval(
			window.setInterval(() => this._syncExternalState(), 2500),
		);
	}

	private _lastExternalSignature = '';

	private _syncExternalState(): void {
		if (this.destroyed || !this.containerEl.isShown()) return;
		const signature = communityPluginStateSignature(this.plugin.app);
		if (signature === this._lastExternalSignature) return;
		this._lastExternalSignature = signature;
		void this.refresh();
	}

	onunload(): void {
		this.destroyed = true;
		this.refreshRevision += 1;
		this.treeView?.destroy();
		this.treeView = null;
		this.emptyEl?.remove();
		this.emptyEl = null;
		super.onunload();
	}

	async refresh(): Promise<void> {
		const revision = ++this.refreshRevision;
		const manifestId = this.plugin.manifest.id;
		this._lastExternalSignature = communityPluginStateSignature(
			this.plugin.app,
		);
		const entries = await listCommunityPluginEntries(this.plugin.app);
		if (this.destroyed || revision !== this.refreshRevision) return;
		this.entries = entries.map((entry) => ({
			...entry,
			isVaultman: entry.pluginId === manifestId,
		}));
		this.rebuildNodes();
	}

	setSearchTerm(term: string): void {
		if (this.searchTerm === term) return;
		this.searchTerm = term;
		this.rebuildNodes();
	}

	setSortState(state: ExplorerSortState): void {
		const normalized = normalizeExplorerSortState('plugins', state);
		if (sameExplorerSortState(this.sortState, normalized)) return;
		this.sortState = normalized;
		this.rebuildNodes();
	}

	setVisibleCells(cells: Set<string>): void {
		const next = new Set(cells);
		if (
			next.size === this.visibleCells.size &&
			[...next].every((cell) => this.visibleCells.has(cell))
		) {
			return;
		}
		this.visibleCells = next;
		this.rebuildNodes();
	}

	setViewMode(_mode: ExplorerViewMode): void {
		// The scene-precedent port is operationally flat/tree-only in beta.3.
	}

	setCellStyle(style: AddonCellStyle): void {
		const next = normalizeAddonCellStyle(style);
		if (this.cellStyle === next) return;
		this.cellStyle = next;
		this.rebuildNodes();
	}

	private rebuildNodes(): void {
		const filtered = filterAddonEntries(
			this.entries,
			this.searchTerm,
			(entry) =>
				[entry.name, entry.version, entry.author, entry.description]
					.filter(Boolean)
					.join(' '),
		);
		const entries = sortAddonEntries(
			filtered,
			activeScopeSort('plugins', this.sortState),
		);
		const settingsTabIds = pluginSettingTabIds(this.plugin.app);
		this.nodes = entries.map((entry) => {
			const meta: PluginMeta = {
				...entry,
			};
			// The state toggle always sits rightmost (D27); config goes before it.
			const cells: TreeNodeCell[] = [];
			if (settingsTabIds.has(entry.pluginId)) {
				cells.push({
					id: 'config',
					kind: 'action',
					icon: 'lucide-settings',
					label: translate('addons.open_settings'),
				});
			}
			cells.push(
				meta.isVaultman
					? {
							id: 'state',
							kind: 'action',
							icon: 'lucide-shield',
							label: translate('addons.plugins.self_protected'),
							disabled: true,
							appearance: 'badge',
						}
					: {
							id: 'state',
							kind: 'toggle',
							enabled: entry.enabled,
							style: this.cellStyle,
							label: translate(
								entry.enabled ? 'addons.enabled' : 'addons.disabled',
							),
							disabled: this.pendingToggleIds.has(entry.pluginId),
						},
			);
			return {
				id: `plugin:${entry.pluginId}`,
				label: entry.name,
				icon: 'lucide-plug',
				typeText: entry.version,
				ctimeText: formatAddonTimestamp(entry.installedTime),
				mtimeText: formatAddonTimestamp(entry.updatedTime),
				depth: 0,
				cells,
				meta,
				coreCls: 'tree-item-self nav-file-title tappable is-clickable',
			};
		});
		this.render();
	}

	private render(): void {
		if (!this.treeView) return;
		this.emptyEl?.remove();
		this.emptyEl = null;
		this.treeView.render({
			nodes: this.nodes,
			visibleCells: this.visibleCells,
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onCellClick: (id, cellId) => {
				const node = this.findNode(id);
				if (!node) return;
				if (cellId === 'state') void this.toggle(node.meta);
				if (cellId === 'config') {
					openPluginSettings(this.plugin.app, node.meta.pluginId);
				}
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
		this.onIndexChanged?.();
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
		return buildAddonHoverInfo(
			{
				name: meta.name,
				installed: formatAddonTimestamp(meta.installedTime),
				updated: formatAddonTimestamp(meta.updatedTime),
				version: meta.version,
				author: meta.author,
			},
			{
				installed: translate('addons.installed'),
				updated: translate('addons.updated'),
				version: translate('addons.version'),
				author: translate('addons.author'),
			},
		);
	}

	onIndexChanged?: (change?: FloatingTocExpansionChange) => void;

	getIndexNodes(rootId: string | null): IndexNodeRef[] {
		if (rootId !== null) return [];
		return this.nodes.map((node) => ({
			id: node.id,
			label: node.label,
			isContainer: false,
		}));
	}

	isIndexableSort(): boolean {
		return isFloatingTocSortIndexable(
			'plugins',
			activeScopeSort('plugins', this.sortState).sortBy,
		);
	}

	supportsKindToggle(): boolean {
		return false;
	}

	supportsDrill(): boolean {
		return false;
	}

	scopeRootForNode(_id: string): string | null {
		return null;
	}

	expandNodeById(_id: string): void {}

	revealNode(id: string, options?: { behavior?: ScrollBehavior }): boolean {
		if (!this.findNode(id)) return false;
		this.treeView?.scrollToId(id, 'start', options?.behavior ?? 'auto');
		return true;
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
					.setTitle(translate(next ? 'addons.enable' : 'addons.disable'))
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
		if (this.pendingToggleIds.has(meta.pluginId)) return;
		this.pendingToggleIds.add(meta.pluginId);
		this.rebuildNodes();
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
		} finally {
			this.pendingToggleIds.delete(meta.pluginId);
			if (!this.destroyed) this.rebuildNodes();
		}
	}
}
