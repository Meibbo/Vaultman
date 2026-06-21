// src/components/TagsExplorerPanel.ts
import { Component, App, Notice, setIcon } from 'obsidian';
import { TagsLogic } from '../../logic/logicTags';
import { FilterService } from '../../services/serviceFilter';
import { IconicService } from '../../services/serviceIcons';
import { ContextMenuService } from '../../services/serviceContextMenu';
import { OperationQueueService } from '../../services/serviceOperationQueue';
import type { StatisticsCacheService } from '../../services/serviceStatisticsCache';

export interface PanelPluginCtx {
	app: App;
	filterService: FilterService;
	iconicService?: IconicService;
	contextMenuService: ContextMenuService;
	queueService: OperationQueueService;
	settings?: {
		badgeCancelClickMode?: import('../../utils/badgeInteraction').BadgeCancelClickMode;
		explorerSearchHighlights?: boolean;
	};
	statisticsCache?: Pick<StatisticsCacheService, 'getFileTimes'>;
	showDragActionGuide?: (text: string) => void;
	clearDragActionGuide?: () => void;
}
import { UnifiedTreeView } from '../layout/viewTree';
import { NodeTableView } from '../layout/viewNodeTable';
import type { TreeNode, TagMeta } from '../../types/typeTree';
import type { MenuCtx } from '../../types/typeCMenu';
import { translate } from '../../i18n/index';
import { normalizeExplorerSortBy } from '../../logic/logicSort';
import {
	attachBadgeCancelInteraction,
	normalizeBadgeCancelClickMode,
} from '../../utils/badgeInteraction';
import {
	flattenTreeToPathLabels,
	groupRootHierarchy,
} from '../../logic/logicExplorerHierarchy';
import {
	readVaultmanDragPayload,
	setVaultmanDragPayload,
	type VaultmanDragNodePayload,
	withActiveFilterDragSelection,
} from '../../utils/dragPayload';

type DateSortId = 'mtime' | 'ctime';

function sameStringSet(a: Set<string>, b: Set<string>): boolean {
	if (a.size !== b.size) return false;
	for (const value of a) {
		if (!b.has(value)) return false;
	}
	return true;
}

export class TagsExplorerPanel extends Component {
	private plugin: PanelPluginCtx;
	private logic: TagsLogic;
	private containerEl: HTMLElement;
	private view: UnifiedTreeView;
	private tableView: NodeTableView<TagMeta> | null = null;
	private expandedIds = new Set<string>();
	private searchTerm = '';
	private searchMode: 'all' | 'leaf' = 'all';
	private editingId: string | null = null;
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private sortChildLevel = false;
	private nodeTypeFilter: string | null = null;
	private viewMode: 'tree' | 'grid' | 'table' = 'tree';
	private visibleCells = new Set<string>(['icon', 'text', 'count', 'nested']);
	private onExpansionChange?: () => void;

	constructor(containerEl: HTMLElement, plugin: PanelPluginCtx) {
		super();
		this.plugin = plugin;
		this.logic = new TagsLogic(plugin.app);
		this.containerEl = containerEl;
		this.view = new UnifiedTreeView(containerEl);
	}

	onload(): void {
		// Register context menu actions through the service
		const svc = this.plugin.contextMenuService;

		svc.registerAction({
			id: 'tag.rename',
			nodeTypes: ['tag'],
			surfaces: ['panel', 'file-menu'],
			label: 'Rename',
			icon: 'lucide-pencil',
			run: (ctx: MenuCtx) => {
				this.editingId = ctx.node.id;
				this._render();
			},
		});

		svc.registerAction({
			id: 'tag.delete',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			label: 'Delete',
			icon: 'lucide-trash-2',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as TagMeta;
				return this._deleteTag(meta.tagPath);
			},
		});

		this.registerEvent(
			this.plugin.app.metadataCache.on('resolved', () => {
				this.logic.invalidate();
				this._render();
			}),
		);
		// Re-render after Iconic finishes loading
		this.plugin.iconicService?.onLoaded(() => this._render());

		// Re-render dynamically when filters or queues change
		this.plugin.filterService.on('changed', this._handleStateChange);
		this.plugin.queueService.on('changed', this._handleStateChange);
		this.containerEl.addEventListener('dragover', this._handleRootTagDragOver);
		this.containerEl.addEventListener('drop', this._handleRootTagDrop);

		this._render();
	}

	onunload(): void {
		this.plugin.filterService.off('changed', this._handleStateChange);
		this.plugin.queueService.off('changed', this._handleStateChange);
		this.containerEl.removeEventListener(
			'dragover',
			this._handleRootTagDragOver,
		);
		this.containerEl.removeEventListener('drop', this._handleRootTagDrop);
		this.view.destroy();
		this.tableView?.destroy();
		super.onunload();
	}

	private addMode = false;

	setAddMode(active: boolean): void {
		this.addMode = active;
	}

	private readonly _handleStateChange = () => this._render();

	setSearchTerm(term: string, mode: 'all' | 'leaf' = 'all'): void {
		if (this.searchTerm === term && this.searchMode === mode) return;
		this.searchTerm = term;
		this.searchMode = mode;
		this._render();
	}

	setSortBy(
		sortBy: string,
		direction: 'asc' | 'desc',
		childLevel = false,
		nodeTypeFilter: string | null = null,
	): void {
		const normalizedSortBy = normalizeExplorerSortBy(sortBy);
		if (
			this.sortBy === normalizedSortBy &&
			this.sortDir === direction &&
			this.sortChildLevel === childLevel &&
			this.nodeTypeFilter === nodeTypeFilter
		) {
			return;
		}
		this.sortBy = normalizedSortBy;
		this.sortDir = direction;
		this.sortChildLevel = childLevel;
		this.nodeTypeFilter = nodeTypeFilter;
		this._render();
	}

	setViewMode(mode: 'tree' | 'grid' | 'table'): void {
		if (this.viewMode === mode) return;
		this.viewMode = mode;
		if (mode === 'tree') {
			this.tableView?.destroy();
			this.view.destroy();
			this.containerEl.empty();
			this.view = new UnifiedTreeView(this.containerEl);
		} else {
			this.view.destroy();
			if (mode === 'grid') {
				this.tableView?.destroy();
				this.containerEl.empty();
			}
		}
		this._render();
	}

	setVisibleCells(cells: Set<string>): void {
		if (sameStringSet(this.visibleCells, cells)) return;
		this.visibleCells = new Set(cells);
		this._render();
	}

	hasExpandedNodes(): boolean {
		return this._nestedEnabled() && this.expandedIds.size > 0;
	}

	setExpansionChangeHandler(handler?: () => void): void {
		this.onExpansionChange = handler;
	}

	expandAll(): void {
		if (!this._nestedEnabled()) return;
		let tree = this.logic.getTree();
		if (this.searchMode === 'leaf') {
			tree = this._collectLeaves(tree);
		}
		if (this.nodeTypeFilter) {
			tree = this._filterByNodeType(tree, this.nodeTypeFilter);
		}
		if (this.searchTerm) {
			tree = this.logic.filterTree(tree, this.searchTerm);
		}
		this._expandAll(tree);
		this._notifyExpansionChanged();
		this._render();
	}

	collapseAll(): void {
		this.expandedIds.clear();
		this._notifyExpansionChanged();
		this._render();
	}

	private _sortNodes(
		nodes: TreeNode<TagMeta>[],
		timeIndex: Map<string, number> | null,
	): TreeNode<TagMeta>[] {
		const dir = this.sortDir === 'asc' ? 1 : -1;
		const normalizedSortBy = normalizeExplorerSortBy(this.sortBy);
		if (
			(normalizedSortBy === 'mtime' || normalizedSortBy === 'ctime') &&
			timeIndex
		) {
			return [...nodes].sort(
				(a, b) =>
					dir *
					((timeIndex.get(a.meta.tagPath) ?? 0) -
						(timeIndex.get(b.meta.tagPath) ?? 0)),
			);
		}
		return [...nodes].sort((a, b) => {
			if (normalizedSortBy === 'count')
				return dir * ((a.count ?? 0) - (b.count ?? 0));
			if (normalizedSortBy === 'sub')
				return dir * ((a.children?.length ?? 0) - (b.children?.length ?? 0));
			return dir * a.label.localeCompare(b.label);
		});
	}

	private _applySort(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const normalizedSortBy = normalizeExplorerSortBy(this.sortBy);
		const timeIndex =
			normalizedSortBy === 'mtime' || normalizedSortBy === 'ctime'
				? this._buildTagTimeIndex(normalizedSortBy)
				: null;
		if (!this.sortChildLevel) {
			return this._sortNodes(nodes, timeIndex).map((node) => ({
				...node,
				children: node.children ? [...node.children] : [],
			}));
		}

		return nodes.map((node) => ({
			...node,
			children: node.children ? this._sortNodes(node.children, timeIndex) : [],
		}));
	}

	private _buildTagTimeIndex(sortBy: DateSortId): Map<string, number> {
		const index = new Map<string, number>();
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			const time =
				this.plugin.statisticsCache?.getFileTimes(file)?.[sortBy] ??
				file.stat[sortBy] ??
				0;
			const tags = new Set<string>();
			const frontmatterTags = cache?.frontmatter?.tags as unknown;
			if (Array.isArray(frontmatterTags)) {
				for (const tag of frontmatterTags) {
					const clean = String(tag).replace(/^#/, '');
					if (clean) tags.add(clean);
				}
			} else if (typeof frontmatterTags === 'string') {
				const clean = frontmatterTags.replace(/^#/, '');
				if (clean) tags.add(clean);
			}
			for (const tag of cache?.tags ?? []) {
				const clean = tag.tag.replace(/^#/, '');
				if (clean) tags.add(clean);
			}
			for (const tag of tags) {
				if (time > (index.get(tag) ?? 0)) index.set(tag, time);
			}
		}
		return index;
	}

	private _expandAll(nodes: TreeNode<TagMeta>[]): void {
		for (const n of nodes) {
			if (n.children && n.children.length > 0) {
				this.expandedIds.add(n.id);
				this._expandAll(n.children);
			}
		}
	}

	private _notifyExpansionChanged(): void {
		this.onExpansionChange?.();
	}

	private _render(): void {
		let tree = this.logic.getTree();

		if (this.searchMode === 'leaf') {
			tree = this._collectLeaves(tree);
		}
		if (this.nodeTypeFilter) {
			tree = this._filterByNodeType(tree, this.nodeTypeFilter);
		}
		if (this.searchTerm) {
			tree = this.logic.filterTree(tree, this.searchTerm);
			this._expandAll(tree);
		}
		tree = this._applySort(tree);
		const searchHighlightsEnabled =
			this.plugin.settings?.explorerSearchHighlights === true;

		const activeFilterIds = new Set<string>();
		for (const node of this._flattenTree(tree)) {
			if (this.plugin.filterService.hasTagFilter(`#${node.meta.tagPath}`)) {
				activeFilterIds.add(node.id);
			}
		}

		// For highlighting search text specifically on matching nodes
		interface ObsMetadataCache {
			prepareSimpleSearch?(query: string): (text: string) => unknown;
		}
		const cache = this.plugin.app.metadataCache as unknown as ObsMetadataCache;
		let searchFunc: ((text: string) => unknown) | null = null;
		if (this.searchTerm && searchHighlightsEnabled) {
			searchFunc = cache.prepareSimpleSearch
				? cache.prepareSimpleSearch(this.searchTerm)
				: (text: string) =>
						text.toLowerCase().includes(this.searchTerm.toLowerCase())
							? {}
							: null;
		}

		const highlightIds = new Set<string>();

		// Resolve icons via Iconic
		let nodesWithIcons = this._resolveIcons(tree, highlightIds, searchFunc);
		if (!this._nestedEnabled()) {
			nodesWithIcons = flattenTreeToPathLabels(nodesWithIcons);
		}
		if (nodesWithIcons.length === 0) {
			this._renderEmptyState();
			return;
		}

		if (this.viewMode === 'grid') {
			this._renderGrid(nodesWithIcons, activeFilterIds, highlightIds);
			return;
		}

		if (this.viewMode === 'table') {
			if (!this.tableView) {
				this.tableView = new NodeTableView<TagMeta>(this.containerEl);
			}
			this.tableView.render({
				surface: 'tags',
				nodes: nodesWithIcons,
				expandedIds: this.expandedIds,
				visibleCells: this.visibleCells,
				activeFilterIds,
				searchHighlightIds: highlightIds,
				onToggle: (id: string) => {
					if (this.expandedIds.has(id)) this.expandedIds.delete(id);
					else this.expandedIds.add(id);
					this._notifyExpansionChanged();
					void this._render();
				},
				onRowClick: (id: string) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					this._handleNodeClick(node);
				},
				onContextMenu: (id: string, event: MouseEvent) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					this.plugin.contextMenuService.openPanelMenu(
						{ nodeType: 'tag', node, surface: 'panel' },
						event,
					);
				},
				onDragStart: (id: string, event: DragEvent) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					setVaultmanDragPayload(
						event,
						withActiveFilterDragSelection(
							{
								kind: 'tag',
								tagPath: node.meta.tagPath,
							},
							this.plugin.filterService.activeFilter,
							'tags',
						),
					);
				},
				onDragOver: (id: string, event: DragEvent) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					this._handleTagDragOver(node, event);
				},
				onDrop: (id: string, event: DragEvent) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					this._handleTagDrop(node, event);
				},
				onBadgeDoubleClick: (queueIndex: number) => {
					this.plugin.queueService.remove(queueIndex);
					void this._render();
				},
				badgeCancelClickMode: this.plugin.settings?.badgeCancelClickMode,
			});
			return;
		}

		this.view.render({
			nodes: nodesWithIcons,
			expandedIds: this.expandedIds,
			visibleCells: this.visibleCells,
			activeFilterIds,
			searchHighlightIds: highlightIds,
			editingId: this.editingId,
			onRename: (id, newLabel) => {
				const node = this._findNode(id, tree);
				if (node) void this._renameTag(node.meta.tagPath, newLabel);
				this.editingId = null;
				void this._render();
			},
			onCancelRename: () => {
				this.editingId = null;
				this._render();
			},
			onToggle: (id: string) => {
				if (this.expandedIds.has(id)) this.expandedIds.delete(id);
				else this.expandedIds.add(id);
				this._notifyExpansionChanged();
				void this._render();
			},
			onRowClick: (id: string) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				const meta = node.meta;

				// ADD MODE: queue add-tag operation instead of toggling filter
				if (this.addMode) {
					this.plugin.queueService.addOrRun({
						type: 'tag',
						tag: meta.tagPath,
						action: 'add',
						details: `Add tag "#${meta.tagPath}"`,
						files: this.plugin.filterService.filteredFiles,
						customLogic: true,
						logicFunc: (_file, fm) => {
							const raw: unknown = fm.tags;
							const existing: string[] = Array.isArray(raw)
								? (raw as unknown[]).map((v) => String(v))
								: typeof raw === 'string'
									? [raw]
									: [];
							if (existing.includes(meta.tagPath)) return null;
							fm.tags = [...existing, meta.tagPath];
							return fm;
						},
					});
					return;
				}

				this._toggleTagFilter(meta.tagPath);
			},
			onContextMenu: (id: string, e: MouseEvent) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				this.plugin.contextMenuService.openPanelMenu(
					{ nodeType: 'tag', node, surface: 'panel' },
					e,
				);
			},
			onDragStart: (id: string, event: DragEvent) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				setVaultmanDragPayload(
					event,
					withActiveFilterDragSelection(
						{
							kind: 'tag',
							tagPath: node.meta.tagPath,
						},
						this.plugin.filterService.activeFilter,
						'tags',
					),
				);
			},
			onDragOver: (id: string, event: DragEvent) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				this._handleTagDragOver(node, event);
			},
			onDrop: (id: string, event: DragEvent) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				this._handleTagDrop(node, event);
			},
			onBadgeDoubleClick: (queueIndex: number) => {
				this.plugin.queueService.remove(queueIndex);
				void this._render();
			},
			badgeCancelClickMode: this.plugin.settings?.badgeCancelClickMode,
		});
	}

	private _toggleTagFilter(tagPath: string): void {
		const tagId = `#${tagPath}`;
		if (this.plugin.filterService.hasTagFilter(tagId)) {
			void this.plugin.filterService.removeNodeByTag(tagId);
			return;
		}

		void this.plugin.filterService.addNode({
			type: 'rule',
			filterType: 'has_tag',
			property: '',
			values: [tagId],
		});
	}

	private _handleNodeClick(node: TreeNode<TagMeta>): void {
		const meta = node.meta;
		if (this.addMode) {
			this.plugin.queueService.addOrRun({
				type: 'tag',
				tag: meta.tagPath,
				action: 'add',
				details: `Add tag "#${meta.tagPath}"`,
				files: this.plugin.filterService.filteredFiles,
				customLogic: true,
				logicFunc: (_file, fm) => {
					const raw: unknown = fm.tags;
					const existing: string[] = Array.isArray(raw)
						? (raw as unknown[]).map((v) => String(v))
						: typeof raw === 'string'
							? [raw]
							: [];
					if (existing.includes(meta.tagPath)) return null;
					fm.tags = [...existing, meta.tagPath];
					return fm;
				},
			});
			return;
		}
		this._toggleTagFilter(meta.tagPath);
	}

	private _renderGridBadges(
		parent: HTMLElement,
		node: TreeNode<TagMeta>,
	): void {
		if (
			(!node.badges || node.badges.length === 0) &&
			(!node.count || node.count <= 0 || !this.visibleCells.has('count'))
		) {
			return;
		}
		const badgeZone = parent.createDiv({
			cls: 'vaultman-tree-badge-zone vaultman-card-badge-zone',
		});
		for (const badge of node.badges ?? []) {
			const bEl = badgeZone.createSpan({ cls: 'vaultman-badge' });
			if (badge.solid && badge.color)
				bEl.addClass(`vaultman-badge--${badge.color}`);
			if (badge.solid) bEl.addClass('is-solid');
			if (badge.isInherited) bEl.addClass('is-inherited');
			if (badge.icon) {
				const iconEl = bEl.createSpan({ cls: 'vaultman-badge-icon' });
				setIcon(iconEl, badge.icon);
			}
			if (badge.text) bEl.setAttribute('title', badge.text);
			if (badge.queueIndex !== undefined) {
				const badgeCancelClickMode = normalizeBadgeCancelClickMode(
					this.plugin.settings?.badgeCancelClickMode,
				);
				bEl.addClass('is-undoable');
				attachBadgeCancelInteraction(bEl, badgeCancelClickMode, () => {
					this.plugin.queueService.remove(badge.queueIndex!);
					this._render();
				});
			}
		}
		if (this.visibleCells.has('count') && node.count && node.count > 0) {
			badgeZone.createSpan({
				cls: 'vaultman-tree-count',
				text: String(node.count),
			});
		}
	}

	private _renderGrid(
		tree: TreeNode<TagMeta>[],
		activeFilterIds: Set<string>,
		highlightIds: Set<string>,
	): void {
		this.containerEl.empty();
		const flatNodes = this._flattenTree(tree);
		const grid = this.containerEl.createDiv({ cls: 'vaultman-tags-grid' });

		for (const node of flatNodes) {
			const card = grid.createDiv({ cls: 'vaultman-tag-card' });
			if (typeof node.cls === 'string' && node.cls.trim()) {
				for (const c of node.cls.trim().split(/\s+/)) card.addClass(c);
			}
			card.toggleClass('is-active-filter', activeFilterIds.has(node.id));
			card.toggleClass('vaultman-search-highlight', highlightIds.has(node.id));
			card.setAttribute('role', 'button');
			card.draggable = true;
			card.setAttribute('tabindex', '0');
			card.setAttribute('aria-label', node.meta.tagPath);

			if (this.visibleCells.has('icon')) {
				const iconEl = card.createDiv({ cls: 'vaultman-tag-card-icon' });
				setIcon(iconEl, node.icon ?? 'lucide-tag');
			}
			if (this.visibleCells.has('text')) {
				card.createDiv({ cls: 'vaultman-tag-card-name', text: node.label });
			}
			if (this.visibleCells.has('nested') && node.children?.length) {
				card.createDiv({
					cls: 'vaultman-tag-card-meta',
					text: String(node.children.length),
				});
			}
			this._renderGridBadges(card, node);

			card.addEventListener('click', () => this._handleNodeClick(node));
			card.addEventListener('dragstart', (event) =>
				setVaultmanDragPayload(
					event,
					withActiveFilterDragSelection(
						{
							kind: 'tag',
							tagPath: node.meta.tagPath,
						},
						this.plugin.filterService.activeFilter,
						'tags',
					),
				),
			);
			card.addEventListener('dragover', (event) =>
				this._handleTagDragOver(node, event),
			);
			card.addEventListener('drop', (event) =>
				this._handleTagDrop(node, event),
			);
			card.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					this._handleNodeClick(node);
				}
			});
			card.addEventListener('contextmenu', (event) => {
				event.preventDefault();
				this.plugin.contextMenuService.openPanelMenu(
					{ nodeType: 'tag', node, surface: 'panel' },
					event,
				);
			});
		}

		if (flatNodes.length === 0) {
			this._renderEmptyState();
		}
	}

	private _handleTagDragOver(
		targetNode: TreeNode<TagMeta>,
		event: DragEvent,
	): void {
		const payload = readVaultmanDragPayload(event);
		if (!payload) return;
		const tagPaths = this._dragTagPaths(payload);
		if (!tagPaths.some((path) => path !== targetNode.meta.tagPath))
			return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
		this.plugin.showDragActionGuide?.(
			`Move ${tagPaths.length === 1 ? 'tag' : 'tags'} under #${targetNode.meta.tagPath}`,
		);
	}

	private _handleTagDrop(
		targetNode: TreeNode<TagMeta>,
		event: DragEvent,
	): void {
		const payload = readVaultmanDragPayload(event);
		if (!payload) return;
		event.preventDefault();
		event.stopPropagation();
		this.plugin.clearDragActionGuide?.();
		void this._nestDraggedTags(payload, targetNode.meta.tagPath);
	}

	private readonly _handleRootTagDragOver = (event: DragEvent): void => {
		if (this._isRowDropTarget(event.target)) return;
		const payload = readVaultmanDragPayload(event);
		if (!payload) return;
		const tagPaths = this._dragTagPaths(payload).filter((path) =>
			path.includes('/'),
		);
		if (tagPaths.length === 0) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
		this.plugin.showDragActionGuide?.(
			`Move ${tagPaths.length === 1 ? `#${tagPaths[0]}` : `${tagPaths.length} tags`} to root`,
		);
	};

	private readonly _handleRootTagDrop = (event: DragEvent): void => {
		if (this._isRowDropTarget(event.target)) return;
		const payload = readVaultmanDragPayload(event);
		if (!payload) return;
		const tagPaths = this._dragTagPaths(payload).filter((path) =>
			path.includes('/'),
		);
		if (tagPaths.length === 0) return;
		event.preventDefault();
		event.stopPropagation();
		this.plugin.clearDragActionGuide?.();
		void this._nestDraggedTags(payload, '');
	};

	private _isRowDropTarget(target: EventTarget | null): boolean {
		if (typeof HTMLElement === 'undefined') return false;
		if (!(target instanceof HTMLElement)) return false;
		return Boolean(
			target.closest(
				'.vaultman-tree-row, .vaultman-node-table-row, .vaultman-tag-card',
			),
		);
	}

	private async _nestDraggedTags(
		payload: VaultmanDragNodePayload & { selection?: VaultmanDragNodePayload[] },
		targetTagPath: string,
	): Promise<void> {
		const tagPaths = this._dragTagPaths(payload);
		for (const tagPath of tagPaths) {
			if (tagPath === targetTagPath) continue;
			if (targetTagPath.startsWith(`${tagPath}/`)) continue;
			const leaf = tagPath.split('/').filter(Boolean).pop() ?? tagPath;
			const nestedPath = targetTagPath ? `${targetTagPath}/${leaf}` : leaf;
			if (tagPath === nestedPath) continue;
			await this._renameTag(tagPath, nestedPath);
		}
	}

	private _dragTagPaths(
		payload: VaultmanDragNodePayload & { selection?: VaultmanDragNodePayload[] },
	): string[] {
		const nodes = payload.selection?.length ? payload.selection : [payload];
		return nodes
			.filter((node): node is Extract<VaultmanDragNodePayload, { kind: 'tag' }> =>
				node.kind === 'tag',
			)
			.map((node) => node.tagPath);
	}

	private _renderEmptyState(): void {
		this.view.destroy();
		this.tableView?.destroy();
		this.containerEl.empty();
		const emptyEl = this.containerEl.createDiv({
			cls: 'vaultman-explorer-empty-landing',
		});
		emptyEl.createDiv({
			cls: 'vaultman-explorer-empty-title',
			text: translate('explorer.tags.empty_title'),
		});
		emptyEl.createDiv({
			cls: 'vaultman-explorer-empty-desc',
			text: this.searchTerm
				? translate('explorer.tags.empty_search_desc')
				: translate('explorer.tags.empty_desc'),
		});
	}

	private _resolveIcons(
		nodes: TreeNode<TagMeta>[],
		highlightIds: Set<string>,
		searchFunc: ((text: string) => unknown) | null,
		parentDeleted = false,
	): TreeNode<TagMeta>[] {
		const queue = this.plugin.queueService.queue;

		return nodes.map((node) => {
			const meta = node.meta;
			const currentCls = node.cls || '';

			// Highlight System
			if (searchFunc && searchFunc(node.label)) {
				highlightIds.add(node.id);
			}

			const relevantOps = queue.filter(
				(op): op is import('../../types/typeOps').TagChange =>
					op.type === 'tag' && op.tag === meta.tagPath,
			);

			const isDeletedInQueue = relevantOps.some((op) => op.action === 'delete');
			const isEffectivelyDeleted = parentDeleted || isDeletedInQueue;

			const cls = isEffectivelyDeleted
				? (currentCls + ' is-deleted-tag').trim()
				: currentCls;

			const resolvedChildren = node.children
				? this._resolveIcons(
						node.children,
						highlightIds,
						searchFunc,
						isEffectivelyDeleted,
					)
				: [];

			const badges: import('../../types/typeTree').NodeBadge[] = [];
			for (const op of relevantOps) {
				const opIdx = queue.indexOf(op);
				if (op.action === 'delete') {
					badges.push({
						text: 'Delete',
						icon: 'lucide-trash-2',
						color: 'red',
						queueIndex: opIdx,
					});
				} else if (op.action === 'rename') {
					badges.push({
						text: 'Update',
						icon: 'lucide-pencil',
						color: 'blue',
						queueIndex: opIdx,
					});
				} else if (op.action === 'add') {
					badges.push({
						text: 'Add',
						icon: 'lucide-plus',
						color: 'green',
						queueIndex: opIdx,
					});
				} else
					badges.push({
						text: 'In Queue',
						icon: 'lucide-clock',
						color: 'purple',
						queueIndex: opIdx,
					});
			}

			// BUBBLE UP child badges if parent is collapsed
			const isExpanded = this.expandedIds.has(node.id);
			if (!isExpanded && resolvedChildren.length > 0) {
				const childBadges = resolvedChildren.flatMap((c) => c.badges || []);
				const seen = new Set<string>();
				for (const b of childBadges) {
					const key = `${b.text}-${b.icon}`;
					if (!seen.has(key)) {
						badges.push({ ...b, isInherited: true });
						seen.add(key);
					}
				}
			}

			return {
				...node,
				cls: cls,
				icon:
					this.plugin.iconicService?.getTagIcon(meta.tagPath)?.icon ??
					'lucide-tag',
				badges: badges,
				children: resolvedChildren,
			};
		});
	}

	private async _renameTag(tagPath: string, newName: string): Promise<void> {
		if (!newName || newName === tagPath) return;
		this.plugin.queueService.addOrRun({
			type: 'tag',
			tag: tagPath,
			action: 'rename',
			details: `Rename tag "#${tagPath}" to "#${newName}"`,
			files: this._getFilesWithTag(tagPath),
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (!fm.tags) return null;
				const raw: unknown = fm.tags;
				const tags: string[] = Array.isArray(raw)
					? (raw as unknown[]).map((v) => String(v))
					: typeof raw === 'string'
						? [raw]
						: [];

				const newTags = tags.map((t: string) => {
					const cleanT = t.startsWith('#') ? t.slice(1) : t;
					return cleanT === tagPath ? newName : t;
				});
				fm.tags = newTags;
				return fm;
			},
		});
		this.logic.invalidate();
		this._render();
	}

	private async _deleteTag(tagPath: string): Promise<void> {
		this.plugin.queueService.addOrRun({
			type: 'tag',
			tag: tagPath,
			action: 'delete',
			details: `Delete tag "#${tagPath}"`,
			files: this._getFilesWithTag(tagPath),
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (!fm.tags) return null;
				const raw: unknown = fm.tags;
				const tags: string[] = Array.isArray(raw)
					? (raw as unknown[]).map((v) => String(v))
					: typeof raw === 'string'
						? [raw]
						: [];
				const filtered = tags.filter(
					(t: string) => t !== tagPath && t !== `#${tagPath}`,
				);
				fm.tags = filtered.length > 0 ? filtered : undefined;
				return fm;
			},
		});
		this.logic.invalidate();
		this._render();
	}

	createFromSearch(term: string): void {
		const tagPath = term.trim().replace(/^#/, '').replace(/\s+/g, '-');
		if (!tagPath) {
			this.addMode = true;
			new Notice('Select a tag to stage it');
			return;
		}
		this.plugin.queueService.addOrRun({
			type: 'tag',
			tag: tagPath,
			action: 'add',
			details: `Add tag "#${tagPath}"`,
			files: this.plugin.filterService.filteredFiles,
			customLogic: true,
			logicFunc: (_file, fm) => {
				const raw: unknown = fm.tags;
				const existing: string[] = Array.isArray(raw)
					? (raw as unknown[]).map((v) => String(v))
					: typeof raw === 'string'
						? [raw]
						: [];
				if (existing.includes(tagPath)) return null;
				fm.tags = [...existing, tagPath];
				return fm;
			},
		});
		this.logic.invalidate();
		this._render();
	}

	private _collectLeaves(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const leaves: TreeNode<TagMeta>[] = [];
		const walk = (ns: TreeNode<TagMeta>[]) => {
			for (const n of ns) {
				if (!n.children || n.children.length === 0)
					leaves.push({ ...n, children: [] });
				else walk(n.children);
			}
		};
		walk(nodes);
		return leaves;
	}

	private _collectNested(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		return groupRootHierarchy(nodes, 'nested');
	}

	private _filterByNodeType(
		nodes: TreeNode<TagMeta>[],
		nodeTypeFilter: string,
	): TreeNode<TagMeta>[] {
		if (nodeTypeFilter === 'simple') return groupRootHierarchy(nodes, 'simple');
		if (nodeTypeFilter === 'nested') return this._collectNested(nodes);
		return nodes;
	}

	private _nestedEnabled(): boolean {
		return this.visibleCells.has('nested');
	}

	private _findNode(
		id: string,
		nodes: TreeNode<TagMeta>[],
	): TreeNode<TagMeta> | null {
		for (const n of nodes) {
			if (n.id === id) return n;
			if (n.children) {
				const found = this._findNode(id, n.children);
				if (found) return found;
			}
		}
		return null;
	}

	private _flattenTree(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const result: TreeNode<TagMeta>[] = [];
		for (const n of nodes) {
			result.push(n);
			if (n.children) result.push(...this._flattenTree(n.children));
		}
		return result;
	}

	private _getFilesWithTag(tagPath: string): import('obsidian').TFile[] {
		return this.plugin.app.vault.getMarkdownFiles().filter((file) => {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			const fmTags = cache?.frontmatter?.tags as unknown;
			const frontmatterTags = Array.isArray(fmTags)
				? fmTags.map((tag) => String(tag))
				: typeof fmTags === 'string'
					? [fmTags]
					: [];
			const inlineTags = (cache?.tags ?? []).map((tag) => tag.tag);
			return (
				frontmatterTags.some(
					(tag) => tag === tagPath || tag === `#${tagPath}`,
				) || inlineTags.some((tag) => tag === tagPath || tag === `#${tagPath}`)
			);
		});
	}

}
