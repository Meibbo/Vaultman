import { Component, Menu, Notice, setTooltip } from 'obsidian';
import type { VaultmanPlugin } from '../../main';
import { translate } from '../../i18n/index';
import type { SnippetMeta, TreeNode } from '../../types/typeTree';
import type { ExplorerSortState, ExplorerViewMode } from '../../types/typeUI';
import type { AddonCellStyle } from '../../types/typeSettings';
import type { FloatingTocExpansionChange } from '../../services/routerFloatingToc';
import type { IndexNodeRef } from '../../logic/logicIndexGroups';
import {
	cssSnippetStateSignature,
	listCssSnippetEntries,
	setCssSnippetEnabled,
} from '../../utils/obsidianAddons';
import {
	clearAddonIconOverride,
	getAddonIconOverride,
	readAddonIconOverrides,
	resolveAddonIcon,
	setAddonIconOverride,
	writeAddonIconOverrides,
} from '../../logic/logicAddonIcons';
import { openAddonIconPicker } from '../../modals/modalAddonIconPicker';
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
import { normalizeAddonCellStyle } from '../../logic/logicAddonCells';

export class SnippetsExplorerPanel
	extends Component
	implements AddonExplorerPanelPort
{
	private readonly containerEl: HTMLElement;
	private readonly plugin: VaultmanPlugin;
	private treeView: UnifiedTreeView | null = null;
	private nodes: TreeNode<SnippetMeta>[] = [];
	private entries: SnippetMeta[] = [];
	private searchTerm = '';
	private sortState = normalizeExplorerSortState('snippets', null);
	private visibleCells = new Set(['icon', 'text', 'state']);
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
		// Snippet toggles made in core Settings surface as css-change; the poll
		// is the fallback for silent state changes (BT4-006).
		this.registerEvent(
			this.plugin.app.workspace.on('css-change', () => {
				void this.refresh();
			}),
		);
		this.registerInterval(
			window.setInterval(() => this._syncExternalState(), 2500),
		);
		// BT5-019: Iconic never resolves snippets, but its adapter also fires
		// when the icon library itself changes; repaint through that existing
		// event (no new timer) and release the subscription on unload.
		const iconic = this.plugin.iconicService;
		if (iconic) {
			this.register(iconic.onChanged(this._scheduleIconRebuild));
		}
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
		const signature = cssSnippetStateSignature(this.plugin.app);
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
		this._lastExternalSignature = cssSnippetStateSignature(this.plugin.app);
		const entries = await listCssSnippetEntries(this.plugin.app);
		if (this.destroyed || revision !== this.refreshRevision) return;
		this.entries = entries;
		this.rebuildNodes();
	}

	setSearchTerm(term: string): void {
		if (this.searchTerm === term) return;
		this.searchTerm = term;
		this.rebuildNodes();
	}

	setSortState(state: ExplorerSortState): void {
		const normalized = normalizeExplorerSortState('snippets', state);
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
			(entry) => entry.name,
		);
		const entries = sortAddonEntries(
			filtered,
			activeScopeSort('snippets', this.sortState),
		);
		// Read the override map once per rebuild, not once per row.
		const overrides = readAddonIconOverrides(this.plugin.settings);
		this.nodes = entries.map((entry) => ({
			id: `snippet:${entry.name}`,
			label: entry.name,
			// BT5-019: Iconic has no snippet item-kind and a snippet emits no
			// icon of its own, so the chain here is override > fallback. The
			// shared resolver still owns the decision.
			icon: resolveAddonIcon({
				override: getAddonIconOverride(overrides, 'snippet', entry.name),
				iconic: null,
				emitted: null,
				fallback: 'lucide-file-code',
			}).icon,
			iconColor: getAddonIconOverride(overrides, 'snippet', entry.name)?.color,
			ctimeText: formatAddonTimestamp(entry.installedTime),
			mtimeText: formatAddonTimestamp(entry.updatedTime),
			depth: 0,
			cells: [
				{
					id: 'state',
					kind: 'toggle',
					enabled: entry.enabled,
					style: this.cellStyle,
					label: translate(
						entry.enabled ? 'addons.enabled' : 'addons.disabled',
					),
					disabled: this.pendingToggleIds.has(entry.name),
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
			visibleCells: this.visibleCells,
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onCellClick: (id, cellId) => {
				if (cellId !== 'state') return;
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
		this.onIndexChanged?.();
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
		return buildAddonHoverInfo(
			{
				name: meta.name,
				installed: formatAddonTimestamp(meta.installedTime),
				updated: formatAddonTimestamp(meta.updatedTime),
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
			'snippets',
			activeScopeSort('snippets', this.sortState).sortBy,
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

	private openIconPicker(meta: SnippetMeta): void {
		const overrides = readAddonIconOverrides(this.plugin.settings);
		openAddonIconPicker({
			app: this.plugin.app,
			name: meta.name,
			hasOverride:
				getAddonIconOverride(overrides, 'snippet', meta.name) !== null,
			onPick: (icon) =>
				this.persistOverrides(
					setAddonIconOverride(overrides, 'snippet', meta.name, { icon }),
				),
			onReset: () =>
				this.persistOverrides(
					clearAddonIconOverride(overrides, 'snippet', meta.name),
				),
		});
	}

	/** One save per human action; the rebuild repaints from the new store. */
	private async persistOverrides(
		store: ReturnType<typeof readAddonIconOverrides>,
	): Promise<void> {
		writeAddonIconOverrides(this.plugin.settings, store);
		await this.plugin.saveSettings();
		if (!this.destroyed) this.rebuildNodes();
	}

	private openMenu(meta: SnippetMeta, event: MouseEvent): void {
		const next = !meta.enabled;
		new Menu()
			.addItem((item) =>
				item
					.setTitle(translate('addon.icon.change'))
					.setIcon('lucide-image')
					.onClick(() => this.openIconPicker(meta)),
			)
			.addItem((item) =>
				item
					.setTitle(translate(next ? 'addons.enable' : 'addons.disable'))
					.setIcon(next ? 'lucide-toggle-right' : 'lucide-toggle-left')
					.onClick(() => void this.toggle(meta)),
			)
			.showAtMouseEvent(event);
	}

	private async toggle(meta: SnippetMeta): Promise<void> {
		if (this.pendingToggleIds.has(meta.name)) return;
		this.pendingToggleIds.add(meta.name);
		this.rebuildNodes();
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
		} finally {
			this.pendingToggleIds.delete(meta.name);
			if (!this.destroyed) this.rebuildNodes();
		}
	}
}
