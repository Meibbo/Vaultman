import { Component, Notice, setTooltip } from 'obsidian';
import type { VaultmanPlugin } from '../../main';
import { translate } from '../../i18n/index';
import type { PluginMeta, TreeNode, TreeNodeCell } from '../../types/typeTree';
import type { ExplorerSortState, ExplorerViewMode } from '../../types/typeUI';
import type { AddonCellStyle } from '../../types/typeSettings';
import type { FloatingTocExpansionChange } from '../../services/routerFloatingToc';
import type { IndexNodeRef } from '../../logic/logicIndexGroups';
import {
	deletionBadge,
	findDeletionMatch,
	queueDeletesSubject,
} from '../../logic/logicDeletionDecoration';
import {
	communityPluginStateSignature,
	listCommunityPluginEntries,
	pluginRibbonItem,
} from '../../utils/obsidianAddons';
import {
	getAddonIconOverride,
	readAddonIconOverrides,
	resolveAddonIcon,
} from '../../logic/logicAddonIcons';
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
	toggleCommunityPlugin,
} from '../../logic/logicAddonCells';
import {
	normalizeInteractionMode,
	type InteractionMode,
} from '../../logic/logicInteractionMode';

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
	private visibleCells = new Set(['checkbox', 'icon', 'text', 'state', 'config']);
	private emptyEl: HTMLElement | null = null;
	private destroyed = false;
	private refreshRevision = 0;
	private cellStyle: AddonCellStyle;
	private readonly pendingToggleIds = new Set<string>();
	private interactionMode: InteractionMode = 'open';
	private selectedNodeIds = new Set<string>();

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
		// BT5-019: external icon edits repaint through the existing adapter
		// event — no new timer — and the subscription is released on unload.
		const iconic = this.plugin.iconicService;
		if (iconic) {
			this.register(iconic.onChanged(this._scheduleIconRebuild));
		}
		// U121-076: uninstalls are queued now, so this scene has to repaint when
		// the queue moves. Snippets already did; Plugins never listened.
		this.plugin.queueService.on('changed', this._handleQueueChange);
		this.register(() =>
			this.plugin.queueService.off('changed', this._handleQueueChange),
		);
	}

	private readonly _handleQueueChange = (): void => {
		if (!this.destroyed) this.rebuildNodes();
	};

	private deletionBadges(pluginId: string) {
		const match = findDeletionMatch(
			{ kind: 'plugin', pluginId },
			this.plugin.queueService.queue,
		);
		return match ? [deletionBadge(match, { solid: true })] : undefined;
	}

	private deletionCls(pluginId: string): string | undefined {
		return queueDeletesSubject(
			{ kind: 'plugin', pluginId },
			this.plugin.queueService.queue,
		)
			? 'is-deleted-plugin'
			: undefined;
	}

	private _iconRebuildScheduled = false;

	/** Coalesce bursts of external icon changes into one rebuild. */
	private readonly _scheduleIconRebuild = (): void => {
		if (this.destroyed || this._iconRebuildScheduled) return;
		this._iconRebuildScheduled = true;
		window.setTimeout(() => {
			this._iconRebuildScheduled = false;
			if (!this.destroyed) this.rebuildNodes();
		}, 0);
	};

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

	/** BT4-022: hidden panes measure 0; re-render on activation. */
	refreshViewport(): void {
		this.treeView?.refreshViewport();
		this._syncExternalState();
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

	setInteractionMode(mode: InteractionMode): void {
		const normalized = normalizeInteractionMode('plugins', mode);
		if (this.interactionMode === normalized) return;
		this.interactionMode = normalized;
		this.render();
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
		// Read the override map once per rebuild, not once per row.
		const overrides = readAddonIconOverrides(this.plugin.settings);
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
			cells.push({
				id: 'state',
				kind: 'toggle',
				enabled: entry.enabled,
				style: this.cellStyle,
				label: translate(
					entry.enabled ? 'addons.enabled' : 'addons.disabled',
				),
				disabled: this.pendingToggleIds.has(entry.pluginId),
			});
			// BT5-019 precedence: Vaultman override > Iconic ribbon > plugin
			// emitted ribbon icon > generic plug (supersedes D35).
			const ribbon = pluginRibbonItem(this.plugin.app, entry.pluginId);
			const resolved = resolveAddonIcon({
				override: getAddonIconOverride(overrides, 'plugin', entry.pluginId),
				iconic: ribbon
					? this.plugin.iconicService?.getRibbonIcon(ribbon.id)
					: null,
				emitted: ribbon,
				fallback: 'lucide-plug',
			});
			return {
				id: `plugin:${entry.pluginId}`,
				label: entry.name,
				icon: resolved.icon,
				iconColor: resolved.color,
				typeText: entry.version,
				ctimeText: formatAddonTimestamp(entry.installedTime),
				mtimeText: formatAddonTimestamp(entry.updatedTime),
				badges: this.deletionBadges(entry.pluginId),
				cls: this.deletionCls(entry.pluginId),
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
			iconInCaretSlot: this.plugin.settings.iconInCaretSlot === true,
			expandedIds: new Set<string>(),
			...(this.interactionMode === 'select'
				? {
						selectedIds: this.selectedNodeIds,
						selectionCheckboxPosition:
							this.visibleCells.has('checkbox')
							? (this.plugin.settings.selectionCheckboxPosition ?? 'start')
							: 'hidden',
						onSelectionToggle: (id: string, selected: boolean) => {
							if (selected) this.selectedNodeIds.add(id);
							else this.selectedNodeIds.delete(id);
							this.render();
						},
					}
				: {}),
			onToggle: () => {},
			onRowClick: (id) => {
				if (this.interactionMode !== 'select') return;
				if (this.selectedNodeIds.has(id)) this.selectedNodeIds.delete(id);
				else this.selectedNodeIds.add(id);
				this.render();
			},
			onCellClick: (id, cellId) => {
				const node = this.findNode(id);
				if (!node) return;
				if (cellId === 'state') void this.toggle(node.meta);
				if (cellId === 'config') {
					openPluginSettings(this.plugin.app, node.meta.pluginId);
				}
			},
			rowTooltip: (node) => this.tooltip(node.meta as PluginMeta),
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
		this.plugin.contextMenuService.openPanelMenu(
			{
				nodeType: 'plugin',
				node: { id: meta.pluginId, label: meta.name, meta, depth: 0 },
				surface: 'panel',
			},
			event,
		);
	}

	private async toggle(meta: PluginMeta): Promise<void> {
		if (this.pendingToggleIds.has(meta.pluginId)) return;
		this.pendingToggleIds.add(meta.pluginId);
		this.rebuildNodes();
		let callerWillUnload = false;
		try {
			const changed = await toggleCommunityPlugin(this.plugin.app, meta);
			if (!changed) {
				new Notice(translate('addons.plugins.unavailable'));
				return;
			}
			callerWillUnload = meta.isVaultman && meta.enabled;
			if (!callerWillUnload && !this.destroyed) await this.refresh();
		} catch (error) {
			new Notice(translate('addons.plugins.failed'));
			console.error('Vaultman community plugin toggle failed', error);
		} finally {
			this.pendingToggleIds.delete(meta.pluginId);
			if (!callerWillUnload && !this.destroyed) this.rebuildNodes();
		}
	}
}
