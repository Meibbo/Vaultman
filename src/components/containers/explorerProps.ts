// src/components/PropsExplorerPanel.ts
import {
	Component,
	TFile,
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
		stickyParentRows?: boolean;
		stickyParentRowsMaxFraction?: number;
		badgeCancelClickMode?: import('../../utils/badgeInteraction').BadgeCancelClickMode;
		explorerSearchHighlights?: boolean;
		/** BT5-015 */
		iconInCaretSlot?: boolean;
		selectionCheckboxPosition?: 'start' | 'end' | 'hidden';
		/** U121-003: how far a type-incompatibility warning decorates its node. */
		propConflictWarnings?: PropConflictWarnings;
		/** U121-003: what `Move to prop...` does with an unwilling destination. */
		propMoveTypeConflict?: 'coerce' | 'block' | 'ask';
	};
	statisticsCache?: Pick<StatisticsCacheService, 'getFileTimes'>;
	showDragActionGuide?: (text: string) => void;
	clearDragActionGuide?: () => void;
}

import { UnifiedTreeView } from '../layout/viewTree';
import { NodeTableView } from '../layout/viewNodeTable';
import type { TreeNode, PropMeta } from '../../types/typeTree';
import type { PropertyChange } from '../../types/typeOps';
import type { PropConflictWarnings } from '../../types/typeSettings';
import { NATIVE_SET_PROP_TYPE } from '../../types/typeOps';
import { showInputModal } from '../../utils/inputModal';
import { translate } from '../../i18n/index';
import {
	attachBadgeCancelInteraction,
	normalizeBadgeCancelClickMode,
} from '../../utils/badgeInteraction';
import {
	comparePropTypes,
	DERIVED_PROP_TYPE_OPTIONS,
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
import {
	flattenPropertyValues,
	sortFlatProjection,
} from '../../logic/logicExplorerHierarchy';
import { collectExpandableSubtreeIds } from '../../logic/logicTreeExpansion';
import { collectExplorerDeletionIds } from '../../logic/logicExplorerHighlight';
import {
	normalizeInteractionMode,
	resolveInteractionAction,
	type InteractionMode,
} from '../../logic/logicInteractionMode';
import {
	addToFilesAvailability,
	applyAddToFile,
	type AddToFilesTarget,
} from '../../logic/logicAddToFiles';
import {
	buildOperationTargetSet,
	type OperationTarget,
} from '../../logic/logicOperationTargetSet';
import {
	buildValueMoveOperations,
	enterValueMoveMode,
	exitValueMoveMode,
	proceedEnabled,
	reconcileValueMoveOwner,
	selectValueMoveDestination,
	toggleValueMoveOriginDisposition,
	toggleValueMoveWrite,
	type ValueMoveModeState,
	type ValueMoveOrigin,
	type ValueMoveOwner,
} from '../../logic/logicValueMoveMode';
import {
	decidePropMoveConflict,
	normalizePropMoveTypeConflict,
} from '../../logic/logicPropMoveConflict';
import {
	applyValueMove,
	planValueMoveTypeChanges,
} from '../../logic/logicValueMoveApply';
import { observeActiveContentFile } from '../../logic/logicContentActiveFile';
import { projectActiveFileProps } from '../../logic/logicRevealActiveFileProps';
import { projectFilteredProps } from '../../logic/logicFilteredProps';
import {
	OperationSummaryModal,
	type OperationSummaryLine,
} from '../../modals/modalOperationSummary';
import {
	availablePropertyValueConversions,
	coercePropertyValueForWidget,
	convertPropertyValue,
	parsePropertyValue,
	PROPERTY_VALUE_CONVERSION_OPTIONS,
	replaceMatchingPropertyValue,
	type PropertyValueConversionId,
} from '../../logic/propertyValueCoercion';
import { renameTargetFromQueue } from '../../logic/logicRenameBadges';
import {
	renderEditableText,
	renderPropertyValue,
} from '../../utils/renderPropertyValue';
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
	private _editingId?: string;
	private expandedIds = new Set<string>();
	private searchTerm = '';
	private viewMode: 'tree' | 'grid' | 'table' = 'tree';
	private sortState = normalizeExplorerSortState('props', null);
	private searchMode = 0;
	private nodeTypeFilters: string[] = [];
	private visibleCells = new Set<string>([
		'checkbox',
		'icon',
		'text',
		'count',
		'nested',
	]);
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

		// `Add to files` used to exist only as a gesture of `interactionMode='add'`,
		// which meant it could not carry a selection and had no node_value branch
		// at all. As an operation it takes the same target set as every other
		// batch action and states its destination count before it is invoked.
		svc.registerAction({
			id: 'prop.add-to-files',
			nodeTypes: ['prop', 'value'],
			surfaces: ['panel'],
			label: () =>
				translate('explorer.ctx.add_to_files', {
					count: this._addToFilesDestinationCount(),
				}),
			icon: 'lucide-file-plus-2',
			when: (ctx) =>
				addToFilesAvailability(
					this._addToFilesTargets(ctx),
					this._addToFilesDestinationCount(),
				).available,
			run: (ctx) => this._addToFiles(ctx),
		});

		// `Move to prop...` cannot resolve its destination implicitly the way
		// `Add to files` can, so it enters a hidden mode on this explorer and the
		// destination is picked with the same selection machinery as everything
		// else — not a second picker with its own idea of what a property is.
		svc.registerAction({
			id: 'prop.move-to-prop',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: translate('explorer.ctx.move_to_prop'),
			icon: 'lucide-move-right',
			when: (ctx) => (ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => this._enterValueMoveMode(ctx),
		});

		svc.registerAction({
			id: 'prop.move-to-prop.proceed',
			nodeTypes: ['prop'],
			surfaces: ['panel'],
			label: translate('explorer.ctx.move_to_prop.proceed'),
			icon: 'lucide-check',
			when: (ctx) =>
				this._valueMoveProceedAvailable() &&
				this.valueMoveMode?.destinations.includes(ctx.node.id) === true,
			run: () => this._proceedValueMove(),
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
			run: (ctx) => {
				if (ctx.invokeRename) ctx.invokeRename(ctx.node.id);
				else {
					this._editingId = ctx.node.id;
					void this._render();
				}
			},
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

		// A property whose type is a derived kind had a submenu with nothing
		// marked, so the menu said nothing about what the type currently is.
		// Core shows the derived kind and does not offer it; this entry is
		// checked and inert for exactly that reason.
		for (const option of DERIVED_PROP_TYPE_OPTIONS) {
			svc.registerAction({
				id: `prop.type-current-${option.type}`,
				nodeTypes: ['prop'],
				surfaces: ['panel'],
				label: translate(option.labelKey),
				icon: option.icon,
				submenu: translate('explorer.ctx.change_type'),
				when: (ctx) => {
					const meta = ctx.node.meta as PropMeta;
					return (
						!meta.isValueNode && this._effectivePropType(meta) === option.type
					);
				},
				checked: () => true,
				run: () => {
					// Not assignable, matching Core.
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
				return this._renameValue(
					meta.propName,
					meta.rawValue ?? '',
					meta.propType,
				);
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
		// The mode's state dies with the panel. A pending operation nobody can
		// see is worse than one that was never composed.
		this._exitValueMoveMode();
		this._stopRevealWatch();
		this.deferredRender.dispose();
		this.filterClicks.dispose();
		this.plugin.filterService.off('changed', this._handleStateChange);
		this.plugin.queueService.off('changed', this._handleStateChange);
		this.view.destroy();
		this.tableView?.destroy();
		super.onunload();
	}

	private interactionMode: InteractionMode = 'filter';
	private selectedNodeIds = new Set<string>();
	private onContentSearch?: (query: string) => void;

	private interactionModeChangeHandler?: (mode: InteractionMode) => void;
	setInteractionModeChangeHandler(
		handler?: (mode: InteractionMode) => void,
	): void {
		this.interactionModeChangeHandler = handler;
	}

	setInteractionMode(
		mode: InteractionMode,
		onContentSearch?: (query: string) => void,
	): void {
		const normalized = normalizeInteractionMode('props', mode);
		this.onContentSearch = onContentSearch;
		if (this.interactionMode === normalized) return;
		this.interactionMode = normalized;
		this.interactionModeChangeHandler?.(normalized);
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

	private _renderCardSelectionCheckbox(
		card: HTMLElement,
		node: TreeNode<PropMeta>,
	): void {
		if (this.interactionMode !== 'select') return;
		const position = this.plugin.settings?.selectionCheckboxPosition ?? 'start';
		if (position === 'hidden' || !this.visibleCells.has('checkbox')) return;
		card.dataset.id = node.id;
		const checkbox = createEl('input', {
			type: 'checkbox',
			cls: `metadata-input-checkbox vaultman-selection-checkbox vaultman-selection-checkbox--${position}`,
			attr: { 'aria-label': `Select ${node.label}` },
		});
		if (position === 'start') {
			card.prepend(checkbox);
		} else {
			card.append(checkbox);
		}
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
			this.interactionModeChangeHandler?.('add');
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

	// --- `reveal this file` ----------------------------------------------------
	//
	// A variation of the same explorer, not a second one. The vault-wide index
	// keeps its own lifecycle; reveal is a filter over the snapshot it already
	// built, which is what makes reverting the toggle cost nothing.

	private revealActiveFile = false;
	private revealActivePath: string | null = null;
	private stopRevealWatch?: () => void;

	isRevealingActiveFile(): boolean {
		return this.revealActiveFile;
	}

	toggleRevealActiveFile(): void {
		this.revealActiveFile = !this.revealActiveFile;
		if (this.revealActiveFile) this._startRevealWatch();
		else this._stopRevealWatch();
		// One projection revision, exactly like changing `nested` or the engine.
		void this._render();
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
				void this._render();
			},
		);
	}

	private _stopRevealWatch(): void {
		this.stopRevealWatch?.();
		this.stopRevealWatch = undefined;
		this.revealActivePath = null;
	}

	/**
	 * Which note reveal is projecting. An anchored note outranks the workspace:
	 * the user picked that one, so opening something else in the editor no
	 * longer moves the projection — only choosing `Current file` again releases
	 * it. The watcher keeps running underneath so the release resumes with the
	 * file that is active by then, instead of a path from before the pick.
	 */
	private _revealPath(): string | null {
		if (this.sortState?.revealAnchor === 'pinned') {
			return this.sortState.revealAnchorPath ?? null;
		}
		return this.revealActivePath;
	}

	/** The revealed note's frontmatter, or `null` when there is no such note. */
	private _revealFrontmatter(): Record<string, unknown> | null {
		const path = this._revealPath();
		if (!path) return null;
		const file = this.plugin.app.vault.getFileByPath(path);
		if (!(file instanceof TFile)) return null;
		return this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
	}

	/**
	 * Narrows an already-built snapshot; it never asks for a new one. Both modes
	 * that can narrow it come through here, so search, filters, sort and every
	 * engine read the same narrowed tree instead of each deciding for itself.
	 *
	 * Reveal wins when both are on: it is already a single note, so there is
	 * nothing left for a file filter to narrow.
	 */
	private _filteredProjectionCache: {
		snapshot: readonly TreeNode<PropMeta>[];
		files: readonly TFile[];
		projection: TreeNode<PropMeta>[];
	} | null = null;

	private _scopeProjection(
		snapshot: TreeNode<PropMeta>[],
	): TreeNode<PropMeta>[] {
		if (this.revealActiveFile) {
			return projectActiveFileProps(snapshot, this._revealFrontmatter());
		}
		if (this.sortState?.filtered === true) {
			return this._filteredProjection(snapshot);
		}
		return snapshot;
	}

	/**
	 * The narrowed projection, computed once per (snapshot, filtered set) pair.
	 *
	 * Both inputs are replaced rather than mutated when they change — the props
	 * index hands out a new array on invalidate, and the filter service only
	 * reassigns `filteredFiles` when the list actually differs — so identity is
	 * a sound and O(1) cache key. Without this the whole tally was rebuilt on
	 * every render, which is what made the switch feel like a stall.
	 */
	private _filteredProjection(
		snapshot: TreeNode<PropMeta>[],
	): TreeNode<PropMeta>[] {
		// Nothing filtered out means nothing to narrow: the switch is on but the
		// projection is the snapshot, and reading every file to rediscover that
		// is the expensive way to learn nothing.
		if (!this.plugin.filterService.narrowsVault()) return snapshot;

		const files = this.plugin.filterService.filteredFiles;
		const cached = this._filteredProjectionCache;
		if (cached && cached.snapshot === snapshot && cached.files === files) {
			return cached.projection;
		}

		const projection = projectFilteredProps(
			snapshot,
			this._filteredFrontmatters(),
		);
		this._filteredProjectionCache = { snapshot, files, projection };
		return projection;
	}

	/**
	 * The frontmatter of the files the active filter leaves standing. Reads the
	 * cache for that set only — no vault scan, no index rebuild — so the switch
	 * costs what the user is already looking at.
	 */
	private _filteredFrontmatters(): Array<Record<string, unknown>> {
		const frontmatters: Array<Record<string, unknown>> = [];
		for (const file of this.plugin.filterService.filteredFiles) {
			const frontmatter =
				this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
			if (frontmatter) frontmatters.push(frontmatter);
		}
		return frontmatters;
	}

	// --- `Move to prop...` hidden operation mode -------------------------------
	//
	// The adapter owns one machine instance and nothing else: every decision
	// below comes from the pure reducer, the conflict policy or the write.

	private valueMoveMode: ValueMoveModeState | null = null;
	private onValueMoveChange?: () => void;

	getValueMoveMode(): ValueMoveModeState | null {
		return this.valueMoveMode;
	}

	/**
	 * The Scene subscribes so the toolbar and searchbox reproject when the mode
	 * changes. Without it the panel would need an unrelated action to repaint,
	 * which is exactly the class of defect U121-003 exists to remove.
	 */
	setValueMoveChangeHandler(handler?: () => void): void {
		this.onValueMoveChange = handler;
	}

	private _setValueMoveMode(next: ValueMoveModeState | null): void {
		this.valueMoveMode = next;
		this.onValueMoveChange?.();
	}

	private _valueMoveOwner(): ValueMoveOwner {
		return { providerId: 'props', generation: this.valueMoveGeneration };
	}

	private valueMoveGeneration = 0;

	/**
	 * Called by the Scene when the panelWidget owner moves. The mode never
	 * survives a provider change or a generation bump: a pending invisible
	 * operation in another domain cannot be reasoned about by the user.
	 */
	reconcileValueMoveOwner(owner: ValueMoveOwner): void {
		if (!this.valueMoveMode) return;
		if (reconcileValueMoveOwner(this.valueMoveMode, owner)) return;
		this._exitValueMoveMode();
	}

	private _valueMoveOrigins(ctx: {
		node: { id: string; label: string; meta?: unknown };
	}): ValueMoveOrigin[] {
		const tree = this.logic.getTree();
		const toOrigin = (
			node: TreeNode<PropMeta> | null,
		): ValueMoveOrigin | null => {
			const meta = node?.meta;
			if (!node || !meta?.isValueNode) return null;
			return {
				id: node.id,
				kind: 'value',
				node: {
					property: meta.propName,
					rawValue: meta.rawValue ?? node.label,
					propType: meta.propType,
				},
			};
		};

		const selectedNodes: ValueMoveOrigin[] = [];
		for (const id of this.selectedNodeIds) {
			const origin = toOrigin(this._findNode(id, tree));
			if (origin) selectedNodes.push(origin);
		}

		return buildOperationTargetSet<ValueMoveOrigin['node']>({
			selectedNodes,
			invokedNode: toOrigin(ctx.node as TreeNode<PropMeta>),
		}).targets as ValueMoveOrigin[];
	}

	private _enterValueMoveMode(ctx: {
		node: { id: string; label: string; meta?: unknown };
	}): void {
		// Re-invoking the originating action exits, like cancel and escape.
		if (this.valueMoveMode) {
			this._exitValueMoveMode();
			return;
		}

		this.valueMoveGeneration += 1;
		this._setValueMoveMode(
			enterValueMoveMode({
				origin: this._valueMoveOrigins(ctx),
				restore: {
					interactionMode: this.interactionMode,
					searchOpen: this.valueMoveSearchOpen,
				},
				owner: this._valueMoveOwner(),
			}),
		);
		this.interactionMode = 'select';
		this.interactionModeChangeHandler?.('select');
		void this._render();
	}

	private valueMoveSearchOpen = false;

	private _exitValueMoveMode(): void {
		const mode = this.valueMoveMode;
		if (!mode) return;
		const { restore } = exitValueMoveMode(mode);
		this._setValueMoveMode(null);
		this.interactionMode = normalizeInteractionMode(
			'props',
			restore.interactionMode,
		);
		this.interactionModeChangeHandler?.(this.interactionMode);
		this.valueMoveSearchOpen = restore.searchOpen;
		void this._render();
	}

	private _registerValueMoveDestination(meta: PropMeta): void {
		const mode = this.valueMoveMode;
		if (!mode) return;
		const next = selectValueMoveDestination(mode, {
			kind: meta.isValueNode ? 'value' : 'prop',
			property: meta.propName,
		});
		this._setValueMoveMode(next);
		if (next.rejection) {
			new Notice(
				translate('explorer.move_to_prop.rejected', {
					property: next.rejection.destination,
				}),
			);
		}
	}

	toggleValueMoveWrite(): void {
		if (!this.valueMoveMode) return;
		this._setValueMoveMode(toggleValueMoveWrite(this.valueMoveMode));
		void this._render();
	}

	toggleValueMoveOriginDisposition(): void {
		if (!this.valueMoveMode) return;
		this._setValueMoveMode(
			toggleValueMoveOriginDisposition(this.valueMoveMode),
		);
		void this._render();
	}

	cancelValueMoveMode(): void {
		this._exitValueMoveMode();
	}

	private _valueMoveProceedAvailable(): boolean {
		return this.valueMoveMode !== null && proceedEnabled(this.valueMoveMode);
	}

	/** The destination's current type, read from the projected tree. */
	private _destinationPropType(property: string): string | undefined {
		const node = this.logic
			.getTree()
			.find((candidate) => candidate.meta?.propName === property);
		return node?.meta?.propType;
	}

	proceedValueMove(): void {
		this._proceedValueMove();
	}

	private _proceedValueMove(): void {
		const mode = this.valueMoveMode;
		if (!mode || !proceedEnabled(mode)) return;

		const policy = normalizePropMoveTypeConflict(
			this.plugin.settings?.propMoveTypeConflict,
		);
		const files = this.plugin.filterService.filteredFiles;
		const operations = buildValueMoveOperations(mode);

		const decideFor = (destination: string, occupied: boolean) =>
			decidePropMoveConflict(
				{
					property: destination,
					currentType: this._destinationPropType(destination),
					occupied,
				},
				{
					rawValue: operations[0].rawValue,
					propType: operations[0].propType,
				},
				operations[0].write,
				policy,
			);

		const stage = (): void => {
			// The coercion the summary declared has to reach `types.json`, or the
			// declaration is a claim the user cannot see fail. It goes first, so
			// the values land in a destination that already accepts them.
			for (const change of planValueMoveTypeChanges(operations, (destination) =>
				decideFor(destination, true),
			)) {
				const markerFile =
					this._getFilesWithProp(change.property)[0] ??
					this.plugin.app.vault.getMarkdownFiles()[0];
				if (!markerFile) continue;
				this.plugin.queueService.addOrRun({
					type: 'property',
					property: change.property,
					action: 'change_type',
					details: change.declaration,
					files: [markerFile],
					customLogic: true,
					logicFunc: () => ({
						[NATIVE_SET_PROP_TYPE]: {
							propName: change.property,
							type: toNativePropType(change.toType),
						},
					}),
				});
			}

			for (const operation of operations) {
				const destinationType = this._destinationPropType(
					operation.destinationProperty,
				);
				this.plugin.queueService.addOrRun({
					type: 'property',
					property: operation.destinationProperty,
					action: 'add',
					details:
						`${operation.originDisposition === 'move' ? 'Move' : 'Copy'} ` +
						`"${operation.rawValue}" from "${operation.originProperty}" ` +
						`to "${operation.destinationProperty}"`,
					files,
					value: operation.rawValue,
					customLogic: true,
					logicFunc: (_file, fm) => {
						// The decision is per file, because occupancy is.
						const decision = decidePropMoveConflict(
							{
								property: operation.destinationProperty,
								currentType: destinationType,
								occupied: operation.destinationProperty in fm,
							},
							{ rawValue: operation.rawValue, propType: operation.propType },
							operation.write,
							policy,
						);
						const outcome = applyValueMove(
							operation,
							fm,
							decision,
							destinationType,
						);
						return outcome.status === 'written' ? outcome.frontmatter : null;
					},
				});
			}
			this._exitValueMoveMode();
			this.logic.invalidate();
			void this._render();
		};

		// Staging is its own confirmation: the queue can be read and cancelled.
		// Bypass executes immediately and has no such review, so a composed
		// multi-target move stops at an explicit summary first.
		if (this.plugin.queueService.operationMode === 'bypass') {
			const lines: OperationSummaryLine[] = operations.map((operation) => {
				const destinationType = this._destinationPropType(
					operation.destinationProperty,
				);
				// The same decision the write will make, so the summary cannot
				// describe something other than what runs.
				const decision = decideFor(operation.destinationProperty, true);
				return {
					destination: operation.destinationProperty,
					destinationType: destinationType ?? 'text',
					fileCount: files.length,
					originDisposition: operation.originDisposition,
					typeChange: decision.typeChange,
					blockedReason: decision.reasonKey
						? translate(decision.reasonKey, {
								property: operation.destinationProperty,
								type: destinationType ?? 'text',
							})
						: null,
				};
			});
			new OperationSummaryModal(this.plugin.app, lines, stage).open();
			return;
		}

		stage();
	}

	private _addToFilesDestinationCount(): number {
		// Read at build time, so the count in the label is the count that runs.
		return this.plugin.filterService.filteredFiles.length;
	}

	private _addToFilesTargets(ctx: {
		node: { id: string; label: string; meta?: unknown };
	}): AddToFilesTarget[] {
		const tree = this.logic.getTree();
		const toTarget = (
			node: TreeNode<PropMeta> | null,
		): AddToFilesTarget | null => {
			const meta = node?.meta;
			if (!node || !meta) return null;
			return meta.isValueNode
				? {
						id: node.id,
						kind: 'value',
						property: meta.propName,
						rawValue: meta.rawValue ?? node.label,
						propType: meta.propType,
					}
				: { id: node.id, kind: 'prop', property: meta.propName };
		};
		const wrap = (
			target: AddToFilesTarget | null,
		): OperationTarget<AddToFilesTarget> | null =>
			target ? { id: target.id, kind: target.kind, node: target } : null;

		const selectedNodes: OperationTarget<AddToFilesTarget>[] = [];
		for (const id of this.selectedNodeIds) {
			const wrapped = wrap(toTarget(this._findNode(id, tree)));
			if (wrapped) selectedNodes.push(wrapped);
		}

		return buildOperationTargetSet<AddToFilesTarget>({
			selectedNodes,
			invokedNode: wrap(toTarget(ctx.node as TreeNode<PropMeta>)),
		}).targets.map((target) => target.node);
	}

	private _addToFiles(ctx: {
		node: { id: string; label: string; meta?: unknown };
	}): void {
		const files = this.plugin.filterService.filteredFiles;
		const targets = this._addToFilesTargets(ctx);
		const availability = addToFilesAvailability(targets, files.length);
		if (!availability.available) return;
		if (!availability.enabled) {
			new Notice(translate('explorer.ctx.add_to_files.empty'));
			return;
		}

		for (const target of targets) {
			// The Props explorer never produces a tag target; the union narrows
			// here rather than in the pure module, which serves both providers.
			if (target.kind === 'tag') continue;
			const details =
				target.kind === 'value'
					? `Add "${target.rawValue}" to "${target.property}" in ${files.length} files`
					: `Add property "${target.property}" to ${files.length} files`;
			this.plugin.queueService.addOrRun({
				type: 'property',
				property: target.property,
				action: 'add',
				details,
				files,
				...(target.kind === 'value' ? { value: target.rawValue } : {}),
				customLogic: true,
				logicFunc: (_file, fm) => {
					const outcome = applyAddToFile(target, fm);
					return outcome.status === 'written' ? outcome.frontmatter : null;
				},
			});
		}
		this.logic.invalidate();
		void this._render();
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

		if (action === 'select') {
			if (this.selectedNodeIds.has(node.id))
				this.selectedNodeIds.delete(node.id);
			else this.selectedNodeIds.add(node.id);
			// While the move mode is composing, the same selection gesture also
			// names a destination; a value node names its parent property.
			this._registerValueMoveDestination(meta);
			void this._render();
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
			{
				nodeType,
				node,
				surface: 'panel',
				invokeRename: (targetId: string) => {
					this._editingId = targetId;
					void this._render();
				},
			},
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

	private _decorateSubCounts(nodes: TreeNode<PropMeta>[]): void {
		for (const node of nodes) {
			node.subCountText =
				node.children && node.children.length > 0
					? String(node.children.length)
					: undefined;
			this._decorateSubCounts(node.children ?? []);
		}
	}

	private _render(): void {
		this.deferredRender.satisfy();
		if (this.viewMode === 'grid') {
			this._renderGrid();
			return;
		}
		// Narrowed before anything else consumes it, so search, filters, sort and
		// every engine see one projection rather than each deciding for itself.
		let tree = this._scopeProjection(this.logic.getTree());
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
		//
		this.viewMode === 'tree' && this.isRevealingActiveFile();
		let nodesWithIcons = this._resolveIcons(
			sorted,
			warningIds,
			highlightIds,
			searchFunc,
			this.plugin.queueService.queue,
		);
		if (!this._nestedEnabled()) {
			nodesWithIcons = this._sortFlat(
				flattenPropertyValues(nodesWithIcons, {
					showParent: this.visibleCells.has('parent'),
				}),
			);
		}
		this._setIndexRoots(nodesWithIcons);
		if (this.visibleCells.has('sub')) {
			this._decorateSubCounts(nodesWithIcons);
		}
		if (nodesWithIcons.length === 0) {
			this._renderEmptyState();
			return;
		}
		const deletionIds = collectExplorerDeletionIds(nodesWithIcons);
		if (this.viewMode === 'table') {
			if (!this.tableView) {
				this.tableView = new NodeTableView<PropMeta>(this.containerEl);
			}
			this.tableView.render({
				surface: 'props',
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
				renderLabel: (container, node) => {
					const queue = this.plugin.queueService.queue;
					const target = renameTargetFromQueue(queue, node.id);
					if (target) {
						const label = container.createSpan({
							cls: 'vaultman-tree-label vaultman-rename-preview',
							text: target,
						});
						if (node.labelColor) label.style.color = node.labelColor;
						return true;
					}
					return this._renderPropertyValueLabel(container, node);
				},
			});
			this._renderAddPropertyButtonIfNeeded();
			return;
		}

		this.view.render({
			nodes: nodesWithIcons,
			expandedIds: this.expandedIds,
			visibleCells: this.visibleCells,
			stickyParentRows: this.plugin.settings?.stickyParentRows !== false,
			stickyMaxFraction: this.plugin.settings?.stickyParentRowsMaxFraction,
			...this._selectionViewOptions(),
			filterBubbleLabel: translate('filter.active_descendant'),
			renderLabel: (container, node) => {
				const queue = this.plugin.queueService.queue;
				const target = renameTargetFromQueue(queue, node.id);
				if (target) {
					const label = container.createSpan({
						cls: 'vaultman-tree-label vaultman-rename-preview',
						text: target,
					});
					if (node.labelColor) label.style.color = node.labelColor;
					return true;
				}
				return this._renderPropertyValueLabel(
					container,
					node as TreeNode<PropMeta>,
				);
			},
			iconInCaretSlot: this.plugin.settings?.iconInCaretSlot === true,
			highlightIds: {
				inclusive: activeFilterIds,
				exclusive: excludedFilterIds,
				deletion: deletionIds,
			},
			statusDotLabel: () => translate('filter.active_descendant'),
			warningIds,
			searchHighlightIds: highlightIds,
			editingId: this._editingId,
			onRename: (id: string, newLabel: string) => {
				this._editingId = undefined;
				const node = this._findNode(id, tree);
				if (node && node.meta.isValueNode) {
					// A value-node rename writes the value, not the property
					// key, through the same queueable vault path the value
					// cells use. Previously this branch did not exist and the
					// committed text was silently discarded.
					void this._replaceValueInVault(
						node.meta.propName,
						node.meta.rawValue ?? '',
						coercePropertyValueForWidget(
							newLabel,
							node.meta.propType ?? 'text',
						),
					);
				} else if (node) {
					newLabel = newLabel.replace(
						/\{date\}|\[fecha\]/gi,
						new Date().toISOString().slice(0, 10),
					);
					void this._renamePropQueued(node.meta.propName, newLabel);
				} else {
					// Guard: a rename committed on an unknown node must fail
					// loudly instead of silently discarding the text.
					throw new Error(
						`props inline rename: no write path for node "${id}"`,
					);
				}
				void this._render();
			},
			onCancelRename: () => {
				this._editingId = undefined;
				void this._render();
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
		this._renderAddPropertyButtonIfNeeded();
	}

	private _renderAddPropertyButtonIfNeeded(): void {
		// The button is appended to the container the view does not own, so it
		// survives the view's own re-render. Without this sweep every render left
		// another copy behind, and the copies outlived reveal itself: turning the
		// mode off stopped new ones being made but never removed the old ones.
		for (const stale of Array.from(
			this.containerEl.querySelectorAll(':scope > .metadata-add-button'),
		)) {
			stale.remove();
		}
		if (!this.isRevealingActiveFile()) return;
		const addButton = this.containerEl.createDiv({
			cls: 'metadata-add-button text-icon-button',
			attr: { tabIndex: 0 },
		});
		const addIcon = addButton.createSpan({ cls: 'text-button-icon' });
		void import('obsidian').then(({ setIcon }) =>
			setIcon(addIcon, 'lucide-plus'),
		);
		addButton.createSpan({
			cls: 'text-button-label',
			text: translate('ops.add_property'),
		});
		// Core drives this from `addProperty()` on its metadata editor — an
		// internal method, not a command — so there is no id to invoke and the
		// previous `executeObsidianCommand` call could never fire. Matching Core
		// means adding an unnamed property row and focusing its key input, which
		// is the value-entry input shard 9.4 owns and has not landed yet. Until
		// then the button reports rather than pretending.
		addButton.onclick = () => {
			new Notice(translate('ops.add_property.unavailable'));
		};
		addButton.onkeydown = (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				addButton.click();
			}
		};
	}

	private _renderPropertyValueLabel(
		container: HTMLElement,
		node: TreeNode<PropMeta>,
		propertyAttributeContainer?: HTMLElement,
	): boolean {
		if (!node.meta.isValueNode) return false;

		const queue = this.plugin.queueService.queue;
		const target = renameTargetFromQueue(queue, node.id);
		if (target) {
			const label = container.createSpan({
				cls: 'vaultman-tree-label vaultman-rename-preview',
				text: target,
			});
			if (node.labelColor) label.style.color = node.labelColor;
			return true;
		}

		// The empty value node: the model labels it `empty`, and the projection
		// shows the translated word in faint whether the Format cell is on or
		// off — off would paint the raw model word, on would render an empty
		// widget.
		if ((node.meta.rawValue ?? '') === '') {
			if (this.visibleCells.has('format')) {
				const propType = node.meta.propType ?? 'text';
				const label = container.createSpan({
					cls: 'vaultman-tree-label vaultman-property-value-empty vaultman-property-value-cell',
				});
				const text = renderEditableText(label, {
					container: label,
					raw: '',
					type: propType,
					app: this.plugin.app,
					onRenameValue: (next) => {
						void this._replaceValueInVault(
							node.meta.propName,
							'',
							coercePropertyValueForWidget(next, propType),
						);
					},
				});
				// The translated word is a placeholder, not the node's label:
				// the editable text starts empty, so the commit carries only
				// what the user typed, in every language.
				text.setAttribute('data-placeholder', translate('prop.value.empty'));
				return true;
			}
			container.createSpan({
				cls: 'vaultman-tree-label vaultman-property-value-empty',
				attr: { 'data-placeholder': translate('prop.value.empty') },
			});
			return true;
		}

		if (!this.visibleCells.has('format')) return false;

		if (node.meta.flatLabelPrefix) {
			container.createSpan({
				cls: 'vaultman-property-value-prefix',
				text: node.meta.flatLabelPrefix,
			});
		}
		const propType = node.meta.propType ?? 'text';
		const rawValue = node.meta.rawValue ?? node.label;
		const label = container.createSpan({
			cls: 'bases-rendered-value vaultman-tree-label vaultman-property-value-cell',
		});
		// The cell speaks Bases' value idiom, and third-party property plugins
		// query exactly this pair — `.bases-rendered-value[data-property-type]`
		// and `[data-property-key]` — to find values worth decorating. Publishing
		// them is what lets their decorations reach the explorer instead of
		// stopping at Bases and the file-properties panel.
		renderPropertyValue({
			container: label,
			propertyAttributeContainer: propertyAttributeContainer ?? label,
			propertyKey: node.meta.propName,
			raw: rawValue,
			type: propType,
			app: this.plugin.app,
			onRemoveValue: () => {
				// Removal runs the registered `value.delete` action, so the inline
				// control and the context menu queue the same operation, honour the
				// same `when` guard and raise the same pending badge.
				this.plugin.contextMenuService.invokeAction('value.delete', {
					nodeType: 'value',
					node,
					surface: 'panel',
				});
			},
			onRenameValue: (next) => {
				if (propType === 'text') {
					next = next.replace(
						/\{date\}|\[fecha\]/gi,
						new Date().toISOString().slice(0, 10),
					);
				}
				// The context menu's Rename reaches the same vault path through a
				// modal; inline editing is a second way to enter the value, not a
				// second way to write it.
				//
				// Every widget reports its commit as a string, so the value is
				// coerced back to the property's own runtime type here. Writing the
				// string verbatim let a checkbox toggle hand a boolean property the
				// text `"true"`, and Obsidian re-inferred the property's type from
				// that data — the same flip was available on number and date.
				void this._replaceValueInVault(
					node.meta.propName,
					rawValue,
					coercePropertyValueForWidget(next, propType),
				);
			},
		});
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
		const showPropsOnly = selectedTypes.has('props-only');
		const typeFiltersActive =
			nodeTypeFilters.filter((t) => t !== 'props-only').length > 0;

		const filtered = nodes.filter((node) => {
			if (node.meta.isValueNode) return false;
			if (
				typeFiltersActive &&
				!selectedTypes.has(this._effectivePropType(node.meta))
			) {
				return false;
			}
			return true;
		});

		if (showPropsOnly) {
			return filtered.map((node) => ({ ...node, children: [] }));
		}
		return filtered;
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
		// 'custom' is the anchored note's own order. The projection already comes
		// out in that order, so the comparator's job is to leave it alone: the
		// sort is stable, and returning 0 preserves the frontmatter sequence for
		// properties and, one level down, for each property's values.
		if (normalizedSortBy === 'custom') return 0;
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

	/**
	 * Flattening runs after the two-level sort, so the flat list arrives grouped
	 * by property whatever was chosen. One level means one sort: Name compares
	 * values across properties, Parent restores the grouping deliberately.
	 */
	private _sortFlat(nodes: TreeNode<PropMeta>[]): TreeNode<PropMeta>[] {
		const sort = activeScopeSort('props', this.sortState, 'values');
		const sortBy = normalizeExplorerSortBy(sort.sortBy);
		if (sortBy !== 'name' && sortBy !== 'parent') return nodes;
		return sortFlatProjection(nodes, sortBy, sort.direction);
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
			(a, b, parent) => {
				if (this._effectivePropType(parent.meta) !== 'list') {
					// "el sort_option de 'values' debería ordenar los valores solamente de las propiedades tipo lista"
					return 0;
				}
				return this._compareNodes(a, b, valuesSort, valuesTimeIndex);
			},
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
		// Narrowed before anything else consumes it, so search, filters, sort and
		// every engine see one projection rather than each deciding for itself.
		let tree = this._scopeProjection(this.logic.getTree());
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
			: this._sortFlat(
					flattenPropertyValues(resolved, {
						showParent: this.visibleCells.has('parent'),
					}),
				);
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
			card.toggleClass('is-selected', this.selectedNodeIds.has(node.id));
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
			this._renderCardSelectionCheckbox(card, node);

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

	/**
	 * Presentation only. Hiding the warning never hides the conflict: the value
	 * stays `isTypeIncompatible`, so validation and blocked operations behave the
	 * same in all three modes.
	 */
	private _conflictWarnings(): PropConflictWarnings {
		return this.plugin.settings?.propConflictWarnings ?? 'off';
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

			// Only `full` decorates the row itself. `badge` keeps the marker but
			// drops the highlight and the outline, which is the part that turned a
			// browsable list into a wall of yellow.
			if (meta.isTypeIncompatible && this._conflictWarnings() === 'full') {
				warningIds.add(node.id);
			}
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
			if (meta.isTypeIncompatible && this._conflictWarnings() !== 'off') {
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
				else if (action === 'rename' || action === 'set') {
					badges.push({
						text: 'Update',
						icon: 'lucide-pencil',
						color: 'blue',
						queueIndex: opIdx,
					});
					if (action === 'rename') {
						if (meta.isValueNode && op.value !== undefined) {
							node.label = String(op.value);
							node.cls = `${node.cls ?? ''} vaultman-rename-preview`.trim();
						} else if (!meta.isValueNode) {
							const match = op.details.match(/→ "(.*?)"/);
							if (match && match[1]) {
								node.label = match[1];
								node.cls = `${node.cls ?? ''} vaultman-rename-preview`.trim();
							}
						}
					}
				} else if (action === 'move')
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

	private async _renamePropQueued(
		propName: string,
		newName: string,
	): Promise<void> {
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
		propType?: string,
	): Promise<void> {
		const newVal = await showInputModal(
			this.plugin.app,
			`Rename value "${oldValue}" to:`,
		);
		if (!newVal) return;
		// The modal returns a string like every widget does, and writing it
		// verbatim retyped the property. Same coercion, same reason.
		await this._replaceValueInVault(
			propName,
			oldValue,
			coercePropertyValueForWidget(newVal, propType),
		);
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
			action: 'rename',
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
