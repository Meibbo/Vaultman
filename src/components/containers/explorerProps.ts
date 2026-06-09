// src/components/PropsExplorerPanel.ts
import { Component, Notice, prepareSimpleSearch, setIcon } from 'obsidian';
import { PropsLogic } from '../../logic/logicProps';
import type { FilterService } from '../../services/serviceFilter';
import type { IconicService } from '../../services/serviceIcons';
import type { ContextMenuService } from '../../services/serviceContextMenu';
import { OperationQueueService } from '../../services/serviceOperationQueue';
import type { StatisticsCacheService } from '../../services/serviceStatisticsCache';

export interface PanelPluginCtx {
	app: import('obsidian').App;
	filterService: FilterService;
	iconicService?: IconicService;
	contextMenuService: ContextMenuService;
	queueService: OperationQueueService;
	statisticsCache?: Pick<StatisticsCacheService, 'getFileTimes'>;
	showDragActionGuide?: (text: string) => void;
	clearDragActionGuide?: () => void;
}

import { UnifiedTreeView } from '../layout/viewTree';
import { NodeTableView } from '../layout/viewNodeTable';
import type { TreeNode, PropMeta } from '../../types/typeTree';
import type { PropertyChange } from '../../types/typeOps';
import { NATIVE_SET_PROP_TYPE } from '../../types/typeOps';
import { showInputModal } from '../../utils/inputModal';
import { translate } from '../../i18n/index';
import {
	resolveNativePropType,
	TYPE_ICON_MAP,
	toNativePropType,
	type MetadataTypeManagerLike,
} from '../../logic/propTypes';
import { normalizeExplorerSortBy } from '../../logic/logicSort';
import { flattenTreeToPathLabels } from '../../logic/logicExplorerHierarchy';
import {
	readVaultmanDragPayload,
	setVaultmanDragPayload,
	type VaultmanDragNodePayload,
	withActiveFilterDragSelection,
} from '../../utils/dragPayload';

type DateSortId = 'mtime' | 'ctime';
type PropTimeIndex = {
	props: Map<string, number>;
	values: Map<string, number>;
};

function sameStringSet(a: Set<string>, b: Set<string>): boolean {
	if (a.size !== b.size) return false;
	for (const value of a) {
		if (!b.has(value)) return false;
	}
	return true;
}

export class PropsExplorerPanel extends Component {
	private plugin: PanelPluginCtx;
	private logic: PropsLogic;
	private containerEl: HTMLElement;
	private view: UnifiedTreeView;
	private tableView: NodeTableView<PropMeta> | null = null;
	private expandedIds = new Set<string>();
	private searchTerm = '';
	private viewMode: 'tree' | 'grid' | 'table' = 'tree';
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private searchMode = 0;
	private sortChildLevel = false;
	private nodeTypeFilter: string | null = null;
	private visibleCells = new Set<string>(['icon', 'text', 'count', 'nested']);
	private onExpansionChange?: () => void;

	constructor(containerEl: HTMLElement, plugin: PanelPluginCtx) {
		super();
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.logic = new PropsLogic(plugin.app);
		this.view = new UnifiedTreeView(this.containerEl);
	}

	onload(): void {
		const svc = this.plugin.contextMenuService;

		// Property actions
		svc.registerAction({
			id: 'prop.rename',
			nodeTypes: ['prop'],
			surfaces: ['panel'],
			label: (ctx) => `Rename "${ctx.node.label}"`,
			icon: 'lucide-pencil',
			when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => this._renameProp(ctx.node.label),
		});

		svc.registerAction({
			id: 'prop.delete',
			nodeTypes: ['prop'],
			surfaces: ['panel'],
			label: (ctx) => `Delete "${ctx.node.label}"`,
			icon: 'lucide-trash-2',
			when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => this._deleteProp(ctx.node.label),
		});

		// Change type actions
		const types = ['text', 'number', 'checkbox', 'date', 'list'] as const;
		types.forEach((type) => {
			svc.registerAction({
				id: `prop.type-${type}`,
				nodeTypes: ['prop'],
				surfaces: ['panel'],
				label: type.charAt(0).toUpperCase() + type.slice(1),
				icon: TYPE_ICON_MAP[type],
				submenu: 'Change type',
				when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
				run: (ctx) => this._changePropType(ctx.node.label, type),
			});
		});

		// Value actions
		svc.registerAction({
			id: 'value.rename',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Rename value',
			icon: 'lucide-pencil',
			when: (ctx) => (ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._renameValue(meta.propName, meta.rawValue ?? '');
			},
		});

		svc.registerAction({
			id: 'value.case-lower',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Lowercase',
			icon: 'lucide-case-lower',
			submenu: 'Convert',
			section: 'Text',
			when: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return (
					meta.isValueNode &&
					!meta.isTypeIncompatible &&
					meta.propType === 'text'
				);
			},
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._convertValue(
					meta.propName,
					meta.rawValue ?? '',
					(v) => v.toLowerCase(),
					'lowercase',
				);
			},
		});

		svc.registerAction({
			id: 'value.case-upper',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Uppercase',
			icon: 'lucide-case-upper',
			submenu: 'Convert',
			section: 'Text',
			when: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return (
					meta.isValueNode &&
					!meta.isTypeIncompatible &&
					meta.propType === 'text'
				);
			},
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._convertValue(
					meta.propName,
					meta.rawValue ?? '',
					(v) => v.toUpperCase(),
					'uppercase',
				);
			},
		});

		svc.registerAction({
			id: 'value.case-title',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Title case',
			icon: 'lucide-type',
			submenu: 'Convert',
			section: 'Text',
			when: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return (
					meta.isValueNode &&
					!meta.isTypeIncompatible &&
					meta.propType === 'text'
				);
			},
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._convertValue(
					meta.propName,
					meta.rawValue ?? '',
					(v) => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase(),
					'title case',
				);
			},
		});

		svc.registerAction({
			id: 'value.delete',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Delete value',
			icon: 'lucide-trash-2',
			when: (ctx) => (ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._deleteValue(meta.propName, meta.rawValue ?? '');
			},
		});

		this.registerEvent(
			this.plugin.app.metadataCache.on('changed', () => {
				this.logic.invalidate();
				this._render();
			}),
		);
		// Re-render after Iconic finishes loading
		this.plugin.iconicService?.onLoaded(() => this._render());

		// Re-render dynamically when filters or queues change
		this.plugin.filterService.on('changed', this._handleStateChange);
		this.plugin.queueService.on('changed', this._handleStateChange);

		this._render();
	}

	onunload(): void {
		this.plugin.filterService.off('changed', this._handleStateChange);
		this.plugin.queueService.off('changed', this._handleStateChange);
		this.view.destroy();
		this.tableView?.destroy();
		super.onunload();
	}

	private addMode = false;

	setAddMode(active: boolean): void {
		this.addMode = active;
	}

	private readonly _handleStateChange = () => this._render();

	private _getFilesWithProp(propName: string): import('obsidian').TFile[] {
		return this.plugin.app.vault
			.getMarkdownFiles()
			.filter(
				(f) =>
					propName in
					(this.plugin.app.metadataCache.getFileCache(f)?.frontmatter ?? {}),
			);
	}

	private _getFilesWithValue(
		propName: string,
		value: string,
	): import('obsidian').TFile[] {
		return this.plugin.app.vault.getMarkdownFiles().filter((f) => {
			const fm: Record<string, unknown> =
				this.plugin.app.metadataCache.getFileCache(f)?.frontmatter ?? {};
			if (!(propName in fm)) return false;
			const v: unknown = fm[propName];
			if (Array.isArray(v)) return v.some((x) => String(x) === value);
			return String(v) === value;
		});
	}

	setSearchTerm(term: string, mode = 0): void {
		if (this.searchTerm === term && this.searchMode === mode) return;
		const previousKey = `${this.searchTerm}\0${this.searchMode}`;
		this.searchTerm = term;
		this.searchMode = mode;
		const nextKey = `${this.searchTerm}\0${this.searchMode}`;
		if (this.searchTerm && previousKey !== nextKey) {
			this._expandSearchMatches();
		}
		this._render();
	}

	setViewMode(mode: 'tree' | 'grid' | 'table'): void {
		if (this.viewMode === mode) return;
		this.viewMode = mode;
		if (mode === 'tree') {
			this.tableView?.destroy();
			this.view.destroy();
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
		if (this.nodeTypeFilter) {
			tree = this._filterByType(tree, this.nodeTypeFilter);
		}
		if (this.searchTerm) {
			tree = this.logic.filterTree(tree, this.searchTerm, this.searchMode);
			for (const id of this.logic.expansionIdsForSearchMatches(
				tree,
				this.searchTerm,
				this.searchMode,
			)) {
				this.expandedIds.add(id);
			}
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

	createFromSearch(term: string, category: number): void {
		const propName = term.trim();
		void category;
		if (!propName) {
			this.addMode = true;
			new Notice('Select a property to stage it');
			return;
		}
		this.plugin.queueService.addOrRun({
			type: 'property',
			property: propName,
			action: 'add',
			details: `Add property "${propName}"`,
			files: this.plugin.filterService.filteredFiles,
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (propName in fm) return null;
				fm[propName] = '';
				return fm;
			},
		});
		this.logic.invalidate();
		this._render();
	}

	private _findNode(
		id: string,
		nodes: TreeNode<PropMeta>[],
	): TreeNode<PropMeta> | null {
		for (const n of nodes) {
			if (n.id === id) return n;
			if (n.children) {
				const found = this._findNode(id, n.children);
				if (found) return found;
			}
		}
		return null;
	}

	private _activeFilterIds(): Set<string> {
		const activeFilterIds = new Set<string>();

		const walkFilter = (node: import('../../types/typeFilter').FilterNode) => {
			if (node.type === 'rule' && node.property) {
				if (node.filterType === 'has_property') {
					activeFilterIds.add(node.property);
				} else if (node.filterType === 'specific_value') {
					node.values?.forEach((v) =>
						activeFilterIds.add(`${node.property}::${v}`),
					);
				}
			} else if (node.type === 'group') {
				node.children.forEach(walkFilter);
			}
		};

		walkFilter(this.plugin.filterService.activeFilter);
		return activeFilterIds;
	}

	private _handleNodeClick(
		node: TreeNode<PropMeta>,
		activeFilterIds: Set<string>,
	): void {
		const meta = node.meta;

		if (this.addMode && !meta.isValueNode) {
			this.plugin.queueService.addOrRun({
				type: 'property',
				property: meta.propName,
				action: 'add',
				details: `Add property "${meta.propName}"`,
				files: this.plugin.filterService.filteredFiles,
				customLogic: true,
				logicFunc: (_file, fm) => {
					if (meta.propName in fm) return null;
					fm[meta.propName] = '';
					return fm;
				},
			});
			return;
		}

		const isPropDeleted = this.plugin.queueService.queue.some(
			(op) =>
				op.type === 'property' &&
				op.property === meta.propName &&
				op.action === 'delete' &&
				!('value' in op),
		);
		if (isPropDeleted) return;

		const filterId = meta.isValueNode
			? `${meta.propName}::${meta.rawValue}`
			: meta.propName;
		if (activeFilterIds.has(filterId)) {
			if (meta.isValueNode) {
				void this.plugin.filterService.removeNodeByProperty(
					meta.propName,
					meta.rawValue ?? '',
				);
			} else {
				void this.plugin.filterService.removeNodeByProperty(meta.propName);
			}
			return;
		}

		if (meta.isValueNode) {
			void this.plugin.filterService.addNode({
				type: 'rule',
				filterType: 'specific_value',
				property: meta.propName,
				values: [meta.rawValue ?? ''],
			});
		} else {
			void this.plugin.filterService.addNode({
				type: 'rule',
				filterType: 'has_property',
				property: meta.propName,
				values: [],
			});
		}
	}

	private _openNodeMenu(node: TreeNode<PropMeta>, e: MouseEvent): void {
		const nodeType: 'prop' | 'value' = node.meta.isValueNode ? 'value' : 'prop';
		this.plugin.contextMenuService.openPanelMenu(
			{ nodeType, node, surface: 'panel' },
			e,
		);
	}

	private _setPropDragPayload(
		node: TreeNode<PropMeta>,
		activeFilterIds: Set<string>,
		event: DragEvent,
	): void {
		const meta = node.meta;
		if (!meta.isValueNode) {
			setVaultmanDragPayload(
				event,
				withActiveFilterDragSelection(
					{
						kind: 'property',
						property: meta.propName,
					},
					this.plugin.filterService.activeFilter,
					'props',
				),
			);
			return;
		}
		setVaultmanDragPayload(
			event,
			withActiveFilterDragSelection(
				{
					kind: 'property-value',
					property: meta.propName,
					value: meta.rawValue ?? '',
					mode: activeFilterIds.has(meta.propName)
						? 'value-only'
						: 'property-value',
				},
				this.plugin.filterService.activeFilter,
				'props',
			),
		);
	}

	private _renderGridBadges(
		parent: HTMLElement,
		node: TreeNode<PropMeta>,
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
				bEl.addClass('is-undoable');
				bEl.addEventListener('dblclick', (event) => {
					event.stopPropagation();
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

	private _render(): void {
		if (this.viewMode === 'grid') {
			this._renderGrid();
			return;
		}
		let tree = this.logic.getTree();
		const activeFilterIds = this._activeFilterIds();
		const highlightIds = new Set<string>();
		const warningIds = new Set<string>();

		if (this.nodeTypeFilter) {
			tree = this._filterByType(tree, this.nodeTypeFilter);
		}
		if (this.searchTerm) {
			tree = this.logic.filterTree(tree, this.searchTerm, this.searchMode);
		}

		// FIX: prepare search function once
		const searcher = this.searchTerm
			? prepareSimpleSearch(this.searchTerm)
			: null;
		const searchFunc = searcher ? (text: string) => searcher(text) : null;

		const sorted = this._applySort(tree);
		let nodesWithIcons = this._resolveIcons(
			sorted,
			warningIds,
			highlightIds,
			searchFunc,
			this.plugin.queueService.queue,
		);
		if (!this._nestedEnabled()) {
			nodesWithIcons = flattenTreeToPathLabels(nodesWithIcons);
		}
		if (nodesWithIcons.length === 0) {
			this._renderEmptyState();
			return;
		}

		if (this.viewMode === 'table') {
			if (!this.tableView) {
				this.tableView = new NodeTableView<PropMeta>(this.containerEl);
			}
			this.tableView.render({
				surface: 'props',
				nodes: nodesWithIcons,
				expandedIds: this.expandedIds,
				visibleCells: this.visibleCells,
				activeFilterIds,
				warningIds,
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
					this._handleNodeClick(node, activeFilterIds);
				},
				onContextMenu: (id: string, event: MouseEvent) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					this._openNodeMenu(node, event);
				},
				onDragStart: (id: string, event: DragEvent) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					this._setPropDragPayload(node, activeFilterIds, event);
				},
				onDragOver: (id: string, event: DragEvent) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					this._handlePropDragOver(node, event);
				},
				onDrop: (id: string, event: DragEvent) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					this._handlePropDrop(node, event);
				},
				onBadgeDoubleClick: (queueIndex: number) => {
					this.plugin.queueService.remove(queueIndex);
					void this._render();
				},
			});
			return;
		}

		this.view.render({
			nodes: nodesWithIcons,
			expandedIds: this.expandedIds,
			visibleCells: this.visibleCells,
			activeFilterIds,
			warningIds,
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
				this._handleNodeClick(node, activeFilterIds);
			},
			onContextMenu: (id: string, e: MouseEvent) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				this._openNodeMenu(node, e);
			},
			onDragStart: (id: string, event: DragEvent) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				this._setPropDragPayload(node, activeFilterIds, event);
			},
			onDragOver: (id: string, event: DragEvent) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				this._handlePropDragOver(node, event);
			},
			onDrop: (id: string, event: DragEvent) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				this._handlePropDrop(node, event);
			},
			onBadgeDoubleClick: (queueIndex: number) => {
				this.plugin.queueService.remove(queueIndex);
				void this._render();
			},
		});
	}

	private _expandAll(nodes: TreeNode<PropMeta>[]): void {
		for (const node of nodes) {
			if (node.children?.length) {
				this.expandedIds.add(node.id);
				this._expandAll(node.children);
			}
		}
	}

	private _expandSearchMatches(): void {
		let tree = this.logic.getTree();
		if (this.nodeTypeFilter) {
			tree = this._filterByType(tree, this.nodeTypeFilter);
		}
		tree = this.logic.filterTree(tree, this.searchTerm, this.searchMode);
		for (const id of this.logic.expansionIdsForSearchMatches(
			tree,
			this.searchTerm,
			this.searchMode,
		)) {
			this.expandedIds.add(id);
		}
		this._notifyExpansionChanged();
	}

	private _notifyExpansionChanged(): void {
		this.onExpansionChange?.();
	}

	private _filterByType(
		nodes: TreeNode<PropMeta>[],
		nodeTypeFilter: string,
	): TreeNode<PropMeta>[] {
		return nodes.filter((node) => {
			if (node.meta.isValueNode) return false;
			return this._effectivePropType(node.meta) === nodeTypeFilter;
		});
	}

	private _nestedEnabled(): boolean {
		return this.visibleCells.has('nested');
	}

	private _metadataTypeManager(): MetadataTypeManagerLike | null {
		return (
			(
				this.plugin.app as unknown as {
					metadataTypeManager?: MetadataTypeManagerLike;
				}
			).metadataTypeManager ?? null
		);
	}

	private _effectivePropType(
		meta: Pick<PropMeta, 'propName' | 'propType'>,
	): string {
		return resolveNativePropType(
			meta.propName,
			meta.propType,
			this._metadataTypeManager(),
		).type;
	}

	private _effectivePropIcon(
		meta: Pick<PropMeta, 'propName' | 'propType'>,
	): string {
		return resolveNativePropType(
			meta.propName,
			meta.propType,
			this._metadataTypeManager(),
		).icon;
	}

	private _sortNodes(
		nodes: TreeNode<PropMeta>[],
		timeIndex: PropTimeIndex | null,
	): TreeNode<PropMeta>[] {
		const dir = this.sortDir === 'asc' ? 1 : -1;
		const normalizedSortBy = normalizeExplorerSortBy(this.sortBy);
		if (
			(normalizedSortBy === 'mtime' || normalizedSortBy === 'ctime') &&
			timeIndex
		) {
			return [...nodes].sort(
				(a, b) =>
					dir *
					(this._timeForPropNode(a, timeIndex) -
						this._timeForPropNode(b, timeIndex)),
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

	private _applySort(nodes: TreeNode<PropMeta>[]): TreeNode<PropMeta>[] {
		const normalizedSortBy = normalizeExplorerSortBy(this.sortBy);
		const timeIndex =
			normalizedSortBy === 'mtime' || normalizedSortBy === 'ctime'
				? this._buildPropTimeIndex(normalizedSortBy)
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

	private _buildPropTimeIndex(sortBy: DateSortId): PropTimeIndex {
		const props = new Map<string, number>();
		const values = new Map<string, number>();
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			const frontmatter =
				this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
			const time =
				this.plugin.statisticsCache?.getFileTimes(file)?.[sortBy] ??
				file.stat[sortBy] ??
				0;
			for (const [propName, rawValue] of Object.entries(frontmatter)) {
				if (propName === 'position') continue;
				this._setMaxTime(props, propName, time);
				const rawValues = Array.isArray(rawValue) ? rawValue : [rawValue];
				for (const value of rawValues) {
					if (value === undefined || value === null) continue;
					this._setMaxTime(values, `${propName}::${String(value)}`, time);
				}
			}
		}
		return { props, values };
	}

	private _timeForPropNode(
		node: TreeNode<PropMeta>,
		index: PropTimeIndex,
	): number {
		const meta = node.meta;
		if (meta.isValueNode) {
			return (
				index.values.get(`${meta.propName}::${meta.rawValue ?? ''}`) ??
				index.props.get(meta.propName) ??
				0
			);
		}
		return index.props.get(meta.propName) ?? 0;
	}

	private _setMaxTime(
		index: Map<string, number>,
		key: string,
		time: number,
	): void {
		if (time > (index.get(key) ?? 0)) index.set(key, time);
	}

	private _renderGrid(): void {
		this.containerEl.empty();
		let tree = this.logic.getTree();
		const activeFilterIds = this._activeFilterIds();
		const highlightIds = new Set<string>();
		const warningIds = new Set<string>();
		if (this.nodeTypeFilter) {
			tree = this._filterByType(tree, this.nodeTypeFilter);
		}
		if (this.searchTerm) {
			tree = this.logic.filterTree(tree, this.searchTerm, this.searchMode);
		}
		const searcher = this.searchTerm
			? prepareSimpleSearch(this.searchTerm)
			: null;
		const searchFunc = searcher ? (text: string) => searcher(text) : null;
		const sorted = this._applySort(tree);
		const resolved = this._resolveIcons(
			sorted,
			warningIds,
			highlightIds,
			searchFunc,
			this.plugin.queueService.queue,
		);
		const filtered = this._nestedEnabled()
			? resolved.filter((node) => !node.meta.isValueNode)
			: flattenTreeToPathLabels(resolved);
		if (filtered.length === 0) {
			this._renderEmptyState();
			return;
		}

		const grid = this.containerEl.createDiv({ cls: 'vaultman-props-grid' });
		for (const node of filtered) {
			const card = grid.createDiv({ cls: 'vaultman-prop-card' });
			if (typeof node.cls === 'string' && node.cls.trim()) {
				for (const c of node.cls.trim().split(/\s+/)) card.addClass(c);
			}
			card.toggleClass('is-active-filter', activeFilterIds.has(node.id));
			card.toggleClass('vaultman-badge-warning', warningIds.has(node.id));
			card.toggleClass('vaultman-search-highlight', highlightIds.has(node.id));
			card.setAttribute('role', 'button');
			card.draggable = true;
			card.setAttribute('tabindex', '0');
			card.setAttribute('aria-label', node.label);

			if (this.visibleCells.has('icon')) {
				const iconEl = card.createDiv({ cls: 'vaultman-prop-card-icon' });
				setIcon(iconEl, node.icon ?? this._effectivePropIcon(node.meta));
			}
			if (this.visibleCells.has('text')) {
				card.createDiv({ cls: 'vaultman-prop-card-name', text: node.label });
			}
			if (this.visibleCells.has('type')) {
				card.createDiv({
					cls: 'vaultman-prop-card-type',
					text: this._effectivePropType(node.meta),
				});
			}
			this._renderGridBadges(card, node);

			card.addEventListener('click', () =>
				this._handleNodeClick(node, activeFilterIds),
			);
			card.addEventListener('dragstart', (event) =>
				this._setPropDragPayload(node, activeFilterIds, event),
			);
			card.addEventListener('dragover', (event) =>
				this._handlePropDragOver(node, event),
			);
			card.addEventListener('drop', (event) =>
				this._handlePropDrop(node, event),
			);
			card.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					this._handleNodeClick(node, activeFilterIds);
				}
			});
			card.addEventListener('contextmenu', (event) => {
				event.preventDefault();
				event.stopPropagation();
				this._openNodeMenu(node, event);
			});
		}
	}

	private _handlePropDragOver(
		targetNode: TreeNode<PropMeta>,
		event: DragEvent,
	): void {
		if (targetNode.meta.isValueNode) return;
		const payload = readVaultmanDragPayload(event);
		if (!payload) return;
		if (
			!this._dragValueNodes(payload).some(
				(node) => node.property !== targetNode.meta.propName,
			)
		) {
			return;
		}
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
		this.plugin.showDragActionGuide?.(
			`Copy value to "${targetNode.meta.propName}"`,
		);
	}

	private _handlePropDrop(
		targetNode: TreeNode<PropMeta>,
		event: DragEvent,
	): void {
		if (targetNode.meta.isValueNode) return;
		const payload = readVaultmanDragPayload(event);
		if (!payload) return;
		event.preventDefault();
		event.stopPropagation();
		this.plugin.clearDragActionGuide?.();
		void this._copyDraggedValueToProperty(payload, targetNode.meta.propName);
	}

	private async _copyDraggedValueToProperty(
		payload: VaultmanDragNodePayload & { selection?: VaultmanDragNodePayload[] },
		targetPropName: string,
	): Promise<void> {
		const valueNodes = this._dragValueNodes(payload).filter(
			(node) => node.property !== targetPropName,
		);
		for (const node of valueNodes) {
			const files = this._getFilesWithValue(node.property, node.value);
			if (files.length === 0) continue;
			this.plugin.queueService.addOrRun({
				type: 'property',
				property: targetPropName,
				action: 'set',
				value: node.value,
				oldValue: node.value,
				details: `Copy value "${node.value}" from "${node.property}" to "${targetPropName}"`,
				files,
				customLogic: true,
				logicFunc: (_file, fm) => {
					if (!this._frontmatterHasValue(fm[node.property], node.value)) {
						return null;
					}
					fm[targetPropName] = this._appendFrontmatterValue(
						fm[targetPropName],
						node.value,
					);
					return fm;
				},
			});
		}
		this.logic.invalidate();
		this._render();
	}

	private _dragValueNodes(
		payload: VaultmanDragNodePayload & { selection?: VaultmanDragNodePayload[] },
	): Array<Extract<VaultmanDragNodePayload, { kind: 'property-value' }>> {
		const nodes = payload.selection?.length ? payload.selection : [payload];
		return nodes.filter(
			(
				node,
			): node is Extract<VaultmanDragNodePayload, { kind: 'property-value' }> =>
				node.kind === 'property-value',
		);
	}

	private _frontmatterHasValue(raw: unknown, value: string): boolean {
		if (Array.isArray(raw)) {
			return raw.some((item) => this._stringComparableValue(item) === value);
		}
		return this._stringComparableValue(raw) === value;
	}

	private _appendFrontmatterValue(raw: unknown, value: string): unknown {
		if (raw === undefined || raw === null) return value;
		if (Array.isArray(raw)) {
			const values: unknown[] = raw;
			if (values.some((item) => this._stringComparableValue(item) === value)) {
				return values;
			}
			return [...values, value];
		}
		if (this._stringComparableValue(raw) === value) return raw;
		return [raw, value];
	}

	private _stringComparableValue(raw: unknown): string | null {
		if (
			typeof raw === 'string' ||
			typeof raw === 'number' ||
			typeof raw === 'boolean'
		) {
			return String(raw);
		}
		return null;
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
			text: translate('explorer.props.empty_title'),
		});
		emptyEl.createDiv({
			cls: 'vaultman-explorer-empty-desc',
			text: this.searchTerm
				? translate('explorer.props.empty_search_desc')
				: translate('filter.prop_browser.empty'),
		});
	}

	private _resolveIcons(
		nodes: TreeNode<PropMeta>[],
		warningIds: Set<string>,
		highlightIds: Set<string>,
		searchFunc: ((text: string) => unknown) | null,
		queue: import('../../types/typeOps').PendingChange[],
		parentDeleted = false,
	): TreeNode<PropMeta>[] {
		return nodes.map((node) => {
			const meta = node.meta;
			let currentCls = node.cls || '';

			if (meta.isTypeIncompatible) warningIds.add(node.id);
			if (searchFunc && searchFunc(node.label)) highlightIds.add(node.id);

			const isPropDeleted =
				parentDeleted ||
				queue.some(
					(op) =>
						op.type === 'property' &&
						op.property === meta.propName &&
						op.action === 'delete' &&
						!('value' in op),
				);

			if (isPropDeleted) {
				if (!currentCls.includes('is-deleted-prop')) {
					currentCls = (currentCls + ' is-deleted-prop').trim();
				}
			} else if (meta.isValueNode) {
				const isValueDeleted = queue.some(
					(op): op is PropertyChange =>
						op.type === 'property' &&
						op.property === meta.propName &&
						op.action === 'delete' &&
						op.oldValue === meta.rawValue,
				);
				if (isValueDeleted) {
					if (!currentCls.includes('is-deleted-value')) {
						currentCls = (currentCls + ' is-deleted-value').trim();
					}
				}
			}

			const resolvedChildren = node.children
				? this._resolveIcons(
						node.children,
						warningIds,
						highlightIds,
						searchFunc,
						queue,
						isPropDeleted,
					)
				: [];

			const badges: import('../../types/typeTree').NodeBadge[] = [];
			if (meta.isTypeIncompatible) {
				badges.push({
					text: 'Conflict',
					color: 'red',
					solid: true,
					icon: 'lucide-alert-triangle',
				});
			}

			const relevantOps = queue.filter(
				(op) =>
					op.type === 'property' &&
					op.property === meta.propName &&
					(meta.isValueNode
						? op.value === meta.rawValue ||
							op.oldValue === meta.rawValue ||
							op.action === 'change_type'
						: true),
			) as import('../../types/typeOps').PropertyChange[];

			for (const op of relevantOps) {
				const action = op.action;
				const opIdx = queue.indexOf(op);
				if (action === 'delete')
					badges.push({
						text: 'Delete',
						icon: 'lucide-trash-2',
						color: 'red',
						queueIndex: opIdx,
					});
				else if (action === 'rename' || action === 'set')
					badges.push({
						text: 'Update',
						icon: 'lucide-pencil',
						color: 'blue',
						queueIndex: opIdx,
					});
				else if (action === 'move')
					badges.push({
						text: 'Move',
						icon: 'lucide-move',
						color: 'orange',
						queueIndex: opIdx,
					});
				else if (
					action === 'change_type' ||
					(meta.isValueNode && op.details.toLowerCase().includes('convert'))
				) {
					badges.push({
						text: 'Convert',
						icon: 'lucide-arrow-right-left',
						color: 'blue',
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

			// BUBLLE UP: If collapsed property node, show badges from resolved children
			const isExpanded = this.expandedIds.has(node.id);
			if (!meta.isValueNode && !isExpanded && resolvedChildren.length > 0) {
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

			const iconic = !meta.isValueNode
				? this.plugin.iconicService?.getIcon(meta.propName)
				: null;
			const defaultIcon = !meta.isValueNode
				? this._effectivePropIcon(meta)
				: undefined;

			return {
				...node,
				cls: currentCls,
				icon: (iconic?.icon ?? defaultIcon) || undefined,
				typeText: !meta.isValueNode ? this._effectivePropType(meta) : undefined,
				badges: badges,
				children: resolvedChildren,
			};
		});
	}

	private async _changePropType(
		propName: string,
		newType: string,
	): Promise<void> {
		const markerFile =
			this._getFilesWithProp(propName)[0] ??
			this.plugin.app.vault.getMarkdownFiles()[0];
		if (!markerFile) return;
		this.plugin.queueService.addOrRun({
			type: 'property',
			property: propName,
			action: 'change_type',
			details: `Change type of "${propName}" to ${newType}`,
			files: [markerFile],
			customLogic: true,
			logicFunc: () => ({
				[NATIVE_SET_PROP_TYPE]: {
					propName,
					type: toNativePropType(newType),
				},
			}),
		});
	}

	private async _renameProp(propName: string): Promise<void> {
		const newName = await showInputModal(
			this.plugin.app,
			`Rename "${propName}" to:`,
		);
		if (!newName) return;
		const files = this._getFilesWithProp(propName);
		this.plugin.queueService.addOrRun({
			type: 'property',
			property: propName,
			action: 'rename',
			details: `Rename property "${propName}" → "${newName}"`,
			files,
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (!(propName in fm)) return null;
				fm[newName] = fm[propName];
				delete fm[propName];
				return fm;
			},
		});
	}

	private async _deleteProp(propName: string): Promise<void> {
		const files = this._getFilesWithProp(propName);
		this.plugin.queueService.addOrRun({
			type: 'property',
			property: propName,
			action: 'delete',
			details: `Bulk delete property "${propName}"`,
			files,
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (!(propName in fm)) return null;
				delete fm[propName];
				return fm;
			},
		});
	}

	private async _renameValue(
		propName: string,
		oldValue: string,
	): Promise<void> {
		const newVal = await showInputModal(
			this.plugin.app,
			`Rename value "${oldValue}" to:`,
		);
		if (!newVal) return;
		await this._replaceValueInVault(propName, oldValue, newVal);
	}

	private async _deleteValue(
		propName: string,
		oldValue: string,
	): Promise<void> {
		const files = this._getFilesWithValue(propName, oldValue);
		this.plugin.queueService.addOrRun({
			type: 'property',
			property: propName,
			action: 'delete',
			details: `Delete value "${oldValue}" from "${propName}"`,
			files,
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (!(propName in fm)) return null;
				const val = fm[propName];
				if (Array.isArray(val)) {
					fm[propName] = (val as unknown[]).filter(
						(v) => String(v) !== oldValue,
					);
				} else if (String(val) === oldValue) {
					delete fm[propName];
				} else {
					return null;
				}
				return fm;
			},
		});
	}

	private async _convertValue(
		propName: string,
		oldValue: string,
		transform: (v: string) => string,
		details: string,
	): Promise<void> {
		await this._replaceValueInVault(
			propName,
			oldValue,
			transform(oldValue),
			details,
		);
	}

	private async _replaceValueInVault(
		propName: string,
		oldValue: string,
		newValue: string,
		label?: string,
	): Promise<void> {
		const files = this._getFilesWithValue(propName, oldValue);
		this.plugin.queueService.addOrRun({
			type: 'property',
			property: propName,
			action: 'set',
			details: label
				? `Convert "${oldValue}" to ${label}`
				: `Rename value "${oldValue}" → "${newValue}"`,
			files,
			value: newValue,
			oldValue: oldValue,
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (!(propName in fm)) return null;
				const val = fm[propName];
				let changed = false;
				if (Array.isArray(val)) {
					const newArr = (val as unknown[]).map((v) => {
						if (String(v) === oldValue) {
							changed = true;
							return newValue;
						}
						return v;
					});
					if (changed) fm[propName] = newArr;
				} else if (String(val) === oldValue) {
					fm[propName] = newValue;
					changed = true;
				}
				return changed ? fm : null;
			},
		});
	}
}
