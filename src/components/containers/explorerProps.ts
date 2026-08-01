// src/components/PropsExplorerPanel.ts
import {
	Component,
	Keymap,
	Notice,
	prepareSimpleSearch,
	setIcon,
} from 'obsidian';
import { PropsLogic } from '../../logic/logicProps';
import { DeferredExplorerRender } from '../../logic/logicDeferredExplorerRender';
import {
	DeferredFilterClickCoordinator,
	filterStateToPolarity,
	type FilterPolarity,
} from '../../logic/logicFilterPolarity';
import type { FilterService } from '../../services/serviceFilter';
import type { IconicService } from '../../services/serviceIcons';
import type { ContextMenuService } from '../../services/serviceContextMenu';
import { OperationQueueService } from '../../services/serviceOperationQueue';
import type { StatisticsCacheService } from '../../services/serviceStatisticsCache';
import type { RevealNodeOptions } from '../../services/routerFloatingToc';
import {
	normalizeNodeTypeFilters,
	sameNodeTypeFilters,
} from '../../logic/logicNodeTypeFilters';

export interface PanelPluginCtx {
	app: import('obsidian').App;
	filterService: FilterService;
	iconicService?: IconicService;
	contextMenuService: ContextMenuService;
	queueService: OperationQueueService;
	settings?: {
		minimalStyle: boolean;
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
import type { TreeNode, PropMeta } from '../../types/typeTree';
import type { PropertyChange } from '../../types/typeOps';
import { NATIVE_SET_PROP_TYPE } from '../../types/typeOps';
import { showInputModal } from '../../utils/inputModal';
import { translate } from '../../i18n/index';
import {
	attachBadgeCancelInteraction,
	normalizeBadgeCancelClickMode,
} from '../../utils/badgeInteraction';
import {
	comparePropTypes,
	EDITABLE_PROP_TYPE_OPTIONS,
	resolveNativePropType,
	toNativePropType,
	type MetadataTypeManagerLike,
} from '../../logic/propTypes';
import { normalizeExplorerSortBy } from '../../logic/logicSort';
import {
	activeScopeSort,
	normalizeExplorerSortState,
	sameExplorerSortState,
	sortTwoLevel,
} from '../../logic/logicScopedSort';
import type { ExplorerSortState, ScopeSort } from '../../types/typeUI';
import {
	findParentId,
	indexLevel,
	type FloatingTocExpansionChange,
	type IndexNodeRef,
} from '../../logic/logicIndexGroups';
import { flattenPropertyValues } from '../../logic/logicExplorerHierarchy';
import { collectExpandableSubtreeIds } from '../../logic/logicTreeExpansion';
import {
	normalizeInteractionMode,
	resolveInteractionAction,
	type InteractionMode,
} from '../../logic/logicInteractionMode';
import {
	availablePropertyValueConversions,
	convertPropertyValue,
	parsePropertyValue,
	PROPERTY_VALUE_CONVERSION_OPTIONS,
	replaceMatchingPropertyValue,
	type PropertyValueConversionId,
} from '../../logic/propertyValueCoercion';
import { renderPropertyValue } from '../../utils/renderPropertyValue';
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
type PropFilterTarget = {
	propName: string;
	value: string | undefined;
};
type KeyedPropFilterTarget = {
	key: string;
	target: PropFilterTarget;
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
	private sortState = normalizeExplorerSortState('props', null);
	private searchMode = 0;
	private nodeTypeFilters: string[] = [];
	private visibleCells = new Set<string>(['icon', 'text', 'count', 'nested']);
	private onExpansionChange?: () => void;
	private readonly deferredRender = new DeferredExplorerRender();
	private readonly filterClicks: DeferredFilterClickCoordinator<PropFilterTarget>;

	constructor(containerEl: HTMLElement, plugin: PanelPluginCtx) {
		super();
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.logic = new PropsLogic(plugin.app);
		this.view = new UnifiedTreeView(this.containerEl);
		this.filterClicks = new DeferredFilterClickCoordinator({
			onEffect: (target: PropFilterTarget, polarity: FilterPolarity) =>
				this.plugin.filterService.setPropertyNodePolarity(
					target.propName,
					target.value,
					polarity,
				),
		});
	}

	onload(): void {
		const svc = this.plugin.contextMenuService;

		// Property actions
		svc.registerAction({
			id: 'prop.filter_include',
			nodeTypes: ['prop', 'value'],
			surfaces: ['panel'],
			label: translate('explorer.ctx.filter_include'),
			icon: 'lucide-filter',
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				const filterTarget = this._propFilterTarget(meta);
				this.filterClicks.cancel(filterTarget.key);
				this.plugin.filterService.setPropertyNodePolarity(
					filterTarget.target.propName,
					filterTarget.target.value,
					'inclusive',
				);
			},
		});

		svc.registerAction({
			id: 'prop.filter_exclude',
			nodeTypes: ['prop', 'value'],
			surfaces: ['panel'],
			label: translate('explorer.ctx.filter_exclude'),
			icon: 'lucide-filter-x',
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				const filterTarget = this._propFilterTarget(meta);
				this.filterClicks.cancel(filterTarget.key);
				this.plugin.filterService.setPropertyNodePolarity(
					filterTarget.target.propName,
					filterTarget.target.value,
					'exclusive',
				);
			},
		});

		svc.registerAction({
			id: 'prop.iconic-change',
			nodeTypes: ['prop'],
			surfaces: ['panel'],
			label: translate('iconic.change_icon'),
			icon: 'lucide-image-plus',
			section: 'Icon',
			when: (ctx) =>
				!(ctx.node.meta as PropMeta).isValueNode &&
				this.plugin.iconicService?.canChangePropertyIcon() === true,
			run: (ctx) => {
				this.plugin.iconicService?.openPropertyIconPicker(
					(ctx.node.meta as PropMeta).propName,
					ctx.event,
				);
			},
		});

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
		for (const option of EDITABLE_PROP_TYPE_OPTIONS) {
			svc.registerAction({
				id: `prop.type-${option.type}`,
				nodeTypes: ['prop'],
				surfaces: ['panel'],
				label: translate(option.labelKey),
				icon: option.icon,
				submenu: translate('explorer.ctx.change_type'),
				when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
				checked: (ctx) =>
					this._effectivePropType(ctx.node.meta as PropMeta) === option.type,
				run: (ctx) => {
					const meta = ctx.node.meta as PropMeta;
					if (this._effectivePropType(meta) === option.type) return;
					return this._changePropType(meta.propName, option.type);
				},
			});
		}

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
			id: 'value.checkbox-checked',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Mark checked',
			icon: 'lucide-check-square',
			section: 'Checkbox',
			when: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return (
					this.plugin.settings?.minimalStyle === true &&
					meta.isValueNode &&
					!meta.isTypeIncompatible &&
					meta.propType === 'checkbox' &&
					parsePropertyValue(meta.rawValue ?? '', 'checkbox') !== true
				);
			},
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._setCheckboxValue(meta.propName, meta.rawValue ?? '', true);
			},
		});

		svc.registerAction({
			id: 'value.checkbox-unchecked',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Mark unchecked',
			icon: 'lucide-square',
			section: 'Checkbox',
			when: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return (
					this.plugin.settings?.minimalStyle === true &&
					meta.isValueNode &&
					!meta.isTypeIncompatible &&
					meta.propType === 'checkbox' &&
					parsePropertyValue(meta.rawValue ?? '', 'checkbox') !== false
				);
			},
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._setCheckboxValue(
					meta.propName,
					meta.rawValue ?? '',
					false,
				);
			},
		});

		for (const option of PROPERTY_VALUE_CONVERSION_OPTIONS) {
			svc.registerAction({
				id: option.actionId,
				nodeTypes: ['value'],
				surfaces: ['panel'],
				label: translate(option.labelKey),
				icon: option.icon,
				submenu: translate('explorer.ctx.convert'),
				submenuIcon: 'lucide-arrow-right-left',
				section: 'Text',
				when: (ctx) => {
					const meta = ctx.node.meta as PropMeta;
					return availablePropertyValueConversions(
						meta.propType,
						meta.rawValue ?? '',
						meta.isTypeIncompatible,
					).some((candidate) => candidate.id === option.id);
				},
				run: (ctx) => {
					const meta = ctx.node.meta as PropMeta;
					return this._convertValue(
						meta.propName,
						meta.rawValue ?? '',
						option.id,
						translate(option.labelKey),
					);
				},
			});
		}

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
				this._deferRender();
			}),
		);
		// Re-render after Iconic loads/changes; both are registered for cleanup
		// and coalesced (BT4-002 twin of the tags panel fix).
		const iconic = this.plugin.iconicService;
		if (iconic) {
			this.register(iconic.onLoaded(this._scheduleIconicRender));
			this.register(iconic.onChanged(this._scheduleIconicRender));
		}

		// Re-render dynamically when filters or queues change
		this.plugin.filterService.on('changed', this._handleStateChange);
		this.plugin.queueService.on('changed', this._handleStateChange);

		this._render();
	}

	onunload(): void {
		this.deferredRender.dispose();
		this.filterClicks.dispose();
		this.plugin.filterService.off('changed', this._handleStateChange);
		this.plugin.queueService.off('changed', this._handleStateChange);
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
		this.interactionMode = normalizeInteractionMode('props', mode);
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

	setSortState(state: ExplorerSortState): void {
		const normalizedState = normalizeExplorerSortState('props', state);
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
		if (this.nodeTypeFilters.length > 0) {
			tree = this._filterByTypes(tree, this.nodeTypeFilters);
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
		this._notifyExpansionChanged({ type: 'collapse-all' });
		this._render();
	}

	createFromSearch(term: string, category: number): void {
		const propName = term.trim();
		void category;
		if (!propName) {
			this.interactionMode = 'add';
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

	private _activeFilterIds(): { active: Set<string>; excluded: Set<string> } {
		const active = new Set<string>();
		const excluded = new Set<string>();

		const walkFilter = (
			node: import('../../types/typeFilter').FilterNode,
			isExcluded = false,
		) => {
			if (node.type === 'rule' && node.property) {
				const isNodeExcluded =
					isExcluded ||
					node.filterType === 'missing_property' ||
					node.filterType === 'not_specific_value';
				const targetSet = isNodeExcluded ? excluded : active;

				if (
					node.filterType === 'has_property' ||
					node.filterType === 'missing_property'
				) {
					targetSet.add(node.property);
				} else if (
					node.filterType === 'specific_value' ||
					node.filterType === 'not_specific_value'
				) {
					node.values?.forEach((v) => targetSet.add(`${node.property}::${v}`));
				}
			} else if (node.type === 'group') {
				node.children.forEach((c) =>
					walkFilter(c, isExcluded || node.logic === 'none'),
				);
			}
		};

		walkFilter(this.plugin.filterService.activeFilter);
		return { active, excluded };
	}

	private _handleNodeClick(
		node: TreeNode<PropMeta>,
		event?: MouseEvent | KeyboardEvent,
	): void {
		const meta = node.meta;
		const action = resolveInteractionAction(
			'props',
			this.interactionMode,
			Boolean(Keymap.isModEvent(event)),
		);

		if (action === 'content-search') {
			if (this.onContentSearch) {
				this.onContentSearch(
					meta.isValueNode ? (meta.rawValue ?? node.label) : meta.propName,
				);
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

		if (action === 'add' && !meta.isValueNode) {
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

		const filterState = this.plugin.filterService.getFilterState(
			meta.isValueNode ? 'value' : 'prop',
			meta.propName,
			meta.rawValue,
		);
		const filterTarget = this._propFilterTarget(meta);
		this.filterClicks.click(
			filterTarget.key,
			filterTarget.target,
			filterStateToPolarity(filterState),
		);
	}

	private _propFilterTarget(meta: PropMeta): KeyedPropFilterTarget {
		const value = meta.isValueNode ? (meta.rawValue ?? '') : undefined;
		return {
			key:
				value === undefined
					? `prop:${meta.propName}`
					: `value:${JSON.stringify([meta.propName, value])}`,
			target: { propName: meta.propName, value },
		};
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

	/** Last rendered tree — feeds the floating TOC (index/scope drill). */
	private _lastRenderTree: TreeNode<PropMeta>[] = [];
	onIndexChanged?: (change?: FloatingTocExpansionChange) => void;

	/** Floating TOC: nodes at a scope level (rootId=null → top level). */
	getIndexNodes(rootId: string | null): IndexNodeRef[] {
		return indexLevel(
			this._lastRenderTree,
			rootId,
			(node) => (node.children?.length ?? 0) > 0,
		);
	}

	isIndexableSort(): boolean {
		return ['name', 'path', 'ext'].includes(
			normalizeExplorerSortBy(activeScopeSort('props', this.sortState).sortBy),
		);
	}

	/** Props have no folders — the drill uses the container/leaf hierarchy, no kind toggle. */
	supportsKindToggle(): boolean {
		return false;
	}

	supportsDrill(): boolean {
		return this.viewMode === 'tree';
	}

	/** Re-measure the cached virtual window after a hidden pane becomes visible. */
	refreshViewport(): void {
		if (this.viewMode === 'tree') this.view.refreshViewport();
		else this.tableView?.refreshViewport();
		this.deferredRender.activate(() => this._render());
	}

	scopeRootForNode(id: string): string | null {
		if (this.viewMode !== 'tree') return null;
		return findParentId(this._lastRenderTree, id);
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

	private _setIndexRoots(tree: TreeNode<PropMeta>[]): void {
		this._lastRenderTree = tree;
		this.onIndexChanged?.();
	}

	private _render(): void {
		this.deferredRender.satisfy();
		if (this.viewMode === 'grid') {
			this._renderGrid();
			return;
		}
		let tree = this.logic.getTree();
		const filterSets = this._activeFilterIds();
		const activeFilterIds = filterSets.active;
		const excludedFilterIds = filterSets.excluded;
		const highlightIds = new Set<string>();
		const warningIds = new Set<string>();
		const searchHighlightsEnabled =
			this.plugin.settings?.explorerSearchHighlights === true;

		if (this.nodeTypeFilters.length > 0) {
			tree = this._filterByTypes(tree, this.nodeTypeFilters);
		}
		if (this.searchTerm) {
			tree = this.logic.filterTree(tree, this.searchTerm, this.searchMode);
		}

		// FIX: prepare search function once
		const searcher = this.searchTerm
			? prepareSimpleSearch(this.searchTerm)
			: null;
		const searchFunc =
			searcher && searchHighlightsEnabled
				? (text: string) => searcher(text)
				: null;

		const sorted = this._applySort(tree);
		let nodesWithIcons = this._resolveIcons(
			sorted,
			warningIds,
			highlightIds,
			searchFunc,
			this.plugin.queueService.queue,
		);
		if (!this._nestedEnabled()) {
			nodesWithIcons = flattenPropertyValues(nodesWithIcons);
		}
		this._setIndexRoots(nodesWithIcons);
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
				excludedFilterIds,
				warningIds,
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
				badgeCancelClickMode: this.plugin.settings?.badgeCancelClickMode,
				renderLabel: (container, node) =>
					this._renderPropertyValueLabel(container, node),
			});
			return;
		}

		this.view.render({
			nodes: nodesWithIcons,
			expandedIds: this.expandedIds,
			visibleCells: this.visibleCells,
			filterBubbleLabel: translate('filter.active_descendant'),
			renderLabel: (container, node) =>
				this._renderPropertyValueLabel(container, node as TreeNode<PropMeta>),
			iconInCaretSlot: this.plugin.settings?.iconInCaretSlot === true,
			activeFilterIds,
			excludedFilterIds,
			warningIds,
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
			badgeCancelClickMode: this.plugin.settings?.badgeCancelClickMode,
		});
	}

	private _renderPropertyValueLabel(
		container: HTMLElement,
		node: TreeNode<PropMeta>,
	): boolean {
		if (!node.meta.isValueNode || !this.visibleCells.has('format')) return false;
		if (node.meta.flatLabelPrefix) {
			container.createSpan({
				cls: 'vaultman-property-value-prefix',
				text: node.meta.flatLabelPrefix,
			});
		}
		const label = container.createSpan({
			cls: 'bases-rendered-value vaultman-tree-label vaultman-property-value-cell',
		});
		renderPropertyValue(
			label,
			node.meta.rawValue ?? node.label,
			node.meta.propType ?? 'text',
			this.plugin.app,
		);
		return true;
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
		if (this.nodeTypeFilters.length > 0) {
			tree = this._filterByTypes(tree, this.nodeTypeFilters);
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

	private _toggleExpanded(id: string): void {
		const wasExpanded = this.expandedIds.has(id);
		if (wasExpanded) this.expandedIds.delete(id);
		else this.expandedIds.add(id);
		this._notifyExpansionChanged(
			wasExpanded ? { type: 'collapse-node', id } : undefined,
		);
	}

	private _expandSubtree(id: string, nodes: TreeNode<PropMeta>[]): void {
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

	private _filterByTypes(
		nodes: TreeNode<PropMeta>[],
		nodeTypeFilters: readonly string[],
	): TreeNode<PropMeta>[] {
		const selectedTypes = new Set(nodeTypeFilters);
		return nodes.filter((node) => {
			if (node.meta.isValueNode) return false;
			return selectedTypes.has(this._effectivePropType(node.meta));
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

	private _compareNodes(
		a: TreeNode<PropMeta>,
		b: TreeNode<PropMeta>,
		sort: ScopeSort,
		timeIndex: PropTimeIndex | null,
		typeIndex: Map<string, string> | null = null,
	): number {
		const dir = sort.direction === 'asc' ? 1 : -1;
		const normalizedSortBy = normalizeExplorerSortBy(sort.sortBy);
		if (
			(normalizedSortBy === 'mtime' || normalizedSortBy === 'ctime') &&
			timeIndex
		) {
			return (
				dir *
				(this._timeForPropNode(a, timeIndex) -
					this._timeForPropNode(b, timeIndex))
			);
		}
		if (normalizedSortBy === 'count')
			return dir * ((a.count ?? 0) - (b.count ?? 0));
		if (normalizedSortBy === 'sub')
			return dir * ((a.children?.length ?? 0) - (b.children?.length ?? 0));
		if (normalizedSortBy === 'type') {
			return comparePropTypes(
				typeIndex?.get(a.id) ?? this._effectivePropType(a.meta),
				typeIndex?.get(b.id) ?? this._effectivePropType(b.meta),
				sort.direction,
				a.label,
				b.label,
			);
		}
		return dir * a.label.localeCompare(b.label);
	}

	private _applySort(nodes: TreeNode<PropMeta>[]): TreeNode<PropMeta>[] {
		const propertiesSort = activeScopeSort(
			'props',
			this.sortState,
			'properties',
		);
		const valuesSort = activeScopeSort('props', this.sortState, 'values');
		const propertiesSortBy = normalizeExplorerSortBy(propertiesSort.sortBy);
		const valuesSortBy = normalizeExplorerSortBy(valuesSort.sortBy);
		const propertiesTimeIndex =
			propertiesSortBy === 'mtime' || propertiesSortBy === 'ctime'
				? this._buildPropTimeIndex(propertiesSortBy)
				: null;
		const valuesTimeIndex =
			valuesSortBy === 'mtime' || valuesSortBy === 'ctime'
				? propertiesSortBy === valuesSortBy && propertiesTimeIndex
					? propertiesTimeIndex
					: this._buildPropTimeIndex(valuesSortBy)
				: null;
		const propertiesTypeIndex =
			propertiesSortBy === 'type'
				? new Map(
						nodes.map((node) => [node.id, this._effectivePropType(node.meta)]),
					)
				: null;

		return sortTwoLevel(
			nodes,
			(a, b) =>
				this._compareNodes(
					a,
					b,
					propertiesSort,
					propertiesTimeIndex,
					propertiesTypeIndex,
				),
			(a, b) => this._compareNodes(a, b, valuesSort, valuesTimeIndex),
		);
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
		const filterSets = this._activeFilterIds();
		const activeFilterIds = filterSets.active;
		const excludedFilterIds = filterSets.excluded;
		const highlightIds = new Set<string>();
		const warningIds = new Set<string>();
		const searchHighlightsEnabled =
			this.plugin.settings?.explorerSearchHighlights === true;
		if (this.nodeTypeFilters.length > 0) {
			tree = this._filterByTypes(tree, this.nodeTypeFilters);
		}
		if (this.searchTerm) {
			tree = this.logic.filterTree(tree, this.searchTerm, this.searchMode);
		}
		const searcher = this.searchTerm
			? prepareSimpleSearch(this.searchTerm)
			: null;
		const searchFunc =
			searcher && searchHighlightsEnabled
				? (text: string) => searcher(text)
				: null;
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
			: flattenPropertyValues(resolved);
		this._setIndexRoots(filtered);
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
			card.toggleClass('is-excluded-filter', excludedFilterIds.has(node.id));
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
				const name = card.createDiv({ cls: 'vaultman-prop-card-name' });
				if (!this._renderPropertyValueLabel(name, node))
					name.setText(node.label);
			}
			if (this.visibleCells.has('type')) {
				card.createDiv({
					cls: 'vaultman-prop-card-type',
					text: this._effectivePropType(node.meta),
				});
			}
			this._renderGridBadges(card, node);

			card.addEventListener('click', (event) =>
				this._handleNodeClick(node, event),
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
					this._handleNodeClick(node, event);
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
		payload: VaultmanDragNodePayload & {
			selection?: VaultmanDragNodePayload[];
		},
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
		payload: VaultmanDragNodePayload & {
			selection?: VaultmanDragNodePayload[];
		},
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
				iconColor: iconic?.color || undefined,
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
		conversion: PropertyValueConversionId,
		details: string,
	): Promise<void> {
		const newValue = convertPropertyValue(oldValue, conversion);
		if (newValue === oldValue) return;
		await this._replaceValueInVault(propName, oldValue, newValue, details);
	}

	private async _setCheckboxValue(
		propName: string,
		oldValue: string,
		checked: boolean,
	): Promise<void> {
		await this._replaceValueInVault(
			propName,
			oldValue,
			parsePropertyValue(String(checked), 'checkbox'),
			checked ? 'checked' : 'unchecked',
		);
	}

	private async _replaceValueInVault(
		propName: string,
		oldValue: string,
		newValue: unknown,
		label?: string,
	): Promise<void> {
		if (String(newValue) === oldValue) return;
		const files = this._getFilesWithValue(propName, oldValue);
		this.plugin.queueService.addOrRun({
			type: 'property',
			property: propName,
			action: 'set',
			details: label
				? `Convert "${oldValue}" to ${label}`
				: `Rename value "${oldValue}" → "${String(newValue)}"`,
			files,
			value: String(newValue),
			oldValue: oldValue,
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (!(propName in fm)) return null;
				const replacement = replaceMatchingPropertyValue(
					fm[propName],
					oldValue,
					newValue,
				);
				if (!replacement.changed) return null;
				fm[propName] = replacement.value;
				return fm;
			},
		});
	}
}
