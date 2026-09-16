// src/components/TagsExplorerPanel.ts
import {
	Component,
	App,
	Keymap,
	MarkdownView,
	Notice,
	TFile,
	setIcon,
} from 'obsidian';
import { TagsLogic } from '../../logic/logicTags';
import { observeActiveContentFile } from '../../logic/logicContentActiveFile';
import {
	nestProjectedTagNodes,
	projectActiveFileTags,
} from '../../logic/logicRevealActiveFileTags';
import {
	matchesTagSource,
	orderedTagOccurrences,
	tagOccurrenceKey,
	tagOccurrenceRange,
	tagOccurrences,
	tagSourceLabelKey,
	tagSourceRank,
	TAG_SOURCE_ORDER,
	visibleTagSources,
	type TagCacheLike,
	type TagSource,
} from '../../logic/logicTagSource';
import {
	addToFilesAvailability,
	applyAddToFile,
	type AddToFilesTarget,
} from '../../logic/logicAddToFiles';
import { tagNameProblemKey, validateTagName } from '../../logic/logicTagName';
import { applyCellTooltip } from '../../logic/logicCellTooltip';
import { openFileAtOffset } from '../../utils/openFileAtOffset';
import { renameTargetFromQueue } from '../../logic/logicRenameBadges';
import {
	prefixesFromSettings,
	tagAliasTokens,
} from '../../services/serviceNodeBinding';
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
	nodeBindingService?: import('../../services/serviceNodeBinding').NodeBindingService;
	filterService: FilterService;
	iconicService?: IconicService;
	contextMenuService: ContextMenuService;
	queueService: OperationQueueService;
	settings?: {
		stickyParentRows?: boolean;
		stickyParentRowsMaxFraction?: number;
		badgeCancelClickMode?: import('../../utils/badgeInteraction').BadgeCancelClickMode;
		explorerSearchHighlights?: boolean;
		/** BT5-015 */
		iconInCaretSlot?: boolean;
		selectionCheckboxPosition?: 'start' | 'end' | 'hidden';
		/** U121-077: opt-in red tint for everything the queue will delete. */
		deletionHighlight?: boolean;
		savedLayouts?: import('../../types/typeSettings').SavedLayout[];
		/** U130-05: global layout fallback when per-instance activeLayoutName is null. */
		activeLayoutName?: string;
	};
	statisticsCache?: Pick<StatisticsCacheService, 'getFileTimes'>;
	showDragActionGuide?: (text: string) => void;
	clearDragActionGuide?: () => void;
	revealFrontmatterProperty?: (
		file: TFile,
		propertyName: string,
		source: {
			offset: number;
			content: string;
			range: readonly [number, number];
		},
		propertyValue?: string,
	) => Promise<boolean>;
}
import { UnifiedTreeView } from '../layout/viewTree';
import { NodeTableView } from '../layout/viewNodeTable';
import type { TreeNode, TagMeta } from '../../types/typeTree';
import type { PanelWidgetExplorerProjectionConfig } from '../../types/typePanelWidget';
import type { MenuCtx } from '../../types/typeCMenu';
import { translate } from '../../i18n/index';
import { normalizeExplorerSortBy } from '../../logic/logicSort';
import { formatMembershipUrn } from '../../logic/logicMembershipUrn';
import { bubbleMemberCountsToGroups } from '../../logic/logicBadgeBubbling';
import {
	collectGroupMemberIds,
	collectSelectedMembershipUrns,
	expandNewGroupHeaders,
	isGroupHeader,
	projectGroupedTree,
	resolveCustomGroups,
	toggleGroupMembers,
} from '../../logic/logicTreeGroupProjection';
import {
	NO_GROUP_PRESET,
	sameGroupPreset,
	type GroupPreset,
} from '../../types/typeGroupPreset';
import { translatedRangeLabels } from '../../utils/groupPresetLabels';
import {
	activeScopeSort,
	normalizeExplorerSortState,
	sameExplorerSortState,
	siblingScopeSort,
	sortWithScopes,
} from '../../logic/logicScopedSort';
import type { ExplorerSortState, ScopeSort } from '../../types/typeUI';
import {
	findNodeLevel,
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
	flattenTreeToPathLabels,
	groupRootHierarchy,
	sortFlatProjection,
	tagStructureRank,
} from '../../logic/logicExplorerHierarchy';
import {
	collectExpandableSubtreeIds,
	toggleExpandableSubtreeIds,
} from '../../logic/logicTreeExpansion';
import { collectExplorerDeletionIds } from '../../logic/logicExplorerHighlight';
import { queueDeletesSubject } from '../../logic/logicDeletionDecoration';
import {
	normalizeInteractionMode,
	resolveInteractionAction,
	resolveRecursiveInteractionAction,
	type InteractionMode,
} from '../../logic/logicInteractionMode';
import { toggleDescendantSelection } from '../../logic/logicNodeSelection';
import { resolveSelectionTargets } from '../../logic/logicSelectionTargets';
import {
	readVaultmanDragPayload,
	setVaultmanDragPayload,
	type VaultmanDragNodePayload,
	withActiveFilterDragSelection,
} from '../../utils/dragPayload';
import { flattenVisibleTree } from '../../utils/treeVirtualization';

type DateSortId = 'mtime' | 'ctime';

interface MarkdownEditorLike {
	getValue?: () => unknown;
}

interface MarkdownViewWithContent {
	file?: TFile;
	editor?: MarkdownEditorLike;
}

function sameStringSet(
	a: ReadonlySet<string>,
	b: ReadonlySet<string>,
): boolean {
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
	private visibleCells = new Set<string>([
		'checkbox',
		'icon',
		'text',
		'count',
		'nested',
	]);
	private onExpansionChange?: () => void;
	private onSortStateChange?: (state: ExplorerSortState) => void;
	/** Spec 08 §2: override per_instance sobre `plugin.settings.stickyParentRows`. */
	private stickyRowsOverride: boolean | undefined;
	/** Spec 08: view_option `indent` per_instance. `false` flattens row padding
	 *  to 4px and zeroes the per-depth indent unit. Default (unset) keeps the
	 *  indented geometry of today. */
	private indentOverride: boolean | undefined;
	/** Spec 08 §3.2: the grouping switch IS this selection; `none` = off. */
	private groupPreset: GroupPreset = { ...NO_GROUP_PRESET };
	/** Spec 08 §3.3: set by the navbar; receives the selection's membership URNs. */
	private createGroupHandler?: (urns: readonly string[]) => void;
	/** Spec 08 §4: hidden custom groups of this instance; they project as `No group`. */
	private hiddenGroupIds: ReadonlySet<string> = new Set();
	/** Group headers this explorer has already shown once (they open on first sight). */
	private readonly _seenGroupHeaderIds = new Set<string>();
	private hasConnectedSortStateHandler = false;
	private readonly deferredRender = new DeferredExplorerRender();
	private readonly filterClicks: DeferredFilterClickCoordinator<string>;
	private revealActiveFile = false;
	private revealActivePath: string | null = null;
	private stopRevealWatch?: () => void;
	private revealCycle: {
		path: string;
		tagPath: string;
		signature: string;
		index: number;
	} | null = null;
	/**
	 * Where each tag is written, across the vault. Built on demand — the type
	 * cell, the type sort and the source filters are the only readers — and
	 * dropped whenever the index goes stale, so it never answers for a vault
	 * that has moved on.
	 */
	private tagSourceIndex: Map<string, Set<TagSource>> | null = null;

	private _tagFilterState(meta: TagMeta) {
		return this.plugin.filterService.getFilterState('tag', `#${meta.tagPath}`);
	}

	private _tagFilterMenuLabel(
		ctx: MenuCtx,
		activeState: 'included' | 'excluded',
		fallback: 'explorer.ctx.filter_include' | 'explorer.ctx.filter_exclude',
	): string {
		return this._tagFilterState(ctx.node.meta as TagMeta) === activeState
			? translate('explorer.ctx.filter_clean')
			: translate(fallback);
	}

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
			label: (ctx) =>
				this._tagFilterMenuLabel(ctx, 'included', 'explorer.ctx.filter_include'),
			icon: 'lucide-filter',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as TagMeta;
				this.filterClicks.cancel(`#${meta.tagPath}`);
				this.plugin.filterService.setTagNodePolarity(
					`#${meta.tagPath}`,
					this._tagFilterState(meta) === 'included' ? 'none' : 'inclusive',
				);
			},
		});

		svc.registerAction({
			id: 'tag.filter_exclude',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			label: (ctx) =>
				this._tagFilterMenuLabel(ctx, 'excluded', 'explorer.ctx.filter_exclude'),
			icon: 'lucide-filter-x',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as TagMeta;
				this.filterClicks.cancel(`#${meta.tagPath}`);
				this.plugin.filterService.setTagNodePolarity(
					`#${meta.tagPath}`,
					this._tagFilterState(meta) === 'excluded' ? 'none' : 'exclusive',
				);
			},
		});

		// The same operation the Props explorer offers: the selected tags unioned
		// with the invoked one, written into every file the filter produced, with
		// the destination count stated in the label.
		svc.registerAction({
			id: 'tag.add-to-files',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			label: () =>
				translate('explorer.ctx.add_to_files', {
					count: this.plugin.filterService.filteredFiles.length,
				}),
			icon: 'lucide-file-plus-2',
			when: (ctx: MenuCtx) =>
				addToFilesAvailability(
					this._addToFilesTargets(ctx),
					this.plugin.filterService.filteredFiles.length,
				).available,
			run: (ctx: MenuCtx) => this._addToFiles(ctx),
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
				// U130-p2: actúa sobre la selección si el invocado está en ella
				const targetIds = this._resolveSelectionTargets(ctx);
				const tree = this.logic.getTree();
				for (const id of targetIds) {
					const node = this._findNode(id, tree);
					if (node?.meta) {
						this.plugin.iconicService?.openTagIconPicker(node.meta.tagPath, ctx.event);
					}
				}
			},
		});

		svc.registerAction({
			id: 'tag.rename',
			nodeTypes: ['tag'],
			surfaces: ['panel', 'file-menu'],
			label: 'Rename',
			icon: 'lucide-pencil',
			run: (ctx: MenuCtx) => {
				if (ctx.invokeRename) ctx.invokeRename(ctx.node.id);
				else {
					this.editingId = ctx.node.id;
					this._render();
				}
			},
		});

		svc.registerAction({
			id: 'tag.delete',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			label: 'Delete',
			icon: 'lucide-trash-2',
			run: (ctx: MenuCtx) => {
				// U130-p2: usa la regla canónica resolveSelectionTargets
				const targetIds = this._resolveSelectionTargets(ctx);
				const tree = this.logic.getTree();
				for (const id of targetIds) {
					const node = this._findNode(id, tree);
					if (node?.meta) {
						void this._deleteTag(node.meta.tagPath);
					}
				}
			},
		});

		this.registerEvent(
			this.plugin.app.metadataCache.on('resolved', () => {
				this.logic.invalidate();
				this.tagSourceIndex = null;
				this._deferRender();
			}),
		);
		this.registerEvent(
			this.plugin.app.metadataCache.on('changed', () => {
				if (this.visibleCells.has('format')) {
					this._deferRender();
				}
			}),
		);
		this.registerEvent(
			this.plugin.app.vault.on('create', () => {
				if (this.visibleCells.has('format')) {
					this._deferRender();
				}
			}),
		);
		this.registerEvent(
			this.plugin.app.vault.on('delete', () => {
				if (this.visibleCells.has('format')) {
					this._deferRender();
				}
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
		this._stopRevealWatch();
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
	private selectedNodeIds = new Set<string>();
	/** U130-03: ids de los grupos custom activos. Lo puebla la tarea 3.3. */
	private readonly _groupIds = new Set<string>();
	private activeLayoutName: string | null = null;
	private onContentSearch?: (query: string) => void;

	setActiveLayoutName(name: string | null): void {
		if (this.activeLayoutName === name) return;
		this.activeLayoutName = name;
		void this._render();
	}

	private projectedNodes(
		nodes: readonly TreeNode<TagMeta>[],
	): TreeNode<TagMeta>[] {
		const activeName =
			this.activeLayoutName ?? this.plugin.settings?.activeLayoutName;
		const layout = this.plugin.settings?.savedLayouts?.find(
			(candidate) => candidate.name === activeName,
		);
		const memberships = layout?.groupMemberships ?? {};
		const groups = resolveCustomGroups(memberships).filter(
			(group) => !this.hiddenGroupIds.has(group.id),
		);
		this._groupIds.clear();
		for (const group of groups) this._groupIds.add(group.id);
		const projected = projectGroupedTree<TagMeta>({
			nodes,
			groups,
			memberships,
			providerId: 'tags',
			noGroupLabel: translate('explorer.group.no_group'),
			filtered: this.sortState?.filtered === true,
			urnOf: (node) => this._membershipUrnOf(node),
			// S07A: la cabecera muestra el agregado burbujeado (identidades,
			// no ocurrencias) en vez de `children.length`.
			groupTotals: bubbleMemberCountsToGroups({ groups, memberships }),
			// Spec 08 §3.1.bis: the preset selection is the switch, never the
			// sort scope.
			enabled: this.groupPreset.kind !== 'none',
			preset: this.groupPreset,
			presetValueOf: (node, kind) => this._groupPresetValue(node, kind),
			rangeLabels: translatedRangeLabels(),
			// Dev 2026-09-14: la cabecera colapsada burbujea los badges como un p-node.
			expandedIds: this.expandedIds,
			// L-PNODE: la cabecera entra por el camino comun de los p-nodes
			// de tags: clases nativas y meta propia en vez de la prestada
			// del primer hijo.
			headerCoreCls: 'tree-item-self tag-pane-tag is-clickable',
			headerMeta: { tagPath: '' },
		}) as TreeNode<TagMeta>[];
		expandNewGroupHeaders(projected, this._seenGroupHeaderIds, this.expandedIds, this._groupIds);
		return projected;
	}

	setInteractionMode(
		mode: InteractionMode,
		onContentSearch?: (query: string) => void,
	): void {
		const normalized = normalizeInteractionMode('tags', mode);
		this.onContentSearch = onContentSearch;
		if (this.interactionMode === normalized) return;
		this.interactionMode = normalized;
		this._render();
	}

	private _selectionViewOptions() {
		if (this.interactionMode === 'select') {
			return {
				selectedIds: this.selectedNodeIds,
				selectionCheckboxPosition: this.visibleCells.has('checkbox')
					? (this.plugin.settings?.selectionCheckboxPosition ?? 'start')
					: 'hidden',
				onSelectionToggle: (id: string, selected: boolean) => {
					if (selected) this.selectedNodeIds.add(id);
					else this.selectedNodeIds.delete(id);
					void this._render();
				},
			} as const;
		}
		return {};
	}

	/**
	 * U130-p2: visible tree node IDs in render order for selection resolution.
	 */
	private _orderedVisibleTreeIds(): string[] {
		const tree = this.logic.getTree();
		if (!tree) return [];
		return flattenVisibleTree(tree, this.expandedIds).map((node) => node.id);
	}

	private _renderCardSelectionCheckbox(
		card: HTMLElement,
		node: TreeNode<TagMeta>,
	): void {
		if (this.interactionMode !== 'select') return;
		const position = this.plugin.settings?.selectionCheckboxPosition ?? 'start';
		if (position === 'hidden' || !this.visibleCells.has('checkbox')) return;
		card.dataset.id = node.id;
		const checkbox = card.createEl('input', {
			type: 'checkbox',
			cls: `metadata-input-checkbox vaultman-selection-checkbox vaultman-selection-checkbox--${position}`,
			attr: { 'aria-label': `Select ${node.label}` },
		});
		checkbox.checked = this.selectedNodeIds.has(node.id);
		checkbox.addEventListener('click', (event) => event.stopPropagation());
		checkbox.addEventListener('change', (event) => {
			event.stopPropagation();
			if (checkbox.checked) this.selectedNodeIds.add(node.id);
			else this.selectedNodeIds.delete(node.id);
			card.toggleClass('is-selected', checkbox.checked);
		});
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

	configurePanelWidgetProjection(
		config: PanelWidgetExplorerProjectionConfig,
	): void {
		const viewChanged = this.viewMode !== config.viewMode;
		const cellsChanged = !sameStringSet(this.visibleCells, config.visibleCells);
		const normalizedSort = normalizeExplorerSortState('tags', config.sortState);
		const nextFilters = normalizeNodeTypeFilters(
			normalizedSort.nodeTypeFilters ?? normalizedSort.nodeTypeFilter,
		);
		const sortChanged =
			!sameExplorerSortState(this.sortState, normalizedSort) ||
			!sameNodeTypeFilters(this.nodeTypeFilters, nextFilters);
		const normalizedInteractionMode = config.interactionMode
			? normalizeInteractionMode('tags', config.interactionMode)
			: undefined;
		const interactionChanged =
			normalizedInteractionMode !== undefined &&
			this.interactionMode !== normalizedInteractionMode;
		const stickyChanged =
			config.stickyRows !== undefined &&
			this.stickyRowsOverride !== config.stickyRows;
		const indentChanged =
			config.indent !== undefined && this.indentOverride !== config.indent;
		const presetChanged =
			config.groupPreset !== undefined &&
			!sameGroupPreset(this.groupPreset, config.groupPreset);

		if (
			!viewChanged &&
			!cellsChanged &&
			!sortChanged &&
			!interactionChanged &&
			!stickyChanged &&
			!indentChanged &&
			!presetChanged
		) {
			return;
		}

		if (viewChanged) {
			this.viewMode = config.viewMode;
			if (config.viewMode === 'tree') {
				this.tableView?.destroy();
				this.view.destroy();
				this.containerEl.empty();
				this.view = new UnifiedTreeView(this.containerEl);
			} else {
				this.view.destroy();
				if (config.viewMode === 'grid') {
					this.tableView?.destroy();
					this.containerEl.empty();
				}
			}
		}
		if (cellsChanged) {
			this.visibleCells = new Set(config.visibleCells);
		}
		if (sortChanged) {
			this.sortState = normalizedSort;
			this.nodeTypeFilters = nextFilters;
		}
		if (interactionChanged && normalizedInteractionMode) {
			this.interactionMode = normalizedInteractionMode;
		}
		if (indentChanged) {
			this.indentOverride = config.indent;
		}
		if (stickyChanged) {
			this.stickyRowsOverride = config.stickyRows;
		}
		if (presetChanged && config.groupPreset) {
			this.groupPreset = { ...config.groupPreset };
		}
		if (config.hiddenGroupIds) this.setHiddenGroupIds(config.hiddenGroupIds);

		this._render();
	}

	setGroupPreset(preset: GroupPreset): void {
		if (sameGroupPreset(this.groupPreset, preset)) return;
		this.groupPreset = { ...preset };
		this._render();
	}

	setHiddenGroupIds(ids: readonly string[]): void {
		const next = new Set(ids);
		if (
			next.size === this.hiddenGroupIds.size &&
			[...next].every((id) => this.hiddenGroupIds.has(id))
		) {
			return;
		}
		this.hiddenGroupIds = next;
		this._render();
	}

	setCreateGroupHandler(
		handler?: (urns: readonly string[]) => void,
	): void {
		this.createGroupHandler = handler;
	}

	private _membershipUrnOf(node: TreeNode<TagMeta>): string {
		return formatMembershipUrn({
			providerId: 'tags',
			kind: 'tag',
			canonicalId: node.meta.tagPath,
			displayLabel: node.label,
		});
	}

	/** Spec 08 §3.3: only in select mode with a selection, and only if someone listens. */
	private _groupCreationMenuCtx(): Pick<MenuCtx, 'createGroupWithSelected'> {
		const handler = this.createGroupHandler;
		if (
			!handler ||
			this.interactionMode !== 'select' ||
			this.selectedNodeIds.size === 0
		) {
			return {};
		}
		return {
			createGroupWithSelected: () =>
				handler(
					collectSelectedMembershipUrns(
						this._lastRenderTree,
						this.selectedNodeIds,
						(node) => this._membershipUrnOf(node),
						this._groupIds,
					),
				),
		};
	}

	setStickyRowsEnabled(enabled: boolean): void {
		if (this.stickyRowsOverride === enabled) return;
		this.stickyRowsOverride = enabled;
		this._render();
	}

	setIndentEnabled(enabled: boolean): void {
		if (this.indentOverride === enabled) return;
		this.indentOverride = enabled;
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
		return this._expansionEnabled() && this.expandedIds.size > 0;
	}

	setExpansionChangeHandler(handler?: () => void): void {
		this.onExpansionChange = handler;
	}

	expandAll(): void {
		if (!this._expansionEnabled()) return;
		// The same tree the render walks, reveal included: expanding rows the
		// projection does not show would leave the ids behind when it closes.
		let tree = this._scopeProjection(this.logic.getTree());
		if (this.searchMode === 'leaf') {
			tree = this._collectLeaves(tree);
		}
		if (this.nodeTypeFilters.length > 0) {
			tree = this._filterByNodeTypes(tree, this.nodeTypeFilters);
		}
		if (this.searchTerm) {
			tree = this.logic.filterTree(tree, this.searchTerm);
		}
		// L-PNODE: el MISMO arbol que pinta la vista, aplanado incluido y con
		// la proyeccion de grupos. Sin esto las cabeceras quedaban fuera del
		// toggle, y con anidacion apagada el toggle entero moria en la guarda.
		if (!this._nestedEnabled()) {
			tree = this._sortFlat(
				flattenTreeToPathLabels(tree, '/', {
					showParent: this.visibleCells.has('parent'),
				}),
			);
		}
		this._expandAll(this.projectedNodes(tree));
		this._notifyExpansionChanged();
		this._render();
	}

	collapseAll(): void {
		this.expandedIds.clear();
		this._notifyExpansionChanged({ type: 'collapse-all' });
		this._render();
	}

	// --- `reveal this file` ----------------------------------------------------
	//
	// The Props precedent (`logicRevealActiveFileProps`), applied to tags: a
	// filter over the snapshot the explorer already built, not a second index.
	// The order is the note's, which is what makes the `note` sort mean
	// something here.

	isRevealingActiveFile(): boolean {
		return this.revealActiveFile;
	}

	/**
	 * Toolbar reveal-faint oracle: is this path inside the file set the
	 * scene projects (the active filter's survivors when `filtered` is on)?
	 */
	isPathListed(path: string): boolean {
		return this.plugin.filterService.filteredFiles.some(
			(file) => file.path === path,
		);
	}

	toggleRevealActiveFile(): void {
		this.revealActiveFile = !this.revealActiveFile;
		this.revealCycle = null;
		if (this.revealActiveFile) this._startRevealWatch();
		else this._stopRevealWatch();
		this._render();
	}

	private _startRevealWatch(): void {
		if (this.stopRevealWatch) return;
		const workspace = this.plugin.app.workspace;
		const vault = this.plugin.app.vault;
		// The watcher that already exists: it resolves open, rename and delete,
		// so reveal does not add a second idea of which file is active.
		this.stopRevealWatch = observeActiveContentFile(
			{
				current: () => workspace.getActiveFile(),
				onFileOpen: (listener) => {
					const ref = workspace.on('file-open', (file) => listener(file));
					return () => workspace.offref(ref);
				},
				onRename: (listener) => {
					const ref = vault.on('rename', (file, oldPath) => {
						if (file instanceof TFile) listener(file, oldPath);
					});
					return () => workspace.offref(ref);
				},
				onDelete: (listener) => {
					const ref = vault.on('delete', (file) => {
						if (file instanceof TFile) listener(file);
					});
					return () => workspace.offref(ref);
				},
			},
			(path) => {
				this.revealActivePath = path;
				this._render();
			},
		);
	}

	private _stopRevealWatch(): void {
		this.stopRevealWatch?.();
		this.stopRevealWatch = undefined;
		this.revealActivePath = null;
		this.revealCycle = null;
	}

	/**
	 * Which note reveal is projecting. An anchored note outranks the workspace,
	 * exactly as in Props: the user picked that one, so opening something else
	 * no longer moves the projection until `Current file` releases it.
	 */
	private _revealPath(): string | null {
		if (this.sortState?.revealAnchor === 'pinned') {
			return this.sortState.revealAnchorPath ?? null;
		}
		return this.revealActivePath;
	}

	/** The revealed note's metadata, or `null` when there is no such note. */
	private _revealCache(): TagCacheLike | null {
		const path = this._revealPath();
		if (!path) return null;
		const file = this.plugin.app.vault.getFileByPath(path);
		if (!(file instanceof TFile)) return null;
		return this.plugin.app.metadataCache.getFileCache(file) ?? {};
	}

	/** Read the active editor when possible so reveal uses unsaved loaded text. */
	private async _revealContent(file: TFile): Promise<string | null> {
		const workspace = this.plugin.app.workspace;
		const active = workspace.getActiveViewOfType(
			MarkdownView,
		) as MarkdownViewWithContent | null;
		if (active?.file?.path === file.path) {
			try {
				const content = active.editor?.getValue?.();
				if (typeof content === 'string') return content;
			} catch {
				// A view can be torn down between the active-file check and getValue.
			}
		}
		try {
			return await this.plugin.app.vault.cachedRead(file);
		} catch {
			return null;
		}
	}

	/**
	 * Jump to and highlight a tag occurrence in the revealed note. A structural
	 * parent owns all descendant occurrences, so repeated clicks cycle the same
	 * targets instead of alternating with the beginning of the note.
	 */
	private async _revealTagAt(tagPath: string): Promise<void> {
		const path = this._revealPath();
		if (!path) return;
		const file = this.plugin.app.vault.getFileByPath(path);
		if (!(file instanceof TFile)) return;
		const cache = this._revealCache();
		const occurrences = tagOccurrences(cache);
		const selectedSources = this._selectedTagSources();
		const sort = activeScopeSort('tags', this.sortState);
		const ordered = orderedTagOccurrences(
			occurrences,
			tagPath,
			sort.direction,
			selectedSources,
		);
		if (ordered.length === 0) {
			this.revealCycle = null;
			return;
		}

		const occurrenceSignature = ordered.map(tagOccurrenceKey).join('|');
		const cycleSignature = [
			path,
			tagPath,
			sort.sortBy,
			sort.direction,
			selectedSources.join(','),
			occurrenceSignature,
		].join('|');
		const previousCycle = this.revealCycle;
		const continuing =
			previousCycle?.path === path &&
			previousCycle.tagPath === tagPath &&
			previousCycle.signature === cycleSignature;
		const index =
			continuing && ordered.length > 1
				? ((previousCycle?.index ?? -1) + 1) % ordered.length
				: 0;
		const occurrence = ordered[index];
		const content = await this._revealContent(file);
		if (content === null) return;
		const sameSourcePath = occurrences.filter(
			(candidate) =>
				candidate.source === occurrence.source &&
				candidate.tagPath === occurrence.tagPath,
		);
		const range = tagOccurrenceRange(occurrence, content, {
			frontmatterStartOffset: cache?.frontmatterPosition?.start?.offset,
			frontmatterEndOffset: cache?.frontmatterPosition?.end?.offset,
			occurrenceIndex: sameSourcePath.indexOf(occurrence),
		});
		// A missing metadata position is recoverable from the loaded text. If the
		// text also has no matching token, do not send offset zero to the editor.
		if (!range) return;
		const opened =
			occurrence.source === 'frontmatter' &&
			typeof this.plugin.revealFrontmatterProperty === 'function'
				? await this.plugin.revealFrontmatterProperty(
						file,
						'tags',
						{ offset: range[0], content, range },
						// A11: the pill to flash in Visible mode, not the whole row.
						tagPath,
					)
				: await openFileAtOffset(this.plugin.app, file, range[0], {
						match: { content, range },
						source: occurrence.source,
					});
		if (!opened) return;
		this.revealCycle = {
			path,
			tagPath,
			signature: cycleSignature,
			index,
		};
	}

	private _selectedTagSources(): TagSource[] {
		return TAG_SOURCE_ORDER.filter((source) =>
			this.nodeTypeFilters.includes(source),
		);
	}

	/**
	 * Narrows an already-built snapshot; it never asks for a new one. Reveal
	 * and the `filtered` switch are the narrowings the tags tree has, so this
	 * is where any other would join it rather than being applied at each call
	 * site. Reveal wins when both are on: it is already a single note.
	 */
	private _scopeProjection(snapshot: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		if (!this.revealActiveFile) {
			if (this.sortState?.filtered === true) {
				return this._filteredProjection(snapshot);
			}
			return snapshot;
		}
		const projected = projectActiveFileTags(snapshot, this._revealCache());
		// The projection is flat on purpose (a note holds whole paths), so
		// with `nested` on it must be regrouped — otherwise on and off render
		// the same plane.
		return this._nestedEnabled()
			? nestProjectedTagNodes(projected, snapshot)
			: projected;
	}

	/**
	 * Narrows the snapshot to the tags the active filter leaves standing,
	 * like the Props scene does. Reveal wins over it (see `_scopeProjection`):
	 * it is already a single note. A parent survives when a descendant does.
	 */
	private _filteredProjectionCache: {
		snapshot: readonly TreeNode<TagMeta>[];
		files: readonly unknown[];
		projection: TreeNode<TagMeta>[];
	} | null = null;

	private _filteredProjection(
		snapshot: TreeNode<TagMeta>[],
	): TreeNode<TagMeta>[] {
		if (!this.plugin.filterService.narrowsVault()) return snapshot;
		const files = this.plugin.filterService.filteredFiles;
		const cached = this._filteredProjectionCache;
		if (cached && cached.snapshot === snapshot && cached.files === files) {
			return cached.projection;
		}
		const allowed = new Set<string>();
		for (const file of files) {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			for (const occurrence of tagOccurrences(cache)) {
				const parts = occurrence.tagPath.split('/');
				let path = '';
				for (const part of parts) {
					path = path ? `${path}/${part}` : part;
					allowed.add(path);
				}
			}
		}
		const projection = this._keepAllowedTags(snapshot, allowed);
		this._filteredProjectionCache = { snapshot, files, projection };
		return projection;
	}

	private _keepAllowedTags(
		nodes: TreeNode<TagMeta>[],
		allowed: ReadonlySet<string>,
	): TreeNode<TagMeta>[] {
		const kept: TreeNode<TagMeta>[] = [];
		for (const node of nodes) {
			const children = this._keepAllowedTags(node.children ?? [], allowed);
			if (children.length > 0 || allowed.has(node.meta.tagPath)) {
				kept.push(
					children.length === (node.children?.length ?? 0)
						? node
						: { ...node, children },
				);
			}
		}
		return kept;
	}

	/**
	 * Where each tag in the vault is written. One pass over the metadata cache,
	 * the same shape as the date index above, kept until the cache resolves
	 * again.
	 */
	private _sourceIndex(): Map<string, Set<TagSource>> {
		if (this.tagSourceIndex) return this.tagSourceIndex;
		const index = new Map<string, Set<TagSource>>();
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			for (const occurrence of tagOccurrences(cache)) {
				// Every ancestor of a nested tag is a row of its own, and it is
				// written wherever its descendants are — otherwise `parent`
				// would answer the type question with nothing at all.
				const parts = occurrence.tagPath.split('/');
				let path = '';
				for (const part of parts) {
					path = path ? `${path}/${part}` : part;
					const sources = index.get(path) ?? new Set<TagSource>();
					sources.add(occurrence.source);
					index.set(path, sources);
				}
			}
		}
		this.tagSourceIndex = index;
		return index;
	}

	/**
	 * The sources of one node. Reveal carries the note's own answer on the
	 * node, and nothing else may answer for the note: the vault-wide index
	 * aggregates every note, so a tag the revealed note writes in one place
	 * would come back `both`. Non-reveal trees still ask the index.
	 */
	private _sourcesFor(
		node: TreeNode<TagMeta>,
	): ReadonlySet<TagSource> | undefined {
		if (this.revealActiveFile) return node.meta.tagSources;
		return node.meta.tagSources ?? this._sourceIndex().get(node.meta.tagPath);
	}

	private _decorateNodeNotes(nodes: TreeNode<TagMeta>[]): void {
		const app = this.plugin.app;
		if (!app?.vault) return;

		const aliasSet = new Set<string>();
		const markdownFiles = app.vault.getMarkdownFiles?.() ?? [];
		for (const file of markdownFiles) {
			const fm = app.metadataCache?.getFileCache(file)?.frontmatter;
			if (fm?.aliases) {
				if (Array.isArray(fm.aliases)) {
					for (const a of fm.aliases) {
						if (typeof a === 'string') aliasSet.add(a.trim());
					}
				} else if (typeof fm.aliases === 'string') {
					aliasSet.add(fm.aliases.trim());
				}
			}
		}

		const visit = (list: TreeNode<TagMeta>[]) => {
			for (const node of list) {
				const tagPath = node.meta?.tagPath ?? node.label;
				const tagTokens = tagAliasTokens(
					tagPath,
					prefixesFromSettings(this.plugin.settings),
				);
				if (tagTokens.some((t) => aliasSet.has(t))) {
					node.meta.hasNodeNote = true;
				}
				if (node.children?.length) {
					visit(node.children);
				}
			}
		};

		visit(nodes);
	}

	private _decorateTypeText(nodes: TreeNode<TagMeta>[]): void {
		const selectedSources = this._selectedTagSources();
		for (const node of nodes) {
			const labelKey = tagSourceLabelKey(
				visibleTagSources(this._sourcesFor(node), selectedSources),
			);
			node.typeText = labelKey ? translate(labelKey) : undefined;
			this._decorateTypeText(node.children ?? []);
		}
	}

	private _compareNodes(
		a: TreeNode<TagMeta>,
		b: TreeNode<TagMeta>,
		sort: ScopeSort,
		timeIndex: Map<string, number> | null,
	): number {
		const dir = sort.direction === 'asc' ? 1 : -1;
		const normalizedSortBy = normalizeExplorerSortBy(sort.sortBy);
		// 'note' is the anchored note's own order; the projection already
		// carries it, so the comparator leaves the sequence untouched.
		// 'anchor' (U130 #101/#90) is the same anchored scope as an explicit
		// sort option, so it shares the keep-order semantics.
		if (normalizedSortBy === 'note' || normalizedSortBy === 'anchor')
			return 0;
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
			// A tag's type has two halves — its shape and where it is written —
			// and the By type menu now offers both. Shape stays the primary key
			// so the order that shipped is the order that comes back when every
			// tag is written in the same place; the source only decides the
			// ties the label used to decide alone.
			const structure = tagStructureRank(a) - tagStructureRank(b);
			if (structure !== 0) return dir * structure;
			const source =
				tagSourceRank(this._sourcesFor(a)) - tagSourceRank(this._sourcesFor(b));
			if (source !== 0) return dir * source;
			// The label tie break stays ascending whichever way the type runs,
			// as it was when `compareTagStructure` owned the whole comparison.
			return a.label.localeCompare(b.label);
		}
		return dir * a.label.localeCompare(b.label);
	}

	private _applySort(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		// Spec 08 §3.1: every level resolves parent → level → all. The time
		// index is built once per distinct date sort, whichever scopes share it.
		const timeIndexes = new Map<DateSortId, Map<string, number>>();
		const timeIndexFor = (sort: ScopeSort) => {
			const sortBy = normalizeExplorerSortBy(sort.sortBy);
			if (sortBy !== 'mtime' && sortBy !== 'ctime') return null;
			let index = timeIndexes.get(sortBy);
			if (!index) {
				index = this._buildTagTimeIndex(sortBy);
				timeIndexes.set(sortBy, index);
			}
			return index;
		};
		return sortWithScopes(
			nodes,
			(parentId, level) =>
				siblingScopeSort('tags', this.sortState, parentId, level),
			(sort) => {
				const timeIndex = timeIndexFor(sort);
				return (a, b) => this._compareNodes(a, b, sort, timeIndex);
			},
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
			for (const id of collectExpandableSubtreeIds(n)) this.expandedIds.add(id);
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
		const { expanded, changedIds } = toggleExpandableSubtreeIds(
			root,
			this.expandedIds,
		);
		if (changedIds.length === 0) return;
		this._notifyExpansionChanged(
			expanded ? undefined : { type: 'collapse-node', id },
		);
		void this._render();
	}

	/**
	 * U130 gestures: `hold` / double click on `input: select` toggles every
	 * descendant of the node in this instance's own selection. Never opens,
	 * never expands, never queues a file operation.
	 */
	private _toggleDescendantSelection(id: string): void {
		const node = this._findNode(id, this._lastRenderTree);
		if (!node?.children?.length) return;
		this.selectedNodeIds = toggleDescendantSelection(
			node,
			this.selectedNodeIds,
		);
		void this._render();
	}

	/**
	 * B-groupbody: accion del CUERPO del row de grupo segun el modo. En
	 * `select` conmuta los MIEMBROS (ids de entidad, sin el sufijo `@grupo`);
	 * en el resto colapsa/expande. Un grupo no puede ser criterio de filtro
	 * (`serviceFilter.getFilterState` solo acepta folder/tag/prop/value):
	 * fallback a open, nunca el veto.
	 */
	private _activateGroupRow(id: string): void {
		if (this.interactionMode === 'select') {
			const node = this._findNode(
				id,
				this.projectedNodes(this._lastRenderTree),
			);
			if (!node?.children?.length) return;
			const members = collectGroupMemberIds(node.children);
			if (members.length === 0) return;
			const { next } = toggleGroupMembers(this.selectedNodeIds, members);
			this.selectedNodeIds = next;
			void this._render();
			return;
		}
		this._toggleExpanded(id);
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

	scopeLevelForNode(id: string): number | null {
		if (this.viewMode !== 'tree') return null;
		return findNodeLevel(this._lastRenderTree, id);
	}

	/** Re-measure the cached virtual window after a hidden pane becomes visible. */
	refreshViewport(): void {
		if (this.viewMode === 'tree') this.view.refreshViewport();
		else this.tableView?.refreshViewport();
		this.deferredRender.activate(() => this._render());
	}

	/**
	 * U130-p2: resuelve los targets de la selección usando la regla
	 * canónica `resolveSelectionTargets` para tags.
	 */
	private _resolveSelectionTargets(ctx: MenuCtx): string[] {
		const selectedIds = ctx.selectedIds ?? this.selectedNodeIds;
		const orderedIds = ctx.orderedIds ?? this._orderedVisibleTreeIds();
		return resolveSelectionTargets(ctx.node.id, selectedIds, orderedIds);
	}

	private _addToFilesTargets(ctx: MenuCtx): AddToFilesTarget[] {
		// U130-p2: usa la regla canónica resolveSelectionTargets
		const targetIds = this._resolveSelectionTargets(ctx);
		const tree = this.logic.getTree();
		const targets: AddToFilesTarget[] = [];
		for (const id of targetIds) {
			const node = this._findNode(id, tree);
			if (node?.meta) {
				targets.push({ id: node.id, kind: 'tag', tag: node.meta.tagPath });
			}
		}
		return targets;
	}

	private _addToFiles(ctx: MenuCtx): void {
		const files = this.plugin.filterService.filteredFiles;
		const targets = this._addToFilesTargets(ctx);
		const availability = addToFilesAvailability(targets, files.length);
		if (!availability.available) return;
		if (!availability.enabled) {
			new Notice(translate('explorer.ctx.add_to_files.empty'));
			return;
		}

		for (const target of targets) {
			if (target.kind !== 'tag') continue;
			this.plugin.queueService.addOrRun({
				type: 'tag',
				tag: target.tag,
				action: 'add',
				details: `Add tag "#${target.tag}" to ${files.length} files`,
				files,
				customLogic: true,
				logicFunc: (_file, fm) => {
					const outcome = applyAddToFile(target, fm);
					return outcome.status === 'written' ? outcome.frontmatter : null;
				},
			});
		}
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

	private _decorateSubCounts(nodes: TreeNode<TagMeta>[]): void {
		for (const node of nodes) {
			node.subCountText =
				node.children && node.children.length > 0
					? String(node.children.length)
					: undefined;
			this._decorateSubCounts(node.children ?? []);
		}
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
		// Reveal narrows the snapshot before anything else reads it, so search,
		// the type filters and every sort work on the same tree instead of each
		// deciding for itself which one it is looking at.
		let tree = this._scopeProjection(this.logic.getTree());

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
			nodesWithIcons = this._sortFlat(
				flattenTreeToPathLabels(nodesWithIcons, '/', {
					showParent: this.visibleCells.has('parent'),
				}),
			);
		}
		if (nodesWithIcons.length === 0) {
			this._setIndexRoots([]);
			this._renderEmptyState();
			return;
		}
		// U121-077: el tachado gris va siempre; el tinte rojo es opcional y
		// esta apagado por defecto. El bubble no depende de ninguno de los dos.
		const deletionIds =
			this.plugin.settings?.deletionHighlight === true
				? collectExplorerDeletionIds(nodesWithIcons)
				: new Set<string>();
		this._setIndexRoots(nodesWithIcons);
		if (this.visibleCells.has('sub')) {
			this._decorateSubCounts(nodesWithIcons);
		}
		if (this.visibleCells.has('type')) {
			this._decorateTypeText(nodesWithIcons);
		}
		if (this.visibleCells.has('format')) {
			this._decorateNodeNotes(nodesWithIcons);
		}

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
				...this._selectionViewOptions(),
				highlightIds: {
					inclusive: activeFilterIds,
					exclusive: excludedFilterIds,
					deletion: deletionIds,
				},
				statusDotLabel: () => translate('filter.active_descendant'),
				searchHighlightIds: highlightIds,
				onToggle: (id: string) => {
					this._toggleExpanded(id);
					void this._render();
				},
				onRecursiveExpand: (id: string) =>
					resolveRecursiveInteractionAction(this.interactionMode) ===
					'select-descendants'
						? this._toggleDescendantSelection(id)
						: this._expandSubtree(id, nodesWithIcons),
				onRowDoubleClick: (id: string) =>
					resolveRecursiveInteractionAction(this.interactionMode) ===
					'select-descendants'
						? this._toggleDescendantSelection(id)
						: this._expandSubtree(id, nodesWithIcons),
				onRowClick: (id: string, event) => {
					// B-groupbody: la tabla no proyecta cabeceras; este veto era
					// codigo muerto. Fuera.
					const node = this._findNode(id, tree);
					if (!node) return;
					this._handleNodeClick(node, event);
				},
				onContextMenu: (id: string, event: MouseEvent) => {
					// B-groupbody: idem (la tabla no proyecta cabeceras).
					const node = this._findNode(id, tree);
					if (!node) return;
					this.plugin.contextMenuService.openPanelMenu(
						{
							nodeType: 'tag',
							node,
							surface: 'panel',
							selectedIds: this.selectedNodeIds,
							orderedIds: this._orderedVisibleTreeIds(),
							...this._groupCreationMenuCtx(),
							invokeRename: (targetId: string) => {
								this.editingId = targetId;
								void this._render();
							},
						},
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
			surface: 'tags',
			nodes: this.projectedNodes(nodesWithIcons),
			expandedIds: this.expandedIds,
			visibleCells: this.visibleCells,
			indentGuides: this._indentGuidesActive(),
			indent: this.indentOverride ?? true,
			stickyParentRows:
				this.stickyRowsOverride ?? this.plugin.settings?.stickyParentRows !== false,
			stickyMaxFraction: this.plugin.settings?.stickyParentRowsMaxFraction,
			...this._selectionViewOptions(),
			filterBubbleLabel: translate('filter.active_descendant'),
			renderLabel: (row, node) => {
				const queue = this.plugin.queueService.queue;
				const target = renameTargetFromQueue(queue, node.id);
				if (target) {
					const label = row.createSpan({
						cls: 'vaultman-tree-label vaultman-rename-preview',
						text: target,
					});
					if (node.labelColor) label.style.color = node.labelColor;
					return true;
				}
				if (
					this.visibleCells.has('format') &&
					(node.meta as TagMeta)?.hasNodeNote === true
				) {
					const label = row.createSpan({
						cls: 'vaultman-tree-label vaultman-node-note-link',
						text: node.label,
					});
					if (node.labelColor) label.style.color = node.labelColor;
					label.onclick = (e) => {
						e.stopPropagation();
						e.preventDefault();
						const tagPath = (node.meta as TagMeta)?.tagPath ?? node.label;
						void this.plugin.nodeBindingService?.bindOrCreate(
							{ kind: 'tag', label: node.label, tagPath },
							{ newLeaf: e.ctrlKey || e.metaKey || e.button === 1 },
						);
					};
					return true;
				}
				return false;
			},
			iconInCaretSlot: this.plugin.settings?.iconInCaretSlot === true,
			highlightIds: {
				inclusive: activeFilterIds,
				exclusive: excludedFilterIds,
				deletion: deletionIds,
			},
			statusDotLabel: () => translate('filter.active_descendant'),
			searchHighlightIds: highlightIds,
			editingId: this.editingId,
			onRename: (id, newLabel) => {
				newLabel = newLabel.replace(
					/\{date\}|\[fecha\]/gi,
					new Date().toISOString().slice(0, 10),
				);
				// BT5-077: a rejected name keeps the inline editor open, so the
				// typed text can be corrected instead of being discarded.
				const check = validateTagName(newLabel);
				if (!check.valid || !check.name) {
					new Notice(
						translate(tagNameProblemKey(check.reason ?? 'invalid_char')),
					);
					void this._render();
					return;
				}
				const node = this._findNode(id, tree);
				if (node) void this._renameTag(node.meta.tagPath, check.name);
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
			// B-groupbody: el cuerpo del row de grupo entra por el motor; el
			// chevron queda en `onToggle` puro.
			onGroupActivate: (id: string) => {
				this._activateGroupRow(id);
			},
			onRecursiveExpand: (id: string) =>
				resolveRecursiveInteractionAction(this.interactionMode) ===
				'select-descendants'
					? this._toggleDescendantSelection(id)
					: this._expandSubtree(id, this.projectedNodes(nodesWithIcons)),
			onRowDoubleClick: (id: string) =>
				resolveRecursiveInteractionAction(this.interactionMode) ===
				'select-descendants'
					? this._toggleDescendantSelection(id)
					: this._expandSubtree(id, this.projectedNodes(nodesWithIcons)),
			onRecursiveSelect: (id: string) => this._toggleDescendantSelection(id),
			onRowClick: (id: string, event) => {
				if (isGroupHeader(id, this._groupIds)) {
					// B-groupbody: el motor ya no trae el cuerpo por aqui
					// (va a `onGroupActivate`); el auxclick si. Mismo camino.
					this._activateGroupRow(id);
					return;
				}
				const node = this._findNode(id, tree);
				if (!node) return;
				this._handleNodeClick(node, event);
			},
			onContextMenu: (id: string, e: MouseEvent) => {
				if (isGroupHeader(id, this._groupIds)) {
					// B-groupbody: sin nodeType 'group' en typeCMenu ni menu
					// de grupo en logicGroupContextMenu no hay menu que
					// abrir; no caer al menu del item (ver informe).
					return;
				}
				const node = this._findNode(id, tree);
				if (!node) return;
				this.plugin.contextMenuService.openPanelMenu(
					{
						nodeType: 'tag',
						node,
						surface: 'panel',
						selectedIds: this.selectedNodeIds,
						orderedIds: this._orderedVisibleTreeIds(),
						...this._groupCreationMenuCtx(),
						invokeRename: (targetId: string) => {
							this.editingId = targetId;
							void this._render();
						},
					},
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
			// In reveal the rows are the note's own tags, so opening one
			// jumps to where the note writes it — the same open-at-offset
			// mechanism the content matches use — instead of expanding.
			if (this.revealActiveFile) {
				void this._revealTagAt(node.meta.tagPath);
				return;
			}
			if (node.children?.length) {
				this._toggleExpanded(node.id);
				void this._render();
			}
			return;
		}

		if (action === 'select') {
			if (this.selectedNodeIds.has(node.id))
				this.selectedNodeIds.delete(node.id);
			else this.selectedNodeIds.add(node.id);
			void this._render();
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
			const countCell = badgeZone.createSpan({
				cls: 'vaultman-tree-count',
				text: String(node.count),
			});
			applyCellTooltip(countCell, 'tags', 'grid', 'count');
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
			card.toggleClass('is-selected', this.selectedNodeIds.has(node.id));
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
			this._renderCardSelectionCheckbox(card, node);

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
					{
						nodeType: 'tag',
						node,
						surface: 'panel',
						selectedIds: this.selectedNodeIds,
						orderedIds: this._orderedVisibleTreeIds(),
						...this._groupCreationMenuCtx(),
					},
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

			// U121-074: `_deleteTag` filters tags by equality, so `#a/b` survives
			// the deletion of `#a`. The old cascade greyed the whole nested
			// subtree and promised a removal that never happens. Each tag now
			// answers for itself.
			const isDeleted = queueDeletesSubject(
				{ kind: 'tag', tagPath: meta.tagPath },
				queue,
			);

			const cls = isDeleted
				? (currentCls + ' is-deleted-tag').trim()
				: currentCls;

			const resolvedChildren = node.children
				? this._resolveIcons(node.children, highlightIds, searchFunc)
				: [];

			const badges: import('../../types/typeTree').NodeBadge[] = [];
			for (const op of relevantOps) {
				const opIdx = queue.indexOf(op);
				if (op.action === 'delete') {
					badges.push({
						text: 'Delete',
						icon: 'lucide-trash-2',
						color: 'red',
						tooltip: op.details,
						queueIndex: opIdx,
					});
				} else if (op.action === 'rename') {
					badges.push({
						text: 'Update',
						icon: 'lucide-pencil',
						color: 'blue',
						queueIndex: opIdx,
					});
					const match = op.details.match(/to "#(.*?)"/);
					if (match && match[1]) {
						// Tags can be nested, so we only want the leaf name for the label!
						// But node.label contains just the leaf.
						// match[1] contains the full path! We split it.
						node.label = match[1].split('/').pop() ?? match[1];
						node.cls = `${node.cls ?? ''} vaultman-rename-preview`.trim();
					}
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

			const isGroup = isGroupHeader(node.id, this._groupIds);
			const iconic = isGroup
				? undefined
				: this.plugin.iconicService?.getTagIcon(meta.tagPath);

			return {
				...node,
				cls: cls,
				icon: node.icon ?? iconic?.icon ?? (isGroup ? undefined : 'lucide-tag'),
				iconColor: iconic?.color || undefined,
				badges: badges,
				children: resolvedChildren,
			};
		});
	}

	private async _renameTag(tagPath: string, newName: string): Promise<void> {
		if (!newName || newName === tagPath) return;
		// Defense in depth: drag-to-nest builds a path programmatically and does
		// not pass through the inline editor's check.
		const check = validateTagName(newName);
		if (!check.valid || !check.name) return;
		newName = check.name;
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
		let structured = nodes;
		if (includeSimple && !includeNested)
			structured = groupRootHierarchy(nodes, 'simple');
		else if (includeNested && !includeSimple)
			structured = this._collectNested(nodes);
		// Shape and source are separate questions, so the two groups intersect:
		// picking `nested` and `inline` asks for the tags that are both, not
		// for the union of two unrelated lists.
		const sources = TAG_SOURCE_ORDER.filter((source) =>
			selectedTypes.has(source),
		);
		if (sources.length === 0) return structured;
		return this._filterBySource(structured, sources);
	}

	/**
	 * Keeps the tags written where the filter asks. A parent survives when a
	 * descendant does: hiding it would orphan rows the filter did select, and
	 * the index already credits it with its descendants' sources.
	 */
	private _filterBySource(
		nodes: TreeNode<TagMeta>[],
		sources: readonly TagSource[],
	): TreeNode<TagMeta>[] {
		const kept: TreeNode<TagMeta>[] = [];
		for (const node of nodes) {
			const children = node.children
				? this._filterBySource(node.children, sources)
				: [];
			if (
				children.length > 0 ||
				matchesTagSource(this._sourcesFor(node), sources)
			) {
				kept.push({ ...node, children });
			}
		}
		return kept;
	}

	private _nestedEnabled(): boolean {
		return this.visibleCells.has('nested');
	}

	/**
	 * U130-t33 (L-PNODE): la agrupacion proyecta cabeceras con hijos aunque la
	 * anidacion este apagada. Es la MISMA bandera que habilita la proyeccion
	 * (`projectedNodes`), no un segundo concepto de "agrupacion encendida".
	 */
	private _groupingActive(): boolean {
		return this.groupPreset.kind !== 'none';
	}

	/** Spec 08 §3.2: tags offer no value presets (letter/name read the label). */
	private _groupPresetValue(
		_node: TreeNode<TagMeta>,
		_kind: GroupPreset['kind'],
	): string | number | null {
		return null;
	}

	/**
	 * U130-t33 (L-PNODE): el toggle de expansion vive mientras haya p-nodes
	 * plegables, vengan de la anidacion o de la agrupacion. Un grupo es un
	 * p-node independientemente de si la anidacion esta activa.
	 */
	private _expansionEnabled(): boolean {
		return this._nestedEnabled() || this._groupingActive();
	}

	private _indentGuidesActive(): boolean {
		return this._nestedEnabled() || this._groupingActive();
	}

	private _findNode(
		id: string,
		nodes: TreeNode<TagMeta>[],
	): TreeNode<TagMeta> | null {
		const baseId = id.includes('@') ? id.slice(0, id.lastIndexOf('@')) : id;
		for (const n of nodes) {
			if (n.id === id || n.id === baseId) return n;
			if (n.children) {
				const found = this._findNode(id, n.children);
				if (found) return found;
			}
		}
		return null;
	}

	/**
	 * Flattening runs after the tree sort, so the flat list arrives grouped by
	 * ancestry whatever was chosen. One level means one sort: Name compares tag
	 * names across families, Parent restores the grouping deliberately.
	 */
	private _sortFlat(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const sort = activeScopeSort('tags', this.sortState, 'all');
		const sortBy = normalizeExplorerSortBy(sort.sortBy);
		if (sortBy !== 'name' && sortBy !== 'parent') return nodes;
		return sortFlatProjection(nodes, sortBy, sort.direction);
	}

	private _flattenTree(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const result: TreeNode<TagMeta>[] = [];
		for (const n of nodes) {
			result.push(n);
			if (n.children) result.push(...this._flattenTree(n.children));
		}
		return result;
	}

	/** U121-044: the revealed note, or null when reveal is off. */
	private _mutationScope(): import('obsidian').TFile[] | null {
		if (!this.isRevealingActiveFile()) return null;
		const path = this._revealPath();
		if (!path) return [];
		const file = this.plugin.app.vault.getFileByPath(path);
		return file instanceof TFile ? [file] : [];
	}

	private _getFilesWithTag(tagPath: string): import('obsidian').TFile[] {
		// U121-044, the tag-side twin: in reveal the user is looking at ONE note,
		// so a mutating action must resolve against it instead of every note that
		// happens to carry the same tag.
		const scope =
			this._mutationScope() ?? this.plugin.app.vault.getMarkdownFiles();
		return scope.filter((file) => {
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
