// src/components/TagsExplorerPanel.ts
import { Component, App, Keymap, Notice, setIcon } from 'obsidian';
import { TagsLogic } from '../../logic/logicTags';
import { DeferredExplorerRender } from '../../logic/logicDeferredExplorerRender';
import {
	DeferredFilterClickCoordinator,
	filterStateToPolarity,
	type FilterPolarity,
} from '../../logic/logicFilterPolarity';
import { FilterService } from '../../services/serviceFilter';
import { IconicService } from '../../services/serviceIcons';
import { ContextMenuService } from '../../services/serviceContextMenu';
import { OperationQueueService } from '../../services/serviceOperationQueue';
import type { StatisticsCacheService } from '../../services/serviceStatisticsCache';
import type { RevealNodeOptions } from '../../services/routerFloatingToc';
import {
	nodeTypeFilterPatch,
	normalizeNodeTypeFilters,
	sameNodeTypeFilters,
} from '../../logic/logicNodeTypeFilters';

export interface PanelPluginCtx {
	app: App;
	filterService: FilterService;
	iconicService?: IconicService;
	contextMenuService: ContextMenuService;
	queueService: OperationQueueService;
	settings?: {
		badgeCancelClickMode?: import('../../utils/badgeInteraction').BadgeCancelClickMode;
		explorerSearchHighlights?: boolean;
		/** BT5-015 */
		iconInCaretSlot?: boolean;
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
	activeScopeSort,
	normalizeExplorerSortState,
	sameExplorerSortState,
	sortAllWithDrill,
} from '../../logic/logicScopedSort';
import type { ExplorerSortState, ScopeSort } from '../../types/typeUI';
import {
	findParentId,
	indexLevel,
	type FloatingTocExpansionChange,
	type IndexNodeRef,
} from '../../logic/logicIndexGroups';
import {
	attachBadgeCancelInteraction,
	normalizeBadgeCancelClickMode,
} from '../../utils/badgeInteraction';
import {
	compareTagStructure,
	flattenTreeToPathLabels,
	groupRootHierarchy,
} from '../../logic/logicExplorerHierarchy';
import { collectExpandableSubtreeIds } from '../../logic/logicTreeExpansion';
import {
	normalizeInteractionMode,
	resolveInteractionAction,
	type InteractionMode,
} from '../../logic/logicInteractionMode';
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
	private sortState = normalizeExplorerSortState('tags', null);
	private nodeTypeFilters: string[] = [];
	private viewMode: 'tree' | 'grid' | 'table' = 'tree';
	private visibleCells = new Set<string>(['icon', 'text', 'count', 'nested']);
	private onExpansionChange?: () => void;
	private onSortStateChange?: (state: ExplorerSortState) => void;
	private hasConnectedSortStateHandler = false;
	private readonly deferredRender = new DeferredExplorerRender();
	private readonly filterClicks: DeferredFilterClickCoordinator<string>;

	constructor(containerEl: HTMLElement, plugin: PanelPluginCtx) {
		super();
		this.plugin = plugin;
		this.logic = new TagsLogic(plugin.app);
		this.containerEl = containerEl;
		this.view = new UnifiedTreeView(containerEl);
		this.filterClicks = new DeferredFilterClickCoordinator({
			onEffect: (tagId: string, polarity: FilterPolarity) =>
				this.plugin.filterService.setTagNodePolarity(tagId, polarity),
		});
	}

	onload(): void {
		// Register context menu actions through the service
		const svc = this.plugin.contextMenuService;
		svc.registerAction({
			id: 'tag.filter_include',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			label: translate('explorer.ctx.filter_include'),
			icon: 'lucide-filter',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as TagMeta;
				this.filterClicks.cancel(`#${meta.tagPath}`);
				this.plugin.filterService.setTagNodePolarity(
					`#${meta.tagPath}`,
					'inclusive',
				);
			},
		});

		svc.registerAction({
			id: 'tag.filter_exclude',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			label: translate('explorer.ctx.filter_exclude'),
			icon: 'lucide-filter-x',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as TagMeta;
				this.filterClicks.cancel(`#${meta.tagPath}`);
				this.plugin.filterService.setTagNodePolarity(
					`#${meta.tagPath}`,
					'exclusive',
				);
			},
		});

		svc.registerAction({
			id: 'tag.iconic-change',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			label: translate('iconic.change_icon'),
			icon: 'lucide-image-plus',
			section: 'Icon',
			when: () => this.plugin.iconicService?.canChangeTagIcon() === true,
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as TagMeta;
				this.plugin.iconicService?.openTagIconPicker(meta.tagPath, ctx.event);
			},
		});

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
				this._deferRender();
			}),
		);
		// Re-render after Iconic loads/changes; both are registered for cleanup
		// and coalesced — un-registered onLoaded retained unloaded panels and
		// per-event renders froze large vaults (BT4-002).
		const iconic = this.plugin.iconicService;
		if (iconic) {
			this.register(iconic.onLoaded(this._scheduleIconicRender));
			this.register(iconic.onChanged(this._scheduleIconicRender));
		}

		// Re-render dynamically when filters or queues change
		this.plugin.filterService.on('changed', this._handleStateChange);
		this.plugin.queueService.on('changed', this._handleStateChange);
		this.containerEl.addEventListener('dragover', this._handleRootTagDragOver);
		this.containerEl.addEventListener('drop', this._handleRootTagDrop);

		this._render();
	}

	onunload(): void {
		this.deferredRender.dispose();
		this.filterClicks.dispose();
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

	private interactionMode: InteractionMode = 'filter';
	private onContentSearch?: (query: string) => void;

	setInteractionMode(
		mode: InteractionMode,
		onContentSearch?: (query: string) => void,
	): void {
		this.interactionMode = normalizeInteractionMode('tags', mode);
		this.onContentSearch = onContentSearch;
	}

	private readonly _handleStateChange = () => this._deferRender();

	private _deferRender(): void {
		this.deferredRender.invalidate(this.containerEl.isShown(), () =>
			this._render(),
		);
	}

	private _iconicRenderQueued = false;
	private readonly _scheduleIconicRender = () => {
		if (this._iconicRenderQueued) return;
		this._iconicRenderQueued = true;
		queueMicrotask(() => {
			this._iconicRenderQueued = false;
			this._deferRender();
		});
	};

	setSearchTerm(term: string, mode: 'all' | 'leaf' = 'all'): void {
		if (this.searchTerm === term && this.searchMode === mode) return;
		this.searchTerm = term;
		this.searchMode = mode;
		this._render();
	}

	setSortState(state: ExplorerSortState): void {
		const normalizedState = normalizeExplorerSortState('tags', state);
		const nextNodeTypeFilters = normalizeNodeTypeFilters(
			normalizedState.nodeTypeFilters ?? normalizedState.nodeTypeFilter,
		);
		if (
			sameExplorerSortState(this.sortState, normalizedState) &&
			sameNodeTypeFilters(this.nodeTypeFilters, nextNodeTypeFilters)
		) {
			return;
		}
		this.sortState = normalizedState;
		this.nodeTypeFilters = nextNodeTypeFilters;
		this._render();
	}

	setSortStateChangeHandler(
		handler?: (state: ExplorerSortState) => void,
	): void {
		if (!handler) {
			this.onSortStateChange = undefined;
			return;
		}
		const reconnecting = this.hasConnectedSortStateHandler;
		this.hasConnectedSortStateHandler = true;
		this.onSortStateChange = handler;
		if (reconnecting) handler(this._sortState());
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
		if (this.nodeTypeFilters.length > 0) {
			tree = this._filterByNodeTypes(tree, this.nodeTypeFilters);
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
		this._notifyExpansionChanged({ type: 'collapse-all' });
		this._render();
	}

	private _compareNodes(
		a: TreeNode<TagMeta>,
		b: TreeNode<TagMeta>,
		sort: ScopeSort,
		timeIndex: Map<string, number> | null,
	): number {
		const dir = sort.direction === 'asc' ? 1 : -1;
		const normalizedSortBy = normalizeExplorerSortBy(sort.sortBy);
		if (
			(normalizedSortBy === 'mtime' || normalizedSortBy === 'ctime') &&
			timeIndex
		) {
			return (
				dir *
				((timeIndex.get(a.meta.tagPath) ?? 0) -
					(timeIndex.get(b.meta.tagPath) ?? 0))
			);
		}
		if (normalizedSortBy === 'count')
			return dir * ((a.count ?? 0) - (b.count ?? 0));
		if (normalizedSortBy === 'sub')
			return dir * ((a.children?.length ?? 0) - (b.children?.length ?? 0));
		if (normalizedSortBy === 'type') {
			return compareTagStructure(a, b, sort.direction);
		}
		return dir * a.label.localeCompare(b.label);
	}

	private _applySort(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const allSort = activeScopeSort('tags', this.sortState, 'all');
		const drillSort = activeScopeSort('tags', this.sortState, 'drill');
		const allSortBy = normalizeExplorerSortBy(allSort.sortBy);
		const drillSortBy = normalizeExplorerSortBy(drillSort.sortBy);
		const allTimeIndex =
			allSortBy === 'mtime' || allSortBy === 'ctime'
				? this._buildTagTimeIndex(allSortBy)
				: null;
		const drillTimeIndex =
			drillSortBy === 'mtime' || drillSortBy === 'ctime'
				? allSortBy === drillSortBy && allTimeIndex
					? allTimeIndex
					: this._buildTagTimeIndex(drillSortBy)
				: null;

		return sortAllWithDrill(
			nodes,
			(a, b) => this._compareNodes(a, b, allSort, allTimeIndex),
			(a, b) => this._compareNodes(a, b, drillSort, drillTimeIndex),
			this.sortState.drillNodeId,
		);
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

	private _toggleExpanded(id: string): void {
		const wasExpanded = this.expandedIds.has(id);
		if (wasExpanded) this.expandedIds.delete(id);
		else this.expandedIds.add(id);
		this._notifyExpansionChanged(
			wasExpanded ? { type: 'collapse-node', id } : undefined,
		);
	}

	private _expandSubtree(id: string, nodes: TreeNode<TagMeta>[]): void {
		const root = this._findNode(id, nodes);
		if (!root) return;
		let changed = false;
		for (const expandableId of collectExpandableSubtreeIds(root)) {
			if (this.expandedIds.has(expandableId)) continue;
			this.expandedIds.add(expandableId);
			changed = true;
		}
		if (!changed) return;
		this._notifyExpansionChanged();
		void this._render();
	}

	private _notifyExpansionChanged(change?: FloatingTocExpansionChange): void {
		this.onExpansionChange?.();
		if (change) this.onIndexChanged?.(change);
	}

	/** Last rendered tree — feeds the floating TOC (index/scope drill). */
	private _lastRenderTree: TreeNode<TagMeta>[] = [];
	onIndexChanged?: (change?: FloatingTocExpansionChange) => void;

	getIndexNodes(rootId: string | null): IndexNodeRef[] {
		return indexLevel(
			this._lastRenderTree,
			rootId,
			(node) => (node.children?.length ?? 0) > 0,
		);
	}

	isIndexableSort(): boolean {
		return ['name', 'path', 'ext'].includes(
			normalizeExplorerSortBy(activeScopeSort('tags', this.sortState).sortBy),
		);
	}

	/** Tags have no folders — the drill uses the tag hierarchy, no kind toggle. */
	supportsKindToggle(): boolean {
		return false;
	}

	supportsDrill(): boolean {
		return this.viewMode === 'tree';
	}

	scopeRootForNode(id: string): string | null {
		if (this.viewMode !== 'tree') return null;
		return findParentId(this._lastRenderTree, id);
	}

	/** Re-measure the cached virtual window after a hidden pane becomes visible. */
	refreshViewport(): void {
		if (this.viewMode === 'tree') this.view.refreshViewport();
		else this.tableView?.refreshViewport();
		this.deferredRender.activate(() => this._render());
	}

	hasSortNode(id: string): boolean {
		return this._findNode(id, this._lastRenderTree) !== null;
	}

	/** D31: the floating index drill can drive the sort scope. */
	applyExternalSortScope(drillNodeId: string | null): void {
		const next = normalizeExplorerSortState('tags', {
			...this.sortState,
			activeScope: drillNodeId ? 'drill' : 'all',
			drillNodeId,
		});
		if (sameExplorerSortState(this.sortState, next)) return;
		this.sortState = next;
		this.onSortStateChange?.(this._sortState());
		this._render();
	}

	sortNodeLabel(id: string): string | null {
		return this._findNode(id, this._lastRenderTree)?.label ?? null;
	}

	expandNodeById(id: string): void {
		if (this.viewMode !== 'tree' || this.expandedIds.has(id)) return;
		this.expandedIds.add(id);
		this._render();
	}

	/**
	 * Floating TOC reveal port (FTC-002). Tree mode scrolls by node id; table and
	 * grid have no scroll-to primitive yet, so they reject cleanly (no throw).
	 */
	revealNode(id: string, options?: RevealNodeOptions): boolean {
		if (this.viewMode !== 'tree') return false;
		this.view.scrollToId(id, 'start', options?.behavior);
		return true;
	}

	private _setIndexRoots(tree: TreeNode<TagMeta>[]): void {
		this._lastRenderTree = tree;
		this.onIndexChanged?.();
	}

	private _sortState(): ExplorerSortState {
		return {
			...this.sortState,
			sorts: this.sortState.sorts,
			drillNodeId: this.sortState.drillNodeId,
			...nodeTypeFilterPatch(this.nodeTypeFilters),
		};
	}

	private _render(): void {
		this.deferredRender.satisfy();
		let tree = this.logic.getTree();

		if (this.searchMode === 'leaf') {
			tree = this._collectLeaves(tree);
		}
		if (this.nodeTypeFilters.length > 0) {
			tree = this._filterByNodeTypes(tree, this.nodeTypeFilters);
		}
		if (this.searchTerm) {
			tree = this.logic.filterTree(tree, this.searchTerm);
			this._expandAll(tree);
		}
		tree = this._applySort(tree);
		const searchHighlightsEnabled =
			this.plugin.settings?.explorerSearchHighlights === true;

		const activeFilterIds = new Set<string>();
		const excludedFilterIds = new Set<string>();
		for (const node of this._flattenTree(tree)) {
			const state = this.plugin.filterService.getFilterState(
				'tag',
				`#${node.meta.tagPath}`,
			);
			if (state === 'included') activeFilterIds.add(node.id);
			else if (state === 'excluded') excludedFilterIds.add(node.id);
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
			this._setIndexRoots([]);
			this._renderEmptyState();
			return;
		}
		this._setIndexRoots(nodesWithIcons);

		if (this.viewMode === 'grid') {
			this._renderGrid(
				nodesWithIcons,
				activeFilterIds,
				excludedFilterIds,
				highlightIds,
			);
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
				excludedFilterIds,
				searchHighlightIds: highlightIds,
				onToggle: (id: string) => {
					this._toggleExpanded(id);
					void this._render();
				},
				onRecursiveExpand: (id: string) =>
					this._expandSubtree(id, nodesWithIcons),
				onRowClick: (id: string, event) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					this._handleNodeClick(node, event);
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
			filterBubbleLabel: translate('filter.active_descendant'),
			iconInCaretSlot: this.plugin.settings?.iconInCaretSlot === true,
			activeFilterIds,
			excludedFilterIds,
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
				this._toggleExpanded(id);
				void this._render();
			},
			onRecursiveExpand: (id: string) =>
				this._expandSubtree(id, nodesWithIcons),
			onRowClick: (id: string, event) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				this._handleNodeClick(node, event);
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

	private _handleNodeClick(
		node: TreeNode<TagMeta>,
		event?: MouseEvent | KeyboardEvent,
	): void {
		const meta = node.meta;
		const action = resolveInteractionAction(
			'tags',
			this.interactionMode,
			Boolean(Keymap.isModEvent(event)),
		);

		if (action === 'content-search') {
			if (this.onContentSearch) {
				this.onContentSearch(`#${meta.tagPath}`);
			} else if (node.children?.length) {
				this._toggleExpanded(node.id);
				void this._render();
			}
			return;
		}

		if (action === 'expand') {
			if (node.children?.length) {
				this._toggleExpanded(node.id);
				void this._render();
			}
			return;
		}

		if (action === 'add') {
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
		const tagId = `#${meta.tagPath}`;
		const filterState = this.plugin.filterService.getFilterState('tag', tagId);
		this.filterClicks.click(tagId, tagId, filterStateToPolarity(filterState));
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
		excludedFilterIds: Set<string>,
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
			card.toggleClass('is-excluded-filter', excludedFilterIds.has(node.id));
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

			card.addEventListener('click', (event) =>
				this._handleNodeClick(node, event),
			);
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
					this._handleNodeClick(node, event);
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
		if (!tagPaths.some((path) => path !== targetNode.meta.tagPath)) return;
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
		payload: VaultmanDragNodePayload & {
			selection?: VaultmanDragNodePayload[];
		},
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
		payload: VaultmanDragNodePayload & {
			selection?: VaultmanDragNodePayload[];
		},
	): string[] {
		const nodes = payload.selection?.length ? payload.selection : [payload];
		return nodes
			.filter(
				(node): node is Extract<VaultmanDragNodePayload, { kind: 'tag' }> =>
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

			const iconic = this.plugin.iconicService?.getTagIcon(meta.tagPath);

			return {
				...node,
				cls: cls,
				icon: iconic?.icon ?? 'lucide-tag',
				iconColor: iconic?.color || undefined,
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
			this.interactionMode = 'add';
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

	private _filterByNodeTypes(
		nodes: TreeNode<TagMeta>[],
		nodeTypeFilters: readonly string[],
	): TreeNode<TagMeta>[] {
		const selectedTypes = new Set(nodeTypeFilters);
		const includeSimple = selectedTypes.has('simple');
		const includeNested = selectedTypes.has('nested');
		if (includeSimple && !includeNested)
			return groupRootHierarchy(nodes, 'simple');
		if (includeNested && !includeSimple) return this._collectNested(nodes);
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
